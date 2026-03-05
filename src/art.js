// ── Palette System ────────────────────────────────────────
const _palettes = [
  {
    name: 'Desert Warm',
    skyTop: [215, 165, 95],
    sky: [228, 178, 125],
    ground: [140, 80, 45],
    groundLight: [170, 105, 60],
    dune1: [210, 165, 110],
    dune2: [185, 135, 85],
    dune3: [160, 108, 65],
    sun: [255, 245, 200],
    sunGlow: [255, 225, 150],
    cloud: [255, 255, 255, 0.35],
    flagPole: '#7888a0',
    flagColor: '#e8c840',
    flagText: '#4a3520',
  },
  {
    name: 'Blue Night',
    skyTop: [25, 30, 65],
    sky: [40, 55, 110],
    ground: [20, 22, 50],
    groundLight: [35, 40, 75],
    dune1: [55, 75, 140],
    dune2: [42, 58, 115],
    dune3: [30, 40, 80],
    sun: [230, 235, 255],
    sunGlow: [150, 170, 230],
    cloud: [120, 150, 210, 0.25],
    flagPole: '#6678a8',
    flagColor: '#e8a030',
    flagText: '#2a2040',
  },
  {
    name: 'Sunset',
    skyTop: [60, 25, 70],
    sky: [180, 80, 60],
    ground: [55, 25, 35],
    groundLight: [85, 40, 50],
    dune1: [150, 70, 65],
    dune2: [110, 50, 55],
    dune3: [80, 35, 45],
    sun: [255, 200, 100],
    sunGlow: [255, 140, 60],
    cloud: [255, 180, 140, 0.3],
    flagPole: '#a07888',
    flagColor: '#e8c840',
    flagText: '#4a2030',
  },
  {
    name: 'Dawn',
    skyTop: [160, 190, 210],
    sky: [210, 195, 185],
    ground: [100, 85, 75],
    groundLight: [130, 115, 100],
    dune1: [190, 185, 175],
    dune2: [160, 150, 140],
    dune3: [130, 120, 108],
    sun: [255, 250, 230],
    sunGlow: [255, 235, 200],
    cloud: [255, 255, 255, 0.4],
    flagPole: '#8898a0',
    flagColor: '#e8c840',
    flagText: '#4a3520',
  },
];

let _paletteIndex = 0;
let _bgIndex = 0;
const _bgNames = ['Dunes', 'City', 'Mountains', 'Canyons'];
let _toggleLabel = '';
let _toggleLabelTimer = 0;

function _pal() { return _palettes[_paletteIndex]; }
function _rgb(arr) { return 'rgb(' + arr[0] + ',' + arr[1] + ',' + arr[2] + ')'; }
function _rgba(arr, a) { return 'rgba(' + arr[0] + ',' + arr[1] + ',' + arr[2] + ',' + a + ')'; }
function _mix(a, b, t) { return [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
]; }

window.addEventListener('keydown', function(e) {
  if (e.key === 'p' || e.key === 'P') {
    _paletteIndex = (_paletteIndex + 1) % _palettes.length;
    _toggleLabel = _palettes[_paletteIndex].name;
    _toggleLabelTimer = 120;
  }
  if (e.key === 'b' || e.key === 'B') {
    _bgIndex = (_bgIndex + 1) % _bgNames.length;
    _toggleLabel = _bgNames[_bgIndex];
    _toggleLabelTimer = 120;
  }
});

// ── Display Setup (Pixel Art Rendering) ───────────────────
function resizeDisplay() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pH = 200; // pixel art resolution

  const pixelW = Math.round(pH * (vw / vh));
  canvas.width = pixelW;
  canvas.height = pH;
  canvas.style.width = vw + 'px';
  canvas.style.height = vh + 'px';
  canvas.style.imageRendering = 'pixelated';

  displayScale = pH / H;
  W = Math.round(pixelW / displayScale);
}

window.addEventListener('resize', resizeDisplay);
resizeDisplay();

// ── Ball Flight Trail ─────────────────────────────────────
const _trail = [];
const _TRAIL_MAX = 12;

