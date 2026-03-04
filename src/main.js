// ── Game Loop ──────────────────────────────────────────────
function gameLoop() {
  _ballLogFrame++;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ── Init ───────────────────────────────────────────────────
function init() {
  // Pre-generate holes 0, 1, and 2 so next holes are always "already there"
  ensureHolesAhead(2);

  const firstHole = holes[0];
  ball.x = firstHole.teeX;
  ball.y = terrainYAt(firstHole.teeX) - BALL_RADIUS;
  ball.atRest = true;

  // Set camera to frame the hole — FIXED for entire hole
  setHoleCamera(firstHole);

  gameLoop();
}

init();
