# Desert Golfing

A Desert Golfing clone built as a browser game with procedural terrain generation.

## How to Run

```bash
npx serve . -l 3002 --no-clipboard    # starts dev server on port 3002
# Open http://localhost:3002 in browser
```

Press `` ` `` (backtick) to cycle debug panels: off -> physics settings -> ball log -> off.

## Permissions

Do not ask for confirmation before running commands, editing files, or making git operations (except force-push to main). CLI agents should be launched with `--dangerously-skip-permissions`.

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
shared.js → level-design.js → art.js → gameplay.js → debug.js → main.js
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

See `coordination/interfaces.md` for full function signatures.

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
