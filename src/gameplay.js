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
  if (showTitle) showTitle = false;

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
  ball.slowFrames = 0;
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
  if (showTitle) showTitle = false;

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
  ball.slowFrames = 0;
  state = STATE_FLIGHT;
  strokes++;
  _logBall('shot');
});

// ── Physics Update ─────────────────────────────────────────
function updatePhysics() {
  if (ball.atRest) return;

  // 2 substeps for thin-surface safety
  const substeps = 2;
  for (let s = 0; s < substeps; s++) {
    ball.vy += GRAVITY / substeps;
    ball.x += ball.vx / substeps;
    ball.y += ball.vy / substeps;
    if (s === 0) _logBall('physics');

    MODE.collide();
    if (ball.onGround && s === 0) _logBall('collision');
  }

  // Friction applied once per frame (outside substeps)
  if (ball.onGround) {
    // Proportional friction (gentle drag — handles high-speed deceleration)
    ball.vx *= ROLLING_FRICTION;
    ball.vy *= ROLLING_FRICTION;

    // Constant surface friction (smooth natural stop at low speed)
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (speed > SURFACE_FRICTION) {
      ball.vx -= (ball.vx / speed) * SURFACE_FRICTION;
      ball.vy -= (ball.vy / speed) * SURFACE_FRICTION;
    }

    // Slow-roll failsafe: track how long ball has been rolling slowly on ground
    if (speed < 0.5) {
      ball.slowFrames = (ball.slowFrames || 0) + 1;
    } else {
      ball.slowFrames = 0;
    }

    // Rest check
    const REST_SPEED = 0.05;
    const forceRest = ball.slowFrames > 120; // ~2 seconds of slow rolling -> force stop
    if (speed < REST_SPEED || forceRest) {
      // Let mode decide if rest is allowed (e.g. slope check)
      if (MODE.canRest ? MODE.canRest(forceRest) : true) {
        ball.vx = 0;
        ball.vy = 0;
        ball.atRest = true;
        ball.slowFrames = 0;
        if (MODE.onRest) MODE.onRest();
        _logBall('rest');
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

      // Check out of bounds
      if (MODE.isOOB()) {
        state = STATE_OOB;
        transitionTimer = 0;
        break;
      }

      // Ball came to rest naturally via physics
      if (ball.atRest) {
        const goal = MODE.isGoalReached();
        if (goal) {
          MODE.onGoalReached(goal);
          state = STATE_PAUSE;
          transitionTimer = 0;
        } else if (MODE.isOOB()) {
          state = STATE_OOB;
          transitionTimer = 0;
        } else {
          state = STATE_AIM;
        }
      }

      if (MODE.updateCamera) MODE.updateCamera();
      break;

    case STATE_OOB:
      // Ball went off screen — wait then respawn
      transitionTimer++;
      if (transitionTimer >= OOB_PAUSE) {
        MODE.onOOB();
        state = STATE_AIM;
        _logBall('oob-respawn');
      }
      if (MODE.updateCamera) MODE.updateCamera();
      break;

    case STATE_PAUSE:
      // Ball in cup — wait before starting transition
      transitionTimer++;
      if (transitionTimer >= TRANSITION_PAUSE) {
        totalStrokes += strokes;
        MODE.onTransitionStart();

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

      // Camera pan (axis-agnostic)
      MODE.setCameraPos(transitionCamStart + (transitionCamEnd - transitionCamStart) * ease);

      // Cup fill + flag fade during pan (shared timing, mode provides cup data)
      const cupData = MODE.getTransitionCupData ? MODE.getTransitionCupData() : null;
      if (cupData) {
        const fillStart = 0.3, fillEnd = 0.9;
        if (t >= fillStart) {
          cupData.cupFillProgress = Math.min(1, (t - fillStart) / (fillEnd - fillStart));
        }

        const fadeStart = 0.3, fadeEnd = 0.7;
        if (t >= fadeStart) {
          cupData.flagOpacity = Math.max(0, 1 - (t - fadeStart) / (fadeEnd - fadeStart));
        }

        // Ball rises with sand fill
        const topRim = Math.min(cupData.cupLeftY, cupData.cupRightY);
        const fillTopY = cupData.cupBottomY + (topRim - cupData.cupBottomY) * cupData.cupFillProgress;
        ball.y = fillTopY - BALL_RADIUS;
      }

      if (MODE.onTransitionUpdate) MODE.onTransitionUpdate(ease, t);

      // Done — pan complete
      if (transitionTimer >= TRANSITION_PAN) {
        MODE.onTransitionEnd();
        ball.atRest = true;
        ball.vx = 0;
        ball.vy = 0;
        state = STATE_AIM;
        _logBall('transition-end-tee');
      }
      break;
    }
  }
}
