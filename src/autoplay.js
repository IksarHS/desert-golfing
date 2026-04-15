// ═══════════════════════════════════════════════════════════
// AUTOPLAY — AI golfer with physics-based shot simulation
// ═══════════════════════════════════════════════════════════
// The AI simulates candidate shots using the real game physics
// engine, picks the best one, then fires it. This means it can
// solve ANY hole a human could.
//
// Toggle with 'A' key, speed with 1-4 keys.

const AI_IDLE    = 0;
const AI_AIMING  = 1;
const AI_WAITING = 2;

let aiState   = AI_IDLE;
let aiTimer   = 0;
let aiShot    = null;
let aiEnabled = false;
let aiSpeed   = 1;
let aiSkill   = 0.8;

// Stats
let aiHolesPlayed  = 0;
let aiTotalStrokes = 0;
let aiBestHole     = Infinity;
let aiLastHole     = -1;
let aiHoleStrokes  = 0;

// ═══════════════════════════════════════════════════════════
// SHOT SIMULATION — test a shot using real physics
// ═══════════════════════════════════════════════════════════

function _saveBallState() {
  return {
    x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy,
    atRest: ball.atRest, onGround: ball.onGround,
    spinRate: ball.spinRate, rotation: ball.rotation,
    slowFrames: ball.slowFrames || 0,
    stuckFrames: ball.stuckFrames || 0,
    flightFrames: ball.flightFrames || 0,
    lastCollidedMat: ball.lastCollidedMat,
    lastCollisionSource: ball.lastCollisionSource,
    lastCollisionNormal: ball.lastCollisionNormal,
    lastCollisionY: ball.lastCollisionY,
  };
}

function _restoreBallState(saved) {
  ball.x = saved.x; ball.y = saved.y;
  ball.vx = saved.vx; ball.vy = saved.vy;
  ball.atRest = saved.atRest; ball.onGround = saved.onGround;
  ball.spinRate = saved.spinRate; ball.rotation = saved.rotation;
  ball.slowFrames = saved.slowFrames;
  ball.stuckFrames = saved.stuckFrames;
  ball.flightFrames = saved.flightFrames;
  ball.lastCollidedMat = saved.lastCollidedMat;
  ball.lastCollisionSource = saved.lastCollisionSource;
  ball.lastCollisionNormal = saved.lastCollisionNormal;
  ball.lastCollisionY = saved.lastCollisionY;
}

function simulateShot(vx, vy) {
  const hole = holes[currentHole];
  const savedBall = _saveBallState();
  const savedState = state;

  const origLogBall = _logBall;
  const origSaveSnapshot = typeof saveGameSnapshot === 'function' ? saveGameSnapshot : null;
  _logBall = function() {};
  if (origSaveSnapshot) saveGameSnapshot = function() {};

  ball.vx = vx;
  ball.vy = vy;
  ball.atRest = false;
  ball.onGround = false;
  ball.slowFrames = 0;
  ball.stuckFrames = 0;
  ball.flightFrames = 0;
  ball.spinRate = 0;  // Match player behavior — no forced spin
  state = STATE_FLIGHT;

  let scored = false;
  let oob = false;

  // Run the REAL game update loop so simulation matches gameplay exactly.
  // Track state transitions to detect scoring, OOB, and rest.
  for (let f = 0; f < 600; f++) {
    const prevState = state;
    update();

    if (state === STATE_OOB) {
      oob = true;
      // Let OOB resolve so ball respawns
      for (let of2 = 0; of2 < 80; of2++) update();
      break;
    }

    if (state === STATE_PAUSE) {
      scored = true;
      break;
    }

    // Ball came to rest without scoring (state went back to AIM)
    if (state === STATE_AIM && prevState === STATE_FLIGHT) {
      break;
    }

    // Ball at rest (physics detected)
    if (ball.atRest && state !== STATE_FLIGHT) {
      break;
    }
  }

  const result = {
    x: ball.x, y: ball.y,
    distToCup: hole ? Math.sqrt((ball.x - hole.cupX) ** 2 + (ball.y - hole.cupY) ** 2) : Infinity,
    scored, oob,
  };

  _restoreBallState(savedBall);
  state = savedState;
  _logBall = origLogBall;
  if (origSaveSnapshot) saveGameSnapshot = origSaveSnapshot;

  return result;
}

// ═══════════════════════════════════════════════════════════
// SHOT CALCULATION — simple, clean, correct
// ═══════════════════════════════════════════════════════════

