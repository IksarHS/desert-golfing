// ── Game Loop ──────────────────────────────────────────────
let _gameStarted = false;

function gameLoop() {
  _ballLogFrame++;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ── Shared Seed ────────────────────────────────────────────
const DEFAULT_GAME_SEED = 42;

function initSeed() {
  const stored = localStorage.getItem('dg-seed');
  if (stored !== null) {
    setSeed(parseInt(stored, 10));
  } else {
    setSeed(DEFAULT_GAME_SEED);
    localStorage.setItem('dg-seed', String(DEFAULT_GAME_SEED));
  }
}

// ── Start game (called after auth resolves) ────────────────
function startGame() {
  if (_gameStarted) return;
  _gameStarted = true;
  initSeed();
  MODE.init();
  gameLoop();
}

// ── Init ───────────────────────────────────────────────────
function init() {
  if (typeof initFirebase === 'function') {
    initFirebase(); // This will call startGame() after auth resolves
  } else {
    // No Firebase — start immediately
    startGame();
  }
}

init();
