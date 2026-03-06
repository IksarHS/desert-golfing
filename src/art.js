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

// ── Shared Drawing Utilities ──────────────────────────────
// These work on any object with the cup data interface:
//   cupLeftX, cupRightX, cupLeftY, cupRightY, cupBottomY,
//   cupWallInset, cupFillProgress, flagVisible, flagOpacity, flagHole/index

function drawCupFill(cupData) {
  // Draw sand filling a cup — works in world coords (camera transform already applied)
  if (!cupData.cupFillProgress || cupData.cupFillProgress <= 0) return;

  const leftX = cupData.cupLeftX;
  const rightX = cupData.cupRightX;
  const leftY = cupData.cupLeftY;
  const rightY = cupData.cupRightY;
  const bottomY = cupData.cupBottomY;
  const wallInset = cupData.cupWallInset;
  const blX = leftX + wallInset;   // bottom-left x
  const brX = rightX - wallInset;  // bottom-right x

  // Fill level: rises from bottomY (empty) up to the higher rim (full)
  const topRim = Math.min(leftY, rightY);
  const fillTopY = bottomY + (topRim - bottomY) * cupData.cupFillProgress;

  if (fillTopY >= bottomY) return;

  // Find where fillTopY intersects the left wall
  let flx;
  if (fillTopY <= leftY) {
    flx = leftX;
  } else {
    const t = (bottomY - fillTopY) / (bottomY - leftY);
    flx = blX + (leftX - blX) * t;
  }

  // Find where fillTopY intersects the right wall
  let frx;
  if (fillTopY <= rightY) {
    frx = rightX;
  } else {
    const t = (bottomY - fillTopY) / (bottomY - rightY);
    frx = brX + (rightX - brX) * t;
  }

  // Draw fill polygon — overdraw by 1px to cover sub-pixel gaps
  const overdraw = 1;
  ctx.fillStyle = GROUND;
  ctx.beginPath();
  ctx.moveTo(flx - overdraw, fillTopY);
  ctx.lineTo(blX - overdraw, bottomY + overdraw);
  ctx.lineTo(brX + overdraw, bottomY + overdraw);
  ctx.lineTo(frx + overdraw, fillTopY);
  ctx.closePath();
  ctx.fill();
}

function drawFlag(cupData, surfaceYFn) {
  // Draw flag pole + pennant — works in world coords
  // surfaceYFn(x): returns terrain/platform Y at world x (for pole base)
  if (!cupData.flagVisible) return;

  const opacity = cupData.flagOpacity !== undefined ? cupData.flagOpacity : 1;
  if (opacity <= 0) return;

  const cupW = cupData.cupRightX - cupData.cupLeftX;
  const poleWorldX = cupData.cupLeftX + cupW + 2;
  const sy = surfaceYFn ? surfaceYFn(poleWorldX) : cupData.cupY;

  ctx.globalAlpha = opacity;

  // Pole
  const poleH = 55;
  ctx.strokeStyle = '#7888a0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(poleWorldX, sy);
  ctx.lineTo(poleWorldX, sy - poleH);
  ctx.stroke();

  // Pennant (pentagon — rectangle body + triangular point right)
  const pTop = sy - poleH;
  const pBot = sy - poleH + 16;
  const pMid = (pTop + pBot) / 2;
  const bodyW = 22;
  const pointW = 10;
  ctx.fillStyle = '#e8c840';
  ctx.beginPath();
  ctx.moveTo(poleWorldX, pTop);
  ctx.lineTo(poleWorldX + bodyW, pTop);
  ctx.lineTo(poleWorldX + bodyW + pointW, pMid);
  ctx.lineTo(poleWorldX + bodyW, pBot);
  ctx.lineTo(poleWorldX, pBot);
  ctx.closePath();
  ctx.fill();

  // Hole number on pennant body
  const holeNum = cupData.flagHole !== undefined ? cupData.flagHole : (cupData.index !== undefined ? cupData.index + 1 : '');
  ctx.fillStyle = '#4a3520';
  ctx.font = '10px Silkscreen, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(holeNum), poleWorldX + bodyW / 2, pMid + 4);

  ctx.globalAlpha = 1;
}

function drawBall() {
  // Draw ball in world coords (camera transform already applied)
  ctx.fillStyle = BALL_COLOR;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
}

function drawAimUI() {
  // Draw aim indicator in screen space (no camera transform)
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

function drawStrokeCounter() {
  // Shared stroke HUD — screen space
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '26px VT323, Silkscreen, monospace';

  if (totalStrokes > 0) {
    ctx.fillText(String(totalStrokes), W / 2 - 40, 30);
  }

  if (strokes > 0) {
    ctx.fillText('+' + strokes, W / 2 + 40, 30);
  }
}

// ── Draw Orchestrator ──────────────────────────────────────
function draw() {
  ctx.save();
  ctx.scale(displayScale, displayScale);

  // Sky (screen space)
  MODE.drawSky(ctx);

  // World space
  ctx.save();
  MODE.applyCameraTransform(ctx);
  MODE.drawWorld(ctx);
  drawBall();
  ctx.restore();

  // Screen space: aim UI + HUD
  drawAimUI();
  drawStrokeCounter();
  MODE.drawHUD(ctx);

  ctx.restore();
}
