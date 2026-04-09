// ── Desert Golfing Mode ───────────────────────────────────
// Horizontal golf: procedural terrain, left-to-right holes, fixed camera per hole.
// Requires: shared.js, level-design.js loaded before this file.

// ── DG-Specific Globals ──────────────────────────────────
// vertices[] and holes[] are declared in shared.js (used by level-design.js)
// currentHole is declared in shared.js
let _completeBtn = null; // click target for "Next Course/World" button

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
  // Find the segment whose X range contains worldX (handles any vertex order)
  let bestIdx = vertices.length - 2;
  let bestDist = Infinity;
  for (let i = 0; i < vertices.length - 1; i++) {
    const minX = Math.min(vertices[i].x, vertices[i + 1].x);
    const maxX = Math.max(vertices[i].x, vertices[i + 1].x);
    if (worldX >= minX && worldX <= maxX) return i;
    // Track closest segment in case none contains worldX
    const dist = Math.min(Math.abs(worldX - minX), Math.abs(worldX - maxX));
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  }
  return bestIdx;
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

    // Skip segments far from ball (check both vertices since order may vary)
    const segMinX = Math.min(a.x, b.x);
    const segMaxX = Math.max(a.x, b.x);
    if (segMaxX < ball.x - BALL_RADIUS * 2) continue;
    if (segMinX > ball.x + BALL_RADIUS * 2) continue;  // 'continue' not 'break'

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
// Courses can define artImages: { holeIndex: 'path/to/image.png' }
// When an art image is loaded for the current hole, it replaces
// both sky and terrain rendering.
const _artImageCache = {}; // holeIndex → Image
let _artImagesLoading = false;

function loadArtImages() {
  if (!currentCourse?.artImages) return;
  for (const [idx, path] of Object.entries(currentCourse.artImages)) {
    if (_artImageCache[idx]) continue;
    const img = new Image();
    img.src = path;
    img.onload = () => { _artImageCache[idx] = img; };
  }
}

function getArtImage() {
  return _artImageCache[currentHole] || null;
}

function drawTerrainDG() {
  // If art image is active, don't draw flat terrain — the image IS the terrain
  if (getArtImage()) return;

  const startX = camera.x - 100;
  const endX   = camera.x + W + 100;

  // Group consecutive same-material vertices into runs.
  // Each run is drawn as ONE polygon tracing all vertices in order,
  // closed along the bottom. Canvas nonzero fill rule handles
  // self-intersecting paths (overhangs) correctly.
  let i = 0;
  while (i < vertices.length - 1) {
    const matName = vertices[i].mat || DEFAULT_MAT;
    const mat = MATERIALS[matName] || MATERIALS[DEFAULT_MAT];
    const runStart = i;

    // Find end of this material run
    while (i < vertices.length - 1 && (vertices[i].mat || DEFAULT_MAT) === matName) {
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

      // Draw "Next Course" or "Next World" button after fade-in completes
      if (completeTimer > 60) {
        const next = getNextDestination();
        if (next) {
          const btnText = next.type === 'course' ? '▶ Next Course' : '▶ Next World';
          const btnY = H * 0.30 + 110;
          const btnW = 200, btnH = 40;
          const btnX = W / 2 - btnW / 2;

          // Button background
          ctx.fillStyle = 'rgba(232, 160, 48, ' + fadeIn + ')';
          ctx.beginPath();
          ctx.roundRect(btnX, btnY, btnW, btnH, 8);
          ctx.fill();

          // Button text
          ctx.fillStyle = 'rgba(26, 21, 16, ' + fadeIn + ')';
          ctx.font = "bold 16px 'Departure Mono', monospace";
          ctx.fillText(btnText, W / 2, btnY + 26);

          // Store button bounds for click detection
          _completeBtn = { x: btnX, y: btnY, w: btnW, h: btnH, next: next };
        }
      }

      ctx.textAlign = 'left';
    } else {
      _completeBtn = null;
    }
  }
};
