// ── Display Setup ──────────────────────────────────────────
function resizeDisplay() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Fill entire viewport, scale uniformly based on height
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';

  displayScale = canvas.height / H;
  W = Math.round(vw * dpr / displayScale); // game units visible horizontally
}

window.addEventListener('resize', resizeDisplay);
resizeDisplay();

// ── Sand Particle System ──────────────────────────────────
const _particles = [];
const _PARTICLE_MAX = 60;

function spawnSandParticles(x, y, impactSpeed) {
  const count = Math.min(Math.floor(impactSpeed * 3), 12);
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI * Math.random(); // upward half-circle
    const speed = impactSpeed * randRange(0.3, 0.8);
    _particles.push({
      x, y,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 0.5,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: randRange(0.015, 0.035),
      size: randRange(1.2, 2.8)
    });
  }
  // Cap total particles
  while (_particles.length > _PARTICLE_MAX) _particles.shift();
}

function updateParticles() {
  for (let i = _particles.length - 1; i >= 0; i--) {
    const p = _particles[i];
    p.vy += GRAVITY * 0.6;
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) _particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of _particles) {
    const sx = p.x - camera.x;
    const sy = p.y;
    if (sx < -10 || sx > W + 10) continue;
    const alpha = p.life * 0.7;
    ctx.fillStyle = 'rgba(180, 140, 80, ' + alpha + ')';
    ctx.beginPath();
    ctx.arc(sx, sy, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Palette Progression ───────────────────────────────────
// Subtle color shifts every few holes — warm sunrise to deeper sunset
function getHolePalette(holeNum) {
  // Cycle through subtle palette shifts over 40 holes, then repeat
  const t = (holeNum % 40) / 40;
  // Interpolate sky hue: warm sand → golden → amber → dusty rose → back
  const skyR = Math.round(213 + t * 15 * Math.sin(t * Math.PI * 2));
  const skyG = Math.round(173 - t * 20 * Math.abs(Math.sin(t * Math.PI * 2)));
  const skyB = Math.round(114 - t * 25 * Math.sin(t * Math.PI));
  const groundR = Math.round(214 + t * 10 * Math.sin(t * Math.PI * 2));
  const groundG = Math.round(136 - t * 15 * Math.abs(Math.sin(t * Math.PI * 2)));
  const groundB = Math.round(65 - t * 10 * Math.sin(t * Math.PI));
  return {
    sky: 'rgb(' + Math.max(180,Math.min(240,skyR)) + ',' + Math.max(140,Math.min(200,skyG)) + ',' + Math.max(80,Math.min(140,skyB)) + ')',
    skyTop: 'rgb(' + Math.max(160,Math.min(220,skyR-20)) + ',' + Math.max(120,Math.min(180,skyG-15)) + ',' + Math.max(60,Math.min(120,skyB-10)) + ')',
    ground: 'rgb(' + Math.max(180,Math.min(240,groundR)) + ',' + Math.max(110,Math.min(160,groundG)) + ',' + Math.max(40,Math.min(90,groundB)) + ')'
  };
}

// ── Flag Animation ────────────────────────────────────────
let _flagFrame = 0;

// ── Drawing ────────────────────────────────────────────────
function drawSky() {
  const palette = getHolePalette(currentHole);
  // Vertical gradient: slightly darker at top, lighter at horizon
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, palette.skyTop);
  grad.addColorStop(0.85, palette.sky);
  grad.addColorStop(1, palette.sky);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawTerrain() {
  const palette = getHolePalette(currentHole);
  ctx.fillStyle = palette.ground;
  ctx.beginPath();

  const startX = camera.x - 50;
  const endX   = camera.x + W + 50;

  let started = false;
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    if (v.x < startX - 100 && i < vertices.length - 1 && vertices[i + 1].x < startX - 100) continue;
    if (v.x > endX + 100) {
      const sx = v.x - camera.x;
      const sy = v.y;
      if (!started) { ctx.moveTo(sx, sy); started = true; }
      else ctx.lineTo(sx, sy);
      break;
    }

    const sx = v.x - camera.x;
    const sy = v.y;
    if (!started) { ctx.moveTo(sx, sy); started = true; }
    else ctx.lineTo(sx, sy);
  }

  ctx.lineTo(endX - camera.x + 100, H + 10);
  ctx.lineTo(startX - camera.x - 100, H + 10);
  ctx.closePath();
  ctx.fill();
}

function drawCup(hole) {
  const halfW = CUP_WIDTH / 2;
  const leftX = hole.cupX - halfW;
  const rightX = hole.cupX + halfW;
  const rimY = hole.cupY;
  const sx1 = leftX - camera.x;
  const sx2 = rightX - camera.x;

  // Cup indent highlight — light line along the inside rim for depth
  if (!hole.cupFilled) {
    ctx.strokeStyle = GROUND_LIGHT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx1 + 2, rimY + 1);
    ctx.lineTo(sx2 - 2, rimY + 1);
    ctx.stroke();
  }

  // During transition: draw terrain-colored fill rising from cup bottom
  if (!hole.cupFillProgress || hole.cupFillProgress <= 0) return;

  let bottomY = rimY + CUP_DEPTH;
  const fillTopY = bottomY + (rimY - bottomY) * hole.cupFillProgress;

  const palette = getHolePalette(currentHole);
  ctx.fillStyle = palette.ground;
  ctx.fillRect(sx1, fillTopY, sx2 - sx1, bottomY - fillTopY + 2);
}

