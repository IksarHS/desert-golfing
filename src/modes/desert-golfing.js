// ── Desert Golfing Mode ───────────────────────────────────
// Horizontal golf: procedural terrain, left-to-right holes, fixed camera per hole.
// Requires: shared.js, level-design.js loaded before this file.

// ── DG-Specific Globals ──────────────────────────────────
// vertices[] and holes[] are declared in shared.js (used by level-design.js)
// currentHole is declared in shared.js

// ── Course Data Loading ──────────────────────────────────
// Preloaded data is fetched before game init (set by preloadCourseData)
let _preloadedCourseData = null;

// Call this before MODE.init() — fetches course JSON from server
async function preloadCourseData() {
  let worldId = 'desert-planet', courseId = 'barren-flats';
  try {
    const active = JSON.parse(localStorage.getItem('dg-active-course'));
    if (active?.worldId && active?.courseId) {
      worldId = active.worldId;
      courseId = active.courseId;
    }
  } catch (e) {}

  const filename = `/data/courses/${worldId}--${courseId}.json`;
  try {
    const resp = await fetch(filename);
    if (resp.ok) {
      _preloadedCourseData = await resp.json();
      console.log('Preloaded course from', filename);
    }
  } catch (e) {}
}

// Sync function called during MODE.init() — applies preloaded or localStorage data
function _applyCourseData(worldId, courseId) {
  let saved = _preloadedCourseData;

  // Fall back to localStorage if no server data
  if (!saved) {
    try {
      const key = 'dg-course-' + worldId + '-' + courseId;
      const raw = localStorage.getItem(key);
      if (raw) {
        saved = JSON.parse(raw);
        console.log('Loaded course from localStorage');
      }
    } catch (e) {}
  }

  if (saved) {
    if (saved.courseName) currentCourse.name = saved.courseName;
    if (saved.holeCount) currentCourse.holeCount = saved.holeCount;
    if (saved.holes) {
      for (const [idx, holeData] of Object.entries(saved.holes)) {
        HAND_DEFINED_HOLES[Number(idx)] = holeData;
      }
    }
    // Load objects (editor also loads these via loadCourseData,
    // but the editor clears objects first so no duplication)
    if (saved.objects && Array.isArray(saved.objects)) {
      objects.length = 0;
      for (const o of saved.objects) objects.push(o);
    }
  }
  // Clear preloaded data so it's not applied twice
  _preloadedCourseData = null;
}

// ── Terrain Collision ──────────────────────────────────────
function findSegment(worldX) {
  for (let i = 0; i < vertices.length - 1; i++) {
    if (worldX >= vertices[i].x && worldX <= vertices[i + 1].x) {
      return i;
    }
  }
  return vertices.length - 2;
}

function segmentNormal(i) {
  const a = vertices[i], b = vertices[i + 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  return { x: dy / len, y: -dx / len };
}

function collideWithTerrain() {
  let collided = false;

  for (let i = 0; i < vertices.length - 1; i++) {
    const a = vertices[i], b = vertices[i + 1];

    // Skip segments far from ball
    if (b.x < ball.x - BALL_RADIUS * 2 && a.x < ball.x - BALL_RADIUS * 2) continue;
    if (a.x > ball.x + BALL_RADIUS * 2 && b.x > ball.x + BALL_RADIUS * 2) break;

    // Find closest point on segment AB to ball center
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 0.001) continue;

    let t = ((ball.x - a.x) * dx + (ball.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = a.x + t * dx;
    const closestY = a.y + t * dy;

    const distX = ball.x - closestX;
    const distY = ball.y - closestY;
    const distSq = distX * distX + distY * distY;

    if (distSq < BALL_RADIUS * BALL_RADIUS && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);

      const nx = distX / dist;
      const ny = distY / dist;

      // Push ball out of terrain
      const overlap = BALL_RADIUS - dist;
      ball.x += nx * overlap;
      ball.y += ny * overlap;

      // Velocity response — use material-specific restitution
      const segMat = MATERIALS[vertices[i].mat || DEFAULT_MAT];
      const dot = ball.vx * nx + ball.vy * ny;
      if (dot < 0) {
        const isGround = Math.abs(ny) > Math.abs(nx);
        if (isGround && -dot < BOUNCE_THRESHOLD) {
          ball.vx -= dot * nx;
          ball.vy -= dot * ny;
        } else {
          ball.vx -= (1 + segMat.restitution) * dot * nx;
          ball.vy -= (1 + segMat.restitution) * dot * ny;
        }
      }

      // Track last collided material for friction lookup
      ball.lastCollidedMat = vertices[i].mat || DEFAULT_MAT;

      collided = true;
    }
  }

  return collided;
}

function collideWithObjects() {
  let collided = false;

  for (let oi = 0; oi < objects.length; oi++) {
    const obj = objects[oi];
    const verts = obj.verts;
    if (!verts || verts.length < 2) continue;

    // Quick AABB check — skip objects far from ball
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of verts) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }
    if (ball.x + BALL_RADIUS < minX || ball.x - BALL_RADIUS > maxX ||
        ball.y + BALL_RADIUS < minY || ball.y - BALL_RADIUS > maxY) continue;

    // Check each edge of the polygon
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % verts.length];

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 0.001) continue;

      let t = ((ball.x - a.x) * dx + (ball.y - a.y) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const closestX = a.x + t * dx;
      const closestY = a.y + t * dy;

      const distX = ball.x - closestX;
      const distY = ball.y - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq < BALL_RADIUS * BALL_RADIUS && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const nx = distX / dist;
        const ny = distY / dist;

        // Push ball out
        const overlap = BALL_RADIUS - dist;
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        // Velocity response — use object material or default
        const objMat = MATERIALS[obj.mat || DEFAULT_MAT];
        const dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) {
          const isGround = Math.abs(ny) > Math.abs(nx);
          if (isGround && -dot < BOUNCE_THRESHOLD) {
            ball.vx -= dot * nx;
            ball.vy -= dot * ny;
          } else {
            ball.vx -= (1 + objMat.restitution) * dot * nx;
            ball.vy -= (1 + objMat.restitution) * dot * ny;
          }
        }

        ball.lastCollidedMat = obj.mat || DEFAULT_MAT;
        collided = true;
      }
    }
  }

  return collided;
}

