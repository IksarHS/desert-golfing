# Briefing: Building a New Hole Generator

## Your Task

Build a new hole generator for a different planet/course that is **distinct from the current desert generator**. The new generator should reference **Golf on Mars** as its visual/gameplay inspiration, the same way the current generator was built by studying **Desert Golfing**.

The generator should plug into the existing engine — same vertex format, same cup placement, same physics — but produce holes that feel completely different to play.

## Reference Games

- **Desert Golfing** (current inspiration): https://www.youtube.com/watch?v=HO3WjtZgSMU
- **Golf on Mars** (new inspiration): Search YouTube for "Golf on Mars gameplay"

Golf on Mars is by the same developer as Desert Golfing but has distinct terrain characteristics — more curved/organic shapes, craters, arches, low-gravity feel, and Martian aesthetics.

## How the Current Generator Works

### The Pipeline

Every hole goes through this pipeline:

```
generateHoleTerrain(holeIndex)
  ├─ getDifficulty(holeIndex) → 0.0-1.0 (logarithmic curve)
  ├─ Determine tee position (= previous hole's cup)
  ├─ Calculate hole distance (600-1000px + difficulty bonus)
  ├─ Determine cup elevation (75% downhill, 15% uphill, 10% level)
  ├─ pickArchetype(difficulty) → select terrain shape
  ├─ archetype function → raw vertices [{x, y}, ...]
  ├─ addMicroNoise() → subdivide long segments with subtle roughness
  ├─ Append to global vertices[] array (must maintain X-order!)
  ├─ Add 2 background vertices past the cup
  └─ placeCup() → carve cup notch into terrain
```

### Architecture: Archetypes

The desert generator uses **21 named archetypes**, each a function that takes `(startX, teeY, dist, cupTargetY, difficulty)` and returns an array of `{x, y}` vertices.

Each archetype has:
- A **difficulty range** (e.g., `canyon` only appears at difficulty 0.35+)
- A **weight** for selection probability
- A **terrain shape recipe** that places vertices to create a specific landform

The current desert archetypes all produce **angular, sharp geometry** — vertical walls (6-20px wide), sharp peaks, rectangular mesas, flat plateaus with hard edges. This is the Desert Golfing aesthetic: everything looks like it was cut from sandstone with straight edges.

**Current archetype list** (by difficulty tier):
- **Easy (0.0+)**: flat_run, gentle_slope, gentle_hill
- **Easy-Med (0.0-0.1+)**: downhill, uphill, rolling_hills
- **Medium (0.15-0.25+)**: cliff_drop, valley, shelf, mesa
- **Med-Hard (0.3-0.5+)**: peak_obstacle, wall_shot, stepped_descent, canyon, twin_peaks, deep_pocket, canyon_cup, fortress, narrow_gap, cliff_shelf
- **Hard (0.6+)**: compound_terrain (combines multiple features)

### Key Constraints Your Generator Must Follow

1. **Vertex X-ordering**: The global `vertices` array must always be sorted by ascending X. Never push a vertex with X less than the previous vertex's X.

2. **Y-clamping**: All Y coordinates must stay within `H * 0.20` to `H * 0.90` (where H=540). Use `clampY(y)`.

3. **Hole distance**: Currently 600-1000px. Can be different per course but must ensure the cup is visible from the tee while the NEXT hole's cup is NOT visible.

4. **Cup placement**: Don't worry about this — call the existing `placeCup()` function. It carves a 36px-wide, 20px-deep notch into whatever terrain you generate.

5. **Background vertices**: Add 2 vertices past the cup to provide terrain continuity to the next hole.

6. **Return format**: Your archetype functions return `[{x, y}, ...]` — just an array of vertex positions. The engine handles everything else.

### How We Built the Desert Generator (Our Process)

1. **Studied real Desert Golfing footage** — analyzed 990 holes from actual gameplay
2. **Extracted terrain statistics** — height ranges, flatness, steepness, cup placement patterns
3. **Identified recurring shapes** — valley, cliff, mesa, peak, stepped terrain, etc.
4. **Built each as a parameterized archetype** — functions that produce vertices given difficulty and distance
5. **Added micro-noise** — subtle roughness on long straight segments to avoid perfectly geometric terrain
6. **Tuned the difficulty curve** — logarithmic ramp that slowly introduces harder archetypes over hundreds of holes
7. **Added anti-repetition** — tracks last 3 archetypes and halves their weight to avoid back-to-back repeats