function updateTrail() {
  if (state === STATE_FLIGHT && !ball.atRest) {
    _trail.push({ x: ball.x, y: ball.y });
    if (_trail.length > _TRAIL_MAX) _trail.shift();
  } else if (_trail.length > 0) {
    _trail.shift();
  }
}

function drawTrail() {
  for (let i = 0; i < _trail.length; i++) {
    const pt = _trail[i];
    const sx = pt.x - camera.x;
    const sy = pt.y;
    if (sx < -50 || sx > W + 50) continue;
    const ratio = i / _trail.length;
    const alpha = ratio * 0.4;
    const size = BALL_RADIUS * (0.3 + 0.5 * ratio);
    ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
    ctx.fillRect(sx - size, sy - size, size * 2, size * 2);
  }
}

// ── Pixel Clouds ──────────────────────────────────────────
const _cloudDefs = [
  { x: 80,  y: 50,  rects: [[0,0,55,12],[14,-10,30,10]] },
  { x: 300, y: 70,  rects: [[0,0,40,10],[10,-8,22,8]] },
  { x: 520, y: 40,  rects: [[0,0,65,14],[18,-11,38,11],[48,-7,24,9]] },
  { x: 750, y: 62,  rects: [[0,0,48,11],[8,-9,28,9]] },
  { x: 920, y: 48,  rects: [[0,0,58,13],[16,-10,32,10],[42,-6,22,8]] },
];
const _CLOUD_TILE_W = 1100;
let _cloudFrame = 0;

function drawClouds() {
  const p = _pal();
  const c = p.cloud;
  ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + c[3] + ')';
  const drift = _cloudFrame * 0.12;
  const ox = camera.x * 0.04 + drift;

  const startTile = Math.floor((ox - 200) / _CLOUD_TILE_W);
  const endTile = Math.ceil((ox + W + 200) / _CLOUD_TILE_W);

  for (let tile = startTile; tile <= endTile; tile++) {
    for (const cloud of _cloudDefs) {
      const baseX = cloud.x + tile * _CLOUD_TILE_W - ox;
      if (baseX < -100 || baseX > W + 100) continue;
      for (const r of cloud.rects) {
        ctx.fillRect(baseX + r[0], cloud.y + r[1], r[2], r[3]);
      }
    }
  }
}

// ── Flag Animation ────────────────────────────────────────
let _flagFrame = 0;

