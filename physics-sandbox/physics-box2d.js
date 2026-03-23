// ── Box2D Physics Override ──────────────────────────────────
// Loaded AFTER gameplay.js and desert-golfing.js.
// Replaces updatePhysics() and MODE.collide() with planck-js equivalents.
// Everything else (rendering, input, level generation, transitions) is unchanged.

const PX_PER_M = 30;
// Game gravity: 0.04 px/frame² × 60² fps² / 30 px/m = 4.8 m/s²
const B2_GRAVITY = 4.8;

let b2World = null;
let b2Ball = null;
let b2TerrainBody = null;

// ── World Creation ──────────────────────────────────────
function createB2World() {
  b2World = planck.World(planck.Vec2(0, -B2_GRAVITY));
  b2TerrainBody = b2World.createBody();
  b2Ball = null;
}

// ── Material → Box2D property mapping ───────────────────
// These are Box2D Coulomb friction / restitution values,
// NOT the same as our custom physics multipliers.
const B2_MAT_PROPS = {
  sand:  { friction: 0.5,  restitution: 0.45, rollingResistance: 0.4  },
  grass: { friction: 1.2,  restitution: 0.25, rollingResistance: 0.8  },
  ice:   { friction: 0.02, restitution: 0.6,  rollingResistance: 0.02 },
  rock:  { friction: 0.2,  restitution: 0.85, rollingResistance: 0.25 },
  mud:   { friction: 3.0,  restitution: 0.05, rollingResistance: 2.0  },
};
const B2_DEFAULT_MAT = B2_MAT_PROPS.sand;

// ── Terrain Sync ────────────────────────────────────────
// Rebuild terrain fixtures from the game's vertices[].
// Each segment gets its own edge fixture with material-specific properties.
function syncTerrain() {
  if (!b2World || !b2TerrainBody) return;

  // Remove all existing fixtures from terrain body
  let fix = b2TerrainBody.getFixtureList();
  while (fix) {
    const next = fix.getNext();
    b2TerrainBody.destroyFixture(fix);
    fix = next;
  }

  if (vertices.length < 2) return;

  // Group consecutive segments by material, build a chain per group.
  // This preserves ghost vertex handling within each material region
  // while giving each region its own friction/restitution.
  let groupStart = 0;
  while (groupStart < vertices.length - 1) {
    const mat = vertices[groupStart].mat || DEFAULT_MAT;
    let groupEnd = groupStart + 1;

    // Extend group while material matches
    while (groupEnd < vertices.length - 1 &&
           (vertices[groupEnd].mat || DEFAULT_MAT) === mat) {
      groupEnd++;
    }

    // Build chain for this material group (groupStart..groupEnd inclusive)
    const chainVerts = [];
    for (let i = groupStart; i <= groupEnd; i++) {
      chainVerts.push(planck.Vec2(
        vertices[i].x / PX_PER_M,
        -vertices[i].y / PX_PER_M
      ));
    }

    const props = B2_MAT_PROPS[mat] || B2_DEFAULT_MAT;
    b2TerrainBody.createFixture(planck.Chain(chainVerts, false), {
      friction: props.friction,
      restitution: props.restitution,
    });

    groupStart = groupEnd;
  }
}

// ── Ball Management ─────────────────────────────────────
function createB2Ball(gx, gy) {
  if (b2Ball) {
    b2World.destroyBody(b2Ball);
    b2Ball = null;
  }

  b2Ball = b2World.createBody({
    type: 'dynamic',
    position: planck.Vec2(gx / PX_PER_M, -gy / PX_PER_M),
    bullet: true,           // CCD — prevents tunneling
    linearDamping: 0.0,     // no uniform damping — material rolling resistance handles this
    angularDamping: 0.0,    // no uniform spin decay — material friction handles this
    allowSleep: false,
  });

  b2Ball.createFixture(planck.Circle(BALL_RADIUS / PX_PER_M), {
    density: 1.0,
    friction: 1.0,       // neutral — lets terrain friction dominate via sqrt()
    restitution: 0.0,    // neutral — lets terrain restitution dominate via max()
  });
}

function isB2OnGround() {
  if (!b2Ball) return false;
  for (let ce = b2Ball.getContactList(); ce; ce = ce.next) {
    if (ce.contact.isTouching()) return true;
  }
  return false;
}

