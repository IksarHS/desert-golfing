# Interface Contracts

Canonical function signatures for all cross-module calls. Update this file whenever a signature changes.

---

## `shared.js` — Utilities (available to all)

```js
function clampY(y: number) → number
// Clamp terrain Y to valid range [H*0.20, H*0.90]

function lerp(a: number, b: number, t: number) → number
// Linear interpolation

function randRange(lo: number, hi: number) → number
// Random float in [lo, hi)

function jitter(y: number, amount: number) → number
// Add random jitter to Y, clamped

function terrainYAt(worldX: number) → number
// Sample terrain height at world X coordinate (linear interpolation between vertices)

function toGameCoords(clientX: number, clientY: number) → {x: number, y: number}
// Convert screen/mouse coordinates to game-world coordinates
```

## `level-design.js` — Terrain Generation

```js
function generateHoleTerrain(holeIndex: number) → void
// Generate terrain + cup for hole at given index. Mutates `vertices` and `holes`.

function placeCup(holeIndex: number, cupX: number, teeX: number, teeY: number) → {cupX, cupY, teeX, teeY}
// Carve cup notch into terrain at cupX. Pushes to `holes` array.

function flattenCup(hole: HoleObject) → void
// Replace cup notch with flat terrain (called after transition).

function ensureHolesAhead(upToHole: number) → void
// Generate terrain for all holes up to and including upToHole.

function pickArchetype(difficulty: number) → string
// Select terrain archetype name based on difficulty (0-1).
```

## `art.js` — Rendering

```js
function resizeDisplay() → void
// Recalculate canvas dimensions and display scale. Updates W and displayScale.

function draw() → void
// Main draw orchestrator. Calls all draw* functions in order.
// NOTE: Patched by debug.js to add overlay rendering.

function drawSky() → void
function drawTerrain() → void
function drawCup(hole: HoleObject) → void
function drawFlag(hole: HoleObject) → void
function drawTeeMarker(hole: HoleObject) → void
function drawBall() → void
function drawAimUI() → void
function drawHUD() → void
```

## `gameplay.js` — Physics & State

```js
function setHoleCamera(hole: HoleObject) → void
// Position camera to frame the given hole (tee on left, cup on right).

function findSegment(worldX: number) → number
// Find vertex index i where vertices[i].x <= worldX <= vertices[i+1].x

function segmentNormal(i: number) → {x: number, y: number}
// Return surface normal (unit vector) for segment between vertices[i] and vertices[i+1]

function collideWithTerrain() → boolean
// Circle-vs-segment collision. Mutates ball position/velocity. Returns true if contact.

function isBallInCup() → boolean
// Check if ball is resting inside current hole's cup.

function isBallOffScreen() → boolean
// Check if ball has left the visible screen area.

function updatePhysics() → void
// One frame of physics: gravity, movement, collision, friction, rest detection.

function update() → void
// Main game state machine. Called once per frame before draw().
```

## `debug.js` — Debug Tools

```js
// Overrides:
_logBall = function(reason: string) → void
// Records ball state to _ballLog array. Replaces no-op from shared.js.

// Patches:
draw = function() { _origDraw(); /* debug overlays */ }
// Wraps art.js draw() to add settings panel / ball log overlay.

// Console API:
window.ballLog(n?: number) → string    // Print last n entries (default 60)
window.ballLogFull() → string           // Print all entries
window.ballLogClear() → string          // Clear log
```

## `main.js` — Game Loop

```js
function gameLoop() → void
// Called via requestAnimationFrame. Increments frame counter, calls update() then draw().

function init() → void
// Bootstrap: generate first 3 holes, place ball, set camera, start loop.
```

---

## Shared Types

```js
// HoleObject (elements of `holes` array):
{
  cupX: number,          // world X of cup center
  cupY: number,          // world Y of cup rim
  cupFilled: boolean,    // true after transition completes
  cupFillProgress: number, // 0-1 animation progress
  flagHole: number,      // display number (1-indexed)
  flagVisible: boolean,  // false after transition
  flagOpacity: number,   // 0-1 for fade animation
  teeX: number,          // world X of tee
  teeY: number           // world Y of tee
}

// Vertex (elements of `vertices` array):
{ x: number, y: number }

// Ball:
{ x: number, y: number, vx: number, vy: number, onGround: boolean, atRest: boolean }
```
