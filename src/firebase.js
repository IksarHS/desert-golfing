// ── Firebase Integration ─────────────────────────────────────
// Email/Password Auth + Firestore cloud saves for cross-device progression.
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
let currentUsername = null; // Display name from Firestore

// ── Initialize Firebase ──────────────────────────────────────
function initFirebase() {
  if (!window.firebase) {
    console.warn('Firebase SDK not loaded');
    return;
  }
  firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
  firebaseAuth = firebase.auth();
  firebaseDb = firebase.firestore();

  firebaseAuth.onAuthStateChanged(user => {
    currentUser = user;

    if (user) {
      console.log('Signed in:', user.email);
      // Load username + player data from Firestore
      loadPlayerData().then(() => {
        localStorage.setItem('dg-player-data', JSON.stringify(playerData));
        console.log('Cloud save synced to localStorage:', playerData.currentHole);
        // Start or restart game with saved progress
        if (typeof startGame === 'function') startGame();
        if (typeof startCourse === 'function' && _gameStarted) {
          _restartGameFromPlayerData();
        }
        updateAuthUI();
      });
    } else {
      console.log('Not signed in');
      currentUsername = null;
      playerData = _freshPlayerData();
      // Start game fresh if not started yet (unsigned user)
      if (typeof startGame === 'function') startGame();
      updateAuthUI();
    }
  });
}

// ── Auth ─────────────────────────────────────────────────────

function _showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) {
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }
}

function _clearAuthError() {
  _showAuthError('');
}

