// ── Mudlands System ──────────────────────────────────────────
// Sticky mud terrain mixed with grass. High friction, tricky rolls.

WORLDS['mudlands-1'] = {
  name: 'Mudlands',
  system: 'Mudlands System',

  sky: '#9a8a6a',  // warm brown-green sky
  materials: ['mud', 'grass', 'rock'],
  defaultMaterial: 'mud',

  assets: [],
  courses: {},
};

// Course: "Boggy Flats" — gentle muddy terrain, slow rolling
WORLDS['mudlands-1'].courses['boggy-flats'] = {
  name: 'Boggy Flats',
  materials: ['mud', 'grass'],
  archetypes: ['flat_run', 'gentle_slope', 'gentle_hill', 'rolling_hills', 'downhill', 'uphill'],
  difficultyRange: [0.0, 0.4],
  holeCount: 500,
};

// Course: "Marshlands" — valleys and canyons with mud and rock
WORLDS['mudlands-1'].courses['marshlands'] = {
  name: 'Marshlands',
  materials: ['mud', 'grass', 'rock'],
  archetypes: ['valley', 'canyon', 'deep_pocket', 'canyon_cup', 'cliff_drop', 'shelf'],
  difficultyRange: [0.3, 0.8],
  holeCount: 500,
};

// Course: "The Mire" — extreme mud terrain with peaks and walls
WORLDS['mudlands-1'].courses['the-mire'] = {
  name: 'The Mire',
  materials: ['mud', 'rock', 'grass'],
  archetypes: ['peak_obstacle', 'twin_peaks', 'wall_shot', 'fortress', 'narrow_gap', 'compound_terrain'],
  difficultyRange: [0.5, 1.2],
  holeCount: 500,
};
