// ── Desert Golfing Mode ───────────────────────────────────
// Horizontal golf: procedural terrain, left-to-right holes, fixed camera per hole.
// Requires: shared.js, level-design.js loaded before this file.

// ── DG-Specific Globals ──────────────────────────────────
// vertices[] and holes[] are declared in shared.js (used by level-design.js)
// currentHole is declared in shared.js

// ── Terrain Collision ──────────────────────────────────────
function findSegment(worldX) {
  for (let i = 0; i < vertices.length - 1; i++) {
    if (worldX >= vertices[i].x && worldX <= vertices[i + 1].x) {
      return i;
    }
  }
  return vertices.length - 2;
}

function segmentNormal(i) {
  const a = vertices[i], b = vertices[i + 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  return { x: dy / len, y: -dx / len };
}

function collideWithTerrain() {
  let collided = false;

  for (let i = 0; i < vertices.length - 1; i++) {
    const a = vertices[i], b = vertices[i + 1];

    // Skip segments far from ball
    if (b.x < ball.x - BALL_RADIUS * 2 && a.x < ball.x - BALL_RADIUS * 2) continue;
    if (a.x > ball.x + BALL_RADIUS * 2 && b.x > ball.x + BALL_RADIUS * 2) break;

    // Find closest point on segment AB to ball center
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 0.001) continue;

    let t = ((ball.x - a.x) * dx + (ball.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = a.x + t * dx;
    const closestY = a.y + t * dy;

    const distX = ball.x - closestX;
    const distY = ball.y - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < BALL_RADIUS * BALL_RADIUS && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);

      const nx = distX / dist;
      const ny = distY / dist;

      // Side check
      const segNormX = dy / Math.sqrt(lenSq);
      const segNormY = -dx / Math.sqrt(lenSq);
      const upNx = segNormY < 0 ? segNormX : -segNormX;
      const upNy = segNormY < 0 ? segNormY : -segNormY;
      const sideCheck = (ball.x - a.x) * upNx + (ball.y - a.y) * upNy;
      if (sideCheck < -BALL_RADIUS * 2) continue;

      // Push ball out of terrain
      const overlap = BALL_RADIUS - dist;
      ball.x += nx * overlap;
      ball.y += ny * overlap;

      // Velocity response
      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        const isGround = Math.abs(ny) > Math.abs(nx);
        if (isGround && -dot < BOUNCE_THRESHOLD) {
          ball.vx -= dot * nx;
          ball.vy -= dot * ny;
        } else {
          ball.vx -= (1 + RESTITUTION) * dot * nx;
          ball.vy -= (1 + RESTITUTION) * dot * ny;
        }
      }

      collided = true;
    }
  }

  ball.onGround = collided;
  return collided;
}

// ── Camera ─────────────────────────────────────────────────
function setHoleCamera(hole) {
  const margin = 120;
  const teeScreenX = margin;
  camera.x = hole.teeX - teeScreenX;

  const cupScreenX = hole.cupX - camera.x;
  if (cupScreenX > W - margin) {
    const center = (hole.teeX + hole.cupX) / 2;
    camera.x = center - W / 2;
  }
}

// ── Cup Logic ──────────────────────────────────────────────
function isBallInCup() {
  const hole = holes[currentHole];
  if (!hole || hole.cupFilled) return false;

  const inCupX = Math.abs(ball.x - hole.cupX) < CUP_WIDTH / 2;
  const belowRim = ball.y > hole.cupY;
  return inCupX && belowRim;
}

function isBallOffScreen() {
  const sx = ball.x - camera.x;
  const sy = ball.y;
  const margin = BALL_RADIUS + 10;
  return sx < -margin || sx > W + margin || sy < -margin || sy > H + margin;
}

