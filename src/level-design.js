// ── Seeded PRNG ──────────────────────────────────────────────
// Mulberry32: fast, high-quality 32-bit PRNG for reproducible terrain
function _mulberry32(seed) {
  return function() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let _prngFn = null;       // null = use Math.random (default/unseeded)
let _currentSeed = null;

function random() {
  return _prngFn ? _prngFn() : Math.random();
}

function setSeed(seed) {
  if (seed === null || seed === undefined) {
    _prngFn = null;
    _currentSeed = null;
  } else {
    _currentSeed = seed | 0;
    _prngFn = _mulberry32(_currentSeed);
  }
}

function getSeed() {
  return _currentSeed;
}

// Override shared.js utilities to route through seeded PRNG
randRange = function(lo, hi) { return lo + random() * (hi - lo); };
jitter = function(y, amount) { return clampY(y + (random() - 0.5) * amount); };

// ── Sandbox Override Hooks ──────────────────────────────────
// Set these from sandbox.html to control generation; null = default behavior
let _archetypeOverride = null;
let _difficultyOverride = null;

// ── Difficulty Curve ─────────────────────────────────────────
// Logarithmic ramp matching real Desert Golfing's gradual progression.
// Analysis of 990 real holes shows difficulty ramps over ~2000 holes:
//   - Height range grows from 0.24 → 0.40
//   - Flatness decreases from 0.57 → 0.40
//   - Steepness increases from 0.03 → 0.07
function getDifficulty(holeIndex) {
  if (_difficultyOverride !== null) return _difficultyOverride;
  if (holeIndex <= 0) return 0;
  // ~0.32 at hole 10, ~0.52 at hole 50, ~0.61 at hole 100
  // ~0.70 at hole 200, ~0.82 at hole 500, ~0.91 at hole 1000, ~1.0 at hole 2000
  return Math.min(1.0, Math.log(1 + holeIndex) / Math.log(1 + 2000));
}

// ── Terrain Micro-Noise ──────────────────────────────────────
// Real Desert Golfing has subtle roughness (~0.006 normalized per sample).
// Insert intermediate vertices on long segments with small perturbations
// for organic, natural-looking terrain instead of perfectly straight lines.
function addMicroNoise(verts, startX, startY, difficulty) {
  const noiseAmp = 2 + difficulty * 4; // 2-6px of noise
  const result = [];
  let prevV = { x: startX, y: startY };

  for (const v of verts) {
    const gap = v.x - prevV.x;
    if (gap > 80) {
      const numPts = gap > 200 ? 3 : gap > 120 ? 2 : 1;
      for (let j = 1; j <= numPts; j++) {
        const t = j / (numPts + 1);
        const x = lerp(prevV.x, v.x, t);
        const baseY = lerp(prevV.y, v.y, t);
        result.push({ x, y: clampY(baseY + (random() - 0.5) * noiseAmp) });
      }
    }
    result.push({ x: v.x, y: clampY(v.y) });
    prevV = v;
  }
  return result;
}

// ── Archetype Library ─────────────────────────────────────
// Each archetype returns an array of {x, y} vertices for one hole's terrain.
// Parameters: startX, startY, dist (tee-to-cup distance), cupTargetY, difficulty (0-1)
// The LAST vertex should be near the cup zone. Background vertices are added separately.
// Based on analysis of real Desert Golfing gameplay footage (holes 1-6400).
// Real DG uses sharp, angular, construction-paper geometry — not smooth curves.

const archetypes = {
  // ── EASY ──────────────────────────────────────────────
  flat_run(sx, sy, dist, cupY, diff) {
    // Nearly flat with maybe one gentle kink
    const kinkX = sx + dist * randRange(0.3, 0.7);
    const kinkY = clampY(lerp(sy, cupY, 0.5) + (random() - 0.5) * 20);
    return [
      { x: kinkX, y: kinkY },
      { x: sx + dist, y: cupY }
    ];
  },

  gentle_slope(sx, sy, dist, cupY, diff) {
    // Simple slope with one break point — like early DG holes
    const breakX = sx + dist * randRange(0.3, 0.6);
    const breakY = clampY(lerp(sy, cupY, randRange(0.3, 0.7)) + (random() - 0.5) * 15);
    return [
      { x: breakX, y: breakY },
      { x: sx + dist, y: cupY }
    ];
  },

  gentle_hill(sx, sy, dist, cupY, diff) {
    // One broad hill or dip — angular peak, not smooth
    const peakX = sx + dist * randRange(0.3, 0.6);
    const isHill = random() < 0.5;
    const amp = randRange(40, 80 + diff * 50);
    const peakY = clampY(lerp(sy, cupY, 0.5) + (isHill ? -amp : amp));
    return [
      { x: peakX, y: peakY },
      { x: sx + dist, y: cupY }
    ];
  },

  // ── EASY-MED ──────────────────────────────────────────
  downhill(sx, sy, dist, cupY, diff) {
    // Slope down with angular break point
    const drop = 60 + diff * 120;
    const actualCupY = clampY(Math.max(cupY, sy + drop));
    const breakX = sx + dist * randRange(0.25, 0.5);
    const breakY = clampY(lerp(sy, actualCupY, randRange(0.2, 0.6)));
    return [
      { x: breakX, y: breakY },
      { x: sx + dist, y: actualCupY }
    ];
  },

  uphill(sx, sy, dist, cupY, diff) {
    // Slope up with angular break
    const rise = 60 + diff * 120;
    const actualCupY = clampY(Math.min(cupY, sy - rise));
    const breakX = sx + dist * randRange(0.3, 0.6);
    const breakY = clampY(lerp(sy, actualCupY, randRange(0.3, 0.7)));
    return [
      { x: breakX, y: breakY },
      { x: sx + dist, y: actualCupY }
    ];
  },

  rolling_hills(sx, sy, dist, cupY, diff) {
    // 2-4 angular peaks and valleys — sharp zigzag terrain
    const numHills = 2 + Math.floor(random() * (1 + diff * 2));
    const verts = [];
    const segW = dist / (numHills + 1);
    for (let i = 1; i <= numHills; i++) {
      const hx = sx + segW * i + (random() - 0.5) * segW * 0.3;
      const amp = randRange(40, 80 + diff * 80);
      const up = (i % 2 === 1) ? -1 : 1;
      const hy = clampY(lerp(sy, cupY, i / (numHills + 1)) + up * amp);
      verts.push({ x: hx, y: hy });
    }
    verts.push({ x: sx + dist, y: cupY });
    return verts;
  },

  // ── MEDIUM ────────────────────────────────────────────
  cliff_drop(sx, sy, dist, cupY, diff) {
    // Flat plateau then near-vertical cliff drop — sharp angular step-down
    // Like real DG holes 100-300 with dramatic drops
    const cliffX = sx + dist * randRange(0.3, 0.55);
    const dropH = randRange(80, 160 + diff * 100);
    const topY = clampY(sy);
    const botY = clampY(topY + dropH);
    return [
      { x: cliffX - 20, y: topY },           // flat run to edge
      { x: cliffX, y: topY },                 // cliff edge
      { x: cliffX + 8, y: botY },             // near-vertical drop (8px wide!)
      { x: sx + dist, y: botY }
    ];
  },

  valley(sx, sy, dist, cupY, diff) {
    // Angular V or U valley — steep walls, flat or pointed bottom
    const valleyX = sx + dist * randRange(0.3, 0.55);
    const depth = randRange(60, 140 + diff * 80);
    const baseLevel = Math.max(sy, cupY);
    const botY = clampY(baseLevel + depth);
    const flatBottom = random() < 0.4; // 40% chance of flat-bottom canyon
    const wallW = randRange(8, 20 + diff * 10); // narrow walls
    if (flatBottom) {
      const gapW = randRange(40, 80);
      return [
        { x: valleyX - gapW / 2 - wallW, y: clampY(baseLevel - 10) },
        { x: valleyX - gapW / 2, y: botY },    // left wall bottom
        { x: valleyX + gapW / 2, y: botY },    // right wall bottom (flat floor)
        { x: valleyX + gapW / 2 + wallW, y: clampY(baseLevel - 10) },
        { x: sx + dist, y: cupY }
      ];
    }
    return [
      { x: valleyX - wallW, y: clampY(baseLevel - 10) },
      { x: valleyX, y: botY },                  // V-bottom
      { x: valleyX + wallW, y: clampY(baseLevel - 10) },
      { x: sx + dist, y: cupY }
    ];
  },

  mesa(sx, sy, dist, cupY, diff) {
    // Elevated flat-top platform with steep walls on both sides
    // Like the rectangular blocks seen in holes 2000+
    const mesaL = sx + dist * randRange(0.15, 0.3);
    const mesaR = sx + dist * randRange(0.55, 0.75);
    const mesaH = randRange(60, 120 + diff * 100);
    const mesaTopY = clampY(Math.min(sy, cupY) - mesaH);
    const wallW = randRange(8, 18);
    return [
      { x: mesaL, y: sy },                      // base left
      { x: mesaL + wallW, y: mesaTopY },         // steep wall up
      { x: mesaR - wallW, y: mesaTopY },         // flat top
      { x: mesaR, y: clampY(mesaTopY + mesaH * 0.8) }, // steep wall down
      { x: sx + dist, y: cupY }
    ];
  },

  shelf(sx, sy, dist, cupY, diff) {
    // Flat shelf → steep step-down → flat shelf (staircase feel)
    // Very common in real DG — sharp rectangular steps
    const stepX = sx + dist * randRange(0.35, 0.55);
    const stepH = randRange(60, 120 + diff * 80);
    const goingDown = random() < 0.6;
    const topY = goingDown ? sy : clampY(sy - stepH);
    const botY = goingDown ? clampY(sy + stepH) : sy;
    const wallW = randRange(6, 15);
    return [
      { x: stepX - 30, y: topY },               // flat approach
      { x: stepX, y: topY },                    // step edge
      { x: stepX + wallW, y: botY },            // steep drop/rise
      { x: sx + dist, y: botY }
    ];
  },

  // ── MED-HARD ──────────────────────────────────────────
  canyon(sx, sy, dist, cupY, diff) {
    // Deep rectangular canyon — flat bottom between vertical walls
    // Signature feature of real DG mid-game (holes 500+)
    const canyonL = sx + dist * randRange(0.25, 0.4);
    const canyonR = sx + dist * randRange(0.55, 0.7);
    const depth = randRange(100, 200 + diff * 100);
    const topY = clampY(Math.min(sy, H * 0.4));
    const botY = clampY(topY + depth);
    const wallW = randRange(6, 14);
    return [
      { x: canyonL - 20, y: topY },             // approach
      { x: canyonL, y: topY },                  // left edge
      { x: canyonL + wallW, y: botY },           // left wall (near vertical)
      { x: canyonR - wallW, y: botY },           // flat canyon floor
      { x: canyonR, y: topY },                  // right wall up
      { x: sx + dist, y: cupY }
    ];
  },

  peak_obstacle(sx, sy, dist, cupY, diff) {
    // Sharp triangular peak — must lob over. Narrow base, steep sides.
    const peakX = sx + dist * randRange(0.3, 0.55);
    const baseLevel = Math.max(sy, cupY);
    const peakH = randRange(80, 140 + diff * 120);
    const peakY = clampY(baseLevel - peakH);
    const baseW = randRange(20, 50 + diff * 30); // narrow base!
    return [
      { x: peakX - baseW, y: clampY(baseLevel) },
      { x: peakX, y: peakY },                   // sharp peak
      { x: peakX + baseW, y: clampY(baseLevel) },
      { x: sx + dist, y: cupY }
    ];
  },

  wall_shot(sx, sy, dist, cupY, diff) {
    // Cup tucked at base of tall vertical wall (backstop)
    // Common pattern in real DG — wall catches overshoots
    const wallX = sx + dist * randRange(0.65, 0.8);
    const wallH = randRange(100, 180 + diff * 80);
    const floorY = clampY(Math.max(sy + 30, H * 0.7));
    const wallTopY = clampY(floorY - wallH);
    return [
      { x: sx + dist * 0.3, y: clampY(lerp(sy, floorY, 0.5)) },
      { x: wallX - 30, y: floorY },             // flat approach to wall
      { x: wallX, y: floorY },                  // cup area (at wall base)
      { x: wallX + 8, y: wallTopY },            // near-vertical wall
      { x: sx + dist + 80, y: wallTopY }
    ];
  },

  twin_peaks(sx, sy, dist, cupY, diff) {
    // Two sharp peaks with narrow gap between — ball must thread through
    const baseLevel = clampY(Math.max(sy, cupY) + 20);
    const gap = randRange(40, 70);
    const centerX = sx + dist * randRange(0.35, 0.55);
    const peakH1 = randRange(80, 140 + diff * 80);
    const peakH2 = randRange(80, 140 + diff * 80);
    const peak1Y = clampY(baseLevel - peakH1);
    const peak2Y = clampY(baseLevel - peakH2);
    const baseW = randRange(15, 30);
    return [
      { x: centerX - gap / 2 - baseW, y: baseLevel },
      { x: centerX - gap / 2, y: peak1Y },      // peak 1
      { x: centerX - gap / 2 + baseW * 0.5, y: baseLevel },
      { x: centerX + gap / 2 - baseW * 0.5, y: baseLevel },
      { x: centerX + gap / 2, y: peak2Y },      // peak 2
      { x: centerX + gap / 2 + baseW, y: baseLevel },
      { x: sx + dist, y: cupY }
    ];
  },

  stepped_descent(sx, sy, dist, cupY, diff) {
    // Multiple sharp step-downs — rectangular staircase like real DG holes 200+
    const numSteps = 2 + Math.floor(random() * (1 + diff));
    const verts = [];
    const stepW = dist / (numSteps + 1);
    let currentY = sy;
    const totalDrop = clampY(sy + 80 + diff * 150) - sy;

    for (let i = 1; i <= numSteps; i++) {
      const stepX = sx + stepW * i;
      const flatLen = randRange(30, 60);
      verts.push({ x: stepX - flatLen, y: currentY }); // flat shelf
      verts.push({ x: stepX, y: currentY });            // edge
      currentY = clampY(sy + totalDrop * (i / numSteps));
      verts.push({ x: stepX + 8, y: currentY });        // steep drop
    }
    verts.push({ x: sx + dist, y: currentY });
    return verts;
  },

  // ── HARD ──────────────────────────────────────────────
  deep_pocket(sx, sy, dist, cupY, diff) {
    // Cup sits in a narrow pocket/notch — steep walls on both sides
    // Like real DG holes where cup is tucked in a crevice
    const pocketX = sx + dist * randRange(0.55, 0.75);
    const pocketW = randRange(50, 80);
    const pocketDepth = randRange(80, 160 + diff * 80);
    const rimY = clampY(Math.min(sy, H * 0.45));
    const pocketBotY = clampY(rimY + pocketDepth);
    const wallW = randRange(6, 12);
    return [
      { x: sx + dist * 0.25, y: clampY(lerp(sy, rimY, 0.5)) },
      { x: pocketX - pocketW / 2 - 20, y: rimY },  // approach
      { x: pocketX - pocketW / 2, y: rimY },        // left rim
      { x: pocketX - pocketW / 2 + wallW, y: pocketBotY }, // left wall
      { x: pocketX + pocketW / 2 - wallW, y: pocketBotY }, // floor
      { x: pocketX + pocketW / 2, y: rimY },        // right rim
      { x: sx + dist, y: rimY }
    ];
  },

  canyon_cup(sx, sy, dist, cupY, diff) {
    // Cup at the bottom of a deep canyon — must chip ball down into it
    // Seen frequently in real DG holes 2000+
    const canyonX = sx + dist * randRange(0.5, 0.7);
    const depth = randRange(120, 220 + diff * 60);
    const topY = clampY(Math.min(sy, H * 0.35));
    const botY = clampY(topY + depth);
    const canyonW = randRange(60, 100);
    const wallW = randRange(6, 12);
    return [
      { x: sx + dist * 0.2, y: clampY(lerp(sy, topY, 0.4)) },
      { x: canyonX - canyonW / 2, y: topY },    // left rim
      { x: canyonX - canyonW / 2 + wallW, y: botY }, // left wall
      { x: canyonX + canyonW / 2 - wallW, y: botY }, // canyon floor (cup here)
      { x: canyonX + canyonW / 2, y: topY },    // right wall up
      { x: sx + dist, y: topY }
    ];
  },

  fortress(sx, sy, dist, cupY, diff) {
    // Tall rectangular block in the middle — must lob over or around
    // Like the block shapes seen in holes 4000+
    const blockL = sx + dist * randRange(0.25, 0.4);
    const blockR = sx + dist * randRange(0.5, 0.65);
    const blockH = randRange(120, 200 + diff * 80);
    const floorY = clampY(Math.max(sy, H * 0.65));
    const blockTopY = clampY(floorY - blockH);
    const wallW = randRange(6, 12);
    return [
      { x: blockL - 10, y: floorY },            // ground level
      { x: blockL, y: floorY },                 // base left
      { x: blockL + wallW, y: blockTopY },       // wall up
      { x: blockR - wallW, y: blockTopY },       // flat top
      { x: blockR, y: floorY },                 // wall down
      { x: sx + dist, y: cupY }
    ];
  },

  narrow_gap(sx, sy, dist, cupY, diff) {
    // Two tall walls with a narrow gap — ball must be threaded through
    // Signature hard feature of real DG
    const gapX = sx + dist * randRange(0.35, 0.55);
    const gapW = randRange(30, 55);
    const wallH = randRange(120, 200 + diff * 80);
    const floorY = clampY(Math.max(sy + 30, H * 0.7));
    const wallTopY = clampY(floorY - wallH);
    const wallW = randRange(8, 15);
    return [
      { x: gapX - gapW / 2 - 60, y: floorY },
      { x: gapX - gapW / 2 - wallW, y: floorY },
      { x: gapX - gapW / 2, y: wallTopY },      // left wall top
      { x: gapX - gapW / 2 + wallW, y: floorY },// left wall inner
      { x: gapX + gapW / 2 - wallW, y: floorY },// right wall inner
      { x: gapX + gapW / 2, y: wallTopY },      // right wall top
      { x: gapX + gapW / 2 + wallW, y: floorY },
      { x: sx + dist, y: cupY }
    ];
  },

  cliff_shelf(sx, sy, dist, cupY, diff) {
    // Dramatic cliff with cup on a narrow shelf partway down
    // Like real DG holes with elevated ledges
    const cliffX = sx + dist * randRange(0.4, 0.55);
    const totalH = randRange(140, 240 + diff * 60);
    const shelfH = totalH * randRange(0.3, 0.6);
    const topY = clampY(Math.min(sy, H * 0.3));
    const shelfY = clampY(topY + shelfH);
    const botY = clampY(topY + totalH);
    const shelfW = randRange(50, 90);
    const wallW = randRange(6, 12);
    return [
      { x: cliffX, y: topY },                   // cliff top
      { x: cliffX + wallW, y: shelfY },          // wall to shelf
      { x: cliffX + wallW + shelfW, y: shelfY }, // shelf (cup goes here)
      { x: cliffX + wallW + shelfW + wallW, y: botY }, // drop below shelf
      { x: sx + dist, y: botY }
    ];
  },

  compound_terrain(sx, sy, dist, cupY, diff) {
    // Multiple mixed features — peak + valley + step, like late-game DG
    const verts = [];
    const numFeatures = 2 + Math.floor(random() * 2);
    const segW = dist / (numFeatures + 1);
    let y = sy;

    for (let i = 1; i <= numFeatures; i++) {
      const fx = sx + segW * i;
      const featureType = random();
      const amp = randRange(60, 120 + diff * 80);

      if (featureType < 0.3) {
        // Sharp peak
        verts.push({ x: fx - 20, y: y });
        verts.push({ x: fx, y: clampY(y - amp) });
        verts.push({ x: fx + 20, y: y });
      } else if (featureType < 0.6) {
        // Step down
        verts.push({ x: fx, y: y });
        y = clampY(y + amp * 0.7);
        verts.push({ x: fx + 8, y: y });
      } else {
        // V-dip
        const dipY = clampY(y + amp);
        verts.push({ x: fx - 15, y: y });
        verts.push({ x: fx, y: dipY });
        verts.push({ x: fx + 15, y: y });
      }
    }
    verts.push({ x: sx + dist, y: cupY });
    return verts;
  }
};

// ── Archetype Selection ──────────────────────────────────────
// Weights and difficulty ranges tuned from real Desert Golfing gameplay footage.
// Early game (diff 0-0.3): simple slopes, gentle hills, flat runs
// Mid game (diff 0.3-0.6): cliffs, valleys, mesas, steps
// Late game (diff 0.6+): canyons, pockets, fortresses, narrow gaps, compound
// Each entry: [archetypeName, minDifficulty, maxDifficulty, weight]
const ARCHETYPE_TABLE = [
  // Easy — gentle terrain, available from the start
  ['flat_run',         0.0, 1.0, 3],
  ['gentle_slope',     0.0, 0.7, 3],
  ['gentle_hill',      0.0, 0.7, 3],
  // Easy-Med — slopes with character
  ['downhill',         0.0, 1.0, 4],
  ['uphill',           0.05, 1.0, 3],
  ['rolling_hills',    0.1, 1.0, 3],
  // Medium — angular features appear
  ['cliff_drop',       0.15, 1.0, 3],
  ['valley',           0.15, 1.0, 3],
  ['shelf',            0.2, 1.0, 3],
  ['mesa',             0.25, 1.0, 2],
  // Med-Hard — dramatic geometry
  ['peak_obstacle',    0.3, 1.0, 3],
  ['wall_shot',        0.35, 1.0, 2],
  ['stepped_descent',  0.3, 1.0, 2],
  ['canyon',           0.35, 1.0, 2],
  // Hard — complex multi-feature terrain
  ['twin_peaks',       0.4, 1.0, 2],
  ['deep_pocket',      0.45, 1.0, 2],
  ['canyon_cup',       0.5, 1.0, 2],
  ['fortress',         0.5, 1.0, 2],
  ['narrow_gap',       0.55, 1.0, 2],
  ['cliff_shelf',      0.5, 1.0, 2],
  ['compound_terrain', 0.6, 1.0, 3],
];

// Anti-repetition: track last 3 archetypes to halve their selection weight
const _recentArchetypes = [];

function pickArchetype(difficulty) {
  if (_archetypeOverride && archetypes[_archetypeOverride]) {
    return _archetypeOverride;
  }
  // Filter to archetypes available at this difficulty, then weighted random
  const available = ARCHETYPE_TABLE.filter(
    ([name, minD, maxD]) => difficulty >= minD && difficulty <= maxD
  );
  // Apply anti-repetition: halve weight if archetype was used in last 3 holes
  const weights = available.map(([name, , , w]) =>
    _recentArchetypes.includes(name) ? w * 0.5 : w
  );
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let roll = random() * totalWeight;
  let picked = available[available.length - 1][0];
  for (let i = 0; i < available.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { picked = available[i][0]; break; }
  }
  // Update recent history
  _recentArchetypes.push(picked);
  if (_recentArchetypes.length > 3) _recentArchetypes.shift();
  return picked;
}

// ── Main Terrain Generation ──────────────────────────────
function generateHoleTerrain(holeIndex) {
  const difficulty = getDifficulty(holeIndex);

  // Determine tee position
  let teeX, teeY;
  if (holeIndex === 0) {
    teeX = 100;
    teeY = H * 0.65;
    // Seed initial terrain: flat run up to tee area
    if (vertices.length === 0) {
      vertices.push({ x: -100, y: teeY });
      vertices.push({ x: teeX - 20, y: teeY });
    }
  } else {
    teeX = holes[holeIndex - 1].cupX;
    teeY = holes[holeIndex - 1].cupY;
  }

  // Determine hole distance — must fit in viewport (W minus camera margins)
  // Use at least 960 for W to avoid tiny holes in small preview windows
  const effectiveW = Math.max(960, W);
  const maxDist = effectiveW - 150; // leave room for margins + flag + background visibility
  const rawDist = HOLE_DIST_MIN + random() * (HOLE_DIST_MAX - HOLE_DIST_MIN)
             + difficulty * 100;
  const dist = Math.min(rawDist, maxDist);

  // Determine cup target elevation
  // Real Desert Golfing: 74% ball higher than hole (downhill to cup)
  // (analysis of 509 ball-hole pairs from real game footage)
  const elevRoll = random();
  let cupTargetY;
  if (elevRoll < 0.10) {
    // Same level (10%)
    cupTargetY = clampY(teeY + (random() - 0.5) * 20);
  } else if (elevRoll < 0.25) {
    // Cup higher = uphill shot (15%)
    cupTargetY = clampY(teeY - randRange(30, 60 + difficulty * 80));
  } else {
    // Cup lower = downhill shot (75%)
    cupTargetY = clampY(teeY + randRange(30, 60 + difficulty * 80));
  }

  // Pick archetype and generate vertices
  const archName = pickArchetype(difficulty);
  const archFunc = archetypes[archName];
  const startX = teeX + 40; // small gap after tee
  const rawVerts = archFunc(startX, teeY, dist, cupTargetY, difficulty);

  // Add micro-noise: subdivide long segments with subtle perturbations
  const holeVerts = addMicroNoise(rawVerts, startX, teeY, difficulty);

  // Append hole vertices to global array
  for (const v of holeVerts) {
    vertices.push(v);
  }

  // The cup X is at the last feature vertex (end of hole)
  const lastVert = holeVerts[holeVerts.length - 1];
  const cupX = lastVert.x;
  const cupSurfaceY = lastVert.y;

  // Add background terrain past the cup (2-3 vertices extending right)
  const bgY = cupSurfaceY;
  const bg1X = cupX + randRange(80, 150);
  const bg1Y = clampY(bgY + (random() - 0.5) * (40 + difficulty * 60));
  const bg2X = bg1X + randRange(100, 200);
  const bg2Y = clampY(bg1Y + (random() - 0.5) * (40 + difficulty * 60));
  vertices.push({ x: bg1X, y: bg1Y });
  vertices.push({ x: bg2X, y: bg2Y });

  // Now place the cup into the terrain at cupX
  placeCup(holeIndex, cupX, teeX, teeY);
  holes[holeIndex].archetype = archName;
}

function placeCup(holeIndex, cupX, teeX, teeY) {
  const halfW = CUP_WIDTH / 2;
  const leftX = cupX - halfW;
  const rightX = cupX + halfW;

  // Sample rim heights BEFORE modifying vertices
  const leftY = terrainYAt(leftX);
  const rightY = terrainYAt(rightX);
  const cupY = (leftY + rightY) / 2; // rim height at center

  // Remove existing vertices inside the cup range
  vertices = vertices.filter(v => v.x < leftX || v.x > rightX);

  // Insert cup as rectangular notch — wide flat bottom for natural ball settling
  const wallInset = 3;  // nearly vertical walls with wide flat bottom
  const bottomY = Math.max(leftY, rightY) + CUP_DEPTH;
  const cupVerts = [
    { x: leftX,                y: leftY },      // left rim
    { x: leftX + wallInset,    y: bottomY },     // bottom-left
    { x: rightX - wallInset,   y: bottomY },     // bottom-right
    { x: rightX,               y: rightY },      // right rim
  ];

  // Insert into vertex array maintaining x-sort order
  let insertIdx = vertices.findIndex(v => v.x >= leftX);
  if (insertIdx === -1) insertIdx = vertices.length;
  vertices.splice(insertIdx, 0, ...cupVerts);

  holes.push({
    cupX, cupY,
    cupLeftX: leftX, cupLeftY: leftY,
    cupRightX: rightX, cupRightY: rightY,
    cupBottomY: bottomY,
    cupWallInset: wallInset,
    cupFilled: false,
    cupFillProgress: 0,
    flagHole: holeIndex + 1,
    flagVisible: true,
    flagOpacity: 1,
    teeX, teeY
  });

  return { cupX, cupY, teeX, teeY };
}

function flattenCup(hole) {
  // Replace the cup notch vertices with flat terrain at rim height
  const halfW = CUP_WIDTH / 2;
  const leftX = hole.cupX - halfW;
  const rightX = hole.cupX + halfW;

  // Remove all vertices inside the cup range
  vertices = vertices.filter(v => v.x < leftX || v.x > rightX);

  // Insert two flat vertices at the original rim heights (stored at placement time)
  let insertIdx = vertices.findIndex(v => v.x >= leftX);
  if (insertIdx === -1) insertIdx = vertices.length;
  vertices.splice(insertIdx, 0,
    { x: leftX, y: hole.cupLeftY },
    { x: rightX, y: hole.cupRightY }
  );
}

function ensureHolesAhead(upToHole) {
  // Make sure terrain and cups exist for holes up to upToHole
  for (let i = holes.length; i <= upToHole; i++) {
    generateHoleTerrain(i);
    holes[i].flagVisible = true;
  }
}
