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
  archetypes: ['gentle_slope', 'gentle_hill', 'rolling_hills', 'downhill', 'uphill', 'valley'],
  difficultyRange: [0.0, 0.4],
  holeCount: 10,
};

// Course 6: "Deep Valleys" — dramatic elevation, canyons with water at the bottom
WORLDS['grasslands-1'].courses['deep-valleys'] = {
  name: 'Deep Valleys',
  materials: ['grass', 'rock', 'water'],
  archetypes: ['valley', 'canyon', 'canyon_cup', 'deep_pocket', 'cliff_drop', 'shelf', 'stepped_descent'],
  difficultyRange: [0.3, 0.8],
  holeCount: 10,
};

// Course 7: "Highland Fortress" — peaks, walls, complex terrain
WORLDS['grasslands-1'].courses['highland-fortress'] = {
  name: 'Highland Fortress',
  materials: ['grass', 'rock', 'mud'],
  archetypes: ['peak_obstacle', 'twin_peaks', 'fortress', 'wall_shot', 'mesa', 'cliff_shelf', 'narrow_gap'],
  difficultyRange: [0.5, 1.0],
  holeCount: 10,
};
