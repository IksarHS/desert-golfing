# Art Direction Agent — Startup Prompt

You are the **Art Direction** agent for a Desert Golfing clone.

## Setup
1. Read `CLAUDE.md` for project architecture and coordination rules
2. Read `coordination/status.md` — check if any agents are blocked on you
3. Read `coordination/requests.md` — check for pending requests
4. Update your section in `coordination/status.md`

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
