// ── Debug Ball Tracker ────────────────────────────────────
// Override the no-op _logBall from shared.js with real implementation
// Records every ball position change with reason. Open console and type:
//   ballLog()        — print last 60 entries
//   ballLog(200)     — print last 200 entries
//   ballLogFull()    — dump entire log
//   ballLogClear()   — clear log

_logBall = function(reason) {
  _ballLog.push({
    f: _ballLogFrame,
    reason,
    x: +ball.x.toFixed(2),
    y: +ball.y.toFixed(2),
    vx: +ball.vx.toFixed(3),
    vy: +ball.vy.toFixed(3),
    rest: ball.atRest,
    ground: ball.onGround,
    state: ['AIM','FLIGHT','PAUSE','TRANSITION','OOB'][state]
  });
  if (_ballLog.length > _BALL_LOG_MAX) _ballLog.splice(0, _ballLog.length - _BALL_LOG_MAX);
};

window.ballLog = function(n) {
  n = n || 60;
  const entries = _ballLog.slice(-n);
  console.table(entries);
  return entries.length + ' entries shown (of ' + _ballLog.length + ' total)';
};
window.ballLogFull = function() { console.table(_ballLog); return _ballLog.length + ' entries'; };
window.ballLogClear = function() { _ballLog.length = 0; return 'cleared'; };

// ── In-Game Debug Panels (press ~ to cycle: off -> settings -> ball log -> off)
// _debugMode: 0=off, 1=physics settings, 2=ball log
let _debugMode = 0;
const _settings = [
  { label: 'Gravity',          get: () => GRAVITY,          set: v => GRAVITY = v,          min: 0.02, max: 0.6,  step: 0.01 },
  { label: 'Restitution',      get: () => RESTITUTION,      set: v => RESTITUTION = v,      min: 0,    max: 0.9,  step: 0.05 },
  { label: 'Roll Friction',    get: () => ROLLING_FRICTION,  set: v => ROLLING_FRICTION = v, min: 0.98, max: 1.0,  step: 0.001 },
  { label: 'Surface Friction', get: () => SURFACE_FRICTION,  set: v => SURFACE_FRICTION = v, min: 0.002, max: 0.05, step: 0.002 },
  { label: 'Power Scale',      get: () => POWER_SCALE,      set: v => POWER_SCALE = v,      min: 0.02, max: 0.3,  step: 0.01 },
  { label: 'Max Power',        get: () => MAX_POWER,        set: v => MAX_POWER = v,        min: 4,    max: 30,   step: 1 },
  { label: 'Bounce Absorb',    get: () => BOUNCE_THRESHOLD, set: v => BOUNCE_THRESHOLD = v, min: 0.1,  max: 2.0,  step: 0.1 },
  { label: 'Ball Radius',      get: () => BALL_RADIUS,      set: v => BALL_RADIUS = v,      min: 3,    max: 12,   step: 1 },
];
let _selectedSetting = 0;

window.addEventListener('keydown', (e) => {
  if (e.key === '`' || e.key === '~') {
    _debugMode = (_debugMode + 1) % 3;
    e.preventDefault();
    return;
  }
  if (_debugMode !== 1) return; // arrow keys only for settings panel

  if (e.key === 'ArrowUp')   { _selectedSetting = (_selectedSetting - 1 + _settings.length) % _settings.length; e.preventDefault(); }
  if (e.key === 'ArrowDown') { _selectedSetting = (_selectedSetting + 1) % _settings.length; e.preventDefault(); }
  if (e.key === 'ArrowLeft') {
    const s = _settings[_selectedSetting];
    s.set(Math.max(s.min, +(s.get() - s.step).toFixed(4)));
    e.preventDefault();
  }
  if (e.key === 'ArrowRight') {
    const s = _settings[_selectedSetting];
    s.set(Math.min(s.max, +(s.get() + s.step).toFixed(4)));
    e.preventDefault();
  }
});

function drawSettingsPanel() {
  const panelW = 280, panelH = 24 + _settings.length * 26;
  const px = 10, py = 60;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(px, py, panelW, panelH);

  ctx.fillStyle = '#ffcc00';
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Physics Settings (\u2191\u2193 select, \u2190\u2192 adjust)', px + 8, py + 16);

  for (let i = 0; i < _settings.length; i++) {
    const s = _settings[i];
    const y = py + 38 + i * 26;
    const selected = i === _selectedSetting;

    ctx.fillStyle = selected ? '#ffcc00' : '#ffffff';
    ctx.font = selected ? 'bold 13px monospace' : '13px monospace';
    const val = s.get();
    const valStr = Number.isInteger(s.step) ? val.toFixed(0) : val.toFixed(3);
    ctx.fillText((selected ? '\u25b8 ' : '  ') + s.label, px + 8, y);
    ctx.fillText(valStr, px + 180, y);

    const barX = px + 220, barW = 50, barH = 6, barY = y - 5;
    const pct = (val - s.min) / (s.max - s.min);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = selected ? '#ffcc00' : '#88aacc';
    ctx.fillRect(barX, barY, barW * pct, barH);
  }
}

