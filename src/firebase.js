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

  // Track if this is the first auth event (page load) vs a user action
  let _firstAuthEvent = true;

  firebaseAuth.onAuthStateChanged(user => {
    currentUser = user;

    if (user) {
      console.log('Signed in as', user.displayName);
      loadPlayerData().then(() => {
        if (!_firstAuthEvent) {
          // User just signed in mid-session — reload to apply cloud save
          location.reload();
        }
        _firstAuthEvent = false;
        updateAuthUI();
      });
    } else {
      console.log('Not signed in');
      // Sign-out reload is handled by signOut() directly
      _firstAuthEvent = false;
      updateAuthUI();
    }
  });
}

// ── Auth ─────────────────────────────────────────────────────
function signInWithGoogle() {
  if (!firebaseAuth) return;
  const provider = new firebase.auth.GoogleAuthProvider();
  firebaseAuth.signInWithPopup(provider).catch(err => {
    console.error('Sign-in failed:', err);
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
// Data model:
// {
//   currentCourse: "desert-world-1/desert-course-1",
//   currentHole: 0,
//   currentStrokes: 0,
//   totalStrokes: 0,
//   completed: {
//     "desert-world-1/desert-course-1": { best: 47, attempts: 3 },
//     ...
//   }
// }

let playerData = {
  currentCourse: null,
  currentHole: 0,
  currentStrokes: 0,
  totalStrokes: 0,
  completed: {}
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

function updateProgress(worldId, courseId, holeIndex, strokes) {
  playerData.currentCourse = worldId + '/' + courseId;
  playerData.currentHole = holeIndex;
  playerData.currentStrokes = strokes;
  // Don't save on every stroke — save periodically or on hole complete
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
    totalStrokes = resumeStrokes;
    showTitle = false;
    const hole = holes[currentHole];
    ball.x = hole.teeX;
    ball.y = terrainYAt(hole.teeX) - BALL_RADIUS;
    ball.vx = 0; ball.vy = 0;
    ball.atRest = true; ball.onGround = false;
    setHoleCamera(hole);
    state = STATE_AIM;
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
