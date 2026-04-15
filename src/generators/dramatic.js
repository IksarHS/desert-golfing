// ── Dramatic Terrain Generator ────────────────────────────────
// Late-game Desert Golfing archetypes (holes 5000+).
// Produces terrain using 80-98% of screen height with vertical cliffs,
// deep valleys, water hazards, overhangs (via objects[]), and staircase patterns.
//
// IMPORTANT: Every archetype MUST start its first vertex at sy (the tee Y)
// and transition gradually to the archetype's desired elevation. Never hardcode
// the starting Y — it causes vertical walls when the previous hole's cup is
// at a different elevation.
//
// Wall widths for steep drops MUST be proportional to drop height:
//   wallW = Math.max(45, dropHeight * 0.5)
// This ensures slopes are climbable (~63° max) and the ball can escape.
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
    const cliffFaceX = sx + dist * randRange(0.50, 0.65);
    const cupPlatY = H * randRange(0.18, 0.35);     // high cup plateau
    const cupPlatW = randRange(60, 120);

    // Proportional wall widths
    const drop1 = Math.abs(valleyY - shelfY);
    const wallW1 = Math.max(45, drop1 * 0.5);
    const rise1 = Math.abs(valleyY - cupPlatY);
    const wallW2 = Math.max(45, rise1 * 0.5);

    return [
      { x: sx + 20, y: sy },                        // match tee
      { x: sx + dist * 0.08, y: shelfY },           // transition to shelf
      { x: shelfEnd, y: shelfY },                    // shelf edge
      { x: shelfEnd + wallW1, y: valleyY },          // sloped drop to valley
      { x: cliffFaceX - 20, y: valleyY },            // valley floor
      { x: cliffFaceX, y: valleyY },                 // base of cliff
      { x: cliffFaceX + wallW2, y: cupPlatY },       // cliff face (sloped)
      { x: cliffFaceX + wallW2 + cupPlatW, y: cupPlatY }, // cup plateau
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
    const valleyEnd = sx + dist * randRange(0.35, 0.48);
    const midClimbX = sx + dist * randRange(0.55, 0.70);
    const midClimbY = H * randRange(0.50, 0.65);
    const cupPlatY = H * randRange(0.15, 0.30);

    // Proportional wall width
    const drop1 = Math.abs(valleyY - shelfY);
    const wallW = Math.max(45, drop1 * 0.5);

    return [
      { x: sx + 20, y: sy },                        // match tee
      { x: sx + dist * 0.08, y: shelfY },           // transition to shelf
      { x: shelfEnd, y: shelfY },                    // shelf edge
      { x: shelfEnd + wallW, y: valleyY },           // sloped drop
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
    const midShelfX = sx + dist * randRange(0.30, 0.45);
    const midShelfY = H * randRange(0.50, 0.65);

    // Proportional wall widths
    const rise1 = Math.abs(floorY - midShelfY);
    const wallW1 = Math.max(45, rise1 * 0.5);
    const rise2 = Math.abs(midShelfY - plateauY);
    const wallW2 = Math.max(45, rise2 * 0.5);

    // Main terrain line: low start, shelf, cliff up to plateau
    const verts = [
      { x: sx + 20, y: sy },                        // match tee
      { x: sx + dist * 0.08, y: floorY },           // transition to floor
      { x: midShelfX - 30, y: floorY },             // approach to mid shelf
      { x: midShelfX, y: floorY },                   // base of mid rise
      { x: midShelfX + wallW1, y: midShelfY },       // mid shelf level
      { x: plateauX - 40, y: midShelfY },            // mid shelf run
      { x: plateauX, y: midShelfY },                 // base of upper cliff
      { x: plateauX + wallW2, y: plateauY },          // cliff to plateau
      { x: sx + dist, y: plateauY },                 // cup on plateau
    ];

    // Overhang object: a solid polygon that juts out over the terrain below
    // Creates a ceiling/cave effect above the mid-shelf area
    const overhangLeft = midShelfX + wallW1 + 20;
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
    const cupPlatX = sx + dist * randRange(0.80, 0.90);
    const cupPlatY = H * randRange(0.18, 0.32);      // cup up high

    // Proportional wall widths
    const drop1 = Math.abs(bowlY - rimY);
    const wallW = Math.max(45, drop1 * 0.5);

    // Main terrain: approach, drop into bowl, climb out, cup on high ground
    const verts = [
      { x: sx + 20, y: sy },                        // match tee
      { x: rimLeftX - 20, y: rimY + 30 },           // transition near rim
      { x: rimLeftX, y: rimY },                      // left rim
      { x: rimLeftX + wallW, y: bowlY },             // sloped drop into bowl
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
    verts.push({ x: sx + 20, y: sy });               // match tee
    verts.push({ x: sx + dist * 0.08, y: startY });  // transition to low start

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
    const numSteps = 2 + Math.floor(random() * 2);   // 2-3 steps (was 3-4)
    const topY = H * randRange(0.15, 0.28);          // not as high (was 0.06-0.18)
    const botY = H * randRange(0.75, 0.88);          // not as low (was 0.85-0.96)
    const verts = [];
    const segW = dist / (numSteps + 1);

    // Start from tee, transition to staircase top
    verts.push({ x: sx + 15, y: sy });               // match tee
    let currentY = topY;
    // Only add transition if sy is far from topY
    if (Math.abs(sy - topY) > 30) {
      verts.push({ x: sx + dist * 0.08, y: topY }); // ramp to staircase top
    }

    for (let i = 0; i < numSteps; i++) {
      const stepX = sx + segW * (i + 1);
      const shelfLen = randRange(40, 80);
      const nextY = lerp(topY, botY, (i + 1) / numSteps);
      const dropHeight = Math.abs(nextY - currentY);
      // Wall width proportional to drop height — ensures slopes are
      // never steeper than ~60°, so the ball can always escape upward
      const wallW = Math.max(55, dropHeight * 0.7);
      verts.push({ x: stepX - shelfLen / 2, y: currentY }); // shelf
      verts.push({ x: stepX, y: currentY });                 // edge
      currentY = nextY;
      verts.push({ x: stepX + wallW, y: currentY });         // angled drop
    }

    verts.push({ x: sx + dist, y: currentY });               // cup at bottom
    return verts;
  },

  // ── CLIFF TOWER: tall narrow tower with cup on top ───────────
  // Valley floor with a rectangular tower rising from it. Cup on top.
  cliff_tower(sx, sy, dist, cupY, diff) {
    const floorY = H * randRange(0.72, 0.85);        // valley floor (not too low)
    const towerTopY = H * randRange(0.22, 0.40);     // tower top — shorter tower
    const towerX = sx + dist * randRange(0.50, 0.68);
    const towerHeight = Math.abs(floorY - towerTopY);
    // Wall width proportional to height — climbable slopes (~50° max)
    const wallW = Math.max(55, towerHeight * 0.5);
    // Ensure tower is wide enough for both walls + a flat top for the cup
    const towerW = Math.max(randRange(60, 110), wallW * 2 + 50);

    return [
      { x: sx + 20, y: sy },                        // match tee
      { x: sx + dist * 0.08, y: floorY },           // transition to floor
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

    // Proportional wall width — chasm walls must be climbable
    const chasmDepth = Math.abs(chasmY - plateauY);
    const wallW = Math.max(45, chasmDepth * 0.5);

    const verts = [
      { x: sx + 20, y: sy },                        // match tee
      { x: sx + dist * 0.08, y: plateauY },         // transition to plateau
      { x: chasmLeft, y: plateauY },                 // left edge
      { x: chasmLeft + wallW, y: chasmY },            // sloped drop into chasm
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

    verts.push({ x: sx + 15, y: sy });               // match tee
    verts.push({ x: sx + dist * 0.08, y: botY });    // transition to bottom

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
    const midLedgeY = H * randRange(0.55, 0.70);

    // Proportional wall widths
    const drop1 = Math.abs(canyonY - leftShelfY);
    const wallW = Math.max(45, drop1 * 0.5);

    // Proportional ledge wall widths
    const ledgeDrop = Math.abs(canyonY - midLedgeY);
    const ledgeW = Math.max(35, ledgeDrop * 0.4);

    return [
      { x: sx + 20, y: sy },                         // match tee
      { x: sx + dist * 0.08, y: leftShelfY },        // transition to shelf
      { x: canyonLeft, y: leftShelfY },               // left shelf edge
      { x: canyonLeft + wallW, y: canyonY },           // sloped drop into canyon
      { x: canyonLeft + wallW + 30, y: canyonY },      // canyon floor
      // Mid-canyon ledge
      { x: canyonLeft + wallW + 30 + ledgeW, y: midLedgeY },
      { x: canyonLeft + wallW + 80 + ledgeW, y: midLedgeY },
      // Back into canyon
      { x: canyonLeft + wallW + 80 + ledgeW * 2, y: canyonY },
      { x: canyonRight - wallW, y: canyonY },         // canyon floor right
      { x: canyonRight, y: rightShelfY },              // climb out
      { x: sx + dist, y: rightShelfY },                // cup on right shelf
    ];
  },

  // ── DOUBLE CLIFF: two massive vertical faces ─────────────────
  double_cliff(sx, sy, dist, cupY, diff) {
    const topY = H * randRange(0.22, 0.32);       // tightened (was 0.18-0.30)
    const midY = H * randRange(0.45, 0.58);
    const botY = H * randRange(0.72, 0.82);       // tightened (was 0.75-0.85)
    const cliff1X = sx + dist * randRange(0.20, 0.35);
    // Wall width proportional to drop height — never steeper than ~60°
    const drop1 = Math.abs(midY - topY);
    const drop2 = Math.abs(botY - midY);
    const wallW1 = Math.max(55, drop1 * 0.55);
    const wallW2 = Math.max(55, drop2 * 0.55);
    // Ensure cliff2 starts after cliff1's wall ends
    const cliff2X = Math.max(sx + dist * randRange(0.60, 0.75), cliff1X + wallW1 + 40);
    const goDown = random() < 0.5;

    if (goDown) {
      return [
        { x: sx + 20, y: sy },                      // match tee
        { x: sx + dist * 0.08, y: topY },           // transition to top
        { x: cliff1X, y: topY },
        { x: cliff1X + wallW1, y: midY },
        { x: cliff2X, y: midY },
        { x: cliff2X + wallW2, y: botY },
        { x: sx + dist, y: botY },
      ];
    } else {
      return [
        { x: sx + 20, y: sy },                      // match tee
        { x: sx + dist * 0.08, y: botY },           // transition to bottom
        { x: cliff1X, y: botY },
        { x: cliff1X + wallW1, y: midY },
        { x: cliff2X, y: midY },
        { x: cliff2X + wallW2, y: topY },
        { x: sx + dist, y: topY },
      ];
    }
  },

  // ── CAVE PASSAGE: enclosed tunnel made of terrain + objects ───
  cave_passage(sx, sy, dist, cupY, diff) {
    const floorY = H * randRange(0.70, 0.82);
    const entryY = H * randRange(0.40, 0.55);
    const exitY = H * randRange(0.15, 0.30);
    const caveStart = sx + dist * randRange(0.20, 0.35);
    const caveEnd = sx + dist * randRange(0.55, 0.70);

    // Proportional wall widths
    const drop1 = Math.abs(floorY - entryY);
    const wallW1 = Math.max(45, drop1 * 0.5);
    const rise1 = Math.abs(floorY - exitY);
    const wallW2 = Math.max(45, rise1 * 0.5);

    const verts = [
      { x: sx + 20, y: sy },                        // match tee
      { x: sx + dist * 0.08, y: entryY },           // transition to entry
      { x: caveStart - 20, y: entryY },
      { x: caveStart, y: entryY },
      { x: caveStart + wallW1, y: floorY },          // sloped drop to cave floor
      { x: caveEnd - wallW2, y: floorY },            // cave floor
      { x: caveEnd, y: exitY },                      // climb out
      { x: sx + dist, y: exitY },                    // cup
    ];

    // Ceiling object over the cave floor
    const ceilTopY = floorY - randRange(80, 140);
    const ceilBotY = floorY - randRange(30, 60);

    objects.push({
      verts: [
        { x: caveStart + wallW1 + 10, y: ceilTopY },
        { x: caveEnd - wallW2 - 10, y: ceilTopY },
        { x: caveEnd - wallW2 + 5, y: ceilBotY },
        { x: caveStart + wallW1 - 5, y: ceilBotY },
      ],
      mat: 'rock',
      holeIndex: holes.length,
    });

    return verts;
  },
  // ── COMPLEX FORTRESS: Reference image hole 128 ──────────────
  // Terrain wraps around itself with overhangs, notches, tunnels.
  // Vertices zigzag in both X and Y creating enclosed negative spaces.
  // Ball starts low-left, cup on a high plateau.
  complex_fortress(sx, sy, dist, cupY, diff) {
    const groundY = H * randRange(0.82, 0.92);    // base ground level
    const midY = H * randRange(0.50, 0.65);        // mid-level shelves
    const highY = H * randRange(0.20, 0.35);       // high plateau (cup area)
    const topY = H * randRange(0.08, 0.18);        // highest point

    // Proportional wall widths
    const rise1 = Math.abs(groundY - midY);
    const wallW1 = Math.max(45, rise1 * 0.5);
    const rise2 = Math.abs(midY - highY);
    const wallW2 = Math.max(45, rise2 * 0.5);
    const rise3 = Math.abs(highY - topY);
    const wallW3 = Math.max(45, rise3 * 0.5);

    // Build a complex path that zigzags up, creating overhangs and notches
    const x1 = sx + dist * randRange(0.08, 0.15);  // first feature
    const x2 = sx + dist * randRange(0.20, 0.30);
    const x3 = sx + dist * randRange(0.35, 0.45);
    const x4 = sx + dist * randRange(0.50, 0.60);
    const x5 = sx + dist * randRange(0.65, 0.75);
    const x6 = sx + dist * randRange(0.80, 0.90);

    return [
      // Start at tee, transition to ground level, rise to first shelf
      { x: sx + 20, y: sy },                        // match tee
      { x: x1 - 20, y: groundY },                   // transition to ground
      { x: x1, y: groundY },
      { x: x1 + wallW1, y: midY },                   // wall up to mid shelf
      { x: x2 - 20, y: midY },                       // mid shelf
      // Overhang: go UP then BACK LEFT, creating a ceiling
      { x: x2, y: midY },
      { x: x2 - wallW2, y: highY },                  // wall up (going LEFT = overhang!)
      { x: x2 - 60, y: highY },                      // overhang shelf extending left
      // Come back right and down, creating a notch
      { x: x2 - 60, y: highY - 30 },                 // notch up
      { x: x3, y: highY - 30 },                      // extend right at high level
      { x: x3, y: midY + 30 },                       // drop back down
      // Another shelf section
      { x: x4 - 20, y: midY + 30 },
      { x: x4, y: midY + 30 },
      { x: x4 + wallW3, y: topY },                   // rise to top
      { x: x5, y: topY },                            // high plateau
      // Drop to cup level
      { x: x5 + wallW2, y: highY },
      { x: x6 - 30, y: highY },                      // cup plateau
      { x: sx + dist, y: highY },
    ];
  },

  // ── LABYRINTH: multiple overhangs creating a maze-like path ────
  labyrinth(sx, sy, dist, cupY, diff) {
    // Simplified labyrinth — zigzag terrain without overhangs
    // Multiple rises and drops create a winding path, but always forward-progressing
    const floorY = H * randRange(0.75, 0.85);
    const shelf1Y = H * randRange(0.50, 0.60);
    const shelf2Y = H * randRange(0.30, 0.42);
    const topY = H * randRange(0.20, 0.30);

    const rise1 = Math.abs(floorY - shelf1Y);
    const wallW1 = Math.max(50, rise1 * 0.6);
    const drop1 = Math.abs(shelf1Y - shelf2Y);
    const wallW2 = Math.max(50, drop1 * 0.6);
    const rise2 = Math.abs(shelf2Y - topY);
    const wallW3 = Math.max(50, rise2 * 0.6);

    const x1 = sx + dist * 0.15;
    const x2 = Math.max(sx + dist * 0.30, x1 + wallW1 + 30);
    const x3 = Math.max(sx + dist * 0.50, x2 + wallW2 + 30);
    const x4 = Math.max(sx + dist * 0.70, x3 + wallW3 + 30);

    return [
      { x: sx + 20, y: sy },                        // match tee
      { x: sx + dist * 0.08, y: floorY },           // transition to floor
      // Rise to first shelf
      { x: x1, y: floorY },
      { x: x1 + wallW1, y: shelf1Y },
      // Drop to second level
      { x: x2, y: shelf1Y },
      { x: x2 + wallW2, y: shelf2Y + 30 },
      // Rise to top
      { x: x3, y: shelf2Y + 30 },
      { x: x3 + wallW3, y: topY },
      // Down to cup
      { x: x4, y: topY },
      { x: sx + dist, y: shelf2Y },
    ];
  },

  // ── ANGULAR CHAOS: random zigzag creating unpredictable overhangs ──
  angular_chaos(sx, sy, dist, cupY, diff) {
    const numPoints = 10 + Math.floor(random() * 6);
    const verts = [];
    let x = sx + 30;
    let y = sy;                                      // start from tee Y

    verts.push({ x: sx + 20, y: sy });               // match tee

    for (let i = 0; i < numPoints; i++) {
      const frac = (i + 1) / (numPoints + 1);
      // Mix of forward and backward X movement
      const dx = dist / numPoints * randRange(0.3, 1.5);
      const goBack = random() < 0.25; // 25% chance to go backward (overhang)
      x += goBack ? -dx * 0.5 : dx;
      x = Math.max(sx + 40, Math.min(sx + dist - 40, x));

      // Y oscillates between ground level and high up
      const targetY = H * randRange(0.08, 0.95);
      y = lerp(y, targetY, randRange(0.5, 1.0));

      verts.push({ x: x, y: y });
    }

    // End at cup position
    const cupFinalY = H * randRange(0.15, 0.50);
    verts.push({ x: sx + dist, y: cupFinalY });

    return verts;
  },
};

// ── Register dramatic archetypes into the main archetype table ──
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
  ['complex_fortress',        0.3, 1.0, 3],
  ['labyrinth',               0.4, 1.0, 2],
  ['angular_chaos',           0.3, 1.0, 3],
];

for (const entry of DRAMATIC_ARCHETYPE_ENTRIES) {
  ARCHETYPE_TABLE.push(entry);
}