function drawFlag(hole) {
  if (!hole.flagVisible) return;

  const opacity = hole.flagOpacity !== undefined ? hole.flagOpacity : 1;
  if (opacity <= 0) return;

  const poleWorldX = hole.cupX + CUP_WIDTH / 2 + 2;
  const sx = poleWorldX - camera.x;
  const sy = terrainYAt(poleWorldX);

  ctx.globalAlpha = opacity;

  // Pole
  const poleH = 55;
  ctx.strokeStyle = '#7888a0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - poleH);
  ctx.stroke();

  // Pennant with gentle waving animation
  _flagFrame++;
  const wave = Math.sin(_flagFrame * 0.04) * 2.5; // subtle sway
  const wave2 = Math.sin(_flagFrame * 0.04 + 1) * 1.5;

  const pTop = sy - poleH;
  const pBot = sy - poleH + 16;
  const pMid = (pTop + pBot) / 2;
  const bodyW = 22;
  const pointW = 10;
  ctx.fillStyle = '#e8c840';
  ctx.beginPath();
  ctx.moveTo(sx, pTop);
  ctx.lineTo(sx + bodyW + wave2, pTop + wave * 0.3);
  ctx.lineTo(sx + bodyW + pointW + wave, pMid + wave * 0.5);
  ctx.lineTo(sx + bodyW + wave2, pBot + wave * 0.3);
  ctx.lineTo(sx, pBot);
  ctx.closePath();
  ctx.fill();

  // Hole number on pennant body
  ctx.fillStyle = '#4a3520';
  ctx.font = '10px Silkscreen, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(hole.flagHole), sx + bodyW / 2 + wave2 * 0.3, pMid + 4 + wave * 0.2);

  ctx.globalAlpha = 1;
}

function drawTeeMarker(hole) {
  const sx = hole.teeX - camera.x;
  const sy = (state === STATE_TRANSITION || state === STATE_PAUSE)
    ? ball.y + BALL_RADIUS
    : hole.teeY;

  ctx.fillStyle = TEE_COLOR;
  ctx.fillRect(sx - TEE_WIDTH / 2, sy - TEE_HEIGHT / 2, TEE_WIDTH, TEE_HEIGHT);
}

