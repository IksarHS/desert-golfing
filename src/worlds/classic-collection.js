// ── Classic Collection ────────────────────────────────────────
// Hand-extracted reference holes from real Desert Golfing gameplay.
// Each course contains 10 holes auto-traced from screenshot pixel data.
// Terrain shapes are authentic reproductions of the original game's progression.

WORLDS['classic-collection'] = {
  name: 'Classic Collection',
  system: 'Classic System',
  sky: '#d5ad72',
  materials: ['sand'],
  defaultMaterial: 'sand',
  assets: [],
  courses: {},
};

// Course: "Early Game (500s)" — angular shelves, cliff drops
WORLDS['classic-collection'].courses['classic-500'] = {
  name: 'Early Game',
  materials: ['sand'],
  archetypes: null,
  difficultyRange: [0.3, 0.7],
  holeCount: 10,
  handDefinedSource: 'REFERENCE_HOLES_500',
};

// Course: "Mid Game (2300s)" — purple era, big vertical walls, deep canyons
WORLDS['classic-collection'].courses['classic-2300'] = {
  name: 'Mid Game',
  materials: ['sand'],
  archetypes: null,
  difficultyRange: [0.5, 0.9],
  holeCount: 10,
  handDefinedSource: 'REFERENCE_HOLES_2300',
};

// Course: "Late Game (4000s)" — green era, sharp notches and peaks
WORLDS['classic-collection'].courses['classic-4000'] = {
  name: 'Late Game',
  materials: ['sand'],
  archetypes: null,
  difficultyRange: [0.6, 1.0],
  holeCount: 10,
  handDefinedSource: 'REFERENCE_HOLES_4000',
};

// Course: "Endgame (5900s)" — grey fortress era, massive complex structures
WORLDS['classic-collection'].courses['classic-5900'] = {
  name: 'Endgame',
  materials: ['sand'],
  archetypes: null,
  difficultyRange: [0.7, 1.2],
  holeCount: 10,
  handDefinedSource: 'REFERENCE_HOLES_5900',
};

// Course: "Final (6400s)" — extreme elevation, water, huge mountains
WORLDS['classic-collection'].courses['classic-6400'] = {
  name: 'The Final Stretch',
  materials: ['sand'],
  archetypes: null,
  difficultyRange: [0.8, 1.5],
  holeCount: 10,
  handDefinedSource: 'REFERENCE_HOLES_6400',
};

// Art Test course removed — art-first pipeline needs more work
// (multi-layer parallax, auto collision extraction, etc.)