// ── Material-based rolling resistance ────────────────────
// Box2D friction controls sliding, not rolling deceleration.
// We apply an opposing force when the ball is on the ground,
// scaled by the material's rollingResistance coefficient.
function getContactMaterial() {
  // Find which material the ball is currently touching
  if (!b2Ball) return DEFAULT_MAT;
  for (let ce = b2Ball.getContactList(); ce; ce = ce.next) {
    if (!ce.contact.isTouching()) continue;
    // The other fixture is terrain — find which segment
    const fA = ce.contact.getFixtureA();
    const fB = ce.contact.getFixtureB();
    const terrainFixture = (fA.getBody() === b2TerrainBody) ? fA : fB;
    // Use ball world position to look up material name from game vertices
    const bx = b2Ball.getPosition().x * PX_PER_M;
    for (let i = 0; i < vertices.length - 1; i++) {
      if (bx >= vertices[i].x && bx < vertices[i + 1].x) {
        return vertices[i].mat || DEFAULT_MAT;
      }
    }
    return DEFAULT_MAT;
  }
  return DEFAULT_MAT;
}

function applyRollingResistance() {
  if (!b2Ball || !isB2OnGround()) return;

  const vel = b2Ball.getLinearVelocity();
  const speed = vel.length();
  if (speed < 0.01) return;

  const matName = getContactMaterial();
  const props = B2_MAT_PROPS[matName] || B2_DEFAULT_MAT;
  const coeff = props.rollingResistance;

  // Force = -coefficient * mass * gravity * velocity_direction
  const mass = b2Ball.getMass();
  const forceMag = coeff * mass * B2_GRAVITY;

  // Apply force opposing velocity
  const fx = -(vel.x / speed) * forceMag;
  const fy = -(vel.y / speed) * forceMag;
  b2Ball.applyForceToCenter(planck.Vec2(fx, fy), true);
}

// ── Read Box2D state back into game's ball object ───────
function syncBallFromB2() {
  if (!b2Ball) return;

  const pos = b2Ball.getPosition();
  ball.x = pos.x * PX_PER_M;
  ball.y = -pos.y * PX_PER_M;           // flip Y back
  ball.rotation = -b2Ball.getAngle();    // flip rotation for y-down
  ball.onGround = isB2OnGround();

  const vel = b2Ball.getLinearVelocity();
  const speed = vel.length();

  // Rest detection (same logic as custom physics)
  if (ball.onGround && speed < 0.3) {
    ball.slowFrames = (ball.slowFrames || 0) + 1;
    if (ball.slowFrames > 120 || speed < 0.02) {
      b2Ball.setLinearVelocity(planck.Vec2(0, 0));
      b2Ball.setAngularVelocity(0);
      ball.vx = 0;
      ball.vy = 0;
      ball.atRest = true;
      ball.slowFrames = 0;

      // Snap to terrain surface
      ball.y = terrainYAt(ball.x) - BALL_RADIUS;
      b2Ball.setPosition(planck.Vec2(ball.x / PX_PER_M, -ball.y / PX_PER_M));

      if (MODE.onRest) MODE.onRest();
      _logBall('rest');
    }
  } else {
    ball.slowFrames = 0;
  }

  // Track velocity in game units for OOB checks etc.
  ball.vx = vel.x * PX_PER_M / 60;  // m/s → px/frame
  ball.vy = -vel.y * PX_PER_M / 60;
}

// ── Override: MODE.collide() ────────────────────────────
// Box2D handles collision internally, so this becomes a no-op.
MODE.collide = function() {
  return ball.onGround;
};

// ── Override: updatePhysics() ───────────────────────────
// Replace the custom physics loop with Box2D step + sync.
// Also detects shots (ball has game velocity but Box2D body doesn't yet).
updatePhysics = function() {
  if (ball.atRest) return;

  // Detect shot: ball has velocity but Box2D body doesn't yet
  if (b2Ball) {
    const b2Vel = b2Ball.getLinearVelocity();
    const b2Speed = b2Vel.length();
    const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

    if (ballSpeed > 0.01 && b2Speed < 0.01) {
      // Shot just fired — sync velocity to Box2D
      b2Ball.setAwake(true);
      b2Ball.setLinearVelocity(planck.Vec2(
        ball.vx * 60 / PX_PER_M,   // px/frame → m/s
        -ball.vy * 60 / PX_PER_M   // flip Y
      ));
      // Let Box2D compute spin from friction — don't force our backspin
    }
  }

  // Apply material-specific rolling resistance before step
  applyRollingResistance();

  // Step Box2D
  b2World.step(1 / 60, 8, 3);

  // Read results back into game state
  syncBallFromB2();
};

// ── Override: MODE.onRest() ─────────────────────────────
// Ensure ball snaps to terrain and Box2D body is synced
const _origOnRest = MODE.onRest;
MODE.onRest = function() {
  if (_origOnRest) _origOnRest();
  // Sync snapped position back to Box2D
  if (b2Ball) {
    b2Ball.setPosition(planck.Vec2(ball.x / PX_PER_M, -ball.y / PX_PER_M));
    b2Ball.setLinearVelocity(planck.Vec2(0, 0));
    b2Ball.setAngularVelocity(0);
  }
};