// ── Camera ─────────────────────────────────────────────────
function setHoleCamera(hole) {
  const margin = 120;
  const teeScreenX = margin;
  camera.x = hole.teeX - teeScreenX;

  const cupScreenX = hole.cupX - camera.x;
  if (cupScreenX > W - margin) {
    const center = (hole.teeX + hole.cupX) / 2;
    camera.x = center - W / 2;
  }
}

// ── Cup Logic ──────────────────────────────────────────────
function isBallInCup() {
  const hole = holes[currentHole];
  if (!hole || hole.cupFilled) return false;

  const inCupX = Math.abs(ball.x - hole.cupX) < CUP_WIDTH / 2;
  const belowRim = ball.y > hole.cupY;
  return inCupX && belowRim;
}

function isBallOffScreen() {
  const sx = ball.x - camera.x;
  const sy = ball.y;
  const margin = BALL_RADIUS + 10;
  // Only OOB on left, right, and bottom — not top (ball can fly upward freely)
  return sx < -margin || sx > W + margin || sy > H + margin;
}

// ── Drawing ────────────────────────────────────────────────
function drawTerrainDG() {
  ctx.fillStyle = GROUND;
  ctx.beginPath();

  const startX = camera.x - 50;
  const endX   = camera.x + W + 50;

  let started = false;
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    if (v.x < startX - 100 && i < vertices.length - 1 && vertices[i + 1].x < startX - 100) continue;
    if (v.x > endX + 100) {
      if (!started) { ctx.moveTo(v.x, v.y); started = true; }
      else ctx.lineTo(v.x, v.y);
      break;
    }

    if (!started) { ctx.moveTo(v.x, v.y); started = true; }
    else ctx.lineTo(v.x, v.y);
  }

  // Close polygon at bottom of screen (in world coords)
  ctx.lineTo(endX + 100, H + 10);
  ctx.lineTo(startX - 100, H + 10);
  ctx.closePath();
  ctx.fill();
}

