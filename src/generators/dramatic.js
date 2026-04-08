// ── Dramatic Terrain Generator ────────────────────────────────
// Late-game Desert Golfing archetypes (holes 5000+).
// Produces terrain using 80-98% of screen height with vertical cliffs,
// deep valleys, water hazards, overhangs (via objects[]), and staircase patterns.
//
// These archetypes intentionally bypass clampY() to place vertices at
// extreme Y values (H * 0.02 to H * 0.98) for maximum visual drama.
//
// Archetype signature: (sx, sy, dist, cupY, diff) => [{x, y}, ...]
// Objects (overhangs/caves) are pushed directly to the global objects[] array.

const dramaticArchetypes = {

  // ── SHELF-CLIFF-VALLEY: Pink reference image ─────────────────
  // Shelf on left at ~75% height, vertical drop to valley floor at 95%,
  // massive cliff face rising to cup at ~30% height. Water at very bottom.
  shelf_cliff_valley(sx, sy, dist, cupY, diff) {
    const shelfY = H * randRange(0.65, 0.78);       // left shelf
    const shelfEnd = sx + dist * randRange(0.20, 0.35);
    const valleyY = H * randRange(0.90, 0.97);      // deep valley floor
    const wallW = randRange(6, 14);
    const cliffFaceX = sx + dist * randRange(0.50, 0.65);
    const cupPlatY = H * randRange(0.18, 0.35);     // high cup plateau
    const cupPlatW = randRange(60, 120);

    return [
      { x: sx + 20, y: shelfY },                    // shelf surface
      { x: shelfEnd, y: shelfY },                    // shelf edge
      { x: shelfEnd + wallW, y: valleyY },           // vertical drop to valley
      { x: cliffFaceX - 20, y: valleyY },            // valley floor
      { x: cliffFaceX, y: valleyY },                 // base of cliff
      { x: cliffFaceX + wallW, y: cupPlatY },        // cliff face (near vertical)
      { x: cliffFaceX + wallW + cupPlatW, y: cupPlatY }, // cup plateau
      { x: sx + dist, y: cupPlatY },
    ];
  },

  // ── RECTANGULAR SHELF DROP: Green reference image ────────────
  // Rectangular shelf on left at ~40%, vertical drop to valley at 95% with water,
  // long slope climbing to cup plateau at ~25% height.
  rect_shelf_valley_climb(sx, sy, dist, cupY, diff) {
    const shelfY = H * randRange(0.32, 0.48);       // left shelf
    const shelfEnd = sx + dist * randRange(0.15, 0.28);
    const valleyY = H * randRange(0.88, 0.96);      // deep valley
    const wallW = randRange(6, 12);
    const valleyEnd = sx + dist * randRange(0.35, 0.48);
    const midClimbX = sx + dist * randRange(0.55, 0.70);
    const midClimbY = H * randRange(0.50, 0.65);
    const cupPlatY = H * randRange(0.15, 0.30);

    return [
      { x: sx + 20, y: shelfY },
      { x: shelfEnd, y: shelfY },                    // shelf edge
      { x: shelfEnd + wallW, y: valleyY },           // vertical drop
      { x: valleyEnd, y: valleyY },                  // valley floor
      { x: midClimbX, y: midClimbY },                // midway up slope
      { x: sx + dist - 80, y: cupPlatY + 15 },       // approaching cup
      { x: sx + dist - 30, y: cupPlatY },            // cup plateau
      { x: sx + dist, y: cupPlatY },
    ];
  },

  // ── OVERHANG CAVE: Red/grey reference image ──────────────────
  // Complex terrain with overhangs and caves made of overlapping solid shapes.
  // Cup on top of a plateau, ball at bottom left.
  // Uses objects[] for the overhang polygon.
  overhang_cave(sx, sy, dist, cupY, diff) {
    const floorY = H * randRange(0.80, 0.92);       // low floor for ball
    const plateauX = sx + dist * randRange(0.55, 0.70);
    const plateauY = H * randRange(0.20, 0.38);     // high plateau for cup
    const wallW = randRange(8, 14);
    const midShelfX = sx + dist * randRange(0.30, 0.45);
    const midShelfY = H * randRange(0.50, 0.65);

    // Main terrain line: low start, shelf, cliff up to plateau
    const verts = [
      { x: sx + 20, y: floorY },                    // low floor
      { x: midShelfX - 30, y: floorY },             // approach to mid shelf
      { x: midShelfX, y: floorY },                   // base of mid rise
      { x: midShelfX + wallW, y: midShelfY },        // mid shelf level
      { x: plateauX - 40, y: midShelfY },            // mid shelf run
      { x: plateauX, y: midShelfY },                 // base of upper cliff
      { x: plateauX + wallW, y: plateauY },          // cliff to plateau
      { x: sx + dist, y: plateauY },                 // cup on plateau
    ];

    // Overhang object: a solid polygon that juts out over the terrain below
    // Creates a ceiling/cave effect above the mid-shelf area
    const overhangLeft = midShelfX + wallW + 20;
    const overhangRight = plateauX - 10;
    const overhangTopY = midShelfY - randRange(40, 80);
    const overhangBotY = midShelfY - randRange(5, 15);

    if (overhangRight - overhangLeft > 40) {
      objects.push({
        verts: [
          { x: overhangLeft, y: overhangTopY },
          { x: overhangRight, y: overhangTopY },
          { x: overhangRight + 15, y: overhangBotY },
          { x: overhangLeft - 10, y: overhangBotY },
        ],
        mat: 'rock',
        holeIndex: holes.length,
      });
    }

    return verts;
  },

  // ── ENCLOSED BOWL: Red reference image ───────────────────────
  // Terrain curves over creating an enclosed bowl shape with water at bottom.
  // Uses an object for the overhanging lip that partially encloses the bowl.
  enclosed_bowl(sx, sy, dist, cupY, diff) {
    const rimLeftX = sx + dist * randRange(0.15, 0.25);
    const rimRightX = sx + dist * randRange(0.65, 0.78);
    const rimY = H * randRange(0.25, 0.40);          // bowl rim
    const bowlY = H * randRange(0.88, 0.96);         // bowl bottom (water)
    const wallW = randRange(6, 12);
    const cupPlatX = sx + dist * randRange(0.80, 0.90);
    const cupPlatY = H * randRange(0.18, 0.32);      // cup up high

    // Main terrain: approach, drop into bowl, climb out, cup on high ground
    const verts = [
      { x: sx + 20, y: rimY + 30 },                 // start slightly below rim
      { x: rimLeftX, y: rimY },                      // left rim
      { x: rimLeftX + wallW, y: bowlY },             // drop into bowl
      { x: rimRightX - wallW, y: bowlY },            // bowl floor
      { x: rimRightX, y: rimY },                     // climb out
      { x: cupPlatX, y: cupPlatY },                  // rise to cup
      { x: sx + dist, y: cupPlatY },
    ];

    // Overhanging lip: partial enclosure over the bowl from the left side
    const lipExtent = rimLeftX + (rimRightX - rimLeftX) * randRange(0.3, 0.6);
    const lipTopY = rimY - randRange(10, 25);
    const lipBotY = rimY + randRange(30, 70);

    objects.push({
      verts: [
        { x: rimLeftX - 10, y: lipTopY },
        { x: lipExtent, y: lipTopY },
        { x: lipExtent + 15, y: lipBotY },
        { x: rimLeftX - 10, y: lipBotY - 10 },
      ],
      mat: 'rock',
      holeIndex: holes.length,
    });

    return verts;
  },

  // ── ANGULAR PEAKS: Blue reference image ──────────────────────
  // Ball at very bottom (95%), terrain rises through multiple angular peaks
  // and shelves to cup at ~30% height. Terrain fills 90%+ of screen.
  angular_peaks_climb(sx, sy, dist, cupY, diff) {
    const startY = H * randRange(0.88, 0.96);        // ball very low
    const cupTargetY = H * randRange(0.15, 0.32);    // cup up high
    const numPeaks = 2 + Math.floor(random() * 2);   // 2-3 peaks
    const verts = [];
    const segW = dist / (numPeaks + 2);

    let prevY = startY;
    verts.push({ x: sx + 20, y: startY });

    for (let i = 0; i < numPeaks; i++) {
      const peakX = sx + segW * (i + 1) + (random() - 0.5) * segW * 0.2;
      const progress = (i + 1) / (numPeaks + 1);
      // Each peak is higher than the last, approaching cup height
      const baseY = lerp(startY, cupTargetY, progress);
      const peakAmp = randRange(40, 90 + diff * 40);
      const peakTopY = Math.max(H * 0.04, baseY - peakAmp);

      // Valley before peak
      const valleyY = Math.min(H * 0.96, baseY + randRange(20, 50));
      verts.push({ x: peakX - randRange(30, 60), y: valleyY });
      // Peak
      verts.push({ x: peakX, y: peakTopY });
      // Shelf after peak
      const shelfY = lerp(peakTopY, valleyY, randRange(0.3, 0.6));
      verts.push({ x: peakX + randRange(20, 45), y: shelfY });
      prevY = shelfY;
    }

    // Final approach to cup
    verts.push({ x: sx + dist - 60, y: cupTargetY + 20 });
    verts.push({ x: sx + dist, y: cupTargetY });
    return verts;
  },

  // ── STAIRCASE PLUNGE: shelf-drop-shelf repeated 3-4 times ────
  // Dramatic rectangular staircase from near screen top to near screen bottom.
  staircase_plunge(sx, sy, dist, cupY, diff) {
    const numSteps = 3 + Math.floor(random() * 2);   // 3-4 steps
    const topY = H * randRange(0.06, 0.18);          // start near top
    const botY = H * randRange(0.85, 0.96);          // end near bottom
    const wallW = randRange(6, 12);
    const verts = [];
    const segW = dist / (numSteps + 1);

    let currentY = topY;
    verts.push({ x: sx + 15, y: topY });

    for (let i = 0; i < numSteps; i++) {
      const stepX = sx + segW * (i + 1);
      const shelfLen = randRange(40, 80);
      verts.push({ x: stepX - shelfLen / 2, y: currentY }); // shelf
      verts.push({ x: stepX, y: currentY });                 // edge
      currentY = lerp(topY, botY, (i + 1) / numSteps);
      verts.push({ x: stepX + wallW, y: currentY });         // drop
    }

    verts.push({ x: sx + dist, y: currentY });               // cup at bottom
    return verts;
  },

  // ── CLIFF TOWER: tall narrow tower with cup on top ───────────
  // Valley floor with a rectangular tower rising from it. Cup on top.
  cliff_tower(sx, sy, dist, cupY, diff) {
    const floorY = H * randRange(0.82, 0.94);        // valley floor
    const towerTopY = H * randRange(0.08, 0.22);     // tower top (cup)
    const towerX = sx + dist * randRange(0.50, 0.68);
    const towerW = randRange(60, 110);
    const wallW = randRange(6, 14);

    return [
      { x: sx + 20, y: floorY },                    // floor
      { x: towerX - towerW / 2 - 20, y: floorY },   // approach to tower
      { x: towerX - towerW / 2, y: floorY },         // tower base left
      { x: towerX - towerW / 2 + wallW, y: towerTopY }, // left wall up
      { x: towerX + towerW / 2 - wallW, y: towerTopY }, // tower top (cup)
      { x: towerX + towerW / 2, y: floorY },         // right wall down
      { x: sx + dist, y: floorY },                   // exit floor
    ];
  },

  // ── CHASM BRIDGE: Two high plateaus with a deep chasm between ─
  // Must lob ball across the gap. Optional overhang object.
  chasm_bridge(sx, sy, dist, cupY, diff) {
    const plateauY = H * randRange(0.15, 0.30);      // high plateaus
    const chasmY = H * randRange(0.88, 0.97);        // deep chasm
    const chasmLeft = sx + dist * randRange(0.25, 0.40);
    const chasmRight = sx + dist * randRange(0.55, 0.70);
    const wallW = randRange(6, 12);

    const verts = [
      { x: sx + 20, y: plateauY },
      { x: chasmLeft, y: plateauY },                 // left edge
      { x: chasmLeft + wallW, y: chasmY },            // drop into chasm
      { x: chasmRight - wallW, y: chasmY },           // chasm floor
      { x: chasmRight, y: plateauY },                 // climb out
      { x: sx + dist, y: plateauY },                  // cup on right plateau
    ];

    // Optional: rocky overhang above chasm (50% chance)
    if (random() < 0.5) {
      const ohLeft = chasmLeft + (chasmRight - chasmLeft) * 0.2;
      const ohRight = chasmLeft + (chasmRight - chasmLeft) * 0.6;
      const ohTopY = plateauY + randRange(30, 60);
      const ohBotY = ohTopY + randRange(25, 50);

      objects.push({
        verts: [
          { x: ohLeft, y: ohTopY },
          { x: ohRight, y: ohTopY },
          { x: ohRight, y: ohBotY },
          { x: ohLeft, y: ohBotY },
        ],
        mat: 'rock',
        holeIndex: holes.length,
      });
    }

    return verts;
  },

  // ── ZIGZAG ASCENT: ball at bottom, zigzag ramps to cup at top ─
  zigzag_ascent(sx, sy, dist, cupY, diff) {
    const botY = H * randRange(0.88, 0.96);
    const topY = H * randRange(0.06, 0.18);
    const numZigs = 3 + Math.floor(random() * 2);
    const verts = [];
    const segW = dist / (numZigs + 1);

    verts.push({ x: sx + 15, y: botY });

    for (let i = 0; i < numZigs; i++) {
      const zx = sx + segW * (i + 0.5 + random() * 0.5);
      const progress = (i + 1) / (numZigs + 1);
      const targetY = lerp(botY, topY, progress);
      // Alternate between flat shelves and steep ramps
      if (i % 2 === 0) {
        // Steep ramp up
        verts.push({ x: zx, y: targetY });
      } else {
        // Flat shelf
        const shelfLen = randRange(40, 80);
        verts.push({ x: zx, y: targetY });
        verts.push({ x: zx + shelfLen, y: targetY });
      }
    }

    verts.push({ x: sx + dist - 40, y: topY + 10 });
    verts.push({ x: sx + dist, y: topY });
    return verts;
  },

  // ── WATER CANYON: deep canyon with water, narrow shelves ──────
  water_canyon(sx, sy, dist, cupY, diff) {
    const leftShelfY = H * randRange(0.30, 0.45);
    const rightShelfY = H * randRange(0.20, 0.38);
    const canyonY = H * randRange(0.90, 0.97);       // below water line
    const canyonLeft = sx + dist * randRange(0.25, 0.38);
    const canyonRight = sx + dist * randRange(0.58, 0.72);
    const wallW = randRange(6, 12);
    const midLedgeY = H * randRange(0.55, 0.70);

    return [
      { x: sx + 20, y: leftShelfY },
      { x: canyonLeft, y: leftShelfY },               // left shelf edge
      { x: canyonLeft + wallW, y: canyonY },           // drop into canyon
      { x: canyonLeft + wallW + 30, y: canyonY },      // canyon floor
      // Mid-canyon ledge
      { x: canyonLeft + wallW + 35, y: midLedgeY },
      { x: canyonLeft + wallW + 80, y: midLedgeY },
      // Back into canyon
      { x: canyonLeft + wallW + 85, y: canyonY },
      { x: canyonRight - wallW, y: canyonY },         // canyon floor right
      { x: canyonRight, y: rightShelfY },              // climb out
      { x: sx + dist, y: rightShelfY },                // cup on right shelf
    ];
  },

  // ── DOUBLE CLIFF: two massive vertical faces ─────────────────
  double_cliff(sx, sy, dist, cupY, diff) {
    const topY = H * randRange(0.06, 0.18);
    const midY = H * randRange(0.45, 0.60);
    const botY = H * randRange(0.85, 0.95);
    const cliff1X = sx + dist * randRange(0.20, 0.35);
    const cliff2X = sx + dist * randRange(0.60, 0.75);
    const wallW = randRange(6, 12);
    // Start high, drop to mid, drop to bottom, cup at bottom
    const goDown = random() < 0.5;

    if (goDown) {
      return [
        { x: sx + 20, y: topY },
        { x: cliff1X, y: topY },                     // first cliff edge
        { x: cliff1X + wallW, y: midY },              // drop to mid
        { x: cliff2X, y: midY },                     // mid shelf
        { x: cliff2X + wallW, y: botY },              // drop to bottom
        { x: sx + dist, y: botY },                    // cup at bottom
      ];
    } else {
      // Reverse: start low, climb to top
      return [
        { x: sx + 20, y: botY },
        { x: cliff1X, y: botY },
        { x: cliff1X + wallW, y: midY },
        { x: cliff2X, y: midY },
        { x: cliff2X + wallW, y: topY },
        { x: sx + dist, y: topY },
      ];
    }
  },

  // ── CAVE PASSAGE: enclosed tunnel made of terrain + objects ───
  cave_passage(sx, sy, dist, cupY, diff) {
    const floorY = H * randRange(0.70, 0.82);
    const entryY = H * randRange(0.40, 0.55);
    const exitY = H * randRange(0.15, 0.30);
    const wallW = randRange(6, 12);
    const caveStart = sx + dist * randRange(0.20, 0.35);
    const caveEnd = sx + dist * randRange(0.55, 0.70);

    const verts = [
      { x: sx + 20, y: entryY },
      { x: caveStart - 20, y: entryY },
      { x: caveStart, y: entryY },
      { x: caveStart + wallW, y: floorY },           // drop to cave floor
      { x: caveEnd - wallW, y: floorY },             // cave floor
      { x: caveEnd, y: exitY },                      // climb out
      { x: sx + dist, y: exitY },                    // cup
    ];

    // Ceiling object over the cave floor
    const ceilTopY = floorY - randRange(80, 140);
    const ceilBotY = floorY - randRange(30, 60);

    objects.push({
      verts: [
        { x: caveStart + wallW + 10, y: ceilTopY },
        { x: caveEnd - wallW - 10, y: ceilTopY },
        { x: caveEnd - wallW + 5, y: ceilBotY },
        { x: caveStart + wallW - 5, y: ceilBotY },
      ],
      mat: 'rock',
      holeIndex: holes.length,
    });

    return verts;
  },
};

