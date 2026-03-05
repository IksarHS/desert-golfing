// ── Archetype Library ─────────────────────────────────────
// Each archetype returns an array of {x, y} vertices for one hole's terrain.
// Parameters: startX, startY, dist (tee-to-cup distance), cupTargetY, difficulty (0-1)
// The LAST vertex should be near the cup zone. Background vertices are added separately.

const archetypes = {
  // ── EASY ──────────────────────────────────────────────
  flat_run(sx, sy, dist, cupY, diff) {
    // Nearly flat with maybe a gentle slope
    const midX = sx + dist * 0.5;
    const midY = clampY(lerp(sy, cupY, 0.5) + (Math.random() - 0.5) * 15);
    return [
      { x: midX, y: midY },
      { x: sx + dist, y: cupY }
    ];
  },

  gentle_hill(sx, sy, dist, cupY, diff) {
    // One broad gentle hill or valley in the middle
    const peakX = sx + dist * randRange(0.3, 0.6);
    const isHill = Math.random() < 0.5;
    const amplitude = randRange(30, 60 + diff * 40);
    const peakY = clampY(lerp(sy, cupY, 0.5) + (isHill ? -amplitude : amplitude));
    return [
      { x: peakX - dist * 0.15, y: jitter(lerp(sy, peakY, 0.4), 10) },
      { x: peakX, y: peakY },
      { x: peakX + dist * 0.15, y: jitter(lerp(peakY, cupY, 0.4), 10) },
      { x: sx + dist, y: cupY }
    ];
  },

  // ── EASY-MED ──────────────────────────────────────────
  downhill(sx, sy, dist, cupY, diff) {
    // Tee is high, long slope down to cup
    // Force cup lower than tee
    const actualCupY = clampY(Math.max(cupY, sy + 50 + diff * 80));
    const breakX = sx + dist * randRange(0.2, 0.5);
    const breakY = clampY(lerp(sy, actualCupY, randRange(0.3, 0.5)));
    return [
      { x: breakX, y: breakY },
      { x: sx + dist * 0.8, y: clampY(lerp(breakY, actualCupY, 0.7)) },
      { x: sx + dist, y: actualCupY }
    ];
  },

  // ── MEDIUM ────────────────────────────────────────────
  uphill(sx, sy, dist, cupY, diff) {
    // Tee is low, slope up to cup
    // Force cup higher than tee
    const actualCupY = clampY(Math.min(cupY, sy - 50 - diff * 80));
    const midX = sx + dist * randRange(0.4, 0.6);
    const midY = clampY(lerp(sy, actualCupY, randRange(0.4, 0.6)));
    return [
      { x: midX, y: midY },
      { x: sx + dist, y: actualCupY }
    ];
  },

  valley(sx, sy, dist, cupY, diff) {
    // Dip in middle, tee and cup at similar heights
    const valleyX = sx + dist * randRange(0.3, 0.55);
    const valleyDepth = randRange(50, 100 + diff * 60);
    const baseLevel = (sy + cupY) / 2;
    const valleyY = clampY(baseLevel + valleyDepth);
    return [
      { x: valleyX - dist * 0.12, y: clampY(baseLevel + valleyDepth * 0.2) },
      { x: valleyX, y: valleyY },
      { x: valleyX + dist * 0.12, y: clampY(baseLevel + valleyDepth * 0.2) },
      { x: sx + dist, y: cupY }
    ];
  },

  mesa(sx, sy, dist, cupY, diff) {
    // Flat-topped elevated hill, cup on top or behind
    const mesaStartX = sx + dist * randRange(0.2, 0.35);
    const mesaEndX   = sx + dist * randRange(0.55, 0.75);
    const mesaHeight = randRange(50, 90 + diff * 60);
    const mesaTopY   = clampY(Math.min(sy, cupY) - mesaHeight);
    // Cup on right side after mesa
    const actualCupY = clampY(mesaTopY + randRange(20, mesaHeight));
    return [
      { x: mesaStartX, y: clampY(lerp(sy, mesaTopY, 0.3)) },
      { x: mesaStartX + 40, y: mesaTopY },
      { x: mesaEndX - 40, y: mesaTopY },
      { x: mesaEndX, y: clampY(lerp(mesaTopY, actualCupY, 0.5)) },
      { x: sx + dist, y: actualCupY }
    ];
  },

  // ── MED-HARD ──────────────────────────────────────────
  peak_obstacle(sx, sy, dist, cupY, diff) {
    // Triangular peak in the middle that must be lobbed over
    const peakX = sx + dist * randRange(0.3, 0.55);
    const baseLevel = Math.max(sy, cupY);
    const peakHeight = randRange(PEAK_HEIGHT_MIN, PEAK_HEIGHT_MIN + diff * (PEAK_HEIGHT_MAX - PEAK_HEIGHT_MIN));
    const peakY = clampY(baseLevel - peakHeight);
    const peakBaseW = dist * randRange(0.12, 0.22);
    return [
      { x: peakX - peakBaseW, y: clampY(lerp(sy, baseLevel, 0.8)) },
      { x: peakX, y: peakY },
      { x: peakX + peakBaseW, y: clampY(lerp(baseLevel, cupY, 0.5)) },
      { x: sx + dist * 0.85, y: jitter(cupY, 15) },
      { x: sx + dist, y: cupY }
    ];
  },

  cliff_drop(sx, sy, dist, cupY, diff) {
    // Flat run then sharp cliff drop, cup at bottom
    const cliffX = sx + dist * randRange(0.35, 0.55);
    const dropHeight = randRange(60, 120 + diff * 60);
    const topY = clampY(sy);
    const botY = clampY(topY + dropHeight);
    return [
      { x: cliffX - 30, y: topY },
      { x: cliffX, y: topY },
      { x: cliffX + 15, y: botY },  // steep but not vertical
      { x: sx + dist * 0.8, y: jitter(botY, 15) },
      { x: sx + dist, y: botY }
    ];
  },

  // ── HARD ──────────────────────────────────────────────
  twin_peaks(sx, sy, dist, cupY, diff) {
    // Two peaked obstacles
    const baseLevel = Math.max(sy, cupY);
    const peak1X = sx + dist * randRange(0.2, 0.32);
    const peak2X = sx + dist * randRange(0.48, 0.62);
    const peakH1 = randRange(50, 80 + diff * 60);
    const peakH2 = randRange(50, 80 + diff * 60);
    const peak1Y = clampY(baseLevel - peakH1);
    const peak2Y = clampY(baseLevel - peakH2);
    const valleyY = clampY(baseLevel + randRange(10, 30));
    return [
      { x: peak1X - dist * 0.06, y: clampY(lerp(sy, baseLevel, 0.7)) },
      { x: peak1X, y: peak1Y },
      { x: peak1X + dist * 0.06, y: valleyY },
      { x: peak2X - dist * 0.06, y: valleyY },
      { x: peak2X, y: peak2Y },
      { x: peak2X + dist * 0.06, y: clampY(lerp(baseLevel, cupY, 0.4)) },
      { x: sx + dist, y: cupY }
    ];
  },

  step_up(sx, sy, dist, cupY, diff) {
    // Valley then step up to elevated cup shelf
    const valleyX = sx + dist * randRange(0.3, 0.45);
    const shelfX  = sx + dist * randRange(0.6, 0.75);
    const valleyDepth = randRange(40, 80 + diff * 40);
    const valleyY = clampY(Math.max(sy, cupY) + valleyDepth);
    const shelfY  = clampY(Math.min(sy, cupY) - randRange(20, 50 + diff * 30));
    return [
      { x: valleyX - dist * 0.08, y: clampY(lerp(sy, valleyY, 0.4)) },
      { x: valleyX, y: valleyY },
      { x: valleyX + dist * 0.1, y: clampY(lerp(valleyY, shelfY, 0.3)) },
      { x: shelfX, y: shelfY },
      { x: shelfX + 60, y: shelfY },  // flat landing zone
      { x: sx + dist, y: shelfY }
    ];
  },

  wall_shot(sx, sy, dist, cupY, diff) {
    // Cup at the base of a steep wall (wall acts as backstop)
    const wallX = sx + dist * randRange(0.7, 0.85);
    const wallHeight = randRange(80, 140 + diff * 60);
    const floorY = clampY(Math.max(sy + 20, cupY));
    const wallTopY = clampY(floorY - wallHeight);
    return [
      { x: sx + dist * 0.3, y: jitter(lerp(sy, floorY, 0.5), 20) },
      { x: sx + dist * 0.6, y: jitter(floorY, 15) },
      { x: wallX - 20, y: floorY },
      { x: wallX, y: floorY },       // cup goes here
      { x: wallX + 15, y: wallTopY }, // steep wall behind cup
      { x: sx + dist + 100, y: clampY(wallTopY - 20) }
    ];
  },

  rolling_hills(sx, sy, dist, cupY, diff) {
    // Multiple gentle undulations
    const numHills = 2 + Math.floor(Math.random() * 2); // 2-3 hills
    const verts = [];
    const segW = dist / (numHills + 1);
    let y = sy;
    for (let i = 1; i <= numHills; i++) {
      const hx = sx + segW * i;
      const amplitude = randRange(25, 50 + diff * 30);
      const up = (i % 2 === 1) ? -1 : 1;
      y = clampY(lerp(sy, cupY, i / (numHills + 1)) + up * amplitude);
      verts.push({ x: hx, y });
    }
    verts.push({ x: sx + dist, y: cupY });
    return verts;
  }
};

