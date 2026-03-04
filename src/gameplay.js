// ── Camera ─────────────────────────────────────────────────
function setHoleCamera(hole) {
  // Frame the hole: tee on left, flag on right, both visible
  const margin = 120;
  const teeScreenX = margin;  // tee sits near left edge
  camera.x = hole.teeX - teeScreenX;

  // Verify flag is on-screen; if not, shrink margins
  const cupScreenX = hole.cupX - camera.x;
  if (cupScreenX > W - margin) {
    // Flag is off-screen — center between tee and cup
    const center = (hole.teeX + hole.cupX) / 2;
    camera.x = center - W / 2;
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

function collideWithTerrain() {
  // Circle-vs-line-segment collision for pixel-accurate contact
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
    if (lenSq < 0.001) continue; // skip degenerate segments

    let t = ((ball.x - a.x) * dx + (ball.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = a.x + t * dx;
    const closestY = a.y + t * dy;

    const distX = ball.x - closestX;
    const distY = ball.y - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < BALL_RADIUS * BALL_RADIUS && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);

      // Normal: from closest point toward ball center (pushes ball out)
      const nx = distX / dist;
      const ny = distY / dist;

      // Only resolve if ball is on the "above" side of terrain
      // (normal should have a component pointing toward sky, i.e. ny < 0)
      // For walls, nx matters more — allow those too
      const segNormX = dy / Math.sqrt(lenSq);
      const segNormY = -dx / Math.sqrt(lenSq);
      // Ensure segment normal points upward (into sky)
      const upNx = segNormY < 0 ? segNormX : -segNormX;
      const upNy = segNormY < 0 ? segNormY : -segNormY;
      // Ball should be on the "above" side: dot(ball-a, upNorm) > -BALL_RADIUS
      const sideCheck = (ball.x - a.x) * upNx + (ball.y - a.y) * upNy;
      if (sideCheck < -BALL_RADIUS * 2) continue; // ball is deep below, skip

      // Push ball out of terrain
      const overlap = BALL_RADIUS - dist;
      ball.x += nx * overlap;
      ball.y += ny * overlap;

      // Velocity response
      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        const isGround = Math.abs(ny) > Math.abs(nx);
        if (isGround && -dot < BOUNCE_THRESHOLD) {
          // Small impact on ground: absorb (sand feel)
          ball.vx -= dot * nx;
          ball.vy -= dot * ny;
        } else {
          // Wall or large impact: bounce with restitution
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

// ── Check if ball is resting inside the cup ─────────────────
function isBallInCup() {
  const hole = holes[currentHole];
  if (!hole || hole.cupFilled) return false;

  const inCupX = Math.abs(ball.x - hole.cupX) < CUP_WIDTH / 2;
  const inCupY = ball.y + BALL_RADIUS >= hole.cupY - 4; // 4px tolerance for cup lip
  return inCupX && inCupY;
}

// ── Out of Bounds Check ────────────────────────────────────
function isBallOffScreen() {
  const sx = ball.x - camera.x;
  const sy = ball.y;
  const margin = BALL_RADIUS + 10;
  return sx < -margin || sx > W + margin || sy < -margin || sy > H + margin;
}

// ── Physics Update ─────────────────────────────────────────
function updatePhysics() {
  if (ball.atRest) return;

  ball.vy += GRAVITY;
  ball.x += ball.vx;
  ball.y += ball.vy;
  _logBall('physics');

  collideWithTerrain();
  // Log if collision changed position
  if (ball.onGround) {
    _logBall('collision');

    // Proportional friction (gentle drag — handles high-speed deceleration)
    ball.vx *= ROLLING_FRICTION;
    ball.vy *= ROLLING_FRICTION;

    // Constant surface friction (smooth natural stop at low speed)
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed > SURFACE_FRICTION) {
      ball.vx -= (ball.vx / speed) * SURFACE_FRICTION;
      ball.vy -= (ball.vy / speed) * SURFACE_FRICTION;
    }

    // Rest check — use threshold higher than SURFACE_FRICTION to catch
    // micro-bounce loops where gravity+collision keep speed at ~0.006
    const REST_SPEED = 0.05;
    if (speed < REST_SPEED) {
      // Check if slope is too steep to rest (static friction check)
      const seg = findSegment(ball.x);
      const n = segmentNormal(seg);
      const slopeGravity = Math.abs(GRAVITY * n.x); // gravity component along surface
      if (slopeGravity > SURFACE_FRICTION) {
        // Too steep — slide along surface tangent so collision won't absorb it
        const a = vertices[seg], b = vertices[seg + 1];
        const sdx = b.x - a.x, sdy = b.y - a.y;
        const slen = Math.sqrt(sdx * sdx + sdy * sdy);
        // Tangent direction along surface, pointing downhill
        let tx = sdx / slen, ty = sdy / slen;
        if (ty < 0) { tx = -tx; ty = -ty; } // ensure downhill
        const slideSpeed = 0.3; // enough to overcome friction + collision absorption
        ball.vx = tx * slideSpeed;
        ball.vy = ty * slideSpeed;
      } else {
        // Gentle enough slope — ball naturally reaches zero
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
  switch (state) {
    case STATE_AIM:
      break;

    case STATE_FLIGHT:
      updatePhysics();

      // Check out of bounds (ball off screen)
      if (isBallOffScreen()) {
        state = STATE_OOB;
        transitionTimer = 0;
        break;
      }

      // Cup capture: ball rolling over cup at moderate speed gets pulled in
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

      // Ball came to rest naturally via physics
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

    case STATE_OOB:
      // Ball went off screen — wait then respawn at tee
      transitionTimer++;
      if (transitionTimer >= OOB_PAUSE) {
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

    case STATE_PAUSE:
      // Ball in cup — wait before starting transition
      transitionTimer++;
      if (transitionTimer >= TRANSITION_PAUSE) {
        totalStrokes += strokes;
        transitionStartCamX = camera.x;
        transitionBallStartY = ball.y; // save ball Y for rise animation

        currentHole++;

        // Use setHoleCamera to compute proper framing for new hole
        const newHole = holes[currentHole];
        const savedCamX = camera.x;
        setHoleCamera(newHole);
        transitionEndCamX = camera.x;
        camera.x = savedCamX; // restore — we'll animate to target

        if (currentHole === 1) showTitle = false;

        transitionTimer = 0;
        strokes = 0;
        state = STATE_TRANSITION;
      }
      break;

    case STATE_TRANSITION: {
      transitionTimer++;
      const t = Math.min(transitionTimer / TRANSITION_PAN, 1);
      const ease = t < 0.5
        ? 2 * t * t
        : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Camera pan
      camera.x = transitionStartCamX + (transitionEndCamX - transitionStartCamX) * ease;

      // Gradual cup fill during pan (starts at 30%, completes at 90%)
      const prevHole = holes[currentHole - 1];
      if (prevHole) {
        const fillStart = 0.3, fillEnd = 0.9;
        if (t >= fillStart) {
          prevHole.cupFillProgress = Math.min(1, (t - fillStart) / (fillEnd - fillStart));
        }

        // Flag fades during pan (starts at 30%, gone by 70%)
        const fadeStart = 0.3, fadeEnd = 0.7;
        if (t >= fadeStart) {
          prevHole.flagOpacity = Math.max(0, 1 - (t - fadeStart) / (fadeEnd - fadeStart));
        }

        // Ball + tee rise with the cup fill
        const surfaceY = prevHole.cupY - BALL_RADIUS;
        ball.y = transitionBallStartY + (surfaceY - transitionBallStartY) * prevHole.cupFillProgress;
      }

      // Done — pan complete
      if (transitionTimer >= TRANSITION_PAN) {
        if (prevHole) {
          prevHole.cupFilled = true;
          prevHole.cupFillProgress = 1;
          prevHole.flagVisible = false;
          prevHole.flagOpacity = 0;

          // Flatten the cup: replace notch vertices with flat terrain at rim height
          flattenCup(prevHole);
        }

        // Snap ball to the now-flat terrain surface (minimal ball handling)
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

  // Camera is FIXED during play — no updateCamera needed
}