// ── Override: MODE.onOOB() ──────────────────────────────
const _origOnOOB = MODE.onOOB;
MODE.onOOB = function() {
  if (_origOnOOB) _origOnOOB();
  // Recreate Box2D ball at respawn position
  createB2Ball(ball.x, ball.y);
};

// ── Override: MODE.onTransitionEnd() ────────────────────
// Rebuild terrain and reposition ball after hole transition
const _origOnTransitionEnd = MODE.onTransitionEnd;
MODE.onTransitionEnd = function() {
  if (_origOnTransitionEnd) _origOnTransitionEnd();
  // Terrain vertices changed — rebuild Box2D chain
  syncTerrain();
  // Recreate ball at new tee position
  createB2Ball(ball.x, ball.y);
};

// ── Material Test Hole ──────────────────────────────────
// Replace hole 1 with a long flat hole divided into 5 material zones.
// Each zone is ~300px wide so you can hit the ball across and feel the difference.
const _MATERIAL_TEST_HOLE = {
  teeY: 350, dist: 900, cupY: 350,
  verts: [
    // Sand zone: 0–150
    { dx: 75, y: 350, mat: 'sand' },
    { dx: 150, y: 350, mat: 'sand' },
    // Grass zone: 150–300
    { dx: 225, y: 350, mat: 'grass' },
    { dx: 300, y: 350, mat: 'grass' },
    // Ice zone: 300–450
    { dx: 375, y: 350, mat: 'ice' },
    { dx: 450, y: 350, mat: 'ice' },
    // Rock zone: 450–600 (slight bump to test bounce)
    { dx: 500, y: 342, mat: 'rock' },
    { dx: 525, y: 335, mat: 'rock' },
    { dx: 550, y: 342, mat: 'rock' },
    { dx: 600, y: 350, mat: 'rock' },
    // Mud zone: 600–750
    { dx: 675, y: 350, mat: 'mud' },
    { dx: 750, y: 350, mat: 'mud' },
    // Back to sand for cup approach
    { dx: 825, y: 350, mat: 'sand' },
  ]
};

// Material zone labels for HUD overlay
const _MAT_ZONES = [
  { name: 'SAND',  color: '#d68841', startDx: 0,    endDx: 150 },
  { name: 'GRASS', color: '#5a8f3c', startDx: 150,  endDx: 300 },
  { name: 'ICE',   color: '#8bb8d4', startDx: 300,  endDx: 450 },
  { name: 'ROCK',  color: '#8a8278', startDx: 450,  endDx: 600 },
  { name: 'MUD',   color: '#6b4c2a', startDx: 600,  endDx: 750 },
];

let _testHoleTeeX = 0; // stored after init to position labels

// ── Override: MODE.init() ───────────────────────────────
const _origInit = MODE.init;
MODE.init = function() {
  // Swap in material test hole before generation
  HAND_DEFINED_HOLES[0] = _MATERIAL_TEST_HOLE;

  // Create Box2D world first
  createB2World();

  // Run original init (sets up holes, ball position, camera)
  if (_origInit) _origInit();

  // Remember tee position for label rendering
  _testHoleTeeX = holes[0] ? holes[0].teeX : 0;

  // Now sync terrain and create ball
  syncTerrain();
  createB2Ball(ball.x, ball.y);
};

// ── HUD indicator ───────────────────────────────────────
const _origDrawHUD = MODE.drawHUD;
MODE.drawHUD = function() {
  if (_origDrawHUD) _origDrawHUD();

  // Show Box2D indicator
  ctx.fillStyle = '#88aaff';
  ctx.font = '14px VT323, Silkscreen, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('BOX2D PHYSICS', 20, H - 16);

  // Draw material zone labels on hole 1
  if (currentHole === 0 && _testHoleTeeX) {
    ctx.font = '16px VT323, Silkscreen, monospace';
    ctx.textAlign = 'center';
    for (const zone of _MAT_ZONES) {
      const worldMidX = _testHoleTeeX + (zone.startDx + zone.endDx) / 2;
      const screenX = worldMidX - camera.x;
      if (screenX < -100 || screenX > W + 100) continue;
      const labelY = 350 - 30; // above terrain
      ctx.fillStyle = zone.color;
      ctx.fillText(zone.name, screenX, labelY);
    }
  }
};

// ── Override: skipToHole() ──────────────────────────────
// Debug skip regenerates terrain without transitions — need to rebuild Box2D.
const _origSkipToHole = window.skipToHole;
if (_origSkipToHole) {
  window.skipToHole = function(holeNum) {
    const result = _origSkipToHole(holeNum);
    syncTerrain();
    createB2Ball(ball.x, ball.y);
    return result;
  };
}

// end of physics-box2d.js
