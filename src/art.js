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

// ── Drawing ────────────────────────────────────────────────
function drawSky() {
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, W, H);
}

function drawTerrain() {
  ctx.fillStyle = GROUND;
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
  // During transition: draw terrain-colored fill rising from cup bottom
  if (!hole.cupFillProgress || hole.cupFillProgress <= 0) return;

  const leftX = hole.cupLeftX;
  const rightX = hole.cupRightX;
  const leftY = hole.cupLeftY;
  const rightY = hole.cupRightY;
  const bottomY = hole.cupBottomY;
  const wallInset = hole.cupWallInset;
  const blX = leftX + wallInset;   // bottom-left x
  const brX = rightX - wallInset;  // bottom-right x

  // Fill level: rises from bottomY (empty) up to the higher rim (full)
  const topRim = Math.min(leftY, rightY); // highest rim point (smallest Y)
  const fillTopY = bottomY + (topRim - bottomY) * hole.cupFillProgress;

  if (fillTopY >= bottomY) return; // nothing to fill yet

  // Find where fillTopY intersects the left wall: (leftX,leftY) -> (blX,bottomY)
  let flx;
  if (fillTopY <= leftY) {
    flx = leftX; // fill is above left rim
  } else {
    const t = (bottomY - fillTopY) / (bottomY - leftY);
    flx = blX + (leftX - blX) * t;
  }

  // Find where fillTopY intersects the right wall: (rightX,rightY) -> (brX,bottomY)
  let frx;
  if (fillTopY <= rightY) {
    frx = rightX; // fill is above right rim
  } else {
    const t = (bottomY - fillTopY) / (bottomY - rightY);
    frx = brX + (rightX - brX) * t;
  }

  // Draw fill polygon matching the cup geometry — overdraw by 1px on each side
  // to cover any sub-pixel gaps between this fill and the terrain path
  const overdraw = 1;
  ctx.fillStyle = GROUND;
  ctx.beginPath();
  ctx.moveTo(flx - camera.x - overdraw, fillTopY);
  ctx.lineTo(blX - camera.x - overdraw, bottomY + overdraw);
  ctx.lineTo(brX - camera.x + overdraw, bottomY + overdraw);
  ctx.lineTo(frx - camera.x + overdraw, fillTopY);
  ctx.closePath();
  ctx.fill();
}

function drawFlag(hole) {
  if (!hole.flagVisible) return;

  const opacity = hole.flagOpacity !== undefined ? hole.flagOpacity : 1;
  if (opacity <= 0) return;

  // Flag pole planted just barely to the right of the cup, flush with ground
  const poleWorldX = hole.cupX + CUP_WIDTH / 2 + 2;
  const sx = poleWorldX - camera.x;
  const sy = terrainYAt(poleWorldX);

  ctx.globalAlpha = opacity;

  // Pole — tall enough to be clearly visible
  const poleH = 55;
  ctx.strokeStyle = '#7888a0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - poleH);
  ctx.stroke();

  // Pennant (pentagon — rectangle body + triangular point right)
  const pTop = sy - poleH;
  const pBot = sy - poleH + 16;
  const pMid = (pTop + pBot) / 2;
  const bodyW = 22;
  const pointW = 10;
  ctx.fillStyle = '#e8c840';
  ctx.beginPath();
  ctx.moveTo(sx, pTop);
  ctx.lineTo(sx + bodyW, pTop);
  ctx.lineTo(sx + bodyW + pointW, pMid);
  ctx.lineTo(sx + bodyW, pBot);
  ctx.lineTo(sx, pBot);
  ctx.closePath();
  ctx.fill();

  // Hole number on pennant body
  ctx.fillStyle = '#4a3520';
  ctx.font = '10px Silkscreen, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(hole.flagHole), sx + bodyW / 2, pMid + 4);

  ctx.globalAlpha = 1;
}

function drawBall() {
  // Don't draw ball if it's off-screen (out of bounds)
  const sx = ball.x - camera.x;
  const sy = ball.y;
  if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) return;

  ctx.fillStyle = BALL_COLOR;
  ctx.beginPath();
  ctx.arc(sx, sy, BALL_RADIUS, 0, Math.PI * 2);
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

  // 1. Faded circle at drag start point
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(aimStartX, aimStartY, 8, 0, Math.PI * 2);
  ctx.stroke();

  // 2. White line from drag start in LAUNCH direction (opposite of drag)
  const launchEndX = aimStartX - dx;
  const launchEndY = aimStartY - dy;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(aimStartX, aimStartY);
  ctx.lineTo(launchEndX, launchEndY);
  ctx.stroke();

  // 3. Arrowhead at launch end (pointing in launch direction)
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

  // 4. Dark dots extending in DRAG direction (toward cursor)
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

  // Total strokes (from previous holes) — shown centered-left
  if (totalStrokes > 0) {
    ctx.fillText(String(totalStrokes), W / 2 - 40, 30);
  }

  // Current hole strokes — shown centered-right (only when > 0)
  if (strokes > 0) {
    ctx.fillText('+' + strokes, W / 2 + 40, 30);
  }

  // Title on first hole — pixel font
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

  drawSky();
  drawTerrain();

  // Draw only current hole elements (+ previous during transition)
  if (state === STATE_TRANSITION && currentHole > 0) {
    const prevHole = holes[currentHole - 1];
    drawCup(prevHole);
    drawFlag(prevHole); // fading out during transition
  }

  const curHole = holes[currentHole];
  if (curHole) {
    drawCup(curHole);
    drawFlag(curHole);
  }

  drawBall();
  drawAimUI();
  drawHUD();

  ctx.restore();
}