function drawBallLog() {
  const maxRows = 20;
  const entries = _ballLog.slice(-maxRows);
  if (entries.length === 0) return;

  const lineH = 15;
  const panelW = 700, panelH = 20 + entries.length * lineH + 4;
  const px = 10, py = 60;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(px, py, panelW, panelH);

  ctx.fillStyle = '#ffcc00';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Ball Log (last ' + entries.length + ' of ' + _ballLog.length + ')  ~:cycle', px + 8, py + 13);

  // Column header
  const headerY = py + 26;
  ctx.fillStyle = '#888';
  ctx.fillText('frame  reason             x        y       vx       vy     rest  grnd  state', px + 8, headerY);

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const y = headerY + (i + 1) * lineH;

    // Color by reason
    if (e.reason === 'shot') ctx.fillStyle = '#66ff66';
    else if (e.reason === 'oob-respawn') ctx.fillStyle = '#ff6666';
    else if (e.reason.startsWith('rest')) ctx.fillStyle = '#66ccff';
    else if (e.reason.startsWith('transition')) ctx.fillStyle = '#cc88ff';
    else if (e.reason === 'collision') ctx.fillStyle = '#ffaa44';
    else ctx.fillStyle = '#aaaaaa';

    const line =
      String(e.f).padStart(5) + '  ' +
      e.reason.padEnd(18) +
      String(e.x).padStart(8) +
      String(e.y).padStart(9) +
      String(e.vx).padStart(9) +
      String(e.vy).padStart(9) +
      (e.rest ? '    \u2713' : '     ').padEnd(6) +
      (e.ground ? '   \u2713' : '    ').padEnd(6) +
      e.state;
    ctx.fillText(line, px + 8, y);
  }
}

// ── Debug: Skip to Hole ──────────────────────────────────
// Usage: skipToHole(5)  — jump to hole 5 (1-based)
window.skipToHole = function(holeNum) {
  const targetIndex = holeNum - 1;
  // Generate holes up to target
  for (let i = holes.length; i <= targetIndex; i++) {
    generateHoleTerrain(i);
    holes[i].flagVisible = true;
  }
  // Fill all previous cups
  for (let i = 0; i < targetIndex; i++) {
    holes[i].cupFilled = true;
    holes[i].cupFillProgress = 1;
    holes[i].flagVisible = false;
    holes[i].flagOpacity = 0;
    flattenCup(holes[i]);
  }
  currentHole = targetIndex;
  const hole = holes[currentHole];
  ball.x = hole.teeX;
  ball.y = terrainYAt(hole.teeX) - BALL_RADIUS;
  ball.vx = 0;
  ball.vy = 0;
  ball.atRest = true;
  ball.onGround = false;
  ball.spinRate = 0;
  ball.rotation = 0;
  setHoleCamera(hole);
  state = STATE_AIM;
  showTitle = false;
  console.log('Skipped to hole ' + holeNum + ' (index ' + targetIndex + ')');
};

// ── Cheat: Auto-sink (N key) ─────────────────────────────
// Drops the ball directly into the current hole's cup.
// Triggers the natural transition animation.
window.addEventListener('keydown', (e) => {
  if (e.key === 'n' || e.key === 'N') {
    if (state !== STATE_AIM && state !== STATE_FLIGHT) return;
    const hole = holes[currentHole];
    if (!hole) return;
    // Place ball just above the cup center and give it a tiny downward velocity
    ball.x = hole.cupX;
    ball.y = hole.cupY - BALL_RADIUS - 2;
    ball.vx = 0;
    ball.vy = 0.5;
    ball.atRest = false;
    ball.onGround = false;
    state = STATE_FLIGHT;
    strokes++;
    totalStrokes++;
    e.preventDefault();
  }
});

// ── Cheat: Bouncy Ball (B key) ───────────────────────────
// Toggles bouncy mode — ball bounces off screen edges instead of going OOB.
let ballMode = 'normal'; // 'normal' or 'bouncy'
const BOUNCY_BALL_COLOR = '#ffcc44';

window.addEventListener('keydown', (e) => {
  if (e.key === 'b' || e.key === 'B') {
    ballMode = ballMode === 'normal' ? 'bouncy' : 'normal';
    console.log('Ball mode:', ballMode);
    e.preventDefault();
  }
});

