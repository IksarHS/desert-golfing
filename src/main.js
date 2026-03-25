// ── Game Loop ──────────────────────────────────────────────
function gameLoop() {
  _ballLogFrame++;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ── Shared Seed ────────────────────────────────────────────
// The default seed ensures every player gets the same holes.
// Stored in localStorage so it persists across refreshes.
// Only changes if explicitly set via setSeed() or the editor.
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

// ── Init ───────────────────────────────────────────────────
async function init() {
  // Initialize seed before anything generates terrain
  initSeed();
  // Preload course data from server JSON before game init
  if (typeof preloadCourseData === 'function') {
    await preloadCourseData();
  }
  MODE.init();
  gameLoop();
}

init();