// ── MODE Object ────────────────────────────────────────────
MODE = {
  name: 'desert-golfing',

  init() {
    // Set current world/course
    let worldId = 'desert-planet', courseId = 'barren-flats';
    try {
      const active = JSON.parse(localStorage.getItem('dg-active-course'));
      if (active && active.worldId && active.courseId) {
        worldId = active.worldId;
        courseId = active.courseId;
      }
    } catch (e) {}
    currentWorld = WORLDS[worldId] || WORLDS['desert-planet'];
    currentCourse = currentWorld.courses[courseId] || Object.values(currentWorld.courses)[0];

    // Load saved course data (sync — checks _preloadedCourseData first, then localStorage)
    _applyCourseData(worldId, courseId);

    ensureHolesAhead(2);
    const firstHole = holes[0];
    ball.x = firstHole.teeX;
    ball.y = terrainYAt(firstHole.teeX) - BALL_RADIUS;
    ball.atRest = true;
    setHoleCamera(firstHole);
  },

  collide() {
    const terrain = collideWithTerrain();
    const obj = collideWithObjects();
    // onGround if touching terrain OR an object surface
    ball.onGround = terrain || obj;
    return terrain || obj;
  },

  canRest(forceRest) {
    // Check if slope is too steep to rest (static friction check)
    const seg = findSegment(ball.x);
    const n = segmentNormal(seg);
    const slopeGravity = Math.abs(GRAVITY * n.x);
    if (slopeGravity > SURFACE_FRICTION && !forceRest) {
      return false; // too steep — let ball keep rolling
    }
    return true;
  },

  onRest() {
    // Trust the collision system — ball is already positioned correctly
    // whether on terrain or an object surface
  },

  isGoalReached() {
    if (isBallInCup()) {
      return holes[currentHole];
    }
    return false;
  },

  onGoalReached(cupData) {
    // Nothing extra needed — cup data is already tracked
  },

  isOOB() {
    return isBallOffScreen();
  },

  onOOB() {
    const hole = holes[currentHole];
    ball.x = hole.teeX;
    ball.y = terrainYAt(hole.teeX) - BALL_RADIUS;
    ball.vx = 0;
    ball.vy = 0;
    ball.atRest = true;
  },

  onTransitionStart() {
    transitionCamStart = camera.x;
    transitionBallStartY = ball.y;

    currentHole++;

    // Check if this was the last hole in the course
    if (currentHole >= (currentCourse?.holeCount ?? Infinity)) {
      courseComplete = true;
      // Don't compute new camera target — stay put
      transitionCamEnd = camera.x;
    } else {
      // Compute target camera position for new hole
      const newHole = holes[currentHole];
      const savedCamX = camera.x;
      setHoleCamera(newHole);
      transitionCamEnd = camera.x;
      camera.x = savedCamX; // restore — we'll animate to target
    }

    if (currentHole === 1) showTitle = false;
  },

  setCameraPos(val) {
    camera.x = val;
  },

  getTransitionCupData() {
    return currentHole > 0 ? holes[currentHole - 1] : null;
  },

  onTransitionEnd() {
    const prevHole = holes[currentHole - 1];
    if (prevHole) {
      prevHole.cupFilled = true;
      prevHole.cupFillProgress = 1;
      prevHole.flagVisible = false;
      prevHole.flagOpacity = 0;
      flattenCup(prevHole);
    }

    // Course complete — enter idle end state
    if (courseComplete) {
      state = STATE_COMPLETE;
      completeTimer = 0;
      return;
    }

    // Ball stays at old cup X (which IS the new tee X) — just snap Y to terrain
    ball.y = terrainYAt(ball.x) - BALL_RADIUS;

    ensureHolesAhead(currentHole + 2);
  },

  // No camera update during flight (camera is fixed per hole in DG)
  updateCamera: null,

  // ── Rendering ──────────────────────────────────────────
  applyCameraTransform(ctx) {
    ctx.translate(-camera.x, 0);
  },

  drawSky() {
    ctx.fillStyle = SKY;
    ctx.fillRect(0, 0, W, H);
  },

  drawWorld() {
    drawTerrainDG();
    drawObjects();

    // Cup fill + flag for current and previous hole
    if (state === STATE_TRANSITION && currentHole > 0) {
      const prevHole = holes[currentHole - 1];
      drawCupFill(prevHole);
      drawFlag(prevHole, terrainYAt);
    }

    const curHole = holes[currentHole];
    if (curHole) {
      drawCupFill(curHole);
      drawFlag(curHole, terrainYAt);
    }
  },

  drawHUD() {
    // Title on first hole — show world, course name, hole count
    if (showTitle && currentHole === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';

      const worldName = currentWorld ? currentWorld.name : 'Desert Planet';
      const courseName = currentCourse ? currentCourse.name : '';
      const holeCount = currentCourse ? (currentCourse.holeCount || '?') : '?';

      ctx.font = "28px 'Departure Mono', monospace";
      ctx.fillText(worldName, 20, 34);

      if (courseName) {
        ctx.font = "20px 'Departure Mono', monospace";
        ctx.fillText(courseName, 20, 58);
      }

      ctx.font = "16px 'Departure Mono', monospace";
      ctx.fillText(holeCount + ' Holes', 20, 78);
    }

    // Course completion screen
    if (state === STATE_COMPLETE) {
      completeTimer++;
      const fadeIn = Math.min(1, completeTimer / 30); // fade over ~0.5 seconds
      ctx.fillStyle = 'rgba(255, 255, 255, ' + fadeIn + ')';
      ctx.textAlign = 'center';

      ctx.font = "28px 'Departure Mono', monospace";
      ctx.fillText('COURSE COMPLETE', W / 2, H * 0.35);

      const courseName = currentCourse ? currentCourse.name : '';
      if (courseName) {
        ctx.font = "20px 'Departure Mono', monospace";
        ctx.fillText(courseName, W / 2, H * 0.35 + 30);
      }

      ctx.font = "20px 'Departure Mono', monospace";
      ctx.fillText(totalStrokes + ' strokes', W / 2, H * 0.35 + 58);

      ctx.textAlign = 'left'; // restore
    }
  }
};
