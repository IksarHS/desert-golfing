// ── Game Loop ──────────────────────────────────────────────
let _gameLoopRunning = false;

function gameLoop() {
  _ballLogFrame++;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function ensureGameLoop() {
  if (_gameLoopRunning) return;
  _gameLoopRunning = true;
  gameLoop();
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

// ── Unified Game Reset ────────────────────────────────────
// THE SINGLE ENTRY POINT for starting or restarting the game.
// All code paths (sign-in, sign-out, refresh, first load) call this.
// This ensures startCourse() is called exactly ONCE per reset,
// keeping the PRNG deterministic.
//
// @param {string} worldId - world to load (default: 'desert-world-1')
// @param {string} courseId - course to load (default: 'desert-course-1')
// @param {object|null} progress - saved player progress to restore, or null for fresh start
function resetGame(worldId, courseId, progress) {
  // Reset PRNG to exact base seed before anything else
  setSeed(DEFAULT_GAME_SEED);
  localStorage.setItem('dg-seed', String(DEFAULT_GAME_SEED));
  startCourse(worldId || 'desert-world-1', courseId || 'desert-course-1');

  if (progress) {
    const resumeHole = progress.currentHole || 0;
    const hasProgress = resumeHole > 0 || (progress.ballState && progress.ballState.x) || (progress.strokes > 0);

    if (hasProgress) {
      ensureHolesAhead(resumeHole + 2);
      for (let i = 0; i < resumeHole; i++) {
        holes[i].cupFilled = true;
        holes[i].cupFillProgress = 1;
        holes[i].flagVisible = false;
        holes[i].flagOpacity = 0;
        flattenCup(holes[i]);
      }
      currentHole = resumeHole;
      totalStrokes = progress.totalStrokes || 0;
      strokes = progress.strokes || 0;
      if (resumeHole > 0 || strokes > 0) showTitle = false;

      if (progress.ballState && progress.ballState.x) {
        const bs = progress.ballState;
        ball.x = bs.x; ball.y = bs.y;
        // Always restore at rest — we only save on rest
        ball.vx = 0; ball.vy = 0;
        ball.onGround = true;
        ball.atRest = true;
        ball.spinRate = 0;
        ball.rotation = bs.rotation || 0;
        state = STATE_AIM;
        setHoleCamera(holes[currentHole]);
      } else {
        // Cross-device resume: restart hole from tee, strokes already charged
        const hole = holes[currentHole];
        ball.x = hole.teeX;
        ball.y = terrainYAt(hole.teeX) - BALL_RADIUS;
        ball.vx = 0; ball.vy = 0;
        ball.atRest = true; ball.onGround = false;
        setHoleCamera(hole);
        state = STATE_AIM;
      }
    }
  }
}

// ── Reveal UI ─────────────────────────────────────────────
function revealGame() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
  if (typeof canvas !== 'undefined') canvas.style.visibility = 'visible';
  const authUI = document.getElementById('auth-ui');
  if (authUI) authUI.style.display = 'block';
}

// ── Init ───────────────────────────────────────────────────
function init() {
  if (typeof initFirebase === 'function') {
    initFirebase(); // onAuthStateChanged will call resetGame + revealGame + ensureGameLoop
  } else {
    // No Firebase — start immediately
    resetGame();
    revealGame();
    ensureGameLoop();
  }
}

init();
