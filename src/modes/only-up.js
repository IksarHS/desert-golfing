// ── Only Up Mode ──────────────────────────────────────────
// Vertical climbing: canyon walls, alternating platforms, climb upward.
// Requires: shared.js loaded before this file.

// ── OU-Specific Constants ────────────────────────────────
const CANYON_LEFT  = 180;
const CANYON_RIGHT = 780;
const CANYON_WIDTH = CANYON_RIGHT - CANYON_LEFT;

const NUM_PLATFORMS = 30;
const PLATFORM_THICKNESS = 20;

const WORLD_BOTTOM = 6000;
const WORLD_TOP    = -500;

const WALL_DARK   = '#c87838';
const CUP_INDENT  = '#dea050';

// ── OU-Specific State ────────────────────────────────────
let segments = [];
let platforms = [];
let leftWall = [];
let rightWall = [];
let lastCheckpointIdx = -1;
let checkpointX = 0;
let checkpointY = 0;
let cupsReached = 0;
let cupFillPlatIdx = -1;
let bestHeight = 0;

// ── Terrain Generation ───────────────────────────────────
function generateTerrain() {
  segments = [];
  platforms = [];
  leftWall = [];
  rightWall = [];

  // Canyon walls
  for (let y = WORLD_BOTTOM + 200; y >= WORLD_TOP; y -= 25) {
    const t = 1 - (y - WORLD_TOP) / (WORLD_BOTTOM - WORLD_TOP);
    const narrowing = t * 40;
    const wobbleL = Math.sin(y * 0.008) * 18 + Math.sin(y * 0.023) * 8;
    const wobbleR = Math.sin(y * 0.011 + 2) * 18 + Math.sin(y * 0.019 + 5) * 8;

    leftWall.push({  x: CANYON_LEFT + narrowing + wobbleL,  y });
    rightWall.push({ x: CANYON_RIGHT - narrowing + wobbleR, y });
  }

  // Wall collision segments
  for (let i = 0; i < leftWall.length - 1; i++) {
    segments.push({ x1: leftWall[i].x, y1: leftWall[i].y, x2: leftWall[i+1].x, y2: leftWall[i+1].y });
    segments.push({ x1: rightWall[i].x, y1: rightWall[i].y, x2: rightWall[i+1].x, y2: rightWall[i+1].y });
  }

  // Floor
  segments.push({ x1: CANYON_LEFT - 50, y1: WORLD_BOTTOM, x2: CANYON_RIGHT + 50, y2: WORLD_BOTTOM });

  // Platforms
  let currentY = WORLD_BOTTOM;

  for (let i = 0; i < NUM_PLATFORMS; i++) {
    const difficulty = i / NUM_PLATFORMS;

    const gap = lerp(220, 380, difficulty) + (Math.random() - 0.5) * 40;
    currentY -= gap;

    const platWidth = lerp(260, 150, difficulty * difficulty);

    const side = i % 2 === 0 ? 'left' : 'right';

    const wallIdx = Math.floor((WORLD_BOTTOM + 200 - currentY) / 25);
    const clampedIdx = Math.max(0, Math.min(wallIdx, leftWall.length - 1));
    const localLeftX  = leftWall[clampedIdx].x;
    const localRightX = rightWall[clampedIdx].x;

    let platX;
    if (side === 'left') {
      platX = localLeftX - 30;
    } else {
      platX = localRightX - platWidth + 30;
    }

    let cupX;
    if (side === 'left') {
      cupX = platX + platWidth * 0.6;
    } else {
      cupX = platX + platWidth * 0.4;
    }

    const halfCupW = CUP_WIDTH / 2;
    const wallInsetVal = 3;

    const plat = {
      x: platX,
      y: currentY,
      w: platWidth,
      h: PLATFORM_THICKNESS,
      side,
      cupX,
      cupY: currentY,
      cupFilled: false,
      cupFillProgress: 0,
      cupLeftX:  cupX - halfCupW,
      cupRightX: cupX + halfCupW,
      cupLeftY:  currentY,
      cupRightY: currentY,
      cupBottomY: currentY + CUP_DEPTH,
      cupWallInset: wallInsetVal,
      flagVisible: true,
      flagOpacity: 1,
      index: i
    };
    platforms.push(plat);

    // Platform collision segments
    const cupL = cupX - halfCupW;
    const cupR = cupX + halfCupW;

    segments.push({ x1: platX, y1: currentY, x2: cupL, y2: currentY });
    segments.push({ x1: cupR, y1: currentY, x2: platX + platWidth, y2: currentY });

    segments.push({ x1: cupL, y1: currentY, x2: cupL + wallInsetVal, y2: currentY + CUP_DEPTH });
    segments.push({ x1: cupL + wallInsetVal, y1: currentY + CUP_DEPTH, x2: cupR - wallInsetVal, y2: currentY + CUP_DEPTH });
    segments.push({ x1: cupR - wallInsetVal, y1: currentY + CUP_DEPTH, x2: cupR, y2: currentY });

    if (side === 'left') {
      segments.push({ x1: platX + platWidth, y1: currentY, x2: platX + platWidth, y2: currentY + PLATFORM_THICKNESS });
    } else {
      segments.push({ x1: platX, y1: currentY, x2: platX, y2: currentY + PLATFORM_THICKNESS });
    }

    segments.push({ x1: platX, y1: currentY + PLATFORM_THICKNESS, x2: platX + platWidth, y2: currentY + PLATFORM_THICKNESS });
  }
}

