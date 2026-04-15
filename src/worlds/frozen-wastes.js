// ── Frozen Wastes System ─────────────────────────────────────
// Ice and rock terrain. Slippery surfaces, bouncy cliffs.

WORLDS['frozen-wastes-1'] = {
  name: 'Frozen Wastes',
  system: 'Frozen Wastes System',

  sky: '#8a9bb0',  // blue-grey winter sky
  materials: ['ice', 'rock', 'sand'],
  defaultMaterial: 'ice',

  assets: [],
  courses: {},
};

// Course: "Ice Fields" — gentle icy terrain, lots of sliding
WORLDS['frozen-wastes-1'].courses['ice-fields'] = {
  name: 'Ice Fields',
  materials: ['ice'],
  archetypes: ['flat_run', 'gentle_slope', 'gentle_hill', 'downhill', 'uphill', 'rolling_hills'],
  difficultyRange: [0.0, 0.4],
  holeCount: 500,
};

// Course: "Frozen Cliffs" — ice shelves and rocky drops
WORLDS['frozen-wastes-1'].courses['frozen-cliffs'] = {
  name: 'Frozen Cliffs',
  materials: ['ice', 'rock'],
  archetypes: ['cliff_drop', 'shelf', 'stepped_descent', 'cliff_shelf', 'valley', 'mesa'],
  difficultyRange: [0.3, 0.8],
  holeCount: 500,
};

// Course: "Glacier Run" — extreme ice with peaks and fortress terrain
WORLDS['frozen-wastes-1'].courses['glacier-run'] = {
  name: 'Glacier Run',
  materials: ['ice', 'rock', 'sand'],
  archetypes: ['peak_obstacle', 'twin_peaks', 'fortress', 'narrow_gap', 'wall_shot', 'compound_terrain'],
  difficultyRange: [0.5, 1.2],
  holeCount: 500,
};
