#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// HEADLESS PLAYTEST — parallel multi-core playtest runner
// ═══════════════════════════════════════════════════════════
// Spawns worker threads to test courses in parallel.
// Each worker has its own VM context with the full game loaded.

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = __dirname;
const CHEAT_THRESHOLD = 10;
const NUM_WORKERS = Math.min(os.cpus().length, 14); // use more cores

// CLI: pass course name substrings to filter, e.g. node headless-playtest.js descent gauntlet
const COURSE_FILTER = process.argv.slice(2).map(s => s.toLowerCase());

// ═══════════════════════════════════════════════════════════
// WORKER THREAD
// ═══════════════════════════════════════════════════════════
if (!isMainThread) {
  const vm = require('vm');
  const { courses, cheatThreshold } = workerData;

  function readSrc(rel) {
    return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
  }

  const noop = function() {};
  const fakeCtx = {
    fillRect:noop,strokeRect:noop,clearRect:noop,fillText:noop,strokeText:noop,
    measureText:()=>({width:0}),beginPath:noop,closePath:noop,moveTo:noop,lineTo:noop,
    arc:noop,arcTo:noop,quadraticCurveTo:noop,bezierCurveTo:noop,rect:noop,fill:noop,
    stroke:noop,clip:noop,save:noop,restore:noop,translate:noop,rotate:noop,scale:noop,
    setTransform:noop,resetTransform:noop,transform:noop,drawImage:noop,
    createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),
    createPattern:()=>({}),getImageData:()=>({data:new Uint8Array(4)}),putImageData:noop,
    createImageData:()=>({data:new Uint8Array(4)}),setLineDash:noop,getLineDash:()=>[],
    globalAlpha:1,globalCompositeOperation:'source-over',fillStyle:'',strokeStyle:'',
    lineWidth:1,lineCap:'',lineJoin:'',font:'',textAlign:'',textBaseline:'',
    shadowBlur:0,shadowColor:'',shadowOffsetX:0,shadowOffsetY:0,lineDashOffset:0,
  };
  const fakeCanvas = {
    getContext:()=>fakeCtx, getBoundingClientRect:()=>({left:0,top:0,width:960,height:540}),
    addEventListener:noop, width:960, height:540, style:{},
  };
  const fakeEl = () => ({
    addEventListener:noop, style:{},
    classList:{add:noop,remove:noop,toggle:noop,contains(){return false}},
    textContent:'',innerHTML:'',dataset:{},appendChild:noop,setAttribute:noop,querySelectorAll:()=>[],
  });

  const G = {
    document:{getElementById:(id)=>id==='c'?fakeCanvas:fakeEl(),querySelectorAll:()=>[],createElement:()=>fakeEl(),addEventListener:noop,body:{appendChild:noop,style:{}}},
    window:{addEventListener:noop,removeEventListener:noop,requestAnimationFrame:noop,innerWidth:960,innerHeight:540,devicePixelRatio:1,open:()=>null},
    localStorage:{_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=String(v)},removeItem(k){delete this._d[k]}},
    Image:class{constructor(){this._src=''}set src(v){this._src=v}get src(){return this._src}get width(){return 64}get height(){return 64}get naturalWidth(){return 64}get naturalHeight(){return 64}},
    navigator:{clipboard:{writeText:()=>({then:()=>{}})}},
    canvas:fakeCanvas,ctx:fakeCtx,
    requestAnimationFrame:noop,setTimeout:noop,setInterval:noop,clearTimeout:noop,clearInterval:noop,
    performance:require('perf_hooks').performance,
    Math,console:{log:noop,error:noop,warn:noop},alert:noop,Date,parseInt,parseFloat,isNaN,isFinite,
    Infinity,NaN,undefined,JSON,Object,Array,String,Number,Boolean,
    RegExp,Error,TypeError,RangeError,Map,Set,Promise,Proxy,Symbol,
    Uint8Array,Float32Array,Float64Array,ArrayBuffer,
    saveGameSnapshot:noop,pushToCloud:noop,updateProgress:noop,
    savePlayerData:noop,recordCourseComplete:noop,resetGame:noop,
    submitToLeaderboard:noop,playerData:{completed:{}},
  };
  G.window.window = G.window;
  G.globalThis = G;
  vm.createContext(G);

  const srcFiles = [
    'src/shared.js','src/worlds/desert-planet.js','src/worlds/grasslands.js',
    'src/worlds/classic-collection.js','src/worlds/dramatic-depths.js',
    'src/worlds/frozen-wastes.js','src/worlds/mudlands.js',
    'src/reference-holes.js','src/level-design.js',
    'src/generators/midgame.js','src/generators/dramatic.js',
    'src/modes/desert-golfing.js','src/art.js','src/gameplay.js','src/autoplay.js',
  ];

  for (const f of srcFiles) {
    let src = readSrc(f);
    if (f === 'src/shared.js') {
      src = src.replace(/const TRANSITION_PAUSE\s*=\s*\d+/, 'const TRANSITION_PAUSE = 1');
      src = src.replace(/const TRANSITION_PAN\s*=\s*\d+/, 'const TRANSITION_PAN = 1');
      src = src.replace(/const OOB_PAUSE\s*=\s*\d+/, 'const OOB_PAUSE = 1');
    }
    if (f === 'src/autoplay.js') {
      src = src.replace(/const angleSteps = stuck \? 30 : 20;/, 'const angleSteps = stuck ? 15 : 12;');
      src = src.replace(/const powerSteps = stuck \? 30 : 20;/, 'const powerSteps = stuck ? 15 : 12;');
    }
    vm.runInContext(src, G, { filename: f });
  }

  // Process courses assigned to this worker
  const results = [];
  for (const c of courses) {
    const ct = cheatThreshold;
    const courseScript = `
(function() {
  var c = ${JSON.stringify(c)};
  var CT = ${ct};
  startCourse(c.wId, c.cId);
  showTitle = false; aiEnabled = true; aiSpeed = 9999; aiSkill = 0.8;
  aiLastHole = -1; aiHoleStrokes = 0; aiState = 0; aiTimer = 0; aiming = false;

  var lastHole = -1, holeStartStr = 0, cheatedThis = false;
  var log = [], cheats = 0;

  for (var iter = 0, max = c.holeCount * CT * 600; iter < max; iter++) {
    aiUpdate(); update();

    if (currentHole !== lastHole) {
      if (lastHole >= 0 && lastHole < holes.length && !cheatedThis) {
        var s = totalStrokes - holeStartStr;
        if (s > 0 || lastHole > 0) {
          log.push({ w: c.worldName, c: c.name, h: lastHole+1, s: Math.max(s,0),
            a: holes[lastHole] ? (holes[lastHole].archetype||'hand_defined') : 'hand_defined', ch: false });
        }
      }
      lastHole = currentHole; holeStartStr = totalStrokes; cheatedThis = false;
    }

    if (aiHoleStrokes >= CT && state === STATE_AIM && ball.atRest && !cheatedThis) {
      cheatedThis = true;
      log.push({ w: c.worldName, c: c.name, h: currentHole+1, s: aiHoleStrokes,
        a: holes[currentHole] ? (holes[currentHole].archetype||'?') : '?', ch: true });
      cheats++; lastHole = currentHole; holeStartStr = totalStrokes;
      var cup = holes[currentHole];
      if (cup) { ball.x=cup.cupX; ball.y=cup.cupY+5; ball.vx=0; ball.vy=0; ball.atRest=false; ball.onGround=false; state=STATE_FLIGHT; }
    }

    if (state === STATE_COMPLETE) {
      if (lastHole >= 0 && lastHole < holes.length) {
        var s2 = totalStrokes - holeStartStr;
        if (s2 > 0) {
          log.push({ w: c.worldName, c: c.name, h: lastHole+1, s: s2,
            a: holes[lastHole] ? (holes[lastHole].archetype||'hand_defined') : 'hand_defined', ch: false });
        }
      }
      break;
    }
  }
  return { log: log, cheats: cheats };
})()`;

    const t0 = performance.now();
    try {
      const r = vm.runInContext(courseScript, G, { timeout: workerData.timeout || 120000 });
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
      results.push({ course: c, log: r.log, cheats: r.cheats, time: +elapsed, error: null });
      parentPort.postMessage({ type: 'progress', course: c, holes: r.log.length, cheats: r.cheats, time: +elapsed });
    } catch(e) {
      const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
      results.push({ course: c, log: [], cheats: 0, time: +elapsed, error: e.message });
      parentPort.postMessage({ type: 'progress', course: c, holes: 0, cheats: 0, time: +elapsed, error: e.message });
    }
  }

  parentPort.postMessage({ type: 'done', results });
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════
// MAIN THREAD
// ═══════════════════════════════════════════════════════════