// Archetype selection weights by difficulty tier
// Each entry: [archetypeName, minDifficulty, maxDifficulty, weight]
const ARCHETYPE_TABLE = [
  ['flat_run',       0.0, 0.4, 3],
  ['gentle_hill',    0.0, 0.5, 3],
  ['downhill',       0.0, 0.7, 2],
  ['uphill',         0.0, 0.8, 2],
  ['valley',         0.0, 0.8, 2],
  ['rolling_hills',  0.0, 1.0, 2],
  ['mesa',           0.15, 1.0, 2],
  ['peak_obstacle',  0.2, 1.0, 3],
  ['cliff_drop',     0.2, 1.0, 2],
  ['twin_peaks',     0.4, 1.0, 2],
  ['step_up',        0.3, 1.0, 2],
  ['wall_shot',      0.3, 1.0, 2],
];

function pickArchetype(difficulty) {
  // Filter to archetypes available at this difficulty, then weighted random
  const available = ARCHETYPE_TABLE.filter(
    ([name, minD, maxD]) => difficulty >= minD && difficulty <= maxD
  );
  const totalWeight = available.reduce((sum, a) => sum + a[3], 0);
  let roll = Math.random() * totalWeight;
  for (const [name, , , w] of available) {
    roll -= w;
    if (roll <= 0) return name;
  }
  return available[available.length - 1][0];
}

