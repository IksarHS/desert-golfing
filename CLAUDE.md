# Desert Golfing — Multi-Agent Development

A Desert Golfing clone built as a browser game with procedural terrain generation.

## How to Run

```bash
npx serve . -l 3002 --no-clipboard    # starts dev server on port 3002
# Open http://localhost:3002 in browser
```

Press `` ` `` (backtick) to cycle debug panels: off -> physics settings -> ball log -> off.

## Architecture

Single-page browser game using `<script>` tags (not ES modules). All files share one global scope.

### File Ownership

| File | Owner | Description |
|------|-------|-------------|
| `src/shared.js` | SHARED | Global state, constants, utilities — loaded first |
| `src/level-design.js` | **Level Design** agent | Terrain archetypes, generation, cup placement |
| `src/art.js` | **Art Direction** agent | All rendering: sky, terrain, cup, flag, ball, HUD |
| `src/gameplay.js` | **Core Gameplay** agent | Physics, collision, input, game state machine |
| `src/debug.js` | **QA/Testing** agent | Debug panels, ball tracker, validation |
| `src/main.js` | SHARED | Game loop + init (rarely changes) |
| `index.html` | SHARED | HTML shell + script tags |

### Load Order (critical!)

```
shared.js → level-design.js → art.js → gameplay.js → debug.js → main.js
```

Each file depends on all files loaded before it. `debug.js` patches `draw()` from `art.js`. `main.js` calls `init()` which uses functions from all other files.

## Shared Global State

### Written by `shared.js`, read by all
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

### Written by `level-design.js`
- Mutates `vertices` (appends terrain, splices cup)
- Mutates `holes` (pushes new hole objects)

### Written by `gameplay.js`
- Mutates `ball` (physics, input)
- Mutates `camera` (setHoleCamera)
- Writes `state`, `transitionTimer`, `currentHole`, `totalStrokes`, `strokes`, `showTitle`
- Writes `aiming`, `aimStartX/Y`, `aimCurrentX/Y`

### Written by `art.js`
- Writes `W`, `displayScale` (on resize)

### Written by `debug.js`
- Overrides `_logBall` (from no-op to real implementation)
- Patches `draw` function (wraps with overlay)
- Writes `_debugMode`, `_selectedSetting`

## Interface Contracts

See `coordination/interfaces.md` for all cross-module function signatures.

### Key cross-module calls:
- `gameplay.js` calls: `terrainYAt()`, `clampY()`, `toGameCoords()`, `findSegment()`, `segmentNormal()`, `isBallInCup()`, `isBallOffScreen()`, `setHoleCamera()`, `flattenCup()`, `ensureHolesAhead()`, `_logBall()`
- `art.js` calls: `terrainYAt()` (for flag placement)
- `main.js` calls: `ensureHolesAhead()`, `terrainYAt()`, `setHoleCamera()`, `update()`, `draw()`
- `debug.js` patches: `draw` (wraps original), `_logBall` (replaces no-op)

## Coordination Rules

1. **Only edit files you own.** If you need a change in another agent's file, file a request in `coordination/requests.md`.
2. **Check coordination files before starting work.** Read `status.md` and `requests.md` first.
3. **Update your status.** Edit your section in `coordination/status.md` when starting/finishing tasks.
4. **Announce interface changes.** If you change a function signature, update `coordination/interfaces.md` and note it in `coordination/decisions.md`.
5. **No new globals without coordination.** Adding new global variables requires agreement — add a request.
6. **Shared files (shared.js, main.js, index.html)** require agreement from all agents before editing.

## Testing

```bash
npm start                              # Start dev server
# Open http://localhost:3002/index.html in browser
```

### Verification checklist:
- [ ] Game loads without console errors
- [ ] Ball renders and sits on terrain
- [ ] Click-drag launches ball
- [ ] Ball physics: gravity, bouncing, rolling, coming to rest
- [ ] Ball enters cup → pause → transition to next hole
- [ ] Camera pans smoothly during transition
- [ ] Cup fills and flag fades during transition
- [ ] Debug panel toggles with backtick key
- [ ] Physics settings adjustable with arrow keys
- [ ] Ball log shows entries
- [ ] Touch input works on mobile

## Desert Golf Analysis Dataset

Terrain analysis data from 990 real Desert Golfing holes is available at `/home/august/desert-golf-analysis/`. The Level Design agent should use this to improve terrain generation fidelity.

## Worktree Setup (Agent Isolation)

Each agent works in its own **git worktree** — a separate directory with its own branch. This means agents can edit, commit, test, and iterate without affecting each other.

### Directory Layout

```
projectss/
├── desert-golfing/                  ← main branch (stable, don't work here)
├── desert-golfing-level-design/     ← Level Design agent's workspace
├── desert-golfing-art-direction/    ← Art Direction agent's workspace
├── desert-golfing-gameplay/         ← Core Gameplay agent's workspace
└── desert-golfing-qa-testing/       ← QA/Testing agent's workspace
```

### Dev Server Ports

Each agent runs their own dev server on a dedicated port:

| Agent | Directory | Port | URL |
|-------|-----------|------|-----|
| Level Design | `desert-golfing-level-design/` | 3010 | http://localhost:3010 |
| Art Direction | `desert-golfing-art-direction/` | 3011 | http://localhost:3011 |
| Core Gameplay | `desert-golfing-gameplay/` | 3012 | http://localhost:3012 |
| QA/Testing | `desert-golfing-qa-testing/` | 3013 | http://localhost:3013 |
| Main (stable) | `desert-golfing/` | 3002 | http://localhost:3002 |

### Branch Strategy

- `main` — stable, working game (merge target)
- `level-design` — Level Design agent's WIP
- `art-direction` — Art Direction agent's WIP
- `gameplay` — Core Gameplay agent's WIP
- `qa-testing` — QA/Testing agent's WIP

Since each agent owns different files, merges to main should be conflict-free.

### How to Merge Your Work to Main

When your changes are tested and ready:

```bash
# From your worktree directory:
git add <your-files>
git commit -m "Description of changes"

# Merge to main (from the main directory):
cd /mnt/c/Users/augus/projectss/desert-golfing
git merge <your-branch>        # e.g. git merge level-design
git push
```

### How to Pull Others' Changes Into Your Worktree

After another agent merges to main:

```bash
# From your worktree directory:
git fetch origin
git merge main                  # pull latest stable code
```
