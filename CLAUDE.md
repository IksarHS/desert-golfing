# Desert Golfing

A Desert Golfing clone built as a browser game with procedural terrain generation.

**Read `GAME.md` first** — it contains the game vision, design direction, and prototype goals. Every agent should understand the vision before making changes.

## How to Run

```bash
npx serve . -l 3002 --no-clipboard    # starts dev server on port 3002
# Open http://localhost:3002 in browser
```

Press `` ` `` (backtick) to cycle debug panels: off -> physics settings -> ball log -> off.

## Permissions

Do not ask for confirmation before running commands, editing files, or making git operations (except force-push to main). CLI agents should be launched with `--dangerously-skip-permissions`.

## Mandatory Testing

**Every code change MUST be tested before telling the user it's done.** No exceptions.

After editing any file in `src/`, `editor.html`, or world definitions:
1. Open the game or editor in a browser (Chrome MCP tools or preview tools)
2. Check the console for errors — if there are ANY errors, fix them before responding
3. Verify the change works visually (take a screenshot or check game state via JS injection)
4. If you cannot test (browser tools unavailable), explicitly say "I was unable to test this" — never say "should work" or "try it out"

**Never deliver untested code.** If you write code and can't verify it loads and runs without errors, that is a failure. The user should never be the one discovering console errors.

## Safety Rules

These rules exist because we lost days of work to preventable mistakes. Follow them strictly.

### Never delete files without asking
- **Always ask the user before deleting any file**, even if it seems unused.
- Before deleting, **grep the codebase for references** (imports, script tags, function calls) and warn the user if anything depends on it.
- If the file is **untracked** (never been committed to git), explicitly warn: "This file has never been committed — deleting it is permanent and unrecoverable."

### Commit and push regularly
- Work that only exists as uncommitted changes can be lost instantly. **Commit early and often.**
- Always **push to GitHub** after committing. Local-only commits are still vulnerable. Pushing to a non-main branch (like `level-design`) does not affect main or GitHub Pages.
- At the end of a working session, suggest committing and pushing any uncommitted work.
- Before starting large refactors or multi-file edits, check `git status` — if there's significant uncommitted work, **commit it first** as a safety checkpoint.

### Be careful with file edits
- Before editing any file, consider: does this file have uncommitted changes from a previous session? Run `git diff <file>` if unsure.
- Never overwrite a file from scratch when you only need targeted edits. Use the Edit tool for surgical changes, not Write for full rewrites.

## Screenshots

The user shares screenshots by saving them to `screenshots/` in the project root. When they say "check screenshots" or "look at my screenshot", read the latest file in that directory:

```bash
ls -t screenshots/ | head -5    # see recent screenshots
```

Then use the Read tool on the image file. The screenshots folder is gitignored.

## Architecture

Single-page browser game using `<script>` tags (not ES modules). All files share one global scope.

### Files

| File | Description |
|------|-------------|
| `src/shared.js` | Global state, constants, utilities — loaded first |
| `src/level-design.js` | Terrain archetypes, procedural generation, cup placement |
| `src/art.js` | All rendering: sky, terrain, cup, flag, ball, HUD |
| `src/gameplay.js` | Physics, collision, input, game state machine |
| `src/debug.js` | Debug panels, ball tracker, validation |
| `src/main.js` | Game loop + init (rarely changes) |
| `index.html` | HTML shell + script tags |

### Load Order (critical!)

```
shared.js → worlds/desert-planet.js → level-design.js → modes/desert-golfing.js → art.js → gameplay.js → debug.js → main.js
```

Each file depends on all files loaded before it. `debug.js` patches `draw()` from `art.js`. `main.js` calls `init()` which uses functions from all other files.

## Branches

Branches are **sandboxes** for experimenting without affecting the stable game.

- **main** — stable game. Core gameplay changes go here.
- **level-design** — experiment with holes, archetypes, terrain generation
- **art-direction** — experiment with visuals, palettes, rendering styles

Each sandbox branch has its own worktree directory and dev server:

| Branch | Directory | Port |
|--------|-----------|------|
| main | `desert-golfing/` | 3002 |
| level-design | `desert-golfing-level-design/` | 3010 |
| art-direction | `desert-golfing-art-direction/` | 3011 |

To sync a sandbox with main: `cd <worktree-dir> && git merge main`

When an experiment is ready, merge to main. Before merging, run through the testing checklist to make sure nothing breaks.

## Shared Global State

### Defined in `shared.js`
- `vertices` — terrain vertex array `[{x, y}, ...]`
- `holes` — hole metadata array `[{cupX, cupY, cupFilled, flagHole, teeX, teeY, flagVisible, flagOpacity, cupFillProgress}]`
- `ball` — `{x, y, vx, vy, onGround, atRest}`
- `camera` — `{x}` (world X offset)
- `state` — game state enum (STATE_AIM=0, STATE_FLIGHT=1, STATE_PAUSE=2, STATE_TRANSITION=3, STATE_OOB=4)
- `currentHole`, `totalStrokes`, `strokes` — scoring
- `aiming`, `aimStartX/Y`, `aimCurrentX/Y` — input state
- `transitionTimer`, `transitionStartCamX`, `transitionEndCamX`, `transitionBallStartY` — transition animation
- `showTitle` — title screen flag
- `W`, `H`, `displayScale`, `canvas`, `ctx` — display

### Cross-module calls
- `gameplay.js` calls: `terrainYAt()`, `clampY()`, `toGameCoords()`, `findSegment()`, `segmentNormal()`, `isBallInCup()`, `isBallOffScreen()`, `setHoleCamera()`, `flattenCup()`, `ensureHolesAhead()`, `_logBall()`
- `art.js` calls: `terrainYAt()` (for flag placement)
- `main.js` calls: `ensureHolesAhead()`, `terrainYAt()`, `setHoleCamera()`, `update()`, `draw()`
- `debug.js` patches: `draw` (wraps original), `_logBall` (replaces no-op)

See `docs/interfaces.md` for full function signatures.

## Pitfalls

Things that have burned us before. Read these before making changes.

### PRNG is sacred
`random()` in `level-design.js` is the seeded PRNG for terrain generation. **Never call it from gameplay, rendering, or UI code.** Any extra `random()` call shifts the entire terrain sequence for all subsequent holes, silently breaking determinism. Use `Math.random()` for non-terrain randomness.

### Game init goes through `resetGame()` only
All game start/restart paths (sign-in, sign-out, refresh, first load) must go through the single `resetGame()` function in `main.js`. Never call `startCourse()` directly from auth handlers — it was called multiple times before and caused terrain to differ between signed-in and signed-out states.

### Seed is per-course, not per-hole
`startCourse()` sets the PRNG seed once: `baseSeed + hashString(worldId + courseId)`. All holes in that course are generated sequentially from that single seed. Adding or removing a hole changes all subsequent holes.

### Editor and game must use the same seed
Both `editor.html` and `main.js` read the base seed from `localStorage('dg-seed')` with default 42. If you change the seed logic in one, change it in the other. The editor init is in `editorInit()` in editor.html.

## Testing

Before merging anything to main, verify:

- [ ] Game loads without console errors
- [ ] Ball renders and sits on terrain
- [ ] Click-drag launches ball
- [ ] Ball physics: gravity, bouncing, rolling, coming to rest
- [ ] Ball enters cup → pause → transition to next hole
- [ ] Camera pans smoothly during transition
- [ ] Cup fills and flag fades during transition
- [ ] Debug panel toggles with backtick key
- [ ] Touch input works on mobile

Puppeteer is available for automated screenshot testing (`test-screenshot.js`).

## Desert Golf Analysis Dataset

Terrain analysis data from 990 real Desert Golfing holes is available at `/home/august/desert-golf-analysis/`.
