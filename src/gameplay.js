// ── Camera ─────────────────────────────────────────────────
let _cameraShakeX = 0, _cameraShakeY = 0;
let _cameraShakeIntensity = 0;

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

function updateCameraShake() {
  if (_cameraShakeIntensity > 0.1) {
    _cameraShakeX = (Math.random() - 0.5) * _cameraShakeIntensity;
    _cameraShakeY = (Math.random() - 0.5) * _cameraShakeIntensity;
    _cameraShakeIntensity *= 0.85; // decay
  } else {
    _cameraShakeX = 0;
    _cameraShakeY = 0;
    _cameraShakeIntensity = 0;
  }
}

function triggerCameraShake(impactSpeed) {
  // Only shake on hard impacts
  if (impactSpeed > 2.0) {
    _cameraShakeIntensity = Math.min(impactSpeed * 1.5, 8);
  }
}

// ── Input System ──────────────────────────────────────────
canvas.addEventListener('mousedown', (e) => {
  if (state !== STATE_AIM) return;
  const pos = toGameCoords(e.clientX, e.clientY);
  aiming = true;
  aimStartX = pos.x;
  aimStartY = pos.y;
  aimCurrentX = pos.x;
  aimCurrentY = pos.y;
});

canvas.addEventListener('mousemove', (e) => {
  if (!aiming) return;
  const pos = toGameCoords(e.clientX, e.clientY);
  aimCurrentX = pos.x;
  aimCurrentY = pos.y;
});

canvas.addEventListener('mouseup', (e) => {
  if (!aiming) return;
  aiming = false;

  const pos = toGameCoords(e.clientX, e.clientY);
  const dx = aimStartX - pos.x;
  const dy = aimStartY - pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 5) return;

  const power = Math.min(dist * POWER_SCALE, MAX_POWER);
  const angle = Math.atan2(dy, dx);

  ball.vx = Math.cos(angle) * power;
  ball.vy = Math.sin(angle) * power;
  ball.atRest = false;
  ball.onGround = false;
  state = STATE_FLIGHT;
  strokes++;
  _logBall('shot');
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (state !== STATE_AIM) return;
  const pos = toGameCoords(e.touches[0].clientX, e.touches[0].clientY);
  aiming = true;
  aimStartX = pos.x;
  aimStartY = pos.y;
  aimCurrentX = pos.x;
  aimCurrentY = pos.y;
});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!aiming) return;
  const pos = toGameCoords(e.touches[0].clientX, e.touches[0].clientY);
  aimCurrentX = pos.x;
  aimCurrentY = pos.y;
});

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (!aiming) return;
  aiming = false;

  const dx = aimStartX - aimCurrentX;
  const dy = aimStartY - aimCurrentY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 5) return;

  const power = Math.min(dist * POWER_SCALE, MAX_POWER);
  const angle = Math.atan2(dy, dx);

  ball.vx = Math.cos(angle) * power;
  ball.vy = Math.sin(angle) * power;
  ball.atRest = false;
  ball.onGround = false;
  state = STATE_FLIGHT;
  strokes++;
  _logBall('shot');
});

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

// Velocity cap — prevent tunneling through thin terrain
const MAX_VELOCITY = 12;