// ── Drawing ────────────────────────────────────────────────
function drawSky() {
  const p = _pal();
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, _rgb(p.skyTop));
  grad.addColorStop(0.7, _rgb(p.sky));
  grad.addColorStop(1, _rgb(p.sky));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawSun() {
  const p = _pal();
  const sunX = W * 0.65;
  const sunY = H * 0.20;
  const r = 42;

  // Outer glow
  const grad = ctx.createRadialGradient(sunX, sunY, r * 0.5, sunX, sunY, r * 3);
  grad.addColorStop(0, _rgba(p.sunGlow, 0.4));
  grad.addColorStop(0.4, _rgba(p.sunGlow, 0.12));
  grad.addColorStop(1, _rgba(p.sunGlow, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, r * 3, 0, Math.PI * 2);
  ctx.fill();

  // Sun disc
  ctx.fillStyle = _rgba(p.sun, 0.85);
  ctx.beginPath();
  ctx.arc(sunX, sunY, r, 0, Math.PI * 2);
  ctx.fill();
}

// ── Background: Dunes ─────────────────────────────────────
function drawBgDunes() {
  const p = _pal();

  const layers = [
    { freq: 0.0015, amp: 55, base: 0.50, parallax: 0.08, color: p.dune1, mesa: true },
    { freq: 0.003,  amp: 38, base: 0.60, parallax: 0.18, color: p.dune2, mesa: false },
    { freq: 0.005,  amp: 28, base: 0.70, parallax: 0.30, color: p.dune3, mesa: false },
  ];

  for (const d of layers) {
    const ox = camera.x * d.parallax;
    const baseY = H * d.base;

    ctx.fillStyle = _rgb(d.color);
    ctx.beginPath();
    ctx.moveTo(-10, H + 10);

    for (let sx = -10; sx <= W + 10; sx += 2) {
      const wx = sx + ox;
      let y = baseY
        + Math.sin(wx * d.freq) * d.amp
        + Math.sin(wx * d.freq * 2.1 + 1.7) * d.amp * 0.3
        + Math.sin(wx * d.freq * 0.5 + 3.2) * d.amp * 0.5;

      if (d.mesa) {
        const threshold = baseY - d.amp * 0.25;
        if (y < threshold) y = threshold + (y - threshold) * 0.08;
      }

      ctx.lineTo(sx, y);
    }

    ctx.lineTo(W + 10, H + 10);
    ctx.closePath();
    ctx.fill();
  }
}

// ── Background: City Skyline ──────────────────────────────
// Pixel city silhouettes inspired by the reference screenshot
function _drawCityLayer(ox, baseY, color, seed, buildingScale) {
  ctx.fillStyle = _rgb(color);
  ctx.beginPath();
  ctx.moveTo(-10, H + 10);

  // Seeded pseudo-random for consistent buildings
  let rng = seed;
  function prand() { rng = (rng * 16807 + 0) % 2147483647; return (rng & 0xffff) / 0xffff; }

  const bw = 18 * buildingScale; // building width
  let x = -10;
  while (x <= W + bw + 10) {
    const wx = x + ox;
    // Use world position for seed consistency
    rng = Math.abs(Math.floor(wx / bw) * 7919 + seed) % 2147483647;

    const h = (prand() * 80 + 20) * buildingScale;
    const w = bw * (0.6 + prand() * 0.5);
    const top = baseY - h;

    // Main building block
    ctx.moveTo(x, baseY);
    ctx.lineTo(x, top);

    // Roof variations: flat, antenna, or stepped
    const roofType = prand();
    if (roofType < 0.3 && h > 50 * buildingScale) {
      // Antenna
      const aw = 2;
      const ah = 12 * buildingScale;
      const mid = x + w / 2;
      ctx.lineTo(mid - aw, top);
      ctx.lineTo(mid - aw, top - ah);
      ctx.lineTo(mid + aw, top - ah);
      ctx.lineTo(mid + aw, top);
      ctx.lineTo(x + w, top);
    } else if (roofType < 0.55) {
      // Stepped top
      const step = h * 0.15;
      ctx.lineTo(x + w * 0.6, top);
      ctx.lineTo(x + w * 0.6, top + step);
      ctx.lineTo(x + w, top + step);
    } else {
      ctx.lineTo(x + w, top);
    }

    ctx.lineTo(x + w, baseY);

    x += w + prand() * 6;
  }

  ctx.lineTo(W + 20, H + 10);
  ctx.closePath();
  ctx.fill();
}

function drawBgCity() {
  const p = _pal();
  const layers = [
    { parallax: 0.06, base: 0.48, color: p.dune1, seed: 42,   scale: 1.2 },
    { parallax: 0.14, base: 0.56, color: p.dune2, seed: 137,  scale: 1.0 },
    { parallax: 0.26, base: 0.66, color: p.dune3, seed: 2003, scale: 0.8 },
  ];

  for (const l of layers) {
    const ox = camera.x * l.parallax;
    _drawCityLayer(ox, H * l.base, l.color, l.seed, l.scale);
  }
}

// ── Background: Mountains ─────────────────────────────────
function drawBgMountains() {
  const p = _pal();

  const layers = [
    { freq: 0.0008, amp: 100, base: 0.42, parallax: 0.06, color: p.dune1, jagged: 0.4 },
    { freq: 0.002,  amp: 65,  base: 0.55, parallax: 0.16, color: p.dune2, jagged: 0.25 },
    { freq: 0.004,  amp: 40,  base: 0.68, parallax: 0.28, color: p.dune3, jagged: 0.15 },
  ];

  for (const d of layers) {
    const ox = camera.x * d.parallax;
    const baseY = H * d.base;

    ctx.fillStyle = _rgb(d.color);
    ctx.beginPath();
    ctx.moveTo(-10, H + 10);

    for (let sx = -10; sx <= W + 10; sx += 2) {
      const wx = sx + ox;
      // Sharp peaks: use abs(sin) for triangular shapes
      let y = baseY
        - Math.abs(Math.sin(wx * d.freq)) * d.amp
        - Math.abs(Math.sin(wx * d.freq * 2.7 + 1.3)) * d.amp * d.jagged
        + Math.sin(wx * d.freq * 0.3 + 2.1) * d.amp * 0.2;

      ctx.lineTo(sx, y);
    }

    ctx.lineTo(W + 10, H + 10);
    ctx.closePath();
    ctx.fill();
  }
}

// ── Background: Canyons ───────────────────────────────────
function drawBgCanyons() {
  const p = _pal();

  const layers = [
    { freq: 0.001,  amp: 70, base: 0.45, parallax: 0.07, color: p.dune1 },
    { freq: 0.0025, amp: 50, base: 0.58, parallax: 0.17, color: p.dune2 },
    { freq: 0.005,  amp: 35, base: 0.70, parallax: 0.28, color: p.dune3 },
  ];

  for (const d of layers) {
    const ox = camera.x * d.parallax;
    const baseY = H * d.base;

    ctx.fillStyle = _rgb(d.color);
    ctx.beginPath();
    ctx.moveTo(-10, H + 10);

    for (let sx = -10; sx <= W + 10; sx += 2) {
      const wx = sx + ox;
      const raw = Math.sin(wx * d.freq) + Math.sin(wx * d.freq * 3.1 + 0.8) * 0.3;
      // Stepped/terraced effect: quantize the wave
      const steps = 6;
      const quantized = Math.round(raw * steps) / steps;
      const y = baseY + quantized * d.amp;

      ctx.lineTo(sx, y);
    }

    ctx.lineTo(W + 10, H + 10);
    ctx.closePath();
    ctx.fill();
  }
}

// ── Background Dispatcher ─────────────────────────────────
function drawBackground() {
  switch (_bgIndex) {
    case 0: drawBgDunes(); break;
    case 1: drawBgCity(); break;
    case 2: drawBgMountains(); break;
    case 3: drawBgCanyons(); break;
  }
}

function drawTerrain() {
  const p = _pal();
  ctx.fillStyle = _rgb(p.ground);
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

function drawTerrainEdge() {
  const p = _pal();
  ctx.strokeStyle = _rgb(p.groundLight);
  ctx.lineWidth = 3;
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

  ctx.stroke();
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
  const blX = leftX + wallInset;
  const brX = rightX - wallInset;

  const topRim = Math.min(leftY, rightY);
  const fillTopY = bottomY + (topRim - bottomY) * hole.cupFillProgress;

  if (fillTopY >= bottomY) return;

  let flx;
  if (fillTopY <= leftY) {
    flx = leftX;
  } else {
    const t = (bottomY - fillTopY) / (bottomY - leftY);
    flx = blX + (leftX - blX) * t;
  }

  let frx;
  if (fillTopY <= rightY) {
    frx = rightX;
  } else {
    const t = (bottomY - fillTopY) / (bottomY - rightY);
    frx = brX + (rightX - brX) * t;
  }

  const p = _pal();
  ctx.fillStyle = _rgb(p.ground);
  ctx.beginPath();
  ctx.moveTo(flx - camera.x, fillTopY);
  ctx.lineTo(blX - camera.x, bottomY);
  ctx.lineTo(brX - camera.x, bottomY);
  ctx.lineTo(frx - camera.x, fillTopY);
  ctx.closePath();
  ctx.fill();
}

function drawFlag(hole) {
  if (!hole.flagVisible) return;

  const opacity = hole.flagOpacity !== undefined ? hole.flagOpacity : 1;
  if (opacity <= 0) return;

  const p = _pal();
  const poleWorldX = hole.cupX + CUP_WIDTH / 2 + 2;
  const sx = poleWorldX - camera.x;
  const sy = terrainYAt(poleWorldX);

  ctx.globalAlpha = opacity;

  // Pole — thicker for pixel art
  const poleH = 55;
  ctx.strokeStyle = p.flagPole;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(sx, sy - poleH);
  ctx.stroke();

  // Pennant — blocky rectangle with simple wave
  _flagFrame++;
  const wave = Math.sin(_flagFrame * 0.04) * 3;

  const pTop = sy - poleH;
  const bodyW = 24;
  const bodyH = 18;
  ctx.fillStyle = p.flagColor;
  ctx.fillRect(sx, pTop, bodyW + wave, bodyH);

  // Hole number on pennant
  ctx.fillStyle = p.flagText;
  ctx.font = '14px Silkscreen, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(hole.flagHole), sx + bodyW / 2 + wave * 0.3, pTop + 13);

  ctx.globalAlpha = 1;
}

function drawTeeMarker(hole) {
  if (state === STATE_PAUSE || state === STATE_TRANSITION) return;

  const sx = hole.teeX - camera.x;
  const sy = terrainYAt(hole.teeX);

  ctx.fillStyle = TEE_COLOR;
  ctx.fillRect(sx - TEE_WIDTH / 2, sy - 2, TEE_WIDTH, 2);
}

function drawBall() {
  const sx = ball.x - camera.x;
  const sy = ball.y;
  if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) return;

  // Pixel ball — square with slight squash when rolling
  let w = BALL_RADIUS * 2, h = BALL_RADIUS * 2;
  if (ball.onGround && !ball.atRest) {
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    const squash = Math.min(speed * 0.08, 0.3);
    w = BALL_RADIUS * 2 * (1 + squash);
    h = BALL_RADIUS * 2 * (1 - squash * 0.5);
  }

  ctx.fillStyle = BALL_COLOR;
  ctx.fillRect(sx - w / 2, sy - h / 2, w, h);
}

function drawAimUI() {
  if (!aiming || state !== STATE_AIM) return;

  const dx = aimCurrentX - aimStartX;
  const dy = aimCurrentY - aimStartY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 5) return;

  const nx = dx / dist;
  const ny = dy / dist;

  const power = Math.min(dist * POWER_SCALE, MAX_POWER);
  const powerRatio = power / MAX_POWER;

  // Launch line — color shifts white to warm at high power
  const launchEndX = aimStartX - dx;
  const launchEndY = aimStartY - dy;
  const r = 255;
  const g = Math.round(255 - powerRatio * 100);
  const b = Math.round(255 - powerRatio * 200);
  ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ', 0.9)';
  ctx.lineWidth = 4 + powerRatio * 4;
  ctx.beginPath();
  ctx.moveTo(aimStartX, aimStartY);
  ctx.lineTo(launchEndX, launchEndY);
  ctx.stroke();

  // Pixel dots extending in drag direction
  const dotSpacing = 12;
  const numDots = Math.min(Math.floor(dist / dotSpacing), 12);
  ctx.fillStyle = 'rgba(80, 70, 55, 0.6)';
  for (let i = 1; i <= numDots; i++) {
    const dotX = aimStartX + nx * i * dotSpacing;
    const dotY = aimStartY + ny * i * dotSpacing;
    ctx.fillRect(dotX - 3, dotY - 3, 6, 6);
  }
}