// ── Collision ──────────────────────────────────────────────
function collideWithSegments() {
  let collided = false;

  for (let iter = 0; iter < 3; iter++) {
    let hitThisPass = false;

    for (const seg of segments) {
      const minX = Math.min(seg.x1, seg.x2) - BALL_RADIUS * 3;
      const maxX = Math.max(seg.x1, seg.x2) + BALL_RADIUS * 3;
      const minY = Math.min(seg.y1, seg.y2) - BALL_RADIUS * 3;
      const maxY = Math.max(seg.y1, seg.y2) + BALL_RADIUS * 3;
      if (ball.x < minX || ball.x > maxX || ball.y < minY || ball.y > maxY) continue;

      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 0.001) continue;

      let t = ((ball.x - seg.x1) * dx + (ball.y - seg.y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const closestX = seg.x1 + t * dx;
      const closestY = seg.y1 + t * dy;

      const distX = ball.x - closestX;
      const distY = ball.y - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq < BALL_RADIUS * BALL_RADIUS && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const nx = distX / dist;
        const ny = distY / dist;

        const segLen = Math.sqrt(lenSq);
        const segNormX = dy / segLen;
        const segNormY = -dx / segLen;
        const upNx = segNormY < 0 ? segNormX : -segNormX;
        const upNy = segNormY < 0 ? segNormY : -segNormY;
        const sideCheck = (ball.x - seg.x1) * upNx + (ball.y - seg.y1) * upNy;
        if (sideCheck < -BALL_RADIUS * 2) continue;

        const overlap = BALL_RADIUS - dist;
        ball.x += nx * overlap;
        ball.y += ny * overlap;

        // Velocity reflection (only on first iteration)
        if (iter === 0) {
          const dot = ball.vx * nx + ball.vy * ny;
          if (dot < 0) {
            const isGround = Math.abs(ny) > Math.abs(nx);
            if (isGround && -dot < BOUNCE_THRESHOLD) {
              ball.vx -= dot * nx;
              ball.vy -= dot * ny;
            } else {
              ball.vx -= (1 + RESTITUTION) * dot * nx;
              ball.vy -= (1 + RESTITUTION) * dot * ny;
            }
          }
        }

        hitThisPass = true;
        collided = true;
      }
    }

    if (!hitThisPass) break;
  }

  ball.onGround = collided;
  return collided;
}

// ── Cup / Checkpoint Logic ───────────────────────────────
function checkCupsOU() {
  for (const plat of platforms) {
    if (plat.cupFilled) continue;
    const inX = Math.abs(ball.x - plat.cupX) < CUP_WIDTH / 2;
    const belowRim = ball.y > plat.cupY;
    const aboveBottom = ball.y < plat.cupY + CUP_DEPTH + BALL_RADIUS;
    if (inX && belowRim && aboveBottom) {
      cupFillPlatIdx = plat.index;
      cupsReached++;
      if (plat.index > lastCheckpointIdx) {
        lastCheckpointIdx = plat.index;
        checkpointX = plat.cupX;
        checkpointY = plat.cupY - BALL_RADIUS;
        bestHeight = Math.max(bestHeight, plat.index + 1);
      }
      return plat;
    }
  }
  return false;
}

function respawnAtCheckpoint() {
  if (lastCheckpointIdx >= 0) {
    const plat = platforms[lastCheckpointIdx];
    ball.x = plat.cupX + (plat.side === 'left' ? -30 : 30);
    ball.y = plat.y - BALL_RADIUS;
  } else {
    ball.x = (CANYON_LEFT + CANYON_RIGHT) / 2;
    ball.y = WORLD_BOTTOM - BALL_RADIUS;
  }
  ball.vx = 0;
  ball.vy = 0;
  ball.atRest = true;
  ball.slowFrames = 0;
}

