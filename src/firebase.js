// ── Firebase Integration ─────────────────────────────────────
// Google Auth + Firestore cloud saves for cross-device progression.
// Loads via CDN script tags (no bundler needed).

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCECzhZ8aX8jTNtIuP2SJLmASV2842hon0",
  authDomain: "terrain-golf.firebaseapp.com",
  projectId: "terrain-golf",
  storageBucket: "terrain-golf.firebasestorage.app",
  messagingSenderId: "868829319435",
  appId: "1:868829319435:web:0bf9b449d60362848f120e"
};

// Globals set after Firebase loads
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let currentUser = null;

// ── Initialize Firebase ──────────────────────────────────────
function initFirebase() {
  if (!window.firebase) {
    console.warn('Firebase SDK not loaded');
    return;
  }
  firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
  firebaseAuth = firebase.auth();
  firebaseDb = firebase.firestore();

  let _firstAuthEvent = true;

  firebaseAuth.onAuthStateChanged(user => {
    currentUser = user;

    if (user) {
      console.log('Signed in as', user.displayName);
      loadPlayerData().then(() => {
        // Always sync cloud data to localStorage
        localStorage.setItem('dg-player-data', JSON.stringify(playerData));
        console.log('Cloud save synced to localStorage:', playerData.currentHole);
        // Restart game with cloud progress (works on first load AND mid-session sign-in)
        if (typeof startCourse === 'function') {
          _restartGameFromPlayerData();
        }
        _firstAuthEvent = false;
        updateAuthUI();
      });
    } else {
      console.log('Not signed in');
      _firstAuthEvent = false;
      updateAuthUI();
    }
  });
}

// ── Auth ─────────────────────────────────────────────────────
function signInWithGoogle() {
  if (!firebaseAuth) return;
  const provider = new firebase.auth.GoogleAuthProvider();
  // Popup works on both localhost and production
  // COOP warnings in console are harmless Firebase internals
  firebaseAuth.signInWithPopup(provider).catch(err => {
    // Fallback to redirect if popup is blocked
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      firebaseAuth.signInWithRedirect(provider);
    } else {
      console.error('Sign-in failed:', err.code);
    }
  });
}

function signOut() {
  if (!firebaseAuth) return;
  // Clear local data FIRST, then sign out and reload
  localStorage.removeItem('dg-player-data');
  firebaseAuth.signOut().then(() => {
    location.reload();
  });
}

// ── Player Data ──────────────────────────────────────────────
let playerData = {
  currentCourse: null,
  currentHole: 0,
  currentStrokes: 0,
  totalStrokes: 0,
  strokes: 0,         // strokes on current hole
  completed: {},
  // Full ball state for mid-flight resume
  ballState: null      // { x, y, vx, vy, onGround, atRest, spinRate, rotation }
};

function getPlayerDocRef() {
  if (!firebaseDb || !currentUser) return null;
  return firebaseDb.collection('players').doc(currentUser.uid);
}

async function loadPlayerData() {
  const ref = getPlayerDocRef();
  if (!ref) return;
  try {
    const doc = await ref.get();
    if (doc.exists) {
      playerData = { ...playerData, ...doc.data() };
      console.log('Loaded cloud save:', playerData);
    } else {
      // First time player — save initial data
      await savePlayerData();
      console.log('Created new cloud save');
    }
  } catch (err) {
    console.error('Failed to load player data:', err);
  }
}

async function savePlayerData() {
  // Always write localStorage FIRST (synchronous, survives browser close)
  localStorage.setItem('dg-player-data', JSON.stringify(playerData));

  const ref = getPlayerDocRef();
  if (!ref) {
    return;
  }
  try {
    await ref.set(playerData, { merge: true });
  } catch (err) {
    console.error('Failed to save player data to cloud:', err);
  }
}

function recordCourseComplete(worldId, courseId, strokes) {
  const key = worldId + '/' + courseId;
  const existing = playerData.completed[key];
  if (!existing) {
    playerData.completed[key] = { best: strokes, attempts: 1 };
  } else {
    existing.attempts++;
    if (strokes < existing.best) existing.best = strokes;
  }
  playerData.totalStrokes += strokes;
  savePlayerData();
}

