// ── Dramatic Depths System ───────────────────────────────────
// Late-game terrain with extreme elevation, overhangs, caves, and water.
// Inspired by Desert Golfing holes 5000+.

// ── World: Dramatic Depths ──────────────────────────────────
WORLDS['dramatic-depths-1'] = {
  name: 'Dramatic Depths',
  system: 'Dramatic Depths System',

  sky: '#4a3a5c',   // deep purple twilight sky
  materials: ['rock', 'sand', 'mud', 'water'],
  defaultMaterial: 'rock',

  assets: [],
  courses: {},
};

// Shared cup elevation function for dramatic courses -- allows extreme Y values
function _dramaticCupElevation(teeY, difficulty) {
  const r = random();
  if (r < 0.3) {
    // Cup way up high (30%)
    return H * randRange(0.08, 0.30);
  } else if (r < 0.6) {
    // Cup way down low (30%)
    return H * randRange(0.75, 0.94);
  } else {
    // Cup at mid elevation (40%)
    return H * randRange(0.35, 0.65);
  }
}

// Course: "The Descent" -- staircase drops, shelf-cliff-valley, plunges
WORLDS['dramatic-depths-1'].courses['the-descent'] = {
  name: 'The Descent',
  materials: ['rock', 'sand'],
  archetypes: [
    'staircase_plunge', 'shelf_cliff_valley', 'double_cliff',
    'deep_plunge', 'shelf_drop_shelf', 'cliff_valley_climb',
  ],
  difficultyRange: [0.4, 1.0],
  holeCount: 10,
  cupElevation: _dramaticCupElevation,
  // Custom noise function that bypasses clampY for dramatic terrain
  noiseFunction: function(verts, startX, startY, difficulty) {
    const noiseAmp = 2 + difficulty * 3;
    const result = [];
    let prevV = { x: startX, y: startY };
    for (const v of verts) {
      const gap = v.x - prevV.x;
      if (gap > 100) {
        const numPts = gap > 220 ? 3 : gap > 140 ? 2 : 1;
        for (let j = 1; j <= numPts; j++) {
          const t = j / (numPts + 1);
          const x = lerp(prevV.x, v.x, t);
          const baseY = lerp(prevV.y, v.y, t);
          // Use raw Y without clampY -- allow extreme positions
          const noisy = Math.max(H * 0.02, Math.min(H * 0.98, baseY + (random() - 0.5) * noiseAmp));
          result.push({ x, y: noisy });
        }
      }
      result.push({ x: v.x, y: v.y });
      prevV = v;
    }
    return result;
  },
};

// Course: "Abyssal Caves" -- overhangs, caves, enclosed bowls, water canyons
WORLDS['dramatic-depths-1'].courses['abyssal-caves'] = {
  name: 'Abyssal Caves',
  materials: ['rock', 'mud', 'water'],
  archetypes: [
    'overhang_cave', 'enclosed_bowl', 'cave_passage',
    'water_canyon', 'chasm_bridge', 'cliff_tower',
  ],
  difficultyRange: [0.5, 1.2],
  holeCount: 10,
  cupElevation: _dramaticCupElevation,
  noiseFunction: function(verts, startX, startY, difficulty) {
    const noiseAmp = 2 + difficulty * 3;
    const result = [];
    let prevV = { x: startX, y: startY };
    for (const v of verts) {
      const gap = v.x - prevV.x;
      if (gap > 100) {
        const numPts = gap > 220 ? 3 : gap > 140 ? 2 : 1;
        for (let j = 1; j <= numPts; j++) {
          const t = j / (numPts + 1);
          const x = lerp(prevV.x, v.x, t);
          const baseY = lerp(prevV.y, v.y, t);
          const noisy = Math.max(H * 0.02, Math.min(H * 0.98, baseY + (random() - 0.5) * noiseAmp));
          result.push({ x, y: noisy });
        }
      }
      result.push({ x: v.x, y: v.y });
      prevV = v;
    }
    return result;
  },
};

// Course: "Vertical Gauntlet" -- peaks, zigzags, towers, maximum drama
WORLDS['dramatic-depths-1'].courses['vertical-gauntlet'] = {
  name: 'Vertical Gauntlet',
  materials: ['rock', 'sand', 'mud'],
  archetypes: [
    'angular_peaks_climb', 'zigzag_ascent', 'cliff_tower',
    'rect_shelf_valley_climb', 'staircase_plunge', 'double_cliff',
  ],
  difficultyRange: [0.6, 1.2],
  holeCount: 10,
  cupElevation: _dramaticCupElevation,
  noiseFunction: function(verts, startX, startY, difficulty) {
    const noiseAmp = 2 + difficulty * 3;
    const result = [];
    let prevV = { x: startX, y: startY };
    for (const v of verts) {
      const gap = v.x - prevV.x;
      if (gap > 100) {
        const numPts = gap > 220 ? 3 : gap > 140 ? 2 : 1;
        for (let j = 1; j <= numPts; j++) {
          const t = j / (numPts + 1);
          const x = lerp(prevV.x, v.x, t);
          const baseY = lerp(prevV.y, v.y, t);
          const noisy = Math.max(H * 0.02, Math.min(H * 0.98, baseY + (random() - 0.5) * noiseAmp));
          result.push({ x, y: noisy });
        }
      }
      result.push({ x: v.x, y: v.y });
      prevV = v;
    }
    return result;
  },
};

// Course: "The Labyrinth" -- complex overhangs, zigzag terrain, fortress shapes
WORLDS['dramatic-depths-1'].courses['the-labyrinth'] = {
  name: 'The Labyrinth',
  materials: ['rock', 'sand'],
  archetypes: [
    'complex_fortress', 'labyrinth', 'angular_chaos',
    'overhang_cave', 'cave_passage',
  ],
  difficultyRange: [0.4, 1.0],
  holeCount: 10,
  cupElevation: _dramaticCupElevation,
  noiseFunction: function(verts) {
    return verts;
  },
};