function collideWithTerrain() {
  let collided = false;
  let maxImpactSpeed = 0;

  // Multiple collision iterations to handle tight crevices
  for (let iter = 0; iter < 3; iter++) {
    let iterCollided = false;

    for (let i = 0; i < vertices.length - 1; i++) {
      const a = vertices[i], b = vertices[i + 1];

      if (b.x < ball.x - BALL_RADIUS * 2 && a.x < ball.x - BALL_RADIUS * 2) continue;
      if (a.x > ball.x + BALL_RADIUS * 2 && b.x > ball.x + BALL_RADIUS * 2) break;

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

        const segNormX = dy / Math.sqrt(lenSq);
        const segNormY = -dx / Math.sqrt(lenSq);
        const upNx = segNormY < 0 ? segNormX : -segNormX;
        const upNy = segNormY < 0 ? segNormY : -segNormY;
        const sideCheck = (ball.x - a.x) * upNx + (ball.y - a.y) * upNy;
        if (sideCheck < -BALL_RADIUS * 2) continue;

        // Push ball out
        const overlap = BALL_RADIUS - dist;
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        // Velocity response (only on first iteration to avoid double-bounce)
        if (iter === 0) {
          const dot = ball.vx * nx + ball.vy * ny;
          if (dot < 0) {
            const impactSpeed = -dot;
            if (impactSpeed > maxImpactSpeed) maxImpactSpeed = impactSpeed;

            const isGround = Math.abs(ny) > Math.abs(nx);
            if (isGround && impactSpeed < BOUNCE_THRESHOLD) {
              ball.vx -= dot * nx;
              ball.vy -= dot * ny;
            } else {
              ball.vx -= (1 + RESTITUTION) * dot * nx;
              ball.vy -= (1 + RESTITUTION) * dot * ny;
            }
          }
        }

        iterCollided = true;
        collided = true;
      }
    }

    // Stop iterating if no collision in this pass
    if (!iterCollided) break;
  }

  // Trigger camera shake and sand particles on hard impacts
  if (maxImpactSpeed > 1.5) {
    triggerCameraShake(maxImpactSpeed);
    // Spawn sand particles if the function exists (defined in art.js)
    if (typeof spawnSandParticles === 'function') {
      spawnSandParticles(ball.x, ball.y, maxImpactSpeed);
    }
  }

  ball.onGround = collided;
  return collided;
}

// ── Check if ball is resting inside the cup ─────────────────
function isBallInCup() {
  const hole = holes[currentHole];
  if (!hole || hole.cupFilled) return false;

  const inCupX = Math.abs(ball.x - hole.cupX) < CUP_WIDTH / 2;
  const inCupY = ball.y + BALL_RADIUS >= hole.cupY - 4;
  return inCupX && inCupY;
}

// ── Out of Bounds Check ────────────────────────────────────
function isBallOffScreen() {
  const sx = ball.x - camera.x;
  const sy = ball.y;
  const margin = BALL_RADIUS + 10;
  return sx < -margin || sx > W + margin || sy < -margin || sy > H + margin;
}

// Way off screen — ball is extremely far away, respawn faster
function isBallWayOff() {
  const sx = ball.x - camera.x;
  const sy = ball.y;
  return sx < -200 || sx > W + 200 || sy < -200 || sy > H + 200;
}

// ── Physics Update ─────────────────────────────────────────
function updatePhysics() {
  if (ball.atRest) return;

  ball.vy += GRAVITY;

  // Velocity cap to prevent tunneling
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed > MAX_VELOCITY) {
    const scale = MAX_VELOCITY / speed;
    ball.vx *= scale;
    ball.vy *= scale;
  }

  ball.x += ball.vx;
  ball.y += ball.vy;
  _logBall('physics');

  collideWithTerrain();
  if (ball.onGround) {
    _logBall('collision');

    ball.vx *= ROLLING_FRICTION;
    ball.vy *= ROLLING_FRICTION;

    const groundSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (groundSpeed > SURFACE_FRICTION) {
      ball.vx -= (ball.vx / groundSpeed) * SURFACE_FRICTION;
      ball.vy -= (ball.vy / groundSpeed) * SURFACE_FRICTION;
    }

    const REST_SPEED = 0.05;
    if (groundSpeed < REST_SPEED) {
      const seg = findSegment(ball.x);
      const n = segmentNormal(seg);
      const slopeGravity = Math.abs(GRAVITY * n.x);
      if (slopeGravity > SURFACE_FRICTION) {
        const a = vertices[seg], b = vertices[seg + 1];
        const sdx = b.x - a.x, sdy = b.y - a.y;
        const slen = Math.sqrt(sdx * sdx + sdy * sdy);
        let tx = sdx / slen, ty = sdy / slen;
        if (ty < 0) { tx = -tx; ty = -ty; }
        const slideSpeed = 0.3;
        ball.vx = tx * slideSpeed;
        ball.vy = ty * slideSpeed;
      } else {
        ball.vx = 0;
        ball.vy = 0;
        ball.atRest = true;
        ball.y = terrainYAt(ball.x) - BALL_RADIUS;
        _logBall(isBallInCup() ? 'rest-in-cup' : 'rest-on-terrain');
      }
    }
  }
}