// Load game code just to enumerate courses
const vm = require('vm');
const noop = function() {};
const fakeCtx = { fillRect:noop,measureText:()=>({width:0}),getImageData:()=>({data:new Uint8Array(4)}) };
const fakeCtxProxy = new Proxy(fakeCtx, { get(t,p) { return t[p] || (typeof p==='string' ? noop : undefined); }, set(){ return true; } });
const fakeCanvas = { getContext:()=>fakeCtxProxy, getBoundingClientRect:()=>({left:0,top:0,width:960,height:540}), addEventListener:noop, width:960, height:540, style:{} };
const fakeEl = () => ({ addEventListener:noop,style:{},classList:{add:noop,remove:noop,toggle:noop,contains(){return false}},textContent:'',innerHTML:'',dataset:{},appendChild:noop,setAttribute:noop,querySelectorAll:()=>[] });

const G = {
  document:{getElementById:(id)=>id==='c'?fakeCanvas:fakeEl(),querySelectorAll:()=>[],createElement:()=>fakeEl(),addEventListener:noop,body:{appendChild:noop,style:{}}},
  window:{addEventListener:noop,removeEventListener:noop,requestAnimationFrame:noop,innerWidth:960,innerHeight:540,devicePixelRatio:1,open:()=>null},
  localStorage:{_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=String(v)},removeItem(k){delete this._d[k]}},
  Image:class{constructor(){this._src=''}set src(v){this._src=v}get src(){return this._src}get width(){return 64}get height(){return 64}get naturalWidth(){return 64}get naturalHeight(){return 64}},
  navigator:{clipboard:{writeText:()=>({then:()=>{}})}},
  canvas:fakeCanvas,ctx:fakeCtxProxy,
  requestAnimationFrame:noop,setTimeout:noop,setInterval:noop,clearTimeout:noop,clearInterval:noop,
  performance:require('perf_hooks').performance,
  Math,console,alert:noop,Date,parseInt,parseFloat,isNaN,isFinite,
  Infinity,NaN,undefined,JSON,Object,Array,String,Number,Boolean,
  RegExp,Error,TypeError,RangeError,Map,Set,Promise,Proxy,Symbol,
  Uint8Array,Float32Array,Float64Array,ArrayBuffer,
  saveGameSnapshot:noop,pushToCloud:noop,updateProgress:noop,
  savePlayerData:noop,recordCourseComplete:noop,resetGame:noop,
  submitToLeaderboard:noop,playerData:{completed:{}},
};
G.window.window = G.window;
G.globalThis = G;
vm.createContext(G);

