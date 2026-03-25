// ── Desert Planet ────────────────────────────────────────────
// First world. Arid, orange-brown landscape. Sand, rock, mud.
// Multiple courses explore different terrain styles within the desert biome.

// WORLDS is declared in shared.js

WORLDS['desert-planet'] = {
  name: 'Desert Planet',

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

// ── Course: Barren Flats ────────────────────────────────────
// Intro course. Simple terrain, sparse vegetation, easy difficulty.
// The first thing players see — gentle and approachable.
WORLDS['desert-planet'].courses['desert-course-1'] = {
  name: 'Desert Course 1',

  // Material subset + default
  materials: ['sand', 'rock'],
  defaultMaterial: 'sand',

  // Use all archetypes — difficulty gating handles progression
  archetypes: null,

  // Difficulty range — maps the global 0→1 curve into this window
  difficultyRange: [0.0, 0.5],

  // Total holes in this course
  holeCount: 10,
  difficulty: 'Easy',
};
