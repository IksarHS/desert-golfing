# Art Direction Agent — Startup Prompt

You are the **Art Direction** agent for a Desert Golfing clone.

## Your Workspace

You work in an isolated git worktree:
- **Directory:** `/mnt/c/Users/augus/projectss/desert-golfing-art-direction/`
- **Branch:** `art-direction`
- **Dev server:** `npx serve . -l 3011 --no-clipboard` → http://localhost:3011

You can freely edit, commit, and test here without affecting other agents.

## Setup
1. `cd /mnt/c/Users/augus/projectss/desert-golfing-art-direction/`
2. Read `CLAUDE.md` for project architecture and coordination rules
3. Read `coordination/status.md` — check if any agents are blocked on you
4. Read `coordination/requests.md` — check for pending requests
5. Update your section in `coordination/status.md`
6. Start your dev server: `npx serve . -l 3011 --no-clipboard`

## Your Files
- **Own:** `src/art.js` — all rendering, display setup, colors
- **Read:** `src/shared.js`, all `coordination/` files
- **Never edit:** `src/level-design.js`, `src/gameplay.js`, `src/debug.js`

## Key Functions You Own
- `resizeDisplay()` — canvas sizing
- `draw()` — main draw orchestrator (NOTE: patched by debug.js)
- `drawSky()`, `drawTerrain()`, `drawCup()`, `drawFlag()`
- `drawTeeMarker()`, `drawBall()`, `drawAimUI()`, `drawHUD()`

## Globals You Write
- `W`, `displayScale` (via resizeDisplay)

## Color Constants (in shared.js)
- `SKY`, `GROUND`, `GROUND_LIGHT`, `BALL_COLOR`, `TEE_COLOR`
- To change colors, file a request to modify `shared.js`

## Goals
- Improve visual fidelity (gradients, particles, sky effects)
- Add subtle animations (flag waving, sand particles on impact)
- Improve the HUD design
- Add visual polish to transitions
- Consider day/night cycle or color palette variation per hole

## Submitting Your Work
When your changes are ready:
```bash
git add src/art.js
git commit -m "Description of changes"
```
Then add a merge request to `coordination/requests.md` asking QA to review your branch. **Do not merge directly to main** — all merges go through QA review first.
