// ── Mars ─────────────────────────────────────────────────────
// Second world. Inspired by Golf on Mars by Captain Games.
// Key terrain differences from Desert Golfing:
//   - Curved/organic surfaces instead of angular geometry
//   - Craters (circular depressions) as signature feature
//   - Arches and bridges with gaps underneath
//   - Undulating bumpy terrain with lots of small ripples
//   - Low friction rocky surfaces — ball rolls further
//   - More balanced elevation (not 75% downhill like desert)
//   - Smooth sinusoidal curves instead of sharp edges

// ── Mars Material ────────────────────────────────────────────
// Regolith: loose rocky dust. More bounce than sand, less than solid rock.
// Lower friction than sand — ball rolls further on Mars.
MATERIALS.regolith = { restitution: 0.30, rollingFriction: 0.91, surfaceFriction: 0.012 };

// ── Mars Terrain Helpers ─────────────────────────────────────

// Generate points along a smooth curve (sine-based interpolation)
// Returns array of {x, y} — far more organic than linear segments
function _marsArc(x0, y0, x1, y1, bulge, numPts) {
  const pts = [];
  for (let i = 1; i < numPts; i++) {
    const t = i / numPts;
    const x = lerp(x0, x1, t);
    // Sine-based bulge for smooth curvature
    const curve = Math.sin(t * Math.PI) * bulge;
    const y = clampY(lerp(y0, y1, t) - curve);
    pts.push({ x, y });
  }
  return pts;
}

// Generate a crater shape — circular depression
// Returns array of {x, y} vertices tracing the crater profile
function _marsCrater(centerX, surfaceY, radius, depth, numPts) {
  const pts = [];
  // Slight rim rise on both edges
  const rimH = depth * 0.08;
  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const angle = Math.PI * t; // 0 to PI (left rim to right rim)
    const x = centerX - radius + (2 * radius) * t;
    // Cosine bowl for the crater interior
    const craterProfile = Math.cos(angle); // -1 at center, 1 at edges
    // At edges (craterProfile=1): surface + slight rim rise
    // At center (craterProfile=-1): surface + depth
    const y = clampY(surfaceY - rimH * Math.max(0, craterProfile) + depth * (1 - craterProfile) / 2);
    pts.push({ x, y });
  }
  return pts;
}

// Smooth subdivision noise for Mars — creates gentle undulation
// Unlike desert's sharp micro-noise, Mars uses sine-based smoothing
function addMarsNoise(verts, startX, startY, difficulty) {
  const result = [];
  let prevV = { x: startX, y: startY };

  for (const v of verts) {
    const gap = v.x - prevV.x;
    if (gap > 50) {
      // More subdivision points than desert, smaller amplitude — smooth rolling surface
      const numPts = Math.max(2, Math.floor(gap / 40));
      for (let j = 1; j <= numPts; j++) {
        const t = j / (numPts + 1);
        const x = lerp(prevV.x, v.x, t);
        const baseY = lerp(prevV.y, v.y, t);
        // Gentle sine undulation instead of random noise
        const wave = Math.sin(x * 0.04 + prevV.x * 0.01) * (2 + difficulty * 3);
        const noise = (random() - 0.5) * (0.5 + difficulty * 1.5);
        result.push({ x, y: clampY(baseY + wave + noise), mat: v.mat || 'regolith' });
      }
    }
    result.push({ x: v.x, y: clampY(v.y), mat: v.mat || 'regolith' });
    prevV = v;
  }
  return result;
}

// ── Mars Archetypes ──────────────────────────────────────────
// Each generates curved, organic terrain — the opposite of desert's angular cuts.
// Golf on Mars terrain is characterized by:
//   - Smooth parabolic curves, not straight edges
//   - Craters of varying sizes
//   - Undulating bumpy surfaces
//   - Arches and bridges
//   - Rolling dunes with gentle sinusoidal profiles