// ── Flatten Filled Cup ──────────────────────────────────
function flattenCupOU(plat) {
  // Remove the 5 cup/surface segments and replace with one flat segment.
  // Cup segments: left wall, bottom, right wall
  // Split surface segments: left-of-cup, right-of-cup
  const cupL = plat.cupLeftX;
  const cupR = plat.cupRightX;
  const inset = plat.cupWallInset;

  segments = segments.filter(seg => {
    // Left surface segment: platX,y -> cupL,y
    if (seg.x1 === plat.x && seg.y1 === plat.y && seg.x2 === cupL && seg.y2 === plat.y) return false;
    // Right surface segment: cupR,y -> platX+w,y
    if (seg.x1 === cupR && seg.y1 === plat.y && seg.x2 === plat.x + plat.w && seg.y2 === plat.y) return false;
    // Cup left wall
    if (seg.x1 === cupL && seg.y1 === plat.y && seg.x2 === cupL + inset && seg.y2 === plat.cupBottomY) return false;
    // Cup bottom
    if (seg.x1 === cupL + inset && seg.y1 === plat.cupBottomY && seg.x2 === cupR - inset && seg.y2 === plat.cupBottomY) return false;
    // Cup right wall
    if (seg.x1 === cupR - inset && seg.y1 === plat.cupBottomY && seg.x2 === cupR && seg.y2 === plat.y) return false;
    return true;
  });

  // Add one continuous flat segment across the full platform top
  segments.push({ x1: plat.x, y1: plat.y, x2: plat.x + plat.w, y2: plat.y });
}

// ── Camera ───────────────────────────────────────────────
function setHoleCameraVertical(platIdx) {
  const plat = platforms[platIdx];
  if (!plat) {
    camera.y = ball.y - H * 0.6;
    return;
  }

  const next = platforms[platIdx + 1];
  if (next) {
    const margin = 40;
    const bottomY = plat.y + PLATFORM_THICKNESS + margin;
    const topY = next.y - margin;
    camera.y = (topY + bottomY) / 2 - H / 2;
  } else {
    camera.y = plat.y - H * 0.5;
  }
}

// ── Drawing ──────────────────────────────────────────────
function drawWallsOU() {
  ctx.fillStyle = GROUND;
  ctx.beginPath();
  ctx.moveTo(-100, leftWall[0].y);
  for (const v of leftWall) {
    ctx.lineTo(v.x, v.y);
  }
  ctx.lineTo(-100, leftWall[leftWall.length - 1].y);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(W + 200, rightWall[0].y);
  for (const v of rightWall) {
    ctx.lineTo(v.x, v.y);
  }
  ctx.lineTo(W + 200, rightWall[rightWall.length - 1].y);
  ctx.closePath();
  ctx.fill();
}

function drawPlatformsOU() {
  for (const plat of platforms) {
    // Platform body
    ctx.fillStyle = GROUND;
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

    // Clip cup rendering to platform bounds (prevents overdraw below platform)
    ctx.save();
    ctx.beginPath();
    ctx.rect(plat.x, plat.y, plat.w, plat.h);
    ctx.clip();

    // Cup indent (V-shape matching collision geometry)
    if (!plat.cupFilled) {
      ctx.fillStyle = CUP_INDENT;
      const halfW = CUP_WIDTH / 2;
      const inset = plat.cupWallInset;
      ctx.beginPath();
      ctx.moveTo(plat.cupX - halfW, plat.y);
      ctx.lineTo(plat.cupX - halfW + inset, plat.cupBottomY);
      ctx.lineTo(plat.cupX + halfW - inset, plat.cupBottomY);
      ctx.lineTo(plat.cupX + halfW, plat.y);
      ctx.closePath();
      ctx.fill();
    }

    // Sand fill animation
    drawCupFill(plat);

    ctx.restore();

    // Flag
    if (plat.flagVisible) {
      drawFlag(plat, function() { return plat.y; });
    }
  }
}

function drawFloorOU() {
  ctx.fillStyle = GROUND;
  ctx.fillRect(CANYON_LEFT - 100, WORLD_BOTTOM, CANYON_WIDTH + 200, 500);
}

// ── Keyboard: R to respawn ───────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    respawnAtCheckpoint();
    if (lastCheckpointIdx >= 0) {
      setHoleCameraVertical(lastCheckpointIdx);
    }
    state = STATE_AIM;
  }
});