// Screen edge collision for bouncy mode
function collideWithScreenEdges() {
  if (ballMode !== 'bouncy') return false;
  let collided = false;
  const rest = MATERIALS.sand.restitution;
  const sx = ball.x - camera.x; // screen-space X

  // Left wall
  if (sx < BALL_RADIUS) {
    ball.x = camera.x + BALL_RADIUS;
    if (ball.vx < 0) ball.vx = -ball.vx * rest;
    collided = true;
  }
  // Right wall
  if (sx > W - BALL_RADIUS) {
    ball.x = camera.x + W - BALL_RADIUS;
    if (ball.vx > 0) ball.vx = -ball.vx * rest;
    collided = true;
  }
  // Top wall
  if (ball.y < BALL_RADIUS) {
    ball.y = BALL_RADIUS;
    if (ball.vy < 0) ball.vy = -ball.vy * rest;
    collided = true;
  }
  // Bottom wall
  if (ball.y > H - BALL_RADIUS) {
    ball.y = H - BALL_RADIUS;
    if (ball.vy > 0) ball.vy = -ball.vy * rest;
    collided = true;
  }
  return collided;
}

// Patch MODE.collide to include screen edges in bouncy mode
const _origCollide = MODE.collide.bind(MODE);
MODE.collide = function() {
  const hit = _origCollide();
  const edgeHit = collideWithScreenEdges();
  return hit || edgeHit;
};

// Patch MODE.isOOB to prevent OOB in bouncy mode
const _origIsOOB = MODE.isOOB.bind(MODE);
MODE.isOOB = function() {
  if (ballMode === 'bouncy') return false;
  return _origIsOOB();
};

// Patch drawBall for bouncy mode visual
const _origDrawBall = drawBall;
drawBall = function() {
  if (ballMode === 'bouncy') {
    // Golden glow ring
    ctx.strokeStyle = 'rgba(255, 204, 68, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS + 2, 0, Math.PI * 2);
    ctx.stroke();
    // Draw golden ball directly instead of modifying BALL_COLOR (it's const)
    ctx.fillStyle = BOUNCY_BALL_COLOR;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    // Draw rotation dots
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation || 0);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    const dotDist = BALL_RADIUS * 0.55;
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * dotDist, Math.sin(angle) * dotDist, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    _origDrawBall();
  }
};

// ── Cheat: Show Collision Lines (C key) ──────────────────
let _showCollisionLines = false;

window.addEventListener('keydown', (e) => {
  if (e.key === 'c' || e.key === 'C') {
    _showCollisionLines = !_showCollisionLines;
    console.log('Collision lines:', _showCollisionLines ? 'ON' : 'OFF');
    e.preventDefault();
  }
});

function drawCollisionLines() {
  const startX = camera.x - 50;
  const endX = camera.x + W + 50;

  // Terrain collision line (red)
  ctx.strokeStyle = 'rgba(255, 40, 40, 0.7)';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < vertices.length; i++) {
    if (vertices[i].x < startX - 100) continue;
    if (vertices[i].x > endX + 100) break;
    if (!started) {
      ctx.moveTo(vertices[i].x, vertices[i].y);
      started = true;
    } else {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
  }
  ctx.stroke();

  // Terrain vertex dots
  ctx.fillStyle = 'rgba(255, 40, 40, 0.9)';
  for (let i = 0; i < vertices.length; i++) {
    if (vertices[i].x < startX - 100) continue;
    if (vertices[i].x > endX + 100) break;
    ctx.beginPath();
    ctx.arc(vertices[i].x, vertices[i].y, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Object collision outlines (blue)
  if (typeof objects !== 'undefined') {
    ctx.strokeStyle = 'rgba(40, 120, 255, 0.8)';
    ctx.lineWidth = 2;
    for (const obj of objects) {
      if (!obj.verts || obj.verts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(obj.verts[0].x, obj.verts[0].y);
      for (let i = 1; i < obj.verts.length; i++) {
        ctx.lineTo(obj.verts[i].x, obj.verts[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

}

// Patch draw to include debug overlays + bouncy HUD + collision lines
const _origDraw = draw;
draw = function() {
  _origDraw();
  ctx.save();
  ctx.scale(displayScale, displayScale);

  // Collision lines (drawn in world space, need camera transform)
  if (_showCollisionLines) {
    ctx.save();
    MODE.applyCameraTransform(ctx);
    drawCollisionLines();
    ctx.restore();
  }

  // Bouncy mode indicator
  if (ballMode === 'bouncy') {
    ctx.fillStyle = 'rgba(255, 204, 68, 0.7)';
    ctx.font = '11px "Departure Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('BOUNCY [B]', W - 10, 20);
  }
  // Collision label (screen space)
  if (_showCollisionLines) {
    ctx.fillStyle = 'rgba(255, 40, 40, 0.7)';
    ctx.font = '11px "Departure Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('COLLISION [C]', W - 10, ballMode === 'bouncy' ? 35 : 20);
  }
  // Debug panels
  if (_debugMode > 0) {
    if (_debugMode === 1) drawSettingsPanel();
    else if (_debugMode === 2) drawBallLog();
  }
  ctx.restore();
};
