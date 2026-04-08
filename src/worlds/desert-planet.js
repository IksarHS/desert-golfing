// ── Desert System ────────────────────────────────────────────
// The starter system. Two desert worlds, four courses total.

// WORLDS is declared in shared.js

// ── World 1: Desert World 1 ─────────────────────────────────
WORLDS['desert-world-1'] = {
  name: 'Desert World 1',
  system: 'Desert System',

  // Visual identity
  sky: '#d5ad72',

  // Materials available in this world
  materials: ['sand', 'rock', 'mud'],
  defaultMaterial: 'sand',

  // Assets available in this world (keys into SPRITE_CATALOG)
  assets: [
    'cactus_1', 'cactus_2', 'barrel_cactus_flowering',
    'prickly_pear_cactus', 'agave_small', 'desert_scrub_brush',
    'alien_eye_plant_small', 'purple_alien_eye_plant',
  ],

  // Courses within this world
  courses: {},
};

// Course 1: "Sand Dunes" — gentle rolling terrain, easy intro
WORLDS['desert-world-1'].courses['desert-course-1'] = {
  name: 'Sand Dunes',
  materials: ['sand'],
  archetypes: ['flat_run', 'gentle_slope', 'gentle_hill', 'downhill', 'uphill', 'rolling_hills'],
  difficultyRange: [0.0, 0.3],
  holeCount: 10,
};

// Course 2: "Rocky Ridge" — cliffs, shelves, and mesas
WORLDS['desert-world-1'].courses['desert-course-2'] = {
  name: 'Rocky Ridge',
  materials: ['sand', 'rock'],
  archetypes: ['cliff_drop', 'shelf', 'mesa', 'stepped_descent', 'cliff_shelf', 'uphill', 'downhill'],
  difficultyRange: [0.2, 0.6],
  holeCount: 10,
};

// ── World 2: Desert World 2 ─────────────────────────────────
WORLDS['desert-world-2'] = {
  name: 'Desert World 2',
  system: 'Desert System',

  sky: '#c9a066',
  materials: ['sand', 'rock', 'mud'],
  defaultMaterial: 'sand',

  assets: [
    'cactus_1', 'cactus_2', 'barrel_cactus_flowering',
    'prickly_pear_cactus', 'agave_small', 'desert_scrub_brush',
    'alien_eye_plant_small', 'purple_alien_eye_plant',
  ],

  courses: {},
};

// Course 3: "Canyonlands" — valleys, canyons, pockets
WORLDS['desert-world-2'].courses['desert-course-3'] = {
  name: 'Canyonlands',
  materials: ['sand', 'rock', 'mud'],
  archetypes: ['valley', 'canyon', 'canyon_cup', 'deep_pocket', 'cliff_drop', 'gentle_slope'],
  difficultyRange: [0.3, 0.7],
  holeCount: 10,
};

// Course 4: "The Gauntlet" — peaks, walls, fortresses, narrow gaps
WORLDS['desert-world-2'].courses['desert-course-4'] = {
  name: 'The Gauntlet',
  materials: ['sand', 'rock', 'mud'],
  archetypes: ['peak_obstacle', 'twin_peaks', 'wall_shot', 'fortress', 'narrow_gap', 'compound_terrain'],
  difficultyRange: [0.5, 1.0],
  holeCount: 10,
};

// Course 5: "Knife's Edge" — angular shelves, cliff drops, hard-angled slopes
// Based on analysis of real Desert Golfing holes 500-700
WORLDS['desert-world-2'].courses['knifes-edge'] = {
  name: "Knife's Edge",
  materials: ['sand', 'rock'],
  archetypes: ['mg_shelf_drop', 'mg_angular_valley', 'mg_slope_break', 'mg_double_shelf', 'mg_cliff_face', 'mg_notch'],
  difficultyRange: [0.3, 0.8],
  holeCount: 10,
};

// Course 6: "Classic 500" — 10 hand-recreated holes from real Desert Golfing (holes 500-700)
WORLDS['desert-world-2'].courses['classic-500'] = {
  name: 'Classic 500',
  materials: ['sand'],
  archetypes: null,
  difficultyRange: [0.3, 0.7],
  holeCount: 10,
  // These holes are loaded from REFERENCE_HOLES_500 in level-design.js
  handDefinedSource: 'REFERENCE_HOLES_500',
};
