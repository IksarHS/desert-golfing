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

## Workflow

There are three roles in this project:

1. **You (the human)** — talk directly to individual agents for single-agent work, or talk to the coordinator for cross-agent features and merges.
2. **Coordinator** — understands all agents' branches, orchestrates merges to main without conflicts, kicks off multi-agent features. This is the Claude Code session in the main `desert-golfing/` directory.
3. **Individual agents** — each works in their own worktree. You interact with them directly by opening a `claude` session in their directory.

### How to talk to an agent directly

```bash
cd /mnt/c/Users/augus/projectss/desert-golfing-art-direction  # or any agent's dir
claude                                                          # interactive session
```

The agent will read `CLAUDE.md` and its prompt in `coordination/prompts/` to understand its role.

### How merges work

1. Agent commits changes to their branch
2. Agent (or human) requests a merge to main
3. **QA agent tests the branch** before it merges (the QA agent is the merge gatekeeper)
4. Once QA approves, the coordinator merges to main and propagates to other worktrees

No agent should merge directly to main without QA review.

### Playtesting

Each agent's dev server shows a label in the browser tab and on-screen overlay so you know which version you're looking at:

| Agent | URL | Browser label |
|-------|-----|---------------|
| Main (stable) | http://localhost:3002 | Desert Golfing |
| Level Design | http://localhost:3010 | LEVEL DESIGN — Desert Golfing |
| Art Direction | http://localhost:3011 | ART DIRECTION — Desert Golfing |
| Core Gameplay | http://localhost:3012 | GAMEPLAY — Desert Golfing |
| QA/Testing | http://localhost:3013 | QA TESTING — Desert Golfing |

## Coordination Rules

1. **Only edit files you own.** If you need a change in another agent's file, file a request in `coordination/requests.md`.
2. **Check coordination files before starting work.** Read `status.md` and `requests.md` first.
3. **Update your status.** Edit your section in `coordination/status.md` when starting/finishing tasks.
4. **Announce interface changes.** If you change a function signature, update `coordination/interfaces.md` and note it in `coordination/decisions.md`.
5. **No new globals without coordination.** Adding new global variables requires agreement — add a request.
6. **Shared files (shared.js, main.js, index.html)** require agreement from all agents before editing.
7. **Never merge directly to main.** All merges go through QA review first.

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

### How to Submit Your Work for Merge

When your changes are tested and ready:

```bash
# From your worktree directory:
git add <your-files>
git commit -m "Description of changes"
```

Then request a merge by adding an entry to `coordination/requests.md` asking QA to review. The QA agent will test your branch and, once approved, the coordinator merges to main.

### How to Pull Others' Changes Into Your Worktree

After another agent merges to main:

```bash
# From your worktree directory:
git fetch origin
git merge main                  # pull latest stable code
```
