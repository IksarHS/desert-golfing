// ── Desert Golfing Mode ───────────────────────────────────
// Horizontal golf: procedural terrain, left-to-right holes, fixed camera per hole.
// Requires: shared.js, level-design.js loaded before this file.

// ── DG-Specific Globals ──────────────────────────────────
// vertices[] and holes[] are declared in shared.js (used by level-design.js)
// currentHole is declared in shared.js
let _completeBtn = null; // click target for "Next Course/World" button
let _replayBtn = null;   // click target for "Replay Course" button

// Find the next course or world to play after completing the current course
function getNextDestination() {
  if (!currentWorld || !currentCourse) return null;

  // Find current course in the world's course list
  const courseIds = Object.keys(currentWorld.courses);
  const currentIdx = courseIds.findIndex(id => currentWorld.courses[id] === currentCourse);

  if (currentIdx < courseIds.length - 1) {
    // More courses in this world
    const nextId = courseIds[currentIdx + 1];
    return { type: 'course', worldId: _currentWorldId, courseId: nextId, course: currentWorld.courses[nextId] };
  }

  // No more courses — find next world (same system first, then any system)
  const worldIds = Object.keys(WORLDS);
  const currentWorldIdx = worldIds.findIndex(id => WORLDS[id] === currentWorld);

  // Same system first
  for (let i = currentWorldIdx + 1; i < worldIds.length; i++) {
    const nextWorld = WORLDS[worldIds[i]];
    if (nextWorld.system === currentWorld.system) {
      const firstCourseId = Object.keys(nextWorld.courses)[0];
      if (firstCourseId) {
        return { type: 'world', worldId: worldIds[i], courseId: firstCourseId, course: nextWorld.courses[firstCourseId], world: nextWorld };
      }
    }
  }

  // Different system — next adventure
  for (let i = currentWorldIdx + 1; i < worldIds.length; i++) {
    const nextWorld = WORLDS[worldIds[i]];
    if (nextWorld.system !== currentWorld.system) {
      const firstCourseId = Object.keys(nextWorld.courses)[0];
      if (firstCourseId) {
        return { type: 'world', worldId: worldIds[i], courseId: firstCourseId, course: nextWorld.courses[firstCourseId], world: nextWorld };
      }
    }
  }

  return null; // end of everything
}

// Start a new course (resets game state)
function startCourse(worldId, courseId) {
  currentWorld = WORLDS[worldId];
  currentCourse = currentWorld.courses[courseId];
  _currentWorldId = worldId;

  // Load art images if the course defines them
  loadArtImages();

  // Reset game state
  vertices.length = 0;
  holes.length = 0;
  objects.length = 0;
  _recentArchetypes.length = 0;
  currentHole = 0;
  totalStrokes = 0;
  strokes = 0;
  courseComplete = false;
  completeTimer = 0;
  showTitle = true;
  _completeBtn = null;
  _replayBtn = null;

  // Re-seed for this course so terrain is deterministic
  // Always use the base seed (42) + course offset, never the current mutated seed
  const baseSeed = parseInt(localStorage.getItem('dg-seed') || '42', 10);
  const _hash = hashString(worldId + courseId);
  setSeed(baseSeed + _hash);
  ensureHolesAhead(2);
  const firstHole = holes[0];
  ball.x = firstHole.teeX;
  ball.y = terrainYAt(firstHole.teeX) - BALL_RADIUS;
  ball.vx = 0; ball.vy = 0;
  ball.atRest = true; ball.onGround = false;
  ball.spinRate = 0; ball.rotation = 0;
  setHoleCamera(firstHole);
  state = STATE_AIM;
}

// Simple string hash for seed offset per course
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return h;
}

let _currentWorldId = 'desert-world-1';

// ── Course Data Loading ──────────────────────────────────
// Course data is now fully defined in code (desert-planet.js etc.)
// No preloading or localStorage overrides needed for the game.

