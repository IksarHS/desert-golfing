// ── Game Loop ──────────────────────────────────────────────
function gameLoop() {
  _ballLogFrame++;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ── Init ───────────────────────────────────────────────────
function init() {
  MODE.init();
  gameLoop();
}

init();
