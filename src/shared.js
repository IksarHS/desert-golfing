// ── Constants ──────────────────────────────────────────────
// Colors (used by art.js)
const SKY    = '#d5ad72';
const GROUND = '#d68841';
const GROUND_LIGHT = '#dea050'; // cup indent color
const BALL_COLOR = '#ffffff';
const TEE_COLOR = '#8a9aaa'; // blue-gray tee marker

// Physics — tunable at runtime (press ~ to open settings panel)
let GRAVITY        = 0.04;
let RESTITUTION    = 0.47;
let ROLLING_FRICTION = 0.98;
let SURFACE_FRICTION = 0.004;
let POWER_SCALE    = 0.04;
let MAX_POWER      = 8;
let BOUNCE_THRESHOLD = 1.0;
let BALL_RADIUS    = 4;
const CUP_WIDTH      = 28;
const CUP_DEPTH      = 16;
const TEE_WIDTH      = 16;
const TEE_HEIGHT     = 6;

const TRANSITION_PAUSE = 60;   // frames: ball sits in cup
const TRANSITION_PAN   = 90;   // frames: camera pans to next hole
const OOB_PAUSE        = 60;   // frames: pause before respawning after out-of-bounds

// Terrain generation
const HOLE_DIST_MIN    = 600;   // min tee-to-cup world px
const HOLE_DIST_MAX    = 1000;  // max tee-to-cup world px
const BG_EXTEND        = 300;   // background terrain past cup area
const PEAK_HEIGHT_MIN  = 60;    // min obstacle peak above surroundings
const PEAK_HEIGHT_MAX  = 180;   // max obstacle peak (at full difficulty)

// ── Canvas Setup ───────────────────────────────────────────
// Game height is fixed at 540 units; width adapts to viewport aspect ratio
const H = 540;
let W = 960; // updated dynamically on resize

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

let displayScale = 1;

// ── Terrain ────────────────────────────────────────────────
let vertices = [];
let holes = []; // [{cupX, cupY, cupFilled, flagHole, teeX, teeY, flagVisible}]
let currentHole = 0;
let totalStrokes = 0;

// ── Ball ───────────────────────────────────────────────────
let ball = { x: 0, y: 0, vx: 0, vy: 0, onGround: false, atRest: true };
let strokes = 0;

// ── Camera ─────────────────────────────────────────────────
// Camera is FIXED for the entire hole. Only moves during transition.
let camera = { x: 0 };

// ── Game State ─────────────────────────────────────────────
const STATE_AIM       = 0;
const STATE_FLIGHT    = 1;
const STATE_PAUSE      = 2;  // ball in cup, waiting
const STATE_TRANSITION = 3;  // camera panning to next hole
const STATE_OOB        = 4;  // ball out of bounds, waiting to respawn

let state = STATE_AIM;
let transitionTimer = 0;
let transitionStartCamX = 0;
let transitionEndCamX   = 0;
let transitionBallStartY = 0; // ball's Y when it rested in cup
let showTitle = true;

// Transition: cup fills and flag fades DURING the camera pan

// ── Aim UI ─────────────────────────────────────────────────
let aiming = false;
let aimStartX = 0, aimStartY = 0;
let aimCurrentX = 0, aimCurrentY = 0;

// ── Debug Ball Tracker ────────────────────────────────────
const _ballLog = [];
const _BALL_LOG_MAX = 2000;
let _ballLogFrame = 0;

// No-op by default — overridden by debug.js with real implementation
let _logBall = function() {};

// ── Utility Functions ──────────────────────────────────────
function clampY(y) {
  const minY = H * 0.20;  // highest terrain allowed
  const maxY = H * 0.90;  // lowest terrain allowed
  return Math.max(minY, Math.min(maxY, y));
}

function lerp(a, b, t) { return a + (b - a) * t; }
function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }

// Helper: add slight random jitter to a Y value
function jitter(y, amount) { return clampY(y + (Math.random() - 0.5) * amount); }

function terrainYAt(worldX) {
  for (let i = 0; i < vertices.length - 1; i++) {
    const a = vertices[i], b = vertices[i + 1];
    if (worldX >= a.x && worldX <= b.x) {
      const t = (worldX - a.x) / (b.x - a.x);
      return a.y + t * (b.y - a.y);
    }
  }
  if (vertices.length >= 2) {
    const a = vertices[vertices.length - 2], b = vertices[vertices.length - 1];
    const t = (worldX - a.x) / (b.x - a.x);
    return a.y + t * (b.y - a.y);
  }
  return H * 0.6;
}

// Convert mouse/touch screen coords to game coords
function toGameCoords(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left) * (W / rect.width),
    y: (clientY - rect.top) * (H / rect.height)
  };
}