archetypes.mars_crater = function(sx, sy, dist, cupY, diff) {
  // Single crater — smooth circular depression, the signature Mars feature
  // Ball rolls down one side, up the other. Cup can be on far rim or beyond.
  const craterCenter = sx + dist * randRange(0.35, 0.55);
  const craterRadius = randRange(80, 120 + diff * 30);
  const craterDepth = randRange(15, 30 + diff * 15);
  const surfaceLevel = (sy + cupY) / 2;

  const pts = _marsCrater(craterCenter, surfaceLevel, craterRadius, craterDepth, 10);
  // Add endpoint
  pts.push({ x: sx + dist, y: cupY });
  return pts;
};

archetypes.mars_double_crater = function(sx, sy, dist, cupY, diff) {
  // Two craters side by side — ball must navigate through both
  // Sizes are capped so craters don't overlap
  const r1 = randRange(50, 80 + diff * 30);
  const r2 = randRange(50, 80 + diff * 30);
  const minGap = 30; // minimum space between craters
  const totalSpan = r1 * 2 + r2 * 2 + minGap;
  // Place craters so they fit within the hole distance
  const margin = 60;
  const availableSpace = dist - margin * 2;
  const scale = availableSpace < totalSpan ? availableSpace / totalSpan : 1;
  const sr1 = r1 * scale;
  const sr2 = r2 * scale;
  const c1X = sx + margin + sr1;
  const c2X = c1X + sr1 + minGap * scale + sr2;

  const d1 = randRange(20, 40 + diff * 20);
  const d2 = randRange(20, 40 + diff * 20);
  const midY = lerp(sy, cupY, 0.5);

  const pts = [];
  const c1pts = _marsCrater(c1X, midY, sr1, d1, 6);
  for (const p of c1pts) pts.push(p);
  // Ridge between craters
  const ridgeX = c1X + sr1 + (c2X - sr2 - c1X - sr1) / 2;
  pts.push({ x: ridgeX, y: clampY(midY - 10) });
  const c2pts = _marsCrater(c2X, midY, sr2, d2, 6);
  for (const p of c2pts) pts.push(p);
  pts.push({ x: sx + dist, y: cupY });
  return pts;
};

archetypes.mars_smooth_dome = function(sx, sy, dist, cupY, diff) {
  // Smooth dome/hill — gentle parabolic profile, not angular peak
  // Asymmetric: approach side is gentle, far side drops to cup level
  const domeCenter = sx + dist * randRange(0.3, 0.5);
  const domeRadius = randRange(100, 160 + diff * 40);
  const domeHeight = randRange(15, 25 + diff * 15);
  const baseY = Math.max(sy, cupY);

  const pts = [];
  // Gentle approach ramp
  pts.push({ x: domeCenter - domeRadius - 20, y: clampY(baseY + 5) });
  // Smooth dome via arc — moderate height, easily lob-able
  const arcPts = _marsArc(
    domeCenter - domeRadius, baseY,
    domeCenter + domeRadius, baseY,
    domeHeight, 8
  );
  for (const p of arcPts) pts.push(p);
  // Gentle runout to cup
  pts.push({ x: domeCenter + domeRadius, y: clampY(baseY) });
  pts.push({ x: sx + dist, y: cupY });
  return pts;
};

archetypes.mars_undulating = function(sx, sy, dist, cupY, diff) {
  // Bumpy undulating terrain — multiple gentle sine waves
  // Like the rippled Martian surface, organic feel
  const numWaves = 3 + Math.floor(random() * (2 + diff * 2));
  const waveLen = dist / numWaves;
  const pts = [];

  for (let i = 0; i < numWaves; i++) {
    const t = (i + 0.5) / numWaves;
    const baseY = lerp(sy, cupY, t);
    const amp = randRange(10, 25 + diff * 20);
    const sign = (i % 2 === 0) ? -1 : 1;
    const wx = sx + waveLen * (i + 0.5);
    pts.push({ x: wx, y: clampY(baseY + sign * amp) });
  }
  pts.push({ x: sx + dist, y: cupY });
  return pts;
};