// ── Terrain Collision ──────────────────────────────────────
function findSegment(worldX) {
  return _bsearchVertex(worldX);
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

  // Binary search to find nearby segments instead of scanning all vertices.
  // Check a small window around ball.x (±BALL_RADIUS*2 worth of segments).
  const center = _bsearchVertex(ball.x);
  if (center < 0) return false;
  const lo = Math.max(0, center - 3);
  const hi = Math.min(vertices.length - 2, center + 3);

  for (let i = lo; i <= hi; i++) {
    const a = vertices[i], b = vertices[i + 1];

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
// ── Art Image Support ──────────────────────────────────────
// Courses can define:
//   artPanorama: 'path/to/panorama.png'  — single wide image spanning whole course
//   artImages: { holeIndex: 'path.png' } — per-hole images (legacy, still supported)
//
// Panorama mode: one image covers the entire course. The camera pans across it
// naturally as the player progresses through holes. The image maps to the world
// X range from hole 0's tee to the last hole's cup.

const _artImageCache = {}; // holeIndex → Image (legacy per-hole)
let _artPanorama = null;   // single panorama Image
let _artPanoWorldStart = 0; // world X where panorama starts
let _artPanoWorldEnd = 0;   // world X where panorama ends

function loadArtImages() {
  // Clear previous course's cached art images
  for (const key of Object.keys(_artImageCache)) {
    delete _artImageCache[key];
  }
  _artPanorama = null;

  if (!currentCourse) return;

  // Panorama mode (preferred)
  if (currentCourse.artPanorama) {
    const img = new Image();
    img.src = currentCourse.artPanorama;
    img.onload = () => {
      _artPanorama = img;
      _recalcPanoRange();
    };
    return;
  }

  // Legacy per-hole mode
  if (currentCourse.artImages) {
    for (const [idx, path] of Object.entries(currentCourse.artImages)) {
      const img = new Image();
      img.src = path;
      img.onload = () => { _artImageCache[idx] = img; };
    }
  }
}

// Calculate the world X range the panorama covers.
// Uses the actual camera positions for first and last hole so the panorama
// maps exactly to what the player sees — no edge artifacts.
function _recalcPanoRange() {
  if (holes.length === 0) return;
  // Camera X for a hole = teeX - margin (setHoleCamera centers the hole)
  // Use the same logic as setHoleCamera: camera.x = teeX - some offset
  const firstHole = holes[0];
  const lastIdx = Math.min(holes.length - 1, (currentCourse?.holeCount || holes.length) - 1);
  const lastHole = holes[lastIdx] || holes[holes.length - 1];
  // Approximate camera positions (setHoleCamera puts tee ~120px from left edge)
  _artPanoWorldStart = firstHole.teeX - 120;
  _artPanoWorldEnd = lastHole.teeX - 120 + W;
}

// Returns the panorama image if active, or per-hole image for current hole
function getArtImage() {
  if (_artPanorama) return _artPanorama;
  return _artImageCache[currentHole] || null;
}

// Returns true if panorama mode is active
function isArtPanorama() {
  return !!_artPanorama;
}

// Draw the panorama art, accounting for camera position
function drawArtPanorama() {
  if (!_artPanorama) return false;
  if (_artPanoWorldEnd <= _artPanoWorldStart) _recalcPanoRange();

  const worldSpan = _artPanoWorldEnd - _artPanoWorldStart;
  if (worldSpan <= 0) return false;

  const imgW = _artPanorama.naturalWidth || _artPanorama.width;
  const imgH = _artPanorama.naturalHeight || _artPanorama.height;

  // Map camera.x to source image coordinates
  // camera.x is the left edge of the viewport in world space
  const viewLeftFrac = (camera.x - _artPanoWorldStart) / worldSpan;
  const viewRightFrac = (camera.x + W - _artPanoWorldStart) / worldSpan;

  const srcX = viewLeftFrac * imgW;
  const srcW = (viewRightFrac - viewLeftFrac) * imgW;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_artPanorama, srcX, 0, srcW, imgH, 0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  return true;
}

function drawTerrainDG() {
  // If art image is active, don't draw flat terrain — the image IS the terrain
  if (currentCourse?.artPanorama || currentCourse?.artImages || isArtPanorama() || getArtImage()) return;

  const startX = camera.x - 100;
  const endX   = camera.x + W + 100;

  // Group consecutive same-material vertices into runs.
  // Each run is drawn as ONE polygon tracing all vertices in order,
  // closed along the bottom. Canvas nonzero fill rule handles
  // self-intersecting paths (overhangs) correctly.
  // Start iteration near the visible range instead of from vertex 0
  let i = Math.max(0, _bsearchVertex(startX) - 2);
  const iMax = Math.min(vertices.length - 1, _bsearchVertex(endX) + 4);
  while (i < iMax) {
    const matName = vertices[i].mat || DEFAULT_MAT;
    const mat = MATERIALS[matName] || MATERIALS[DEFAULT_MAT];
    const runStart = i;

    // Find end of this material run
    while (i < iMax && (vertices[i].mat || DEFAULT_MAT) === matName) {
      i++;
    }
    const runEnd = i; // exclusive — vertices[runEnd] is the first vertex of the next material

    // Check if any part of this run is visible
    let anyVisible = false;
    for (let j = runStart; j <= runEnd && j < vertices.length; j++) {
      if (vertices[j].x >= startX && vertices[j].x <= endX) { anyVisible = true; break; }
    }
    if (!anyVisible) continue;

    // Draw one polygon: trace all vertices in order, then close along bottom
    ctx.fillStyle = mat.color || GROUND;
    ctx.beginPath();
    ctx.moveTo(vertices[runStart].x, vertices[runStart].y);
    for (let j = runStart + 1; j <= runEnd && j < vertices.length; j++) {
      ctx.lineTo(vertices[j].x, vertices[j].y);
    }
    // Close along the bottom
    const lastIdx = Math.min(runEnd, vertices.length - 1);
    ctx.lineTo(vertices[lastIdx].x, H + 300);
    ctx.lineTo(vertices[runStart].x, H + 300);
    ctx.closePath();
    ctx.fill();
  }
}

// ── MODE Object ────────────────────────────────────────────
MODE = {
  name: 'desert-golfing',

  init() {
    // No-op: all game initialization now goes through resetGame() in main.js.
    // This exists for editor compatibility (editor.html calls MODE.init()).
    // The editor has its own seed + course init in editorInit().
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

    // Save progress after each hole
    if (typeof updateProgress === 'function') {
      updateProgress(_currentWorldId, Object.keys(currentWorld.courses).find(k => currentWorld.courses[k] === currentCourse), currentHole, totalStrokes);
    }
    if (typeof savePlayerData === 'function') savePlayerData();

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

    // Course complete — record and enter idle end state
    if (courseComplete) {
      state = STATE_COMPLETE;
      completeTimer = 0;
      // Record course completion in cloud save
      const cId = Object.keys(currentWorld.courses).find(k => currentWorld.courses[k] === currentCourse);
      if (typeof recordCourseComplete === 'function') {
        recordCourseComplete(_currentWorldId, cId, totalStrokes);
      }
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
    // Panorama mode: draw camera-aligned slice of the wide image
    if (drawArtPanorama()) return;
    // Legacy per-hole art: draw full-screen image
    const artImg = getArtImage();
    if (artImg) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(artImg, 0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
      return;
    }
    ctx.fillStyle = currentWorld?.sky || SKY;
    ctx.fillRect(0, 0, W, H);
  },

  drawWorld() {
    drawTerrainDG();

    // Water layer — if current course uses water material, draw a flat blue band
    if (currentCourse?.materials?.includes('water')) {
      const waterY = H * 0.88;
      const waterColor = MATERIALS.water?.color || '#3a7ec8';
      ctx.fillStyle = waterColor;
      ctx.fillRect(camera.x - 10, waterY, W + 20, H - waterY + 10);
      // Subtle highlight on water surface
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(camera.x - 10, waterY, W + 20, 3);
    }

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
      const fadeIn = Math.min(1, completeTimer / 30);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + fadeIn + ')';
      ctx.textAlign = 'center';

      ctx.font = "28px 'Departure Mono', monospace";
      ctx.fillText('COURSE COMPLETE', W / 2, H * 0.30);

      const courseName = currentCourse ? currentCourse.name : '';
      if (courseName) {
        ctx.font = "20px 'Departure Mono', monospace";
        ctx.fillText(courseName, W / 2, H * 0.30 + 30);
      }

      ctx.font = "20px 'Departure Mono', monospace";
      ctx.fillText(totalStrokes + ' strokes', W / 2, H * 0.30 + 58);

      // Show best score if this course was played before
      const courseKey = _currentWorldId + '/' + Object.keys(currentWorld.courses).find(k => currentWorld.courses[k] === currentCourse);
      if (typeof playerData !== 'undefined' && playerData.completed && playerData.completed[courseKey]) {
        const prev = playerData.completed[courseKey];
        ctx.font = "14px 'Departure Mono', monospace";
        ctx.fillStyle = 'rgba(232, 160, 48, ' + fadeIn * 0.7 + ')';
        if (prev.best < totalStrokes) {
          ctx.fillText('Best: ' + prev.best + '  (Attempt ' + (prev.attempts + 1) + ')', W / 2, H * 0.30 + 80);
        } else {
          ctx.fillText('New Best!  (Attempt ' + ((prev.attempts || 0) + 1) + ')', W / 2, H * 0.30 + 80);
        }
      }

      // Draw buttons after fade-in completes
      if (completeTimer > 60) {
        const next = getNextDestination();
        const btnW = 200, btnH = 36;

        // "Next Course" / "Next World" button
        if (next) {
          const btnText = next.type === 'course' ? '▶ Next Course' : '▶ Next World';
          const btnY = H * 0.30 + 110;
          const btnX = W / 2 - btnW / 2;
          ctx.fillStyle = 'rgba(232, 160, 48, ' + fadeIn + ')';
          ctx.beginPath();
          ctx.roundRect(btnX, btnY, btnW, btnH, 8);
          ctx.fill();
          ctx.fillStyle = 'rgba(26, 21, 16, ' + fadeIn + ')';
          ctx.font = "bold 14px 'Departure Mono', monospace";
          ctx.fillText(btnText, W / 2, btnY + 23);
          _completeBtn = { x: btnX, y: btnY, w: btnW, h: btnH, next: next };
        }

        // "Replay" button
        const replayY = H * 0.30 + (next ? 156 : 110);
        const replayX = W / 2 - btnW / 2;
        ctx.fillStyle = 'rgba(255, 255, 255, ' + fadeIn * 0.12 + ')';
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + fadeIn * 0.3 + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(replayX, replayY, btnW, btnH, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255, 255, 255, ' + fadeIn * 0.8 + ')';
        ctx.font = "14px 'Departure Mono', monospace";
        ctx.fillText('↺ Replay Course', W / 2, replayY + 23);
        _replayBtn = { x: replayX, y: replayY, w: btnW, h: btnH };
      }

      ctx.textAlign = 'left';
    } else {
      _completeBtn = null;
      _replayBtn = null;
    }
  }
};