**We recommend following a similar process for Golf on Mars**: watch gameplay, identify the shapes that make it distinct, build archetypes that capture those shapes.

## What Makes Golf on Mars Different

This is where your creative work comes in. Study Golf on Mars gameplay and identify:

- **Terrain shapes**: What landforms appear? Craters? Arches? Curved slopes? How do they differ from Desert Golfing's angular geometry?
- **Curvature**: Golf on Mars terrain tends to be more curved/organic vs Desert Golfing's straight edges. How do you represent curves with vertices?
- **Gravity**: Golf on Mars has lower gravity. This is a physics parameter, not a terrain parameter, but it affects what terrain shapes are fun to play.
- **Scale**: Are holes longer? Shorter? More vertical?
- **Elevation patterns**: Does it favor uphill, downhill, or flat? How does cup placement differ?

## How to Integrate

### File Structure

Create a new file: `src/worlds/mars.js` (or similar). This file should:

1. Define a new world in the `WORLDS` global:
```javascript
WORLDS['mars'] = {
  name: 'Mars',
  courses: {
    'olympus-mons': {
      name: 'Olympus Mons',
      holeCount: 18,
      generator: 'mars',  // tells the engine which generator to use
    }
  }
};
```

2. Register your archetypes so the generator can use them.

### What You Can Modify

- **Archetype functions**: Create entirely new terrain shapes
- **Archetype selection weights and difficulty ranges**: Different progression
- **Micro-noise parameters**: More or less roughness, different character
- **Distance ranges**: Holes can be longer/shorter
- **Cup elevation bias**: Different uphill/downhill ratios
- **Materials**: Mars might use `rock` and `ice` instead of `sand`

### What You Should NOT Modify

- `shared.js` globals (vertices, holes, ball, camera, etc.)
- `placeCup()` function
- `terrainYAt()` or collision code
- The rendering pipeline
- The editor

### Testing

- Use the editor at `localhost:3010/editor.html` to preview generated holes
- Use `_archetypeOverride = 'your_archetype_name'` in console to force-test specific archetypes
- Use `_difficultyOverride = 0.5` to test at specific difficulty levels
- The editor's "Set Auto" button regenerates the current hole with a new random seed

## Technical Reference

### Key Functions in level-design.js

```javascript
// Your archetype function signature:
function myArchetype(startX, teeY, dist, cupTargetY, difficulty) {
  // startX: where terrain starts (teeX + 40)
  // teeY: tee elevation
  // dist: total hole distance
  // cupTargetY: suggested cup elevation
  // difficulty: 0.0-1.0

  const verts = [];
  // ... build your terrain shape ...
  // Last vertex should be at or near (startX + dist - 40, cupTargetY)
  return verts;
}

// Useful helpers available globally:
random()              // seeded PRNG, 0-1
randRange(min, max)   // random integer in range
clampY(y)             // clamp to playable zone
jitter(value, amount) // value ± random amount
```

### Key Constants (shared.js)

```javascript
const H = 540;              // game world height
const BALL_RADIUS = 5;      // ball size
const CUP_WIDTH = 36;       // cup opening width
const CUP_DEPTH = 20;       // cup depth
const HOLE_DIST_MIN = 600;  // min hole distance
const HOLE_DIST_MAX = 1000; // max hole distance
```

### Materials Available

```javascript
const MATERIALS = {
  sand:  { restitution: 0.47, rollingFriction: 0.98,  surfaceFriction: 0.004 },
  grass: { restitution: 0.35, rollingFriction: 0.95,  surfaceFriction: 0.008 },
  ice:   { restitution: 0.55, rollingFriction: 0.998, surfaceFriction: 0.001 },
  rock:  { restitution: 0.75, rollingFriction: 0.97,  surfaceFriction: 0.003 },
  mud:   { restitution: 0.15, rollingFriction: 0.90,  surfaceFriction: 0.015 },
};
```

You can add new materials to this object if Mars needs them (e.g., `regolith`, `crater_dust`).

## Deliverable

A working prototype that:
1. Defines a Mars world with at least one course
2. Has at least 5-8 unique archetypes that feel distinctly "Mars" (not desert)
3. Generates playable holes that are fun and visually distinct
4. Follows all the constraints above
5. Can be tested in the existing editor and game
