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

// Course 1 — sand only, easy intro
WORLDS['desert-world-1'].courses['desert-course-1'] = {
  name: 'Desert Course 1',
  materials: ['sand'],
  archetypes: null,
  difficultyRange: [0.0, 0.5],
  holeCount: 10,
};

// Course 2 — sand + rock, moderate
WORLDS['desert-world-1'].courses['desert-course-2'] = {
  name: 'Desert Course 2',
  materials: ['sand', 'rock'],
  archetypes: null,
  difficultyRange: [0.3, 0.7],
  holeCount: 10,
};

// ── World 2: Desert World 2 ─────────────────────────────────
WORLDS['desert-world-2'] = {
  name: 'Desert World 2',
  system: 'Desert System',

  sky: '#d5ad72',
  materials: ['sand', 'rock', 'mud'],
  defaultMaterial: 'sand',

  assets: [
    'cactus_1', 'cactus_2', 'barrel_cactus_flowering',
    'prickly_pear_cactus', 'agave_small', 'desert_scrub_brush',
    'alien_eye_plant_small', 'purple_alien_eye_plant',
  ],

  courses: {},
};

// Course 3 — sand + rock + mud
WORLDS['desert-world-2'].courses['desert-course-3'] = {
  name: 'Desert Course 3',
  materials: ['sand', 'rock', 'mud'],
  archetypes: null,
  difficultyRange: [0.5, 0.85],
  holeCount: 10,
};

// Course 4 — all desert materials, hardest
WORLDS['desert-world-2'].courses['desert-course-4'] = {
  name: 'Desert Course 4',
  materials: ['sand', 'rock', 'mud'],
  archetypes: null,
  difficultyRange: [0.6, 1.0],
  holeCount: 10,
};
