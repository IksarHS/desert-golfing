# Mode System Architecture Plan

## The Problem

We have two versions of the game:
- **Desert Golfing** (horizontal, `src/*.js`, 6 files ~1200 lines total)
- **Only Up** (vertical, `onlyup.html`, 1 file ~1050 lines)

They share ~70% identical code — physics, input, collision math, state machine flow, aim UI, ball rendering, cup fill animation, flag drawing. But it's all copy-pasted. This means:

1. **Physics improvements don't propagate.** If we tune friction, fix a collision edge case, or add substeps in one version, we have to manually replicate it in the other.
2. **Debug tools only exist in main.** Only Up has no debug panel, no ball logger, no hot-tunable physics.
3. **New modes require forking again.** Every experiment starts with copy-pasting 1000 lines and hoping we remember all the invariants.
4. **Drift is inevitable.** The two versions already have subtle differences (main does 1 collision pass, Only Up does 3 with multi-iteration; main's `updatePhysics` has slope-rest logic, Only Up's doesn't).

## Proposed Solution

**A mode config object that plugs into the shared engine.**

The engine (`shared.js`, `gameplay.js`, `art.js`, `debug.js`, `main.js`) handles everything universal. Each mode is a single JS file that registers a `MODE` object providing ~12 hooks for the things that actually differ.

### What stays in the shared engine (doesn't change per mode)

| System | Why it's universal |
|--------|-------------------|
| Canvas setup & scaling | Same in both |
| Physics (gravity, friction, rest detection) | Identical — both use same constants, same friction model, same slow-roll failsafe |
| Input (mouse/touch drag-to-aim) | Identical — same event listeners, same power/angle calc |
| State machine flow (AIM → FLIGHT → PAUSE → TRANSITION → AIM) | Same 5 states, same transitions, same timing constants |
| Transition animation (ease-in-out camera pan, cup fill 30-90%, flag fade 30-70%) | Identical math — only the camera axis differs |
| Ball rendering | Same white circle |
| Aim UI (drag line, arrow, dots) | Same — minor camera offset difference |
| Cup fill rendering | Same math — both use cupLeftX/rightX/leftY/rightY/bottomY/wallInset/fillProgress |
| Flag rendering | Same pole + pennant + number |
| Debug system | Should work in all modes |

### What varies per mode (~12 hooks)

```javascript
MODE = {
  name: 'desert-golfing',   // or 'only-up', etc.

  // ── Init ──
  init(),
  // Generate terrain, place ball, set initial camera.
  // DG: ensureHolesAhead(2), ball at tee, setHoleCamera
  // OU: generateTerrain(), ball at floor, camera.y at bottom

  // ── Collision ──
  collide(),
  // Run collision detection, set ball.onGround, return bool.
  // DG: iterates vertices[] with left-to-right early break
  // OU: iterates segments[] with AABB reject, 3 iterations

  // ── Camera ──
  cameraAxis: 'x',          // or 'y'
  getCameraPos(),            // return current camera position on axis
  setCameraPos(val),         // set camera position on axis
  setHoleCamera(idx),        // frame current hole/platform for play
  updateCamera(),            // per-frame update during flight
  //   DG: no-op (camera is fixed during play)
  //   OU: smooth follow on Y axis

  // ── Game Logic ──
  isGoalReached(),           // is ball in a cup? Returns cup/hole data or false
  isOOB(),                   // is ball out of bounds?
  onGoalReached(cupData),    // bookkeeping when cup is reached
  //   DG: just record which hole
  //   OU: set cupFillPlatIdx, cupsReached++, update checkpoint
  onTransitionStart(),       // compute camera target, save start/end positions
  onTransitionUpdate(ease, t), // optional per-frame transition work (ball Y, etc.)
  onTransitionEnd(),         // place ball at next position, flatten cup, etc.
  //   DG: flattenCup, place at next tee, ensureHolesAhead
  //   OU: fill platform cup, place on platform surface
  onOOB(),                   // respawn logic
  //   DG: ball back to current tee
  //   OU: respawnAtCheckpoint

  // ── Rendering ──
  drawWorld(ctx),            // terrain/walls/platforms — calls shared drawCupFill/drawFlag
  drawSky(ctx),              // solid color vs height-based gradient
  drawHUD(ctx),              // mode-specific HUD elements
  applyCameraTransform(ctx), // how to translate the canvas for world rendering
  //   DG: no transform (manual camera.x subtraction in vertex drawing)
  //   OU: ctx.translate(0, -camera.y)
};
```

### File structure

```
src/
  shared.js           constants, canvas, ball, state vars, utils
  gameplay.js         input, physics (calls MODE.collide), state machine (calls MODE hooks)
  art.js              drawBall, drawAimUI, drawCupFill, drawFlag (shared utils) + draw orchestrator
  debug.js            debug panels, ball logger
  main.js             init (calls MODE.init), game loop

  modes/
    desert-golfing.js   DG mode object + DG-specific level generation (current level-design.js content)
    only-up.js          OU mode object + canyon/platform generation
```

### HTML files

**index.html** (Desert Golfing):
```html
<script src="src/shared.js"></script>
<script src="src/modes/desert-golfing.js"></script>
<script src="src/art.js"></script>
<script src="src/gameplay.js"></script>
<script src="src/debug.js"></script>
<script src="src/main.js"></script>
```

**onlyup.html** (Only Up):
```html
<script src="src/shared.js"></script>
<script src="src/modes/only-up.js"></script>
<script src="src/art.js"></script>
<script src="src/gameplay.js"></script>
<script src="src/debug.js"></script>
<script src="src/main.js"></script>
```

The only difference is which mode file is loaded. Everything else is shared.

### Key engine changes

**shared.js:**
- Add `let MODE = null;` global
- Add `camera.y = 0` (currently only has `camera.x`)
- Remove the hardcoded `transitionStartCamX` / `transitionEndCamX` — replace with generic `transitionCamStart` / `transitionCamEnd` that work for either axis

**gameplay.js — state machine becomes:**
```javascript
function update() {
  switch (state) {
    case STATE_FLIGHT:
      updatePhysics();  // shared physics, calls MODE.collide()

      const goal = MODE.isGoalReached();
      if (goal) {
        MODE.onGoalReached(goal);
        state = STATE_PAUSE;
        transitionTimer = 0;
      } else if (MODE.isOOB()) {
        state = STATE_OOB;
        transitionTimer = 0;
      } else if (ball.atRest) {
        state = STATE_AIM;
      }

      MODE.updateCamera();
      break;

    case STATE_PAUSE:
      transitionTimer++;
      if (transitionTimer >= TRANSITION_PAUSE) {
        totalStrokes += strokes;
        MODE.onTransitionStart(); // saves cam start/end
        transitionTimer = 0;
        strokes = 0;
        state = STATE_TRANSITION;
      }
      break;

    case STATE_TRANSITION: {
      transitionTimer++;
      const t = Math.min(transitionTimer / TRANSITION_PAN, 1);
      const ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;

      // Camera pan (axis-agnostic)
      MODE.setCameraPos(transitionCamStart + (transitionCamEnd - transitionCamStart) * ease);

      // Shared cup fill + flag fade timing
      // (operates on cupData which has the same interface in both modes)
      applyCupFillProgress(t);    // shared helper
      applyFlagFade(t);           // shared helper
      MODE.onTransitionUpdate(ease, t); // mode-specific (e.g. ball Y position)

      if (transitionTimer >= TRANSITION_PAN) {
        MODE.onTransitionEnd();
        state = STATE_AIM;
      }
      break;
    }

    case STATE_OOB:
      transitionTimer++;
      if (transitionTimer >= OOB_PAUSE) {
        MODE.onOOB();
        state = STATE_AIM;
      }
      break;
  }
}
```

**gameplay.js — updatePhysics:**
```javascript
function updatePhysics() {
  if (ball.atRest) return;

  ball.vy += GRAVITY;
  ball.x += ball.vx;
  ball.y += ball.vy;

  MODE.collide();  // <-- instead of collideWithTerrain()

  if (ball.onGround) {
    // ... friction, slow-roll, rest detection — ALL SHARED
  }
}
```

Note: Only Up currently does 2 substeps. This could be a mode config flag (`MODE.substeps = 2`) or we could just standardize on substeps for everyone (it's better physics anyway).

**art.js — draw orchestrator:**
```javascript
function draw() {
  ctx.save();
  ctx.scale(displayScale, displayScale);

  MODE.drawSky(ctx);

  // World rendering (mode handles its own camera transform)
  MODE.drawWorld(ctx);  // internally calls shared drawCupFill(), drawFlag()
  drawBall();           // shared

  // Aim UI (shared, but needs to undo camera if OU uses translate)
  drawAimUI();

  // HUD
  drawStrokeCounter();  // shared: totalStrokes + strokes display
  MODE.drawHUD(ctx);    // mode-specific extras

  ctx.restore();
}
```

### The cup data interface (already shared!)

Both modes' cup containers already conform to the same shape:

```javascript
// In DG holes[] and OU platforms[], every cup object has:
{
  cupX, cupY,
  cupLeftX, cupRightX,
  cupLeftY, cupRightY,
  cupBottomY,
  cupWallInset,
  cupFilled: false,
  cupFillProgress: 0,
  flagVisible: true,
  flagOpacity: 1,
}
```

This means `drawCupFill()` and `drawFlag()` can be shared utility functions that accept any object with this interface. No refactoring needed — they already work the same way.

### What happens to `level-design.js`?

It gets absorbed into `modes/desert-golfing.js`. The archetype system, seeded PRNG, hand-defined holes, difficulty curve — all DG-specific. The mode file would be larger (~500 lines) but it's all one concern: "how Desert Golfing generates and manages its terrain."

Alternatively, keep `level-design.js` as a separate file and only load it alongside the DG mode. Either way works.

## What This Gets Us

1. **One physics engine.** Tune friction once, it works everywhere. Add substeps everywhere. Fix collision bugs once.
2. **Debug tools in all modes.** Press ~ in Only Up and get the same physics tuning panel and ball logger.
3. **New modes are cheap.** Want diagonal golfing? Zero-gravity mode? Bouncy walls? Write a ~200-line mode file, load it instead.
4. **No drift.** State machine timing, cup fill animation, flag fade — these are defined once. Modes can't accidentally diverge.
5. **Smaller total codebase.** ~1200 (engine) + ~400 (DG mode) + ~350 (OU mode) ≈ 1950 lines vs ~1200 + ~1050 = 2250 lines today. The savings grow with each new mode.

## Why It's Worth Doing vs Not Doing

**Worth doing now because:**
- August explicitly said he's "actively trying to figure out the best version of the game" and wants to experiment with modes. This is the core use case.
- The two codebases are already drifting (OU has 3-iteration collision, main has 1; OU has substeps, main doesn't; OU lacks slope-rest logic). It'll only get worse.
- The code is small enough (~2200 lines total) that the refactor is a day's work, not a week's.
- The interface boundaries are clean. The "cup data interface" already matches between both games without any planning. This is a sign the abstraction is natural, not forced.

**Risk of doing it:**
- Temporarily breaks the main game while refactoring. Mitigated by: working on a branch, testing both HTML files before merging.
- Adds indirection (MODE.collide() vs collideWithTerrain()). But the indirection is minimal — one function call hop — and the mode object is a simple global, not a class hierarchy.

**Risk of NOT doing it:**
- Every physics change requires manual sync between two files.
- Every new game mode experiment requires copy-pasting 1000 lines.
- Debug tools never make it to Only Up.
- We end up with 3-4 diverged forks and no one remembers which has the "good" version of each system.

## Confidence Level

**High confidence on the architecture.** The hook surface is small (~12 functions), the shared code is genuinely identical, and the cup data interface already matches without planning. This is a natural abstraction, not a speculative one.

**Medium confidence on the details.** Specifically:

- **Camera transform approach.** DG manually subtracts `camera.x` in every draw call. OU uses `ctx.translate(0, -camera.y)`. Standardizing on `ctx.translate` would be cleaner but means touching every `v.x - camera.x` line in DG's terrain drawing. Leaving it as-is means the `drawWorld` implementation is more different between modes than it needs to be. I lean toward standardizing but want the CLI agent's take.

- **Substeps.** Only Up does 2 physics substeps per frame for thin platform safety. Main DG does 1. Should we standardize on 2 for everyone (better physics, tiny perf cost) or make it a mode config? I lean toward standardizing.

- **`level-design.js` placement.** Keep it as a separate file loaded only with DG mode, or merge it into `modes/desert-golfing.js`? Separate file is cleaner for editing but means DG mode has a file dependency that OU mode doesn't.

## Open Questions for CLI Agent

1. **Camera transform strategy.** DG currently does manual `camera.x` subtraction in every vertex draw. Should we refactor to `ctx.translate(-camera.x, 0)` to match Only Up's approach? This makes `drawWorld()` implementations more symmetric but touches a lot of lines in the current DG terrain/flag/tee drawing code. What's your preference?

2. **Where does `level-design.js` go?** Options:
   - (A) Keep as separate file, loaded via `<script>` only in index.html alongside DG mode
   - (B) Merge into `modes/desert-golfing.js` (one bigger file, no dependency management)
   - (C) Keep as separate file but rename to `modes/desert-golfing-levels.js` for clarity

3. **Substeps.** Standardize on 2 substeps for all modes, or make it `MODE.substeps`? I'd vote standardize — the perf cost is negligible and it prevents thin-surface tunneling in any mode.

4. **Migration strategy.** I see two approaches:
   - (A) **Incremental:** First, add `MODE` global and hooks to existing files without changing behavior. Desert Golfing mode is just the existing code wrapped in an object. Only then add Only Up mode. Safer, more commits, easier to debug.
   - (B) **Big bang:** Restructure everything at once, test both modes, commit. Faster but riskier.
   Which do you prefer?

5. **Ball position during `drawAimUI`.** In DG, aim coords are in screen space and drawn without camera offset. In OU, aim coords are in screen space but the canvas has a camera translate, so `drawAimUI` does `ctx.translate(0, camera.y)` to undo it. Should we standardize on "aim UI always draws in screen space, mode provides the inverse transform"? Or just have each mode's `drawWorld()` restore the transform before `drawAimUI()` is called?

6. **Any globals I'm missing?** I've accounted for `vertices[]`, `holes[]`, `segments[]`, `platforms[]`, `camera.x/y`, `currentHole`, `cupsReached`, `lastCheckpointIdx`, etc. Are there other mode-specific globals lurking in your codebase that I haven't seen?