// ── Drawing ────────────────────────────────────────────────
function drawTerrainDG() {
  ctx.fillStyle = GROUND;
  ctx.beginPath();

  const startX = camera.x - 50;
  const endX   = camera.x + W + 50;

  let started = false;
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    if (v.x < startX - 100 && i < vertices.length - 1 && vertices[i + 1].x < startX - 100) continue;
    if (v.x > endX + 100) {
      if (!started) { ctx.moveTo(v.x, v.y); started = true; }
      else ctx.lineTo(v.x, v.y);
      break;
    }

    if (!started) { ctx.moveTo(v.x, v.y); started = true; }
    else ctx.lineTo(v.x, v.y);
  }

  // Close polygon at bottom of screen (in world coords)
  ctx.lineTo(endX + 100, H + 10);
  ctx.lineTo(startX - 100, H + 10);
  ctx.closePath();
  ctx.fill();
}

// ── MODE Object ────────────────────────────────────────────
MODE = {
  name: 'desert-golfing',

  init() {
    ensureHolesAhead(2);

    const firstHole = holes[0];
    ball.x = firstHole.teeX;
    ball.y = terrainYAt(firstHole.teeX) - BALL_RADIUS;
    ball.atRest = true;

    setHoleCamera(firstHole);
  },

  collide() {
    return collideWithTerrain();
  },

  canRest(forceRest) {
    // Check if slope is too steep to rest (static friction check)
    const seg = findSegment(ball.x);
    const n = segmentNormal(seg);
    const slopeGravity = Math.abs(GRAVITY * n.x);
    if (slopeGravity > SURFACE_FRICTION && !forceRest) {
      return false; // too steep — let ball keep rolling
    }
    return true;
  },

  onRest() {
    // Snap Y to terrain surface
    ball.y = terrainYAt(ball.x) - BALL_RADIUS;
  },

  isGoalReached() {
    if (isBallInCup()) {
      return holes[currentHole];
    }
    return false;
  },

  onGoalReached(cupData) {
    // Nothing extra needed — cup data is already tracked
  },

  isOOB() {
    return isBallOffScreen();
  },

  onOOB() {
    const hole = holes[currentHole];
    ball.x = hole.teeX;
    ball.y = terrainYAt(hole.teeX) - BALL_RADIUS;
    ball.vx = 0;
    ball.vy = 0;
    ball.atRest = true;
  },

  onTransitionStart() {
    transitionCamStart = camera.x;
    transitionBallStartY = ball.y;

    currentHole++;

    // Compute target camera position for new hole
    const newHole = holes[currentHole];
    const savedCamX = camera.x;
    setHoleCamera(newHole);
    transitionCamEnd = camera.x;
    camera.x = savedCamX; // restore — we'll animate to target

    if (currentHole === 1) showTitle = false;
  },

  setCameraPos(val) {
    camera.x = val;
  },

  getTransitionCupData() {
    return currentHole > 0 ? holes[currentHole - 1] : null;
  },

  onTransitionEnd() {
    const prevHole = holes[currentHole - 1];
    if (prevHole) {
      prevHole.cupFilled = true;
      prevHole.cupFillProgress = 1;
      prevHole.flagVisible = false;
      prevHole.flagOpacity = 0;
      flattenCup(prevHole);
    }

    // Ball stays at old cup X (which IS the new tee X) — just snap Y to terrain
    ball.y = terrainYAt(ball.x) - BALL_RADIUS;

    ensureHolesAhead(currentHole + 2);
  },

  // No camera update during flight (camera is fixed per hole in DG)
  updateCamera: null,

  // ── Rendering ──────────────────────────────────────────
  applyCameraTransform(ctx) {
    ctx.translate(-camera.x, 0);
  },

  drawSky() {
    ctx.fillStyle = SKY;
    ctx.fillRect(0, 0, W, H);
  },

  drawWorld() {
    drawTerrainDG();

    // Cup fill + flag for current and previous hole
    if (state === STATE_TRANSITION && currentHole > 0) {
      const prevHole = holes[currentHole - 1];
      drawCupFill(prevHole);
      drawFlag(prevHole, terrainYAt);
    }

    const curHole = holes[currentHole];
    if (curHole) {
      drawCupFill(curHole);
      drawFlag(curHole, terrainYAt);
    }
  },

  drawHUD() {
    // Title on first hole
    if (showTitle && currentHole === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '32px VT323, Silkscreen, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('Desert\u2014Golfing', 20, 38);
    }
  }
};
