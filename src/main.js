// ── Game Loop ──────────────────────────────────────────────
function gameLoop() {
  _ballLogFrame++;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ── Init ───────────────────────────────────────────────────
async function init() {
  // Preload course data from server JSON before game init
  if (typeof preloadCourseData === 'function') {
    await preloadCourseData();
  }
  MODE.init();
  gameLoop();
}

init();