// ── MODE Object ──────────────────────────────────────────
MODE = {
  name: 'only-up',

  init() {
    generateTerrain();

    ball.x = (CANYON_LEFT + CANYON_RIGHT) / 2;
    ball.y = WORLD_BOTTOM - BALL_RADIUS;
    ball.atRest = true;

    checkpointX = ball.x;
    checkpointY = ball.y;

    // Static camera: frame floor and first platform
    const margin = 40;
    const bottomY = WORLD_BOTTOM + margin;
    const topY = platforms[0].y - margin;
    camera.y = (topY + bottomY) / 2 - H / 2;
  },

  collide() {
    return collideWithSegments();
  },

  // No slope check for OU — platforms are flat
  canRest: null,
  onRest: null,

  isGoalReached() {
    return checkCupsOU();
  },

  onGoalReached(cupData) {
    // Already tracked in checkCupsOU
  },

  isOOB() {
    // Ball at rest off screen — respawn at checkpoint
    if (ball.atRest) {
      const screenY = ball.y - camera.y;
      if (screenY < -BALL_RADIUS - 10 || screenY > H + BALL_RADIUS + 10) {
        return true;
      }
    }
    // Ball fell to floor and came to rest — has a checkpoint to return to
    if (ball.atRest && ball.y >= WORLD_BOTTOM - BALL_RADIUS - 5 && lastCheckpointIdx >= 0) {
      return true;
    }
    // Ball fell way below world (safety)
    if (ball.y > WORLD_BOTTOM + 100) {
      return true;
    }
    return false;
  },

  onOOB() {
    respawnAtCheckpoint();
    // Snap camera to frame checkpoint area
    if (lastCheckpointIdx >= 0) {
      setHoleCameraVertical(lastCheckpointIdx);
    } else {
      const margin = 40;
      camera.y = (platforms[0].y - margin + WORLD_BOTTOM + margin) / 2 - H / 2;
    }
  },

  onTransitionStart() {
    transitionCamStart = camera.y;
    transitionBallStartY = ball.y;

    // Compute camera target
    const savedCamY = camera.y;
    setHoleCameraVertical(cupFillPlatIdx);
    transitionCamEnd = camera.y;
    camera.y = savedCamY;

    if (cupsReached === 1) showTitle = false;
  },

  setCameraPos(val) {
    camera.y = val;
  },

  getTransitionCupData() {
    return cupFillPlatIdx >= 0 ? platforms[cupFillPlatIdx] : null;
  },

  onTransitionEnd() {
    const plat = platforms[cupFillPlatIdx];
    if (plat) {
      plat.cupFilled = true;
      plat.cupFillProgress = 1;
      plat.flagVisible = false;
      plat.flagOpacity = 0;
      flattenCupOU(plat);

      // Ball stays at cup X — cup is now flat, just snap Y to platform surface
      ball.y = plat.y - BALL_RADIUS;
    }
  },

  // Camera is FIXED during play — only moves during transition pan (like DG)
  updateCamera: null,

  // ── Rendering ────────────────────────────────────────
  applyCameraTransform(ctx) {
    ctx.translate(0, -camera.y);
  },

  drawSky() {
    const heightRatio = Math.max(0, Math.min(1, 1 - (camera.y + H / 2) / WORLD_BOTTOM));
    const r = Math.round(lerp(213, 225, heightRatio));
    const g = Math.round(lerp(173, 195, heightRatio));
    const b = Math.round(lerp(114, 140, heightRatio));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, W, H);
  },

  drawWorld() {
    drawFloorOU();
    drawWallsOU();
    drawPlatformsOU();
  },

  drawHUD() {
    // Cups reached (left side)
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px VT323, Silkscreen, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(cupsReached + '/' + NUM_PLATFORMS, 12, 28);

    // Height progress bar (right edge)
    const barX = W - 16;
    const barTop = 40;
    const barH = H - 80;
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(barX, barTop);
    ctx.lineTo(barX, barTop + barH);
    ctx.stroke();

    // Ball height marker
    const heightFrac = Math.max(0, Math.min(1, 1 - (ball.y - WORLD_TOP) / (WORLD_BOTTOM - WORLD_TOP)));
    const markerY = barTop + barH * (1 - heightFrac);
    ctx.fillStyle = BALL_COLOR;
    ctx.beginPath();
    ctx.arc(barX, markerY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Checkpoint markers
    for (const plat of platforms) {
      if (plat.cupFilled) {
        const pFrac = 1 - (plat.y - WORLD_TOP) / (WORLD_BOTTOM - WORLD_TOP);
        const py = barTop + barH * (1 - pFrac);
        ctx.fillStyle = 'rgba(232, 200, 64, 0.6)';
        ctx.fillRect(barX - 3, py - 1, 6, 2);
      }
    }

    // Title
    if (showTitle) {
      ctx.font = '32px VT323, Silkscreen, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Only Up', W / 2, H / 2 - 60);
      ctx.font = '16px VT323, Silkscreen, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('drag to aim \u2022 R to respawn', W / 2, H / 2 - 35);
    }

    // Respawn indicator
    if (state === STATE_OOB) {
      ctx.font = '20px VT323, Silkscreen, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('respawning...', W / 2, H / 2);
    }
  }
};