const srcFiles = [
  'src/shared.js','src/worlds/desert-planet.js','src/worlds/grasslands.js',
  'src/worlds/classic-collection.js','src/worlds/dramatic-depths.js',
  'src/worlds/frozen-wastes.js','src/worlds/mudlands.js',
  'src/reference-holes.js','src/level-design.js',
  'src/generators/midgame.js','src/generators/dramatic.js',
  'src/modes/desert-golfing.js','src/art.js','src/gameplay.js','src/autoplay.js',
];
for (const f of srcFiles) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf-8'), G, { filename: f });
}

const courseQueue = vm.runInContext(`
(function() {
  var q = [];
  for (var wId in WORLDS) {
    var world = WORLDS[wId];
    for (var cId in world.courses) {
      var course = world.courses[cId];
      q.push({ wId: wId, cId: cId, name: course.name, worldName: world.name, holeCount: course.holeCount || 10 });
    }
  }
  return q;
})()`, G, { timeout: 5000 });

// Apply course filter if CLI args provided
if (COURSE_FILTER.length > 0) {
  const before = courseQueue.length;
  const filtered = courseQueue.filter(c =>
    COURSE_FILTER.some(f => c.name.toLowerCase().includes(f) || c.worldName.toLowerCase().includes(f))
  );
  courseQueue.length = 0;
  courseQueue.push(...filtered);
  console.log(`Filter: ${COURSE_FILTER.join(', ')} → ${courseQueue.length}/${before} courses`);
}

const totalCourses = courseQueue.length;
const totalHoles = courseQueue.reduce((s, c) => s + c.holeCount, 0);

console.log(`HEADLESS PLAYTEST (${NUM_WORKERS} workers)`);
console.log(`Cheat threshold: ${CHEAT_THRESHOLD} shots`);
console.log(`Courses: ${totalCourses} | Total holes: ${totalHoles}`);
console.log('────────────────────────────────────────────────────────────');

// Distribute courses across workers using round-robin
// Sort by holeCount descending so heavy courses are spread evenly
const sorted = [...courseQueue].sort((a, b) => b.holeCount - a.holeCount);
const buckets = Array.from({ length: NUM_WORKERS }, () => []);
for (let i = 0; i < sorted.length; i++) {
  buckets[i % NUM_WORKERS].push(sorted[i]);
}

const startTime = performance.now();
let completedCourses = 0;