// ── Main Terrain Generation ──────────────────────────────
function generateHoleTerrain(holeIndex) {
  const difficulty = Math.min(1.0, holeIndex * 0.05);

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
  const rawDist = HOLE_DIST_MIN + Math.random() * (HOLE_DIST_MAX - HOLE_DIST_MIN)
             + difficulty * 100;
  const dist = Math.min(rawDist, maxDist);

  // Determine cup target elevation
  const elevRoll = Math.random();
  let cupTargetY;
  if (elevRoll < 0.30) {
    // Same level
    cupTargetY = clampY(teeY + (Math.random() - 0.5) * 30);
  } else if (elevRoll < 0.65) {
    // Cup higher (lower Y)
    cupTargetY = clampY(teeY - randRange(30, 60 + difficulty * 80));
  } else {
    // Cup lower (higher Y)
    cupTargetY = clampY(teeY + randRange(30, 60 + difficulty * 80));
  }

  // Pick archetype and generate vertices
  const archName = pickArchetype(difficulty);
  const archFunc = archetypes[archName];
  const startX = teeX + 40; // small gap after tee
  const holeVerts = archFunc(startX, teeY, dist, cupTargetY, difficulty);

  // Append hole vertices to global array
  for (const v of holeVerts) {
    vertices.push({ x: v.x, y: clampY(v.y) });
  }

  // The cup X is at the last feature vertex (end of hole)
  const lastVert = holeVerts[holeVerts.length - 1];
  const cupX = lastVert.x;
  const cupSurfaceY = lastVert.y;

  // Add background terrain past the cup (2-3 vertices extending right)
  const bgY = cupSurfaceY;
  const bg1X = cupX + randRange(80, 150);
  const bg1Y = clampY(bgY + (Math.random() - 0.5) * (40 + difficulty * 60));
  const bg2X = bg1X + randRange(100, 200);
  const bg2Y = clampY(bg1Y + (Math.random() - 0.5) * (40 + difficulty * 60));
  vertices.push({ x: bg1X, y: bg1Y });
  vertices.push({ x: bg2X, y: bg2Y });

  // Now place the cup into the terrain at cupX
  placeCup(holeIndex, cupX, teeX, teeY);
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

  // Insert cup as terrain vertices: uniform rectangular notch with FLAT bottom
  const wallInset = 3;
  const bottomY = Math.max(leftY, rightY) + CUP_DEPTH;
  const cupVerts = [
    { x: leftX,                y: leftY },      // left rim
    { x: leftX + wallInset,    y: bottomY },     // bottom-left (flat)
    { x: rightX - wallInset,   y: bottomY },     // bottom-right (flat)
    { x: rightX,               y: rightY },      // right rim
  ];

  // Insert into vertex array maintaining x-sort order
  let insertIdx = vertices.findIndex(v => v.x >= leftX);
  if (insertIdx === -1) insertIdx = vertices.length;
  vertices.splice(insertIdx, 0, ...cupVerts);

  holes.push({
    cupX, cupY,
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

  // Sample rim heights BEFORE removing cup vertices to avoid wrong interpolation
  const leftY = terrainYAt(leftX - 1);
  const rightY = terrainYAt(rightX + 1);

  // Remove all vertices inside the cup range
  vertices = vertices.filter(v => v.x < leftX || v.x > rightX);

  // Insert two flat vertices at the rim heights
  let insertIdx = vertices.findIndex(v => v.x >= leftX);
  if (insertIdx === -1) insertIdx = vertices.length;
  vertices.splice(insertIdx, 0,
    { x: leftX, y: leftY },
    { x: rightX, y: rightY }
  );
}

function ensureHolesAhead(upToHole) {
  // Make sure terrain and cups exist for holes up to upToHole
  for (let i = holes.length; i <= upToHole; i++) {
    generateHoleTerrain(i);
    holes[i].flagVisible = true;
  }
}