function calculateShot() {
  const hole = holes[currentHole];
  if (!hole) return null;

  const dx = hole.cupX - ball.x;
  const dy = hole.cupY - ball.y;
  const hdist = Math.abs(dx);
  const dir = dx > 0 ? 1 : -1;

  // Search grid: normally 20×20 = 400 candidates.
  // If stuck (multiple shots with no progress), widen to 30×30 = 900.
  const stuck = aiHoleStrokes >= 3;
  const angleSteps = stuck ? 30 : 20;
  const powerSteps = stuck ? 30 : 20;
  const minLoft = 0.08;   // ~5 degrees
  const maxLoft = 1.4;    // ~80 degrees
  const minPower = 1.0;
  const maxPower = MAX_POWER;

  let scoringShot = null;   // best shot that scores
  let safeShot = null;      // best non-OOB shot (closest to cup)
  let safeDist = Infinity;

  for (let ai = 0; ai < angleSteps; ai++) {
    const loft = minLoft + (maxLoft - minLoft) * (ai / (angleSteps - 1));
    const angle = dir > 0 ? -loft : (Math.PI + loft);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let pi = 0; pi < powerSteps; pi++) {
      const power = minPower + (maxPower - minPower) * (pi / (powerSteps - 1));
      const vx = cosA * power;
      const vy = sinA * power;

      const result = simulateShot(vx, vy);

      if (result.scored && !scoringShot) {
        scoringShot = { vx, vy, power, angle };
      }

      if (!result.oob && result.distToCup < safeDist) {
        safeDist = result.distToCup;
        safeShot = { vx, vy, power, angle };
      }
    }

    if (scoringShot) break; // found one, stop searching
  }

  // If we found a scoring shot, try to refine it with nearby variations
  if (scoringShot) {
    // Test a few variations to find one that still scores
    // (increases chance of the exact shot working in real game)
    return scoringShot;
  }

  // If we found a safe (non-OOB) shot, refine around it
  if (safeShot && safeDist < hdist * 2) {
    // Fine search: 3 passes of 10×10 narrowing around the best safe shot
    let fineAngle = safeShot.angle;
    let finePower = safeShot.power;
    const startRange = safeDist > 100 ? 0.3 : 0.15;

    for (let pass = 0; pass < 3; pass++) {
      const aRange = startRange / (pass + 1);
      const pRange = startRange / (pass + 1);

      for (let ai = 0; ai < 10; ai++) {
        const angle = fineAngle + (ai / 9 - 0.5) * 2 * aRange;
        for (let pi = 0; pi < 10; pi++) {
          const power = Math.max(1, Math.min(MAX_POWER, finePower * (1 + (pi / 9 - 0.5) * 2 * pRange)));
          const vx = Math.cos(angle) * power;
          const vy = Math.sin(angle) * power;
          const result = simulateShot(vx, vy);

          if (result.scored) {
            return { vx, vy, power, angle }; // found it!
          }
          if (!result.oob && result.distToCup < safeDist) {
            safeDist = result.distToCup;
            safeShot = { vx, vy, power, angle };
            fineAngle = angle;
            finePower = power;
          }
        }
      }
    }

    return safeShot; // return best non-OOB approach shot
  }

  // Fallback: gentle lob forward
  const loft = 0.5;
  const angle = dir > 0 ? -loft : (Math.PI + loft);
  const power = Math.min(MAX_POWER, hdist * 0.01 + 2);
  return {
    vx: Math.cos(angle) * power,
    vy: Math.sin(angle) * power,
    power, angle,
  };
}