archetypes.mars_arch = function(sx, sy, dist, cupY, diff) {
  // Natural rock arch — terrain rises in a smooth hump, drops back down
  // Wider and less steep than the dome — more of a broad bridge shape
  const archCenter = sx + dist * randRange(0.35, 0.55);
  const archSpan = randRange(140, 220 + diff * 60);
  const archHeight = randRange(15, 25 + diff * 15);
  const baseY = clampY(Math.max(sy, cupY) + 5);

  const pts = [];
  // Gentle approach ramp
  pts.push({ x: archCenter - archSpan / 2 - 40, y: clampY(baseY + 5) });
  // Smooth arch top via arc points — wide and gentle
  const arcPts = _marsArc(
    archCenter - archSpan / 2, baseY,
    archCenter + archSpan / 2, baseY,
    archHeight, 8
  );
  for (const p of arcPts) pts.push(p);
  // Right side back to ground
  pts.push({ x: archCenter + archSpan / 2, y: clampY(baseY) });
  pts.push({ x: sx + dist, y: cupY });
  return pts;
};

archetypes.mars_bowl = function(sx, sy, dist, cupY, diff) {
  // Wide smooth bowl — gentle concave curve, the ball rolls down into it
  // Cup placed at or near the bowl bottom for natural ball-gathering play
  const bowlStart = sx + dist * randRange(0.1, 0.2);
  const bowlEnd = sx + dist * randRange(0.75, 0.9);
  const bowlDepth = randRange(20, 40 + diff * 25);
  const rimY = Math.min(sy, cupY);

  const pts = [];
  pts.push({ x: bowlStart, y: clampY(rimY) });
  // Gentle concave curve (negative bulge)
  const arcPts = _marsArc(bowlStart, rimY, bowlEnd, rimY, -bowlDepth, 10);
  for (const p of arcPts) pts.push(p);
  pts.push({ x: bowlEnd, y: clampY(rimY) });
  // Cup near the bowl end at rim level — don't force big climb after bowl
  pts.push({ x: sx + dist, y: clampY(rimY + (random() - 0.3) * 15) });
  return pts;
};

archetypes.mars_plateau_crater = function(sx, sy, dist, cupY, diff) {
  // Elevated area with a crater — ball rolls up gentle slope, into crater, then down
  const platStart = sx + dist * randRange(0.15, 0.25);
  const platEnd = sx + dist * randRange(0.65, 0.8);
  const platHeight = randRange(20, 40 + diff * 25);
  const platY = clampY(Math.min(sy, cupY) - platHeight);
  const craterRadius = randRange(40, 55 + diff * 20);
  const craterDepth = randRange(15, 30 + diff * 15);
  const craterCenterX = (platStart + platEnd) / 2;

  const pts = [];
  // Gentle ramp up via arc
  const rampPts = _marsArc(platStart, sy, platStart + 80, platY, 10, 4);
  for (const p of rampPts) pts.push(p);
  // Plateau surface leading to crater
  pts.push({ x: craterCenterX - craterRadius - 15, y: platY });
  // Crater
  const craterPts = _marsCrater(craterCenterX, platY, craterRadius, craterDepth, 6);
  for (const p of craterPts) pts.push(p);
  pts.push({ x: craterCenterX + craterRadius + 15, y: platY });
  // Gentle ramp down via arc
  const downPts = _marsArc(platEnd - 80, platY, platEnd, cupY, 10, 4);
  for (const p of downPts) pts.push(p);
  pts.push({ x: sx + dist, y: cupY });
  return pts;
};

archetypes.mars_ridge_line = function(sx, sy, dist, cupY, diff) {
  // Series of connected smooth ridges — like a mountain range seen from the side
  // Smooth parabolic peaks connected by saddles
  const numRidges = 2 + Math.floor(random() * (1 + diff));
  const segW = dist / (numRidges + 1);
  const pts = [];

  for (let i = 1; i <= numRidges; i++) {
    const rx = sx + segW * i;
    const ridgeH = randRange(20, 45 + diff * 25);
    const ridgeW = randRange(60, 100);
    const baseY = lerp(sy, cupY, i / (numRidges + 1));
    const peakY = clampY(baseY - ridgeH);

    // Smooth peak via arc
    const peakPts = _marsArc(rx - ridgeW, baseY, rx + ridgeW, baseY, ridgeH, 5);
    for (const p of peakPts) pts.push(p);
  }
  pts.push({ x: sx + dist, y: cupY });
  return pts;
};

