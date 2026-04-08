// ── Grasslands System ────────────────────────────────────────
// Green rolling hills, deep valleys with water, dramatic elevation.

// ── World 3: Grasslands ─────────────────────────────────────
WORLDS['grasslands-1'] = {
  name: 'Grasslands',
  system: 'Grasslands System',

  sky: '#b8c8a0',  // muted olive-green sky
  materials: ['grass', 'rock', 'mud', 'water'],
  defaultMaterial: 'grass',

  assets: [],
  courses: {},
};

// Course 5: "Green Hills" — gentle rolling grass, easy intro
WORLDS['grasslands-1'].courses['green-hills'] = {
  name: 'Green Hills',
  materials: ['grass'],
  archetypes: ['gentle_slope', 'gentle_hill', 'rolling_hills', 'downhill', 'uphill', 'dramatic_ridge'],
  difficultyRange: [0.0, 0.4],
  holeCount: 10,
};

// Course 6: "Deep Valleys" — dramatic elevation, shelves dropping into valleys with water
WORLDS['grasslands-1'].courses['deep-valleys'] = {
  name: 'Deep Valleys',
  materials: ['grass', 'rock', 'water'],
  archetypes: ['deep_plunge', 'cliff_valley_climb', 'water_valley', 'shelf_drop_shelf'],
  difficultyRange: [0.4, 1.0],
  holeCount: 10,
};

// Course 7: "Highland Fortress" — peaks, ridges, dramatic terrain
WORLDS['grasslands-1'].courses['highland-fortress'] = {
  name: 'Highland Fortress',
  materials: ['grass', 'rock', 'mud'],
  archetypes: ['dramatic_ridge', 'deep_plunge', 'cliff_valley_climb', 'shelf_drop_shelf'],
  difficultyRange: [0.5, 1.2],
  holeCount: 10,
};