const workerPromises = buckets.map((courses, i) => {
  return new Promise((resolve, reject) => {
    const w = new Worker(__filename, {
      workerData: { courses, cheatThreshold: CHEAT_THRESHOLD, timeout: COURSE_FILTER.length > 0 ? 600000 : 120000 },
    });

    w.on('message', (msg) => {
      if (msg.type === 'progress') {
        completedCourses++;
        const c = msg.course;
        const warn = msg.error ? ' ERROR' : '';
        const mx = msg.holes > 0 ? '' : '';
        const chStr = msg.cheats > 0 ? `  CHEATS:${msg.cheats}` : '';
        const errStr = msg.error ? `  ERR: ${msg.error.slice(0, 40)}` : '';
        console.log(`  [${String(completedCourses).padStart(2)}/${totalCourses}] ${c.worldName} / ${c.name.padEnd(28)} ${String(msg.holes).padStart(4)}h${chStr}  (${msg.time}s)${errStr}`);
      }
      if (msg.type === 'done') {
        resolve(msg.results);
      }
    });

    w.on('error', reject);
    w.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker ${i} exited with code ${code}`));
    });
  });
});

Promise.all(workerPromises).then((workerResults) => {
  const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);

  // Flatten results and sort by original course order
  const allResults = workerResults.flat();
  const allHoles = [];
  let cheatedTotal = 0;
  let timedOut = 0;

  for (const r of allResults) {
    allHoles.push(...r.log);
    cheatedTotal += r.cheats;
    if (r.error) timedOut++;
  }

  const totalS = allHoles.reduce((s, h) => s + h.s, 0);
  const maxS = allHoles.length > 0 ? Math.max(...allHoles.map(h => h.s)) : 0;
  const o5 = allHoles.filter(h => h.s >= 5).length;
  const o10 = allHoles.filter(h => h.s >= 10).length;

  console.log('────────────────────────────────────────────────────────────');
  console.log('RESULTS:');
  console.log(`  Holes played:  ${allHoles.length} / ${totalHoles}`);
  console.log(`  Average shots: ${allHoles.length > 0 ? (totalS / allHoles.length).toFixed(2) : '—'}`);
  console.log(`  Max shots:     ${maxS}`);
  console.log(`  Over 5:        ${o5}`);
  console.log(`  Over 10:       ${o10}`);
  console.log(`  Cheated (${CHEAT_THRESHOLD}+):  ${cheatedTotal}`);
  if (timedOut > 0) console.log(`  Timed out:     ${timedOut} courses`);
  console.log(`  Time:          ${elapsed}s`);

  // Archetype breakdown
  const byArch = {};
  for (const h of allHoles) {
    if (!byArch[h.a]) byArch[h.a] = { count: 0, total: 0, max: 0, cheats: 0, over5: 0, over10: 0 };
    const a = byArch[h.a];
    a.count++; a.total += h.s;
    if (h.s > a.max) a.max = h.s;
    if (h.ch) a.cheats++;
    if (h.s >= 5) a.over5++;
    if (h.s >= 10) a.over10++;
  }
  const archRows = Object.entries(byArch)
    .map(([name, a]) => ({ name, ...a, avg: (a.total / a.count).toFixed(2) }))
    .sort((a, b) => b.max - a.max);

  console.log('\nARCHETYPE BREAKDOWN:');
  console.log(`  ${'Archetype'.padEnd(28)} Count  Avg    Max  5+   10+  Cheats`);
  for (const a of archRows) {
    const ms = a.max >= 25 ? `${a.max}!!!` : a.max >= 10 ? `${a.max} !!` : a.max >= 5 ? `${a.max}  !` : `${a.max}`;
    console.log(`  ${a.name.padEnd(28)} ${String(a.count).padStart(5)}  ${a.avg.padStart(5)}  ${ms.padStart(6)}  ${String(a.over5).padStart(3)}  ${String(a.over10).padStart(4)}  ${a.cheats || ''}`);
  }

  // Problem holes
  const problems = allHoles.filter(h => h.s >= 5 || h.ch).sort((a, b) => b.s - a.s);
  if (problems.length > 0) {
    console.log(`\nPROBLEM HOLES (5+ shots): ${problems.length}`);
    for (const h of problems.slice(0, 40)) {
      console.log(`  ${String(h.s).padStart(3)}${h.ch ? ' CHEAT' : '      '} | ${h.w} / ${h.c} H${h.h} (${h.a})`);
    }
    if (problems.length > 40) console.log(`  ... and ${problems.length - 40} more`);
  }

  // JSON report
  const reportPath = path.join(ROOT, 'headless-report.json');
  const normalized = allHoles.map(h => ({ world: h.w, course: h.c, hole: h.h, shots: h.s, arch: h.a, cheated: h.ch }));
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    cheatThreshold: CHEAT_THRESHOLD,
    workers: NUM_WORKERS,
    totalHoles: allHoles.length, avgShots: allHoles.length > 0 ? +(totalS / allHoles.length).toFixed(2) : 0,
    maxShots: maxS, over5: o5, over10: o10, cheated: cheatedTotal, timedOut, elapsed: +elapsed,
    archetypes: archRows,
    problems: problems.map(h => ({ world: h.w, course: h.c, hole: h.h, shots: h.s, arch: h.a, cheated: h.ch })),
    allHoles: normalized,
  }, null, 2));
  console.log(`\nReport saved: ${reportPath}`);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