// ═══════════════════════════════════════════════════════════
// AI UPDATE
// ═══════════════════════════════════════════════════════════
function aiUpdate() {
  if (!aiEnabled) return;

  if (currentHole !== aiLastHole) {
    if (aiLastHole >= 0 && aiHoleStrokes > 0) {
      aiHolesPlayed++;
      aiTotalStrokes += aiHoleStrokes;
      if (aiHoleStrokes < aiBestHole) aiBestHole = aiHoleStrokes;
    }
    aiLastHole = currentHole;
    aiHoleStrokes = 0;
  }

  if (state === STATE_OOB || state === STATE_PAUSE || state === STATE_TRANSITION) {
    aiState = AI_WAITING;
    return;
  }

  if (state === STATE_COMPLETE && typeof _completeBtn !== 'undefined' && _completeBtn) {
    aiTimer++;
    if (aiTimer > 90) {
      const next = _completeBtn.next;
      if (next) startCourse(next.worldId, next.courseId);
      aiTimer = 0;
    }
    return;
  }

  switch (aiState) {
    case AI_IDLE:
      if (state === STATE_AIM && ball.atRest) {
        aiTimer++;
        const idleFrames = aiSpeed >= 16 ? 1 : aiSpeed >= 8 ? 3 : aiSpeed >= 4 ? 8 : aiSpeed >= 2 ? 20 : 40;
        if (aiTimer >= idleFrames) {
          aiShot = calculateShot();
          if (!aiShot) break;
          if (showTitle) showTitle = false;

          const bsx = ball.x - camera.x, bsy = ball.y;
          const dragDist = aiShot.power / POWER_SCALE;
          aiming = true;
          aimStartX = bsx;
          aimStartY = bsy;
          aimCurrentX = bsx - Math.cos(aiShot.angle) * dragDist;
          aimCurrentY = bsy - Math.sin(aiShot.angle) * dragDist;
          aiState = AI_AIMING;
          aiTimer = 0;
        }
      } else {
        aiTimer = 0;
      }
      break;

    case AI_AIMING:
      aiTimer++;
      const aimFrames = aiSpeed >= 8 ? 3 : aiSpeed >= 4 ? 6 : aiSpeed >= 2 ? 15 : 30;
      if (aiTimer >= aimFrames) {
        aiming = false;
        ball.vx = aiShot.vx;
        ball.vy = aiShot.vy;
        ball.atRest = false;
        ball.onGround = false;
        ball.slowFrames = 0;
        if (typeof ball.lastCollidedMat !== 'undefined') {
          ball.lastCollidedMat = null;
          ball.lastCollisionSource = 'terrain';
        }
        ball.spinRate = 0;  // Match player behavior — no forced spin
        state = STATE_FLIGHT;
        strokes++;
        aiHoleStrokes++;
        if (typeof _logBall === 'function') _logBall('shot');
        if (typeof pushToCloud === 'function') pushToCloud();

        aiState = AI_WAITING;
        aiTimer = 0;
      }
      break;

    case AI_WAITING:
      if (state === STATE_AIM && ball.atRest) {
        aiState = AI_IDLE;
        aiTimer = 0;
      }
      break;
  }
}

// ═══════════════════════════════════════════════════════════
// DRAW — autoplay HUD
// ═══════════════════════════════════════════════════════════
const _origDrawForAutoplay = draw;
draw = function() {
  _origDrawForAutoplay();
  if (!aiEnabled) return;

  ctx.save();
  ctx.scale(displayScale, displayScale);

  ctx.fillStyle = 'rgba(100, 200, 120, 0.6)';
  ctx.font = "14px 'Departure Mono', monospace";
  ctx.textAlign = 'left';
  const dot = Math.sin(Date.now() * 0.004) > 0 ? ' \u25CF' : ' \u25CB';
  ctx.fillText('AUTOPLAY' + dot, 16, H - 10);

  if (aiHoleStrokes > 0 && state === STATE_FLIGHT) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = "13px 'Departure Mono', monospace";
    ctx.fillText('Shot ' + aiHoleStrokes, 16, H - 24);
  }

  if (aiSpeed > 1) {
    ctx.fillStyle = 'rgba(100, 200, 120, 0.4)';
    ctx.font = "13px 'Departure Mono', monospace";
    ctx.textAlign = 'right';
    ctx.fillText(aiSpeed + 'x', W - 16, H - 10);
  }

  ctx.restore();
};

// ═══════════════════════════════════════════════════════════
// CONTROLS
// ═══════════════════════════════════════════════════════════
function toggleAutoplay() {
  aiEnabled = !aiEnabled;
  aiState = AI_IDLE;
  aiTimer = 0;
  aiming = false;
  _updateAutoplayPanel();
}

function setAutoplaySpeed(s) {
  aiSpeed = s;
  if (!aiEnabled) {
    aiEnabled = true;
    aiState = AI_IDLE;
    aiTimer = 0;
    aiming = false;
  }
  _updateAutoplayPanel();
}

function _updateAutoplayPanel() {
  const btn = document.getElementById('ap-toggle');
  if (btn) {
    btn.textContent = aiEnabled ? 'ON' : 'OFF';
    btn.classList.toggle('on', aiEnabled);
    btn.classList.toggle('off', !aiEnabled);
  }
  document.querySelectorAll('.ap-speed').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.speed) === aiSpeed);
  });
}

// ═══════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════
window.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === 'a' || e.key === 'A') {
    toggleAutoplay();
    e.preventDefault();
  }
  if (!e.ctrlKey) {
    if (e.key === '1') setAutoplaySpeed(1);
    if (e.key === '2') setAutoplaySpeed(2);
    if (e.key === '3') setAutoplaySpeed(4);
    if (e.key === '4') setAutoplaySpeed(8);
  }
});