function drawBall() {
  const sx = ball.x - camera.x;
  const sy = ball.y;
  if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) return;

  // Squash effect on ground contact (ball slightly wider, shorter)
  let rx = BALL_RADIUS, ry = BALL_RADIUS;
  if (ball.onGround && !ball.atRest) {
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const squash = Math.min(speed * 0.08, 0.3);
    rx = BALL_RADIUS * (1 + squash);
    ry = BALL_RADIUS * (1 - squash * 0.5);
  }

  ctx.fillStyle = BALL_COLOR;
  ctx.beginPath();
  ctx.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawAimUI() {
  if (!aiming || state !== STATE_AIM) return;

  const dx = aimCurrentX - aimStartX;
  const dy = aimCurrentY - aimStartY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 5) return;

  const nx = dx / dist;
  const ny = dy / dist;

  // Power ratio for color/thickness feedback
  const power = Math.min(dist * POWER_SCALE, MAX_POWER);
  const powerRatio = power / MAX_POWER; // 0-1

  // 1. Faded circle at drag start point
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(aimStartX, aimStartY, 8, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Launch line — color shifts from white to warm yellow/red at high power
  const launchEndX = aimStartX - dx;
  const launchEndY = aimStartY - dy;
  const r = Math.round(255);
  const g = Math.round(255 - powerRatio * 100);
  const b = Math.round(255 - powerRatio * 200);
  ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ', 0.85)';
  ctx.lineWidth = 2 + powerRatio * 2; // thicker at high power
  ctx.beginPath();
  ctx.moveTo(aimStartX, aimStartY);
  ctx.lineTo(launchEndX, launchEndY);
  ctx.stroke();

  // 3. Arrowhead at launch end
  const arrowLen = 10;
  const arrowAngle = 0.45;
  const launchAngle = Math.atan2(-dy, -dx);
  ctx.beginPath();
  ctx.moveTo(launchEndX, launchEndY);
  ctx.lineTo(
    launchEndX - arrowLen * Math.cos(launchAngle - arrowAngle),
    launchEndY - arrowLen * Math.sin(launchAngle - arrowAngle)
  );
  ctx.moveTo(launchEndX, launchEndY);
  ctx.lineTo(
    launchEndX - arrowLen * Math.cos(launchAngle + arrowAngle),
    launchEndY - arrowLen * Math.sin(launchAngle + arrowAngle)
  );
  ctx.stroke();

  // 4. Dark dots extending in drag direction
  const dotSpacing = 10;
  const numDots = Math.min(Math.floor(dist / dotSpacing), 15);
  ctx.fillStyle = 'rgba(80, 70, 55, 0.5)';
  for (let i = 1; i <= numDots; i++) {
    const dotX = aimStartX + nx * i * dotSpacing;
    const dotY = aimStartY + ny * i * dotSpacing;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHUD() {
  const hole = holes[currentHole];
  if (!hole) return;

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '26px VT323, Silkscreen, monospace';

  if (totalStrokes > 0) {
    ctx.fillText(String(totalStrokes), W / 2 - 40, 30);
  }

  if (strokes > 0) {
    ctx.fillText('+' + strokes, W / 2 + 40, 30);
  }

  if (showTitle && currentHole === 0) {
    ctx.font = '32px VT323, Silkscreen, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Desert\u2014Golfing', 20, 38);
  }
}

// ── Draw Orchestrator ──────────────────────────────────────
function draw() {
  ctx.save();
  ctx.scale(displayScale, displayScale);

  // Update particles each frame
  updateParticles();

  drawSky();
  drawTerrain();

  // Draw only current hole elements (+ previous during transition)
  if (state === STATE_TRANSITION && currentHole > 0) {
    const prevHole = holes[currentHole - 1];
    drawCup(prevHole);
    drawFlag(prevHole);
  }

  const curHole = holes[currentHole];
  if (curHole) {
    drawCup(curHole);
    drawFlag(curHole);
    drawTeeMarker(curHole);
  }

  drawParticles();
  drawBall();
  drawAimUI();
  drawHUD();

  ctx.restore();
}