function snapshotGameState() {
  const worldId = typeof _currentWorldId !== 'undefined' ? _currentWorldId : 'desert-world-1';
  const cId = (typeof currentWorld !== 'undefined' && typeof currentCourse !== 'undefined')
    ? Object.keys(currentWorld.courses).find(k => currentWorld.courses[k] === currentCourse) || 'desert-course-1'
    : 'desert-course-1';

  playerData.currentCourse = worldId + '/' + cId;
  playerData.currentHole = typeof currentHole !== 'undefined' ? currentHole : 0;
  playerData.totalStrokes = typeof totalStrokes !== 'undefined' ? totalStrokes : 0;
  playerData.strokes = typeof strokes !== 'undefined' ? strokes : 0;
  playerData.ballState = typeof ball !== 'undefined' ? {
    x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy,
    onGround: ball.onGround, atRest: ball.atRest,
    spinRate: ball.spinRate, rotation: ball.rotation
  } : null;
  playerData.gameState = typeof state !== 'undefined' ? state : 0;
}

// Full save (localStorage + cloud) — call on key events only
function saveGameSnapshot() {
  snapshotGameState();
  savePlayerData();
}

// Cloud-only push — call sparingly (hole complete, course complete)
function pushToCloud() {
  snapshotGameState();
  const ref = getPlayerDocRef();
  if (ref) {
    ref.set(playerData, { merge: true }).catch(err => {
      console.error('Cloud push failed:', err);
    });
  }
}

function isCourseCompleted(worldId, courseId) {
  return !!playerData.completed[worldId + '/' + courseId];
}

function getCourseBest(worldId, courseId) {
  const data = playerData.completed[worldId + '/' + courseId];
  return data ? data.best : null;
}

// ── Game Restart ─────────────────────────────────────────────
function _restartGameFromPlayerData() {
  if (typeof startCourse !== 'function' || typeof WORLDS === 'undefined') return;
  if (typeof initSeed === 'function') initSeed(); // Reset to base seed before course offset

  let worldId = 'desert-world-1', courseId = 'desert-course-1';
  let resumeHole = 0, resumeStrokes = 0;

  if (playerData.currentCourse) {
    const parts = playerData.currentCourse.split('/');
    if (parts.length === 2 && WORLDS[parts[0]]) {
      worldId = parts[0];
      courseId = parts[1];
      resumeHole = playerData.currentHole || 0;
      resumeStrokes = playerData.currentStrokes || 0;
    }
  }

  startCourse(worldId, courseId);

  // Resume mid-course if needed
  if (resumeHole > 0) {
    ensureHolesAhead(resumeHole + 2);
    for (let i = 0; i < resumeHole; i++) {
      holes[i].cupFilled = true;
      holes[i].cupFillProgress = 1;
      holes[i].flagVisible = false;
      holes[i].flagOpacity = 0;
      flattenCup(holes[i]);
    }
    currentHole = resumeHole;
    totalStrokes = playerData.totalStrokes || 0;
    strokes = playerData.strokes || 0;
    showTitle = false;

    // Restore exact ball state if we have it
    if (playerData.ballState) {
      const bs = playerData.ballState;
      ball.x = bs.x; ball.y = bs.y;
      ball.vx = bs.vx; ball.vy = bs.vy;
      ball.onGround = bs.onGround;
      ball.atRest = bs.atRest;
      ball.spinRate = bs.spinRate || 0;
      ball.rotation = bs.rotation || 0;
      state = playerData.gameState || STATE_AIM;
      // Camera follows ball
      setHoleCamera(holes[currentHole]);
    } else {
      const hole = holes[currentHole];
      ball.x = hole.teeX;
      ball.y = terrainYAt(hole.teeX) - BALL_RADIUS;
      ball.vx = 0; ball.vy = 0;
      ball.atRest = true; ball.onGround = false;
      setHoleCamera(hole);
      state = STATE_AIM;
    }
  }
}

// ── Auth UI ──────────────────────────────────────────────────
function updateAuthUI() {
  const btn = document.getElementById('auth-btn');
  const nameEl = document.getElementById('auth-name');
  if (!btn) return;

  if (currentUser) {
    btn.textContent = 'Sign Out';
    btn.onclick = signOut;
    if (nameEl) nameEl.textContent = currentUser.displayName || 'Player';
  } else {
    btn.textContent = 'Sign In';
    btn.onclick = signInWithGoogle;
    if (nameEl) nameEl.textContent = '';
  }
}

// Load local data on startup (before Firebase loads)
try {
  const local = JSON.parse(localStorage.getItem('dg-player-data'));
  if (local) playerData = { ...playerData, ...local };
} catch (e) {}