// ── Register dramatic archetypes into the main archetype table ──
// Merge into the shared `archetypes` object so pickArchetype() can find them.
// Also add entries to ARCHETYPE_TABLE with appropriate difficulty ranges.
for (const [name, fn] of Object.entries(dramaticArchetypes)) {
  archetypes[name] = fn;
}

// Dramatic archetypes are all high-difficulty, full-screen terrain
const DRAMATIC_ARCHETYPE_ENTRIES = [
  ['shelf_cliff_valley',      0.3, 1.0, 3],
  ['rect_shelf_valley_climb', 0.3, 1.0, 3],
  ['overhang_cave',           0.4, 1.0, 3],
  ['enclosed_bowl',           0.4, 1.0, 2],
  ['angular_peaks_climb',     0.3, 1.0, 3],
  ['staircase_plunge',        0.2, 1.0, 3],
  ['cliff_tower',             0.3, 1.0, 3],
  ['chasm_bridge',            0.3, 1.0, 3],
  ['zigzag_ascent',           0.3, 1.0, 2],
  ['water_canyon',            0.4, 1.0, 2],
  ['double_cliff',            0.2, 1.0, 3],
  ['cave_passage',            0.4, 1.0, 2],
];

for (const entry of DRAMATIC_ARCHETYPE_ENTRIES) {
  ARCHETYPE_TABLE.push(entry);
}
