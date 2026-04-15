// ═══════════════════════════════════════════════════════════
// LEADERBOARD — Top scores per course across all players
// ═══════════════════════════════════════════════════════════
// Firestore collection: leaderboards/{worldId--courseId}
// Each doc: { scores: [{ username, strokes, date, uid }, ...] } (top 10)
//
// Submits scores after course completion.
// Displays in the collection screen.

const LEADERBOARD_MAX = 10;

// Submit a score to the leaderboard
async function submitToLeaderboard(worldId, courseId, strokes) {
  if (!firebaseDb || !currentUser) return; // need auth

  const docId = worldId + '--' + courseId;
  const docRef = firebaseDb.collection('leaderboards').doc(docId);

  try {
    const doc = await docRef.get();
    let scores = doc.exists ? (doc.data().scores || []) : [];

    // Check if this score qualifies (better than worst, or < max entries)
    if (scores.length >= LEADERBOARD_MAX && strokes >= scores[scores.length - 1].strokes) {
      return; // doesn't qualify
    }

    // Add new entry
    scores.push({
      username: currentUsername || currentUser.email || 'Anonymous',
      strokes: strokes,
      date: new Date().toISOString(),
      uid: currentUser.uid,
    });

    // Sort by strokes (ascending), keep top N
    scores.sort((a, b) => a.strokes - b.strokes);
    if (scores.length > LEADERBOARD_MAX) {
      scores = scores.slice(0, LEADERBOARD_MAX);
    }

    // Same player can hold multiple spots — no deduplication
    await docRef.set({ scores }, { merge: true });
  } catch (e) {
    console.warn('Leaderboard submit failed:', e.message);
  }
}

// Fetch leaderboard for a course
async function fetchLeaderboard(worldId, courseId) {
  if (!firebaseDb) return [];

  const docId = worldId + '--' + courseId;
  try {
    const doc = await firebaseDb.collection('leaderboards').doc(docId).get();
    if (doc.exists) {
      return doc.data().scores || [];
    }
  } catch (e) {
    console.warn('Leaderboard fetch failed:', e.message);
  }
  return [];
}

// Hook into course completion — submit score to leaderboard
const _origRecordCourseComplete = typeof recordCourseComplete === 'function' ? recordCourseComplete : null;
if (_origRecordCourseComplete) {
  recordCourseComplete = function(worldId, courseId, strokes) {
    _origRecordCourseComplete(worldId, courseId, strokes);
    // Async submit — don't block game
    submitToLeaderboard(worldId, courseId, strokes);
  };
}