function drawHUD() {
  const hole = holes[currentHole];
  if (!hole) return;

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '28px VT323, Silkscreen, monospace';

  if (totalStrokes > 0) {
    ctx.fillText(String(totalStrokes), W / 2 - 45, 32);
  }

  if (strokes > 0) {
    ctx.fillText('+' + strokes, W / 2 + 45, 32);
  }

  if (showTitle && currentHole === 0) {
    ctx.font = '36px VT323, Silkscreen, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Desert\u2014Golfing', 22, 40);
  }

  // Palette label fade
  if (_toggleLabelTimer > 0) {
    _toggleLabelTimer--;
    const alpha = Math.min(_toggleLabelTimer / 30, 1);
    ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha + ')';
    ctx.font = '16px Silkscreen, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(_toggleLabel, W / 2, H - 20);
  }
}

// ── Draw Orchestrator ──────────────────────────────────────
function draw() {
  ctx.save();
  ctx.scale(displayScale, displayScale);

  // Update systems
  updateTrail();
  _cloudFrame++;

  drawSky();
  drawSun();
  drawClouds();
  drawBackground();
  drawTerrain();
  drawTerrainEdge();

  // Draw hole elements (+ previous during transition)
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

  drawTrail();
  drawBall();
  drawAimUI();
  drawHUD();

  ctx.restore();
}