async function registerWithEmail() {
  if (!firebaseAuth) return;
  _clearAuthError();

  const username = document.getElementById('auth-username')?.value.trim();
  const email = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value;

  if (!username) { _showAuthError('Username required'); return; }
  if (!email) { _showAuthError('Email required'); return; }
  if (!password || password.length < 6) { _showAuthError('Password must be 6+ characters'); return; }

  try {
    const cred = await firebaseAuth.createUserWithEmailAndPassword(email, password);
    // Save username to Firestore player doc
    await firebaseDb.collection('players').doc(cred.user.uid).set({
      username: username,
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    currentUsername = username;
    console.log('Registered as', username);
    // onAuthStateChanged will handle the rest
  } catch (err) {
    console.error('Registration failed:', err.code);
    const messages = {
      'auth/email-already-in-use': 'Email already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/weak-password': 'Password too weak (6+ chars)',
      'auth/operation-not-allowed': 'Email/password auth not enabled'
    };
    _showAuthError(messages[err.code] || err.message);
  }
}

async function loginWithUsername() {
  if (!firebaseAuth || !firebaseDb) return;
  _clearAuthError();

  const username = document.getElementById('auth-login-username')?.value.trim();
  const password = document.getElementById('auth-password')?.value;

  if (!username) { _showAuthError('Username required'); return; }
  if (!password) { _showAuthError('Password required'); return; }

  try {
    // Look up email from username in Firestore
    const snap = await firebaseDb.collection('players').where('username', '==', username).limit(1).get();
    if (snap.empty) {
      _showAuthError('No account with that username');
      return;
    }
    const email = snap.docs[0].data().email;
    if (!email) {
      _showAuthError('Account has no email — contact support');
      return;
    }
    await firebaseAuth.signInWithEmailAndPassword(email, password);
    // onAuthStateChanged will handle loading data + UI
  } catch (err) {
    console.error('Login failed:', err.code);
    const messages = {
      'auth/wrong-password': 'Wrong password',
      'auth/too-many-requests': 'Too many attempts — try later',
      'auth/invalid-credential': 'Invalid username or password'
    };
    _showAuthError(messages[err.code] || err.message);
  }
}

function signOut() {
  if (!firebaseAuth) return;
  localStorage.removeItem('dg-player-data');
  currentUsername = null;
  firebaseAuth.signOut().then(() => {
    // Reset game to hole 1
    playerData = _freshPlayerData();
    if (typeof startCourse === 'function') {
      _restartGameFromPlayerData();
    }
    updateAuthUI();
  });
}

// ── Auth UI Mode Toggle ─────────────────────────────────────
let _authMode = 'login'; // 'login' or 'register'

function setAuthMode(mode) {
  _authMode = mode;
  _clearAuthError();
  const usernameRow = document.getElementById('auth-username-row');
  const submitBtn = document.getElementById('auth-submit');
  const toggleLink = document.getElementById('auth-toggle');

  const loginUsernameRow = document.getElementById('auth-login-username-row');
  const emailRow = document.getElementById('auth-email-row');

  if (mode === 'register') {
    if (usernameRow) usernameRow.style.display = 'block';
    if (loginUsernameRow) loginUsernameRow.style.display = 'none';
    if (emailRow) emailRow.style.display = 'block';
    if (submitBtn) { submitBtn.textContent = 'Register'; submitBtn.onclick = registerWithEmail; }
    if (toggleLink) toggleLink.innerHTML = '<a href="#" onclick="setAuthMode(\'login\');return false">Login</a>';
  } else {
    if (usernameRow) usernameRow.style.display = 'none';
    if (loginUsernameRow) loginUsernameRow.style.display = 'block';
    if (emailRow) emailRow.style.display = 'none';
    if (submitBtn) { submitBtn.textContent = 'Login'; submitBtn.onclick = loginWithUsername; }
    if (toggleLink) toggleLink.innerHTML = '<a href="#" onclick="setAuthMode(\'register\');return false">Register</a>';
  }
}

// ── Player Data ──────────────────────────────────────────────
function _freshPlayerData() {
  return {
    currentCourse: null,
    currentHole: 0,
    currentStrokes: 0,
    totalStrokes: 0,
    strokes: 0,
    completed: {},
    ballState: null
  };
}

let playerData = _freshPlayerData();

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
      const data = doc.data();
      // Extract username
      if (data.username) {
        currentUsername = data.username;
      }
      playerData = { ..._freshPlayerData(), ...data };
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
  // Only save if signed in
  if (!currentUser) return;

  // Write localStorage as fast cache for signed-in user
  localStorage.setItem('dg-player-data', JSON.stringify(playerData));

  const ref = getPlayerDocRef();
  if (!ref) return;
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
  if (!currentUser) return; // No saves when not signed in
  snapshotGameState();
  savePlayerData();
}

// Cloud-only push — on shot fired and hole complete
function pushToCloud() {
  if (!currentUser) return; // No saves when not signed in
  const ref = getPlayerDocRef();
  if (!ref) return;
  const cloudData = {
    currentCourse: playerData.currentCourse,
    currentHole: playerData.currentHole,
    totalStrokes: playerData.totalStrokes,
    strokes: playerData.strokes,
    completed: playerData.completed
  };
  ref.set(cloudData, { merge: true }).catch(err => {
    console.error('Cloud push failed:', err);
  });
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
  if (typeof initSeed === 'function') initSeed();

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

  // Restore progress (even on hole 0 — player may have taken shots)
  const hasProgress = resumeHole > 0 || (playerData.ballState && playerData.ballState.x) || (playerData.strokes > 0);

  if (hasProgress) {
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
    if (resumeHole > 0 || strokes > 0) showTitle = false;

    if (playerData.ballState && playerData.ballState.x) {
      const bs = playerData.ballState;
      ball.x = bs.x; ball.y = bs.y;
      ball.vx = bs.vx; ball.vy = bs.vy;
      ball.onGround = bs.onGround;
      ball.atRest = bs.atRest;
      ball.spinRate = bs.spinRate || 0;
      ball.rotation = bs.rotation || 0;
      state = playerData.gameState || STATE_AIM;
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
  const form = document.getElementById('auth-form');
  const signedIn = document.getElementById('auth-signed-in');
  const nameEl = document.getElementById('auth-display-name');

  if (currentUser) {
    // Signed in — show username + sign out
    if (form) form.style.display = 'none';
    if (signedIn) signedIn.style.display = 'flex';
    if (nameEl) nameEl.textContent = currentUsername || currentUser.email;
  } else {
    // Not signed in — show form
    if (form) form.style.display = 'block';
    if (signedIn) signedIn.style.display = 'none';
    setAuthMode(_authMode);
  }
}

// On startup: load cached data for signed-in user only
// (If not signed in, onAuthStateChanged will reset to fresh)
try {
  const local = JSON.parse(localStorage.getItem('dg-player-data'));
  if (local) playerData = { ..._freshPlayerData(), ...local };
} catch (e) {}
