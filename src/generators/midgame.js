// ── Midgame Terrain Generator ────────────────────────────────
// Based on analysis of Desert Golfing holes 500-700.
// Characterised by: angular shelves, cliff drops, diagonal slopes
// meeting at hard angles, wider valleys, 40-60% screen height usage.
// No overhangs — all terrain is grounded and left-to-right.
//
// These archetypes produce terrain that feels "cut with a knife" —
// sharp rectangular features, near-vertical walls, flat shelves
// connected by steep drops.

const midgameArchetypes = {

  // ── SHELF DROP: flat shelf → near-vertical drop → lower flat area ──
  // The signature feature of this tier. Sharp rectangular step-down.
  // Seen on holes 502, 575, 689, 699.
  mg_shelf_drop(sx, sy, dist, cupY, diff) {
    const shelfFrac = randRange(0.25, 0.50);  // where the drop happens
    const dropX = sx + dist * shelfFrac;
    const topY = clampY(Math.min(sy, H * 0.40));
    const dropH = randRange(80, 180 + diff * 60);
    const botY = clampY(topY + dropH);
    const wallW = randRange(4, 10);  // near-vertical wall width

    // Sometimes a small shelf juts out before the drop
    const hasLedge = random() < 0.3;
    const verts = [];

    if (hasLedge) {
      const ledgeW = randRange(30, 60);
      verts.push({ x: dropX - ledgeW, y: topY });
      verts.push({ x: dropX, y: topY - randRange(10, 30) });  // slight rise
    }

    verts.push({ x: dropX, y: topY });            // shelf edge
    verts.push({ x: dropX + wallW, y: botY });     // near-vertical drop
    verts.push({ x: sx + dist, y: botY });          // cup on lower level

    return verts;
  },

  // ── ANGULAR VALLEY: wide V or U shape with hard angle at the bottom ──
  // Broad valley, not narrow canyon. Slopes meet at a sharp point or flat floor.
  // Seen on holes 525, 575.
  mg_angular_valley(sx, sy, dist, cupY, diff) {
    const valleyCenter = sx + dist * randRange(0.35, 0.60);
    const baseY = clampY(Math.max(sy, cupY));
    const depth = randRange(60, 160 + diff * 60);
    const botY = clampY(baseY + depth);
    const slopeW = dist * randRange(0.15, 0.30);  // wide slopes, not narrow walls

    const flatBottom = random() < 0.4;

    if (flatBottom) {
      const floorW = randRange(40, 100);
      return [
        { x: valleyCenter - slopeW, y: clampY(baseY - 10) },  // left rim
        { x: valleyCenter - floorW / 2, y: botY },             // left floor edge
        { x: valleyCenter + floorW / 2, y: botY },             // right floor edge
        { x: valleyCenter + slopeW, y: clampY(baseY - 10) },   // right rim
        { x: sx + dist, y: cupY },
      ];
    }

    return [
      { x: valleyCenter - slopeW, y: clampY(baseY - 10) },
      { x: valleyCenter, y: botY },                             // V-bottom
      { x: valleyCenter + slopeW, y: clampY(baseY - 10) },
      { x: sx + dist, y: cupY },
    ];
  },

  // ── DIAGONAL SLOPE WITH BREAK: two distinct slope angles meeting at a hard angle ──
  // The terrain changes slope direction sharply at a break point.
  // Seen on holes 551, 631.
  mg_slope_break(sx, sy, dist, cupY, diff) {
    const breakX = sx + dist * randRange(0.30, 0.55);
    const goingDown = random() < 0.6;

    if (goingDown) {
      // Gentle slope → sharp steep section
      const midY = clampY(lerp(sy, cupY, randRange(0.2, 0.4)));
      const endY = clampY(Math.max(cupY, sy + randRange(60, 150 + diff * 60)));
      return [
        { x: breakX, y: midY },                      // gentle section ends
        { x: breakX + randRange(20, 60), y: endY },  // steep section
        { x: sx + dist, y: endY },
      ];
    } else {
      // Steep rise → gentle plateau
      const midY = clampY(lerp(sy, cupY, randRange(0.6, 0.8)));
      const endY = clampY(Math.min(cupY, sy - randRange(60, 150 + diff * 60)));
      return [
        { x: breakX - randRange(20, 60), y: sy },
        { x: breakX, y: midY },                      // steep section ends
        { x: sx + dist - 40, y: endY },              // gentle plateau
        { x: sx + dist, y: endY },
      ];
    }
  },

  // ── DOUBLE SHELF: two rectangular step-downs (or step-ups) ──
  // Staircase pattern with flat shelves between drops.
  // Seen on holes 665, 699.
  mg_double_shelf(sx, sy, dist, cupY, diff) {
    const step1X = sx + dist * randRange(0.20, 0.35);
    const step2X = sx + dist * randRange(0.55, 0.70);
    const stepH = randRange(50, 120 + diff * 40);
    const wallW = randRange(4, 10);
    const goingDown = random() < 0.65;

    if (goingDown) {
      const y1 = clampY(sy);
      const y2 = clampY(y1 + stepH);
      const y3 = clampY(y2 + stepH);
      return [
        { x: step1X, y: y1 },
        { x: step1X + wallW, y: y2 },    // first drop
        { x: step2X, y: y2 },            // mid shelf
        { x: step2X + wallW, y: y3 },    // second drop
        { x: sx + dist, y: y3 },
      ];
    } else {
      const y1 = clampY(sy);
      const y2 = clampY(y1 - stepH);
      const y3 = clampY(y2 - stepH);
      return [
        { x: step1X, y: y1 },
        { x: step1X + wallW, y: y2 },    // first rise
        { x: step2X, y: y2 },            // mid shelf
        { x: step2X + wallW, y: y3 },    // second rise
        { x: sx + dist, y: y3 },
      ];
    }
  },

  // ── CLIFF FACE: tee on a high shelf, long diagonal slope to a low cup ──
  // The ball rolls/bounces down a long angled surface.
  // Seen on hole 631.
  mg_cliff_face(sx, sy, dist, cupY, diff) {
    const highY = clampY(H * randRange(0.20, 0.38));
    const lowY = clampY(H * randRange(0.70, 0.88));
    const slopeStart = sx + dist * randRange(0.15, 0.30);
    const slopeEnd = sx + dist * randRange(0.65, 0.80);

    // Optional small bump/ridge along the slope
    const hasBump = random() < 0.35;
    const verts = [
      { x: slopeStart, y: highY },
    ];

    if (hasBump) {
      const bumpX = lerp(slopeStart, slopeEnd, randRange(0.3, 0.6));
      const bumpY = lerp(highY, lowY, randRange(0.3, 0.5)) - randRange(15, 35);
      verts.push({ x: bumpX, y: clampY(bumpY) });
      verts.push({ x: bumpX + randRange(15, 30), y: clampY(bumpY + randRange(20, 40)) });
    }

    verts.push({ x: slopeEnd, y: lowY });
    verts.push({ x: sx + dist, y: lowY });

    return verts;
  },

  // ── NOTCH: terrain rises, cuts in sharply, then continues ──
  // Creates a rectangular bite out of a slope. Common in 500+ holes.
  mg_notch(sx, sy, dist, cupY, diff) {
    const notchX = sx + dist * randRange(0.30, 0.55);
    const baseY = clampY(lerp(sy, cupY, 0.5));
    const notchDepth = randRange(40, 100 + diff * 40);
    const notchW = randRange(30, 80);
    const wallW = randRange(4, 10);

    return [
      { x: notchX - 30, y: baseY },                           // approach
      { x: notchX, y: baseY },                                // notch left edge
      { x: notchX + wallW, y: clampY(baseY + notchDepth) },   // drop into notch
      { x: notchX + notchW, y: clampY(baseY + notchDepth) },  // notch floor
      { x: notchX + notchW + wallW, y: baseY },               // climb out
      { x: sx + dist, y: cupY },
    ];
  },
};

// Register into the shared archetype system
for (const [name, fn] of Object.entries(midgameArchetypes)) {
  archetypes[name] = fn;
}

const MIDGAME_ARCHETYPE_ENTRIES = [
  ['mg_shelf_drop',      0.15, 1.0, 3],
  ['mg_angular_valley',  0.15, 1.0, 3],
  ['mg_slope_break',     0.10, 1.0, 3],
  ['mg_double_shelf',    0.20, 1.0, 3],
  ['mg_cliff_face',      0.15, 1.0, 2],
  ['mg_notch',           0.20, 1.0, 2],
];

for (const entry of MIDGAME_ARCHETYPE_ENTRIES) {
  ARCHETYPE_TABLE.push(entry);
}
