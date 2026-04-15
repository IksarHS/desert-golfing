// ═══════════════════════════════════════════════════════════
// COLLECTION / DISCOVERY SCREEN
// ═══════════════════════════════════════════════════════════
// Full-screen overlay showing all systems, worlds, courses.
// Player can see completion status, scores, and navigate to
// any unlocked course. Toggle with 'M' key or menu button.

let menuOpen = false;

function toggleMenu() {
  menuOpen = !menuOpen;
  const overlay = document.getElementById('menu-overlay');
  if (!overlay) return;
  if (menuOpen) {
    buildMenuContent();
    overlay.style.display = 'block';
    // Fade in
    requestAnimationFrame(() => overlay.classList.add('open'));
  } else {
    overlay.classList.remove('open');
    setTimeout(() => { overlay.style.display = 'none'; }, 250);
  }
}

function buildMenuContent() {
  const container = document.getElementById('menu-content');
  if (!container) return;
  container.innerHTML = '';

  const completed = (typeof playerData !== 'undefined' && playerData.completed) ? playerData.completed : {};

  // Determine which courses are unlocked
  // A course is unlocked if: it's completed, OR it's the "next" course in progression
  const unlockedSet = new Set();
  for (const key of Object.keys(completed)) {
    unlockedSet.add(key);
  }
  // The current course is always unlocked
  if (typeof _currentWorldId !== 'undefined' && typeof currentCourse !== 'undefined') {
    const curCId = Object.keys(currentWorld.courses).find(k => currentWorld.courses[k] === currentCourse);
    if (curCId) unlockedSet.add(_currentWorldId + '/' + curCId);
  }
  // Find next unlockable course (first incomplete course in progression order)
  let foundIncomplete = false;
  for (const [wId, world] of Object.entries(WORLDS)) {
    for (const [cId, course] of Object.entries(world.courses)) {
      const key = wId + '/' + cId;
      if (!completed[key] && !foundIncomplete) {
        unlockedSet.add(key);
        foundIncomplete = true;
      }
    }
  }

  // Group worlds by system
  const systems = {};
  for (const [wId, world] of Object.entries(WORLDS)) {
    const sys = world.system || 'Unknown';
    if (!systems[sys]) systems[sys] = [];
    systems[sys].push({ id: wId, world });
  }

  // Stats header
  const statsDiv = document.createElement('div');
  statsDiv.className = 'menu-stats';
  const totalCompleted = Object.keys(completed).length;
  const totalCourses = Object.values(WORLDS).reduce((sum, w) => sum + Object.keys(w.courses).length, 0);
  const totalHoles = Object.values(WORLDS).reduce((sum, w) =>
    sum + Object.values(w.courses).reduce((s, c) => s + (c.holeCount || 10), 0), 0);
  statsDiv.innerHTML = `
    <span class="stat-item">${totalCompleted} / ${totalCourses} courses</span>
    <span class="stat-sep">·</span>
    <span class="stat-item">${totalHoles} holes</span>
    ${typeof playerData !== 'undefined' && playerData.totalStrokes ? '<span class="stat-sep">·</span><span class="stat-item">' + playerData.totalStrokes + ' lifetime strokes</span>' : ''}
  `;
  container.appendChild(statsDiv);

  // Build system → world → course hierarchy
  for (const [sysName, worlds] of Object.entries(systems)) {
    const sysDiv = document.createElement('div');
    sysDiv.className = 'menu-system';

    const sysHeader = document.createElement('div');
    sysHeader.className = 'menu-system-header';
    sysHeader.textContent = sysName;
    sysDiv.appendChild(sysHeader);

    for (const { id: wId, world } of worlds) {
      const worldDiv = document.createElement('div');
      worldDiv.className = 'menu-world';

      const worldHeader = document.createElement('div');
      worldHeader.className = 'menu-world-header';
      worldHeader.innerHTML = `<span class="world-name">${world.name}</span>`;
      worldDiv.appendChild(worldHeader);

      const coursesDiv = document.createElement('div');
      coursesDiv.className = 'menu-courses';

      for (const [cId, course] of Object.entries(world.courses)) {
        const key = wId + '/' + cId;
        const isUnlocked = unlockedSet.has(key);
        const comp = completed[key];
        const isCurrent = typeof currentCourse !== 'undefined' && currentCourse === course;

        const courseDiv = document.createElement('div');
        courseDiv.className = 'menu-course' + (isUnlocked ? '' : ' locked') + (isCurrent ? ' current' : '') + (comp ? ' completed' : '');

        // Course info
        const infoDiv = document.createElement('div');
        infoDiv.className = 'course-info';
        infoDiv.innerHTML = `
          <span class="course-name">${isUnlocked ? course.name : '???'}</span>
          <span class="course-meta">${course.holeCount || 10} holes${comp ? ' · Best: ' + comp.best + ' · ' + comp.attempts + ' attempt' + (comp.attempts !== 1 ? 's' : '') : ''}</span>
        `;
        courseDiv.appendChild(infoDiv);

        // Action buttons
        if (isUnlocked) {
          const btns = document.createElement('div');
          btns.style.cssText = 'display:flex;gap:4px;align-items:center;';

          // Leaderboard toggle
          if (comp && typeof fetchLeaderboard === 'function') {
            const lbBtn = document.createElement('button');
            lbBtn.className = 'course-btn replay';
            lbBtn.textContent = '🏆';
            lbBtn.title = 'Leaderboard';
            lbBtn.style.padding = '5px 8px';
            const lbWorldId = wId;
            const lbCourseId = cId;
            lbBtn.onclick = async (e) => {
              e.stopPropagation();
              // Toggle leaderboard panel below this course
              let existing = courseDiv.querySelector('.lb-panel');
              if (existing) { existing.remove(); return; }

              const panel = document.createElement('div');
              panel.className = 'lb-panel';
              panel.innerHTML = '<div style="color:#666;font-size:10px;padding:6px 0;">Loading...</div>';
              courseDiv.appendChild(panel);

              const scores = await fetchLeaderboard(lbWorldId, lbCourseId);
              if (scores.length === 0) {
                panel.innerHTML = '<div style="color:#666;font-size:10px;padding:6px 0;">No scores yet</div>';
              } else {
                let html = '<div class="lb-header">Top Scores</div>';
                scores.forEach((s, i) => {
                  const isMe = currentUser && s.uid === currentUser.uid;
                  html += `<div class="lb-row${isMe ? ' me' : ''}"><span class="lb-rank">${i+1}.</span><span class="lb-name">${s.username}</span><span class="lb-score">${s.strokes}</span></div>`;
                });
                panel.innerHTML = html;
              }
            };
            btns.appendChild(lbBtn);
          }

          const playBtn = document.createElement('button');
          playBtn.className = 'course-btn' + (comp ? ' replay' : '');
          playBtn.textContent = comp ? 'Replay' : (isCurrent ? 'Resume' : 'Play');
          playBtn.onclick = () => {
            startCourse(wId, cId);
            toggleMenu();
          };
          btns.appendChild(playBtn);
          courseDiv.appendChild(btns);
        } else {
          const lock = document.createElement('span');
          lock.className = 'course-lock';
          lock.textContent = '🔒';
          courseDiv.appendChild(lock);
        }

        coursesDiv.appendChild(courseDiv);
      }

      worldDiv.appendChild(coursesDiv);
      sysDiv.appendChild(worldDiv);
    }

    container.appendChild(sysDiv);
  }
}

// Keyboard shortcut
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'm' || e.key === 'M') {
    toggleMenu();
    e.preventDefault();
  }
  if (e.key === 'Escape' && menuOpen) {
    toggleMenu();
    e.preventDefault();
  }
});