// ── Game State Machine ────────────────────────────────────
function update() {
  updateCameraShake();

  switch (state) {
    case STATE_AIM:
      break;

    case STATE_FLIGHT:
      updatePhysics();

      if (isBallOffScreen()) {
        state = STATE_OOB;
        transitionTimer = 0;
        break;
      }

      if (ball.onGround && !ball.atRest) {
        const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (speed < 3.0 && isBallInCup()) {
          ball.vx = 0;
          ball.vy = 0;
          ball.atRest = true;
          _logBall('rest-in-cup');
          state = STATE_PAUSE;
          transitionTimer = 0;
          break;
        }
      }

      if (ball.atRest) {
        if (isBallInCup()) {
          state = STATE_PAUSE;
          transitionTimer = 0;
        } else if (isBallOffScreen()) {
          state = STATE_OOB;
          transitionTimer = 0;
        } else {
          state = STATE_AIM;
        }
      }
      break;

    case STATE_OOB: {
      transitionTimer++;
      // Faster respawn if ball is way off screen
      const oobLimit = isBallWayOff() ? Math.floor(OOB_PAUSE / 2) : OOB_PAUSE;
      if (transitionTimer >= oobLimit) {
        const hole = holes[currentHole];
        ball.x = hole.teeX;
        ball.y = terrainYAt(hole.teeX) - BALL_RADIUS;
        ball.vx = 0;
        ball.vy = 0;
        ball.atRest = true;
        state = STATE_AIM;
        _logBall('oob-respawn');
      }
      break;
    }

    case STATE_PAUSE:
      transitionTimer++;
      if (transitionTimer >= TRANSITION_PAUSE) {
        totalStrokes += strokes;
        transitionStartCamX = camera.x;
        transitionBallStartY = ball.y;

        currentHole++;

        const newHole = holes[currentHole];
        const savedCamX = camera.x;
        setHoleCamera(newHole);
        transitionEndCamX = camera.x;
        camera.x = savedCamX;

        if (currentHole === 1) showTitle = false;

        transitionTimer = 0;
        strokes = 0;
        state = STATE_TRANSITION;
      }
      break;

    case STATE_TRANSITION: {
      transitionTimer++;
      const t = Math.min(transitionTimer / TRANSITION_PAN, 1);
      // Smoother ease-in-out-cubic
      const ease = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;

      camera.x = transitionStartCamX + (transitionEndCamX - transitionStartCamX) * ease;

      const prevHole = holes[currentHole - 1];
      if (prevHole) {
        const fillStart = 0.3, fillEnd = 0.9;
        if (t >= fillStart) {
          prevHole.cupFillProgress = Math.min(1, (t - fillStart) / (fillEnd - fillStart));
        }

        const fadeStart = 0.3, fadeEnd = 0.7;
        if (t >= fadeStart) {
          prevHole.flagOpacity = Math.max(0, 1 - (t - fadeStart) / (fadeEnd - fadeStart));
        }

        const surfaceY = prevHole.cupY - BALL_RADIUS;
        ball.y = transitionBallStartY + (surfaceY - transitionBallStartY) * prevHole.cupFillProgress;
      }

      if (transitionTimer >= TRANSITION_PAN) {
        if (prevHole) {
          prevHole.cupFilled = true;
          prevHole.cupFillProgress = 1;
          prevHole.flagVisible = false;
          prevHole.flagOpacity = 0;
          flattenCup(prevHole);
        }

        ball.atRest = true;
        ball.vx = 0;
        ball.vy = 0;
        ball.y = terrainYAt(ball.x) - BALL_RADIUS;
        state = STATE_AIM;
        _logBall('transition-end-tee');

        ensureHolesAhead(currentHole + 2);
      }
      break;
    }
  }
}