// ── Mars Archetype Table ─────────────────────────────────────
// All Mars archetypes prefixed with mars_ to avoid collision with desert ones
const MARS_ARCHETYPE_ENTRIES = [
  // Easy — gentle Mars terrain
  ['mars_crater',          0.0,  1.0, 4],
  ['mars_smooth_dome',     0.0,  0.8, 3],
  ['mars_bowl',            0.0,  0.8, 3],
  ['mars_undulating',      0.0,  1.0, 3],
  // Medium — more complex formations
  ['mars_double_crater',   0.15, 1.0, 3],
  ['mars_arch',            0.2,  1.0, 3],
  ['mars_ridge_line',      0.25, 1.0, 3],
  // Hard — compound features
  ['mars_plateau_crater',  0.35, 1.0, 3],
];

// Register Mars archetypes in the global table
for (const entry of MARS_ARCHETYPE_ENTRIES) {
  ARCHETYPE_TABLE.push(entry);
}

// ── Mars World Definition ────────────────────────────────────

WORLDS['mars'] = {
  name: 'Mars',

  // Visual identity — rusty red/brown Martian sky
  sky: '#c4713a',

  // Materials available
  materials: ['regolith', 'rock', 'ice'],
  defaultMaterial: 'regolith',

  // Courses within Mars
  courses: {},
};

// ── Course: Olympus Mons ─────────────────────────────────────
// Introduction to Mars terrain. Craters, domes, and smooth curves.
// Moderate difficulty — the terrain itself is the puzzle.
WORLDS['mars'].courses['olympus-mons'] = {
  name: 'Olympus Mons',

  materials: ['regolith', 'rock'],
  defaultMaterial: 'regolith',

  // Only Mars archetypes — no desert shapes
  archetypes: [
    'mars_crater', 'mars_smooth_dome', 'mars_bowl', 'mars_undulating',
    'mars_double_crater', 'mars_arch',
  ],

  difficultyRange: [0.0, 0.45],
  holeCount: 18,
  difficulty: 'Medium',

  // Mars cup elevation: more balanced than desert, smaller elevation changes
  // Keeps holes playable on smooth terrain (less extremes = fewer stuck situations)
  cupElevation: function(teeY, difficulty) {
    const roll = random();
    if (roll < 0.40) {
      // Same level (40%)
      return clampY(teeY + (random() - 0.5) * 15);
    } else if (roll < 0.65) {
      // Cup higher = uphill (25%)
      return clampY(teeY - randRange(15, 30 + difficulty * 35));
    } else {
      // Cup lower = downhill (35%)
      return clampY(teeY + randRange(15, 35 + difficulty * 40));
    }
  },

  // Smooth rolling noise instead of desert's sharp micro-noise
  noiseFunction: addMarsNoise,

  // Rising terrain after the cup prevents ball from overshooting and going OOB.
  // Smooth Mars terrain causes balls to roll further after landing — this backstop
  // catches them. Negative = terrain rises (lower Y).
  backstopBias: -60,
};

// ── Course: Valles Marineris ─────────────────────────────────
// Harder Mars course — deep canyons, challenging arch shots, compound craters.
WORLDS['mars'].courses['valles-marineris'] = {
  name: 'Valles Marineris',

  materials: ['regolith', 'rock', 'ice'],
  defaultMaterial: 'regolith',

  archetypes: [
    'mars_crater', 'mars_undulating',
    'mars_double_crater', 'mars_arch', 'mars_ridge_line', 'mars_plateau_crater',
  ],

  difficultyRange: [0.2, 0.9],
  holeCount: 18,
  difficulty: 'Hard',

  cupElevation: function(teeY, difficulty) {
    const roll = random();
    if (roll < 0.20) {
      return clampY(teeY + (random() - 0.5) * 20);
    } else if (roll < 0.55) {
      return clampY(teeY - randRange(30, 60 + difficulty * 90));
    } else {
      return clampY(teeY + randRange(30, 60 + difficulty * 90));
    }
  },

  noiseFunction: addMarsNoise,

  backstopBias: -30,
};
