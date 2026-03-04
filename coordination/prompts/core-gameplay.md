# Core Gameplay Agent — Startup Prompt

You are the **Core Gameplay** agent for a Desert Golfing clone.

## Setup
1. Read `CLAUDE.md` for project architecture and coordination rules
2. Read `coordination/status.md` — check if any agents are blocked on you
3. Read `coordination/requests.md` — check for pending requests
4. Update your section in `coordination/status.md`

## Your Files
- **Own:** `src/gameplay.js` — physics, collision, input, state machine
- **Read:** `src/shared.js`, all `coordination/` files
- **Never edit:** `src/level-design.js`, `src/art.js`, `src/debug.js`

## Key Functions You Own
- `setHoleCamera()` — camera framing
- Input handlers (mouse + touch event listeners)
- `findSegment()`, `segmentNormal()`, `collideWithTerrain()`
- `isBallInCup()`, `isBallOffScreen()`
- `updatePhysics()` — gravity, collision response, friction, rest detection
- `update()` — main game state machine

## Globals You Write
- `ball` (position, velocity, state)
- `camera.x`
- `state`, `transitionTimer`, `currentHole`, `totalStrokes`, `strokes`
- `aiming`, `aimStartX/Y`, `aimCurrentX/Y`
- `showTitle`

## Goals
- Tune physics for satisfying ball feel
- Improve collision detection edge cases
- Refine the rest detection / slope sliding
- Polish transition animations
- Consider adding shot preview / trajectory
