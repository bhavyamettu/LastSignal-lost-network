/* SPARDHA 2K26 · Round 3 · The Lost Network — journey engine */
(() => {
'use strict';

const C = window.Core, EV = window.EVENT || {};
const PROFILES = window.ROUTE_PROFILES;
const urlRoute = (() => { try { return new URLSearchParams(location.search).get('route'); } catch (e) { return null; } })();
const PROFILE = PROFILES[urlRoute] || PROFILES[window.ACTIVE_ROUTE] || PROFILES.photo;
const ROUTE_ERRORS = C.validateRoute(PROFILE, window.STAGES.length);
/* S = every node on the map: [START] + 10 stages + [EXTRACTION] (start/extraction only if the route defines them) */
const S = ROUTE_ERRORS.length ? C.buildNodes(PROFILES.photo, window.STAGES, window.FLAVOUR) : C.buildNodes(PROFILE, window.STAGES, window.FLAVOUR);
const N = S.length, TOTAL = window.STAGES.length;
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const W = 3200, H = 1800;
const KEY = 'spardha-lost-network-v1';

const svg = $('world'), panel = $('panel'), chip = $('travelChip'), toast = $('toast');
const intro = $('intro'), finale = $('finale');

/* ---------- storage (safe if blocked) ---------- */
const store = {
  get(){ try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
  set(v){ try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} },
  clear(){ try { localStorage.removeItem(KEY); } catch (e) {} }
};

/* ---------- helpers ---------- */
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mulberry = a => () => {
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
const fmt = C.fmtClock;

/* ---------- sound ---------- */
let actx = null, muted = false;
function tone(f, d = .14, type = 'sine', v = .05, when = 0) {
  if (muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime + when, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + .02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + .02);
  } catch (e) {}
}
const sfx = {
  ok(){ [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .06, i * .09)); },
  bad(){ tone(180, .25, 'sawtooth', .05); tone(140, .3, 'sawtooth', .05, .12); },
  step(){ tone(90 + Math.random() * 25, .07, 'triangle', .035); },
  arrive(){ tone(392, .3, 'sine', .05); tone(587, .4, 'sine', .05, .15); },
  win(){ [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, .5, 'triangle', .06, i * .14)); }
};

/* ============================================================
   WORLD
   ============================================================ */
svg.innerHTML = `
<defs>
  <radialGradient id="gLantern"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".9"/><stop offset=".45" stop-color="#ffc857" stop-opacity=".35"/><stop offset="1" stop-color="#ffc857" stop-opacity="0"/></radialGradient>
  <radialGradient id="gGround" cx="50%" cy="50%" r="75%"><stop offset="0" stop-color="#184a31"/><stop offset=".6" stop-color="#103a27"/><stop offset="1" stop-color="#0a2418"/></radialGradient>
  <linearGradient id="gBeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".95"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></linearGradient>
  <filter id="fGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <g id="pineA"><ellipse cx="0" cy="2" rx="24" ry="6" fill="#000" opacity=".28"/><rect x="-4" y="-10" width="8" height="12" fill="#3a2a1c"/><polygon points="-27,-12 27,-12 0,-52" fill="#1b5638"/><polygon points="-22,-36 22,-36 0,-70" fill="#216843"/><polygon points="-15,-58 15,-58 0,-90" fill="#287a4e"/></g>
  <g id="pineB"><ellipse cx="0" cy="2" rx="22" ry="6" fill="#000" opacity=".28"/><rect x="-4" y="-10" width="8" height="12" fill="#35261a"/><polygon points="-25,-12 25,-12 0,-50" fill="#154a30"/><polygon points="-20,-34 20,-34 0,-66" fill="#195a3a"/><polygon points="-14,-54 14,-54 0,-84" fill="#1e6a44"/></g>
  <g id="pineC"><ellipse cx="0" cy="2" rx="26" ry="7" fill="#000" opacity=".28"/><rect x="-5" y="-12" width="10" height="14" fill="#3d2c1e"/><polygon points="-30,-14 30,-14 0,-58" fill="#1a4f4a"/><polygon points="-24,-40 24,-40 0,-78" fill="#1f605a"/><polygon points="-16,-64 16,-64 0,-100" fill="#26726a"/></g>
  <g id="bush"><ellipse cx="0" cy="3" rx="20" ry="5" fill="#000" opacity=".25"/><circle cx="-9" cy="-6" r="11" fill="#1f6a42"/><circle cx="8" cy="-8" r="13" fill="#27794c"/><circle cx="0" cy="-14" r="10" fill="#2d8656"/></g>
</defs>`;

const cam = el('g', {}, svg);
el('rect', { x: -1600, y: -1600, width: W + 3200, height: H + 3200, fill: 'url(#gGround)' }, cam);

// ground texture
{
  const r = mulberry(11), g = el('g', { opacity: '.5' }, cam);
  for (let i = 0; i < 90; i++) {
    const light = r() > .55;
    el('ellipse', {
      cx: -200 + r() * (W + 400), cy: -150 + r() * (H + 300),
      rx: 60 + r() * 200, ry: 25 + r() * 80,
      fill: light ? '#2a6b46' : '#06180f', opacity: (.1 + r() * .18).toFixed(2)
    }, g);
  }
}

/* ---- path through the stations (winding) ---- */
const all = [];
for (let i = 0; i < N; i++) {
  all.push({ x: S[i].x, y: S[i].y });
  if (i < N - 1) {
    const a = S[i], b = S[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy);
    const off = (i % 2 ? -1 : 1) * Math.min(120, l * .24);
    all.push({ x: (a.x + b.x) / 2 - dy / l * off, y: (a.y + b.y) / 2 + dx / l * off });
  }
}
const P = k => all[clamp(k, 0, all.length - 1)];
function bez(k) {
  const p0 = P(k), p1 = P(k + 1), pm = P(k - 1), p2 = P(k + 2);
  return {
    c1: { x: p0.x + (p1.x - pm.x) / 6, y: p0.y + (p1.y - pm.y) / 6 },
    c2: { x: p1.x - (p2.x - p0.x) / 6, y: p1.y - (p2.y - p0.y) / 6 },
    p1
  };
}
const segs = [];
const trailG = el('g', {}, cam);
for (let i = 0; i < N - 1; i++) {
  const k = 2 * i, a = bez(k), b = bez(k + 1);
  const d = `M${all[k].x} ${all[k].y}C${a.c1.x} ${a.c1.y} ${a.c2.x} ${a.c2.y} ${a.p1.x} ${a.p1.y}C${b.c1.x} ${b.c1.y} ${b.c2.x} ${b.c2.y} ${b.p1.x} ${b.p1.y}`;
  const style = (w, c, o, extra = {}) => el('path', Object.assign({ d, fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: o }, extra), trailG);
  style(70, '#031009', .35);
  const base = style(48, '#5d4126', 1);
  style(32, '#7a5732', 1);
  style(3, '#b08d5a', .8, { 'stroke-dasharray': '2 16' });
  segs.push({ d, len: base.getTotalLength(), path: base });
}
// glowing "walked" overlay
const doneG = el('g', { filter: 'url(#fGlow)' }, cam);
segs.forEach(s => {
  s.done = el('path', { d: s.d, fill: 'none', stroke: '#ffd36b', 'stroke-width': 7, 'stroke-linecap': 'round', opacity: .95 }, doneG);
  s.done.style.strokeDasharray = s.len;
  s.done.style.strokeDashoffset = s.len;
});

/* ---- trees (kept off the trail) ---- */
{
  const samples = [];
  segs.forEach(s => { for (let l = 0; l <= s.len; l += 24) { const p = s.path.getPointAtLength(l); samples.push(p); } });
  const near = (x, y, r) => samples.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < r * r);
  const stationNear = (x, y, r) => S.some(s => (s.x - x) ** 2 + (s.y - y) ** 2 < r * r);
  const r = mulberry(7), list = [];
  for (let n = 0; n < 2400 && list.length < 780; n++) {
    const x = -350 + r() * (W + 700), y = -150 + r() * (H + 450);
    if (near(x, y, 88) || stationNear(x, y, 120)) continue;
    list.push({ x, y, s: .65 + r() * .95, t: Math.floor(r() * 5) });
  }
  list.sort((a, b) => a.y - b.y);
  const g = el('g', {}, cam), ids = ['pineA', 'pineB', 'pineC', 'bush', 'pineA'];
  list.forEach(t => {
    const u = el('use', { href: '#' + ids[t.t], transform: `translate(${t.x.toFixed(0)} ${t.y.toFixed(0)}) scale(${t.s.toFixed(2)})` }, g);
    if (t.t === 3) u.setAttribute('opacity', '.95');
  });
}

/* ---- tower beam (lights up at the end) ---- */
const last = S[N - 1];
const beam = el('g', { id: 'beam' }, cam);
el('polygon', { points: `${last.x - 22},${last.y - 80} ${last.x + 22},${last.y - 80} ${last.x + 160},${last.y - 1500} ${last.x - 160},${last.y - 1500}`, fill: 'url(#gBeam)', opacity: .55 }, beam);
el('circle', { cx: last.x, cy: last.y - 90, r: 120, fill: 'url(#gLantern)' }, beam);

/* ---- station markers ---- */
const markers = S.map((s, i) => {
  const g = el('g', { class: 'mk', transform: `translate(${s.x} ${s.y})` }, cam);
  el('ellipse', { cx: 0, cy: 4, rx: 34, ry: 12, fill: '#000', opacity: .3 }, g);
  const ring = el('ellipse', { class: 'ring', cx: 0, cy: 2, rx: 26, ry: 9, fill: 'none', stroke: '#ffd36b', 'stroke-width': 3 }, g);
  el('line', { x1: 0, y1: -4, x2: 0, y2: -48, stroke: '#c9b27a', 'stroke-width': 3 }, g);
  const badge = el('circle', { cx: 0, cy: -76, r: 32, fill: '#0b1c13', stroke: '#f2c14e', 'stroke-width': 3 }, g);
  const icon = el('text', { x: 0, y: -65, 'text-anchor': 'middle', 'font-size': 32 }, g);
  const num = el('text', { x: 0, y: -126, 'text-anchor': 'middle', 'font-size': 15, 'font-family': 'Cinzel,serif', 'font-weight': 700, fill: '#f2c14e' }, g);
  num.textContent = S[i].tag + ' · ' + S[i].cell;
  const label = el('text', { x: 0, y: 46, 'text-anchor': 'middle', 'font-size': 20, 'font-family': 'Cinzel,serif', 'font-weight': 700, fill: '#fff3cf', stroke: '#06140c', 'stroke-width': 5, 'paint-order': 'stroke' }, g);
  return { g, ring, badge, icon, num, label };
});
function refreshMarkers() {
  const cur = state.idx, curNode = S[cur], over = !!state.end;
  markers.forEach((m, i) => {
    const seen = i <= cur || over;
    m.icon.textContent = seen ? S[i].icon : '?';
    m.label.textContent = seen ? S[i].name + ' · ' + S[i].cell : '';
    m.num.setAttribute('opacity', seen ? 1 : .0);
    m.g.setAttribute('opacity', seen ? 1 : .55);
    m.ring.style.display = i === cur && !over && S[i].kind !== 'extraction' ? '' : 'none';
    m.badge.setAttribute('fill', i < cur || over ? '#1d4a30' : '#0b1c13');
  });
  segs.forEach((s, i) => { s.done.style.strokeDashoffset = (i < cur || over) ? 0 : s.len; });
  const curStage = curNode.stage || 0, finished = over || curNode.kind === 'extraction';
  document.querySelectorAll('.dot').forEach((d, i) => {
    d.classList.toggle('done', finished || (i + 1) < curStage);
    d.classList.toggle('cur', !finished && (i + 1) === curStage);
  });
}

/* ---- fireflies ---- */
{
  const g = el('g', {}, cam), r = mulberry(99);
  for (let i = 0; i < 70; i++) {
    const c = el('circle', { class: 'ff', cx: r() * W, cy: r() * H, r: 2 + r() * 2, fill: '#fff0a8' }, g);
    c.style.setProperty('--dx', (r() * 90 - 45).toFixed(0) + 'px');
    c.style.setProperty('--dy', (r() * 70 - 35).toFixed(0) + 'px');
    c.style.animationDelay = (-r() * 7).toFixed(2) + 's';
    c.style.animationDuration = (5 + r() * 6).toFixed(1) + 's';
  }
}

/* ---- walker ---- */
const walker = el('g', {}, cam);
el('circle', { class: 'lantern', cx: 0, cy: -20, r: 90, fill: 'url(#gLantern)' }, walker);
el('ellipse', { cx: 0, cy: 3, rx: 14, ry: 4, fill: '#000', opacity: .35 }, walker);
const body = el('g', {}, walker);
el('path', { d: 'M-11,0 Q0,-34 11,0 Z', fill: '#e8d9b0' }, body);
el('circle', { cx: 0, cy: -34, r: 7, fill: '#f1d6b0' }, body);
el('path', { d: 'M-8,-36 Q0,-48 8,-36 Z', fill: '#c0392b' }, body);
el('line', { x1: 14, y1: -26, x2: 14, y2: -6, stroke: '#6b4a2b', 'stroke-width': 2 }, body);
el('circle', { class: 'lantern', cx: 14, cy: -8, r: 5, fill: '#ffd36b' }, body);

/* ============================================================
   CAMERA + LOOP
   ============================================================ */
let vw = innerWidth, vh = innerHeight;
let scale = 0.4, targetScale = 0.4, camX = W / 2, camY = H / 2, camT = { x: W / 2, y: H / 2 };
let yFrac = .5, yFracT = .5;
let wx = S[0].x, wy = S[0].y, face = 1, moving = false;
let mode = 'intro';

const playScale = () => clamp(vw / 1000, .75, 1.15);
const overviewScale = () => Math.max(vw / W, vh / H) * 1.1;
function resize() {
  vw = innerWidth; vh = innerHeight;
  svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  targetScale = mode === 'play' ? playScale() : overviewScale();
  yFracT = mode === 'play' ? (vw < 700 ? .27 : .38) : .5;
}
addEventListener('resize', resize);

let introStart = performance.now();
function frame(now) {
  if (mode !== 'play') {
    const t = (now - introStart) / 1000;
    camT = { x: W / 2 + Math.sin(t / 14) * 260, y: H / 2 + Math.cos(t / 17) * 140 };
  }
  scale += (targetScale - scale) * .05;
  camX += (camT.x - camX) * .07;
  camY += (camT.y - camY) * .07;
  yFrac += (yFracT - yFrac) * .06;
  cam.setAttribute('transform', `translate(${(vw / 2 - camX * scale).toFixed(2)} ${(vh * yFrac - camY * scale).toFixed(2)}) scale(${scale.toFixed(4)})`);
  const bob = moving ? -Math.abs(Math.sin(now / 105)) * 5 : Math.sin(now / 700) * -1.2;
  walker.setAttribute('transform', `translate(${wx.toFixed(1)} ${(wy + bob).toFixed(1)})`);
  body.setAttribute('transform', `scale(${face} 1)`);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ============================================================
   GAME STATE + UI
   Flow:  enter clue → question → answer → MOVEMENT DIRECTION →
          travel → next clue … → extraction
   ============================================================ */
let state = null;
const dotsEl = $('dots');
for (let k = 0; k < TOTAL; k++) dotsEl.appendChild(Object.assign(document.createElement('span'), { className: 'dot' }));

/* ---------- 30:00 countdown (timestamp based → exact after tab sleep) ---------- */
const timerEl = $('timer'), timerBox = $('timerBox');
const remaining = () => state ? C.remaining(state.start, state.end || state.expiredAt || Date.now()) : C.DURATION_MS;
function paintTimer() {
  const ms = remaining();
  timerEl.textContent = fmt(ms);
  timerBox.classList.toggle('low', !!state && !state.end && !state.expired && ms <= 5 * 60 * 1000 && ms > 60 * 1000);
  timerBox.classList.toggle('crit', !!state && !state.end && !state.expired && ms <= 60 * 1000 && ms > 0);
  timerBox.classList.toggle('over', !!state && !!state.expired);
}
function isOver() {            // call before accepting ANY input
  if (!state || state.end) return false;
  if (!state.expired && remaining() <= 0) expire();
  return !!state.expired;
}
function tickTimer() { if (state && !state.end) isOver(); paintTimer(); fsCheck(); }
setInterval(tickTimer, 250);                                  // the one and only interval
document.addEventListener('visibilitychange', tickTimer);
addEventListener('focus', tickTimer);
addEventListener('pageshow', tickTimer);


/* ---------- full screen: entered when the game starts, kept until it ends ---------- */
const fsRoot = document.documentElement;
const inFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
let fsPending = false, fsFails = 0, fsGraceUntil = 0;
function goFS() {
  if (inFS() || fsPending) return;
  try {
    const r = fsRoot.requestFullscreen || fsRoot.webkitRequestFullscreen;
    const p = r && r.call(fsRoot, { navigationUI: 'hide' });
    if (!p) fsFails = 99;               /* browser has no full-screen API (e.g. iPhone) */
    if (p && p.then) {
      fsPending = true;
      p.then(() => { try { navigator.keyboard && navigator.keyboard.lock && navigator.keyboard.lock(['Escape']).catch(() => {}); } catch (e) {} })
       .then(() => { fsFails = 0; }, () => { fsFails++; })
       .then(() => { fsPending = false; fsCheck(); });
    }
  } catch (e) { fsPending = false; }
}
function leaveFS() {
  try { if (inFS()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) {}
  try { navigator.keyboard && navigator.keyboard.unlock && navigator.keyboard.unlock(); } catch (e) {}
}
const gameLive = () => !!state && !state.end && !state.expired && mode === 'play';
function fsCheck() {
  const live = gameLive();
  /* no lock in the first moments after Begin/Resume, and none where the browser refuses full screen outright (it would trap the team) */
  const lock = live && !inFS() && !fsPending && Date.now() > fsGraceUntil && fsFails < 3;
  $('fsLock').classList.toggle('hide', !lock);
  document.body.classList.toggle('playing', live);
  if (lock) $('fsLockTime').textContent = fmt(remaining());
}
let wasFS = false;
function onFSChange() {
  const now = inFS();
  if (wasFS && !now && gameLive()) { state.fsExits = (state.fsExits || 0) + 1; save(); report(); }
  wasFS = now; fsCheck();
  if (gameLive() && !now) setTimeout(() => { if (gameLive() && !inFS()) $('fsLock').focus({ preventScroll: true }); }, 0);
}
/* Chrome/Edge: while in full screen, lock the Esc key so a single press no longer exits (needs https or localhost, top-level page) */
function lockKeys() { try { if (inFS() && gameLive() && navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['Escape', 'F11']).catch(() => {}); } catch (e) {} }
document.addEventListener('fullscreenchange', lockKeys);
/* ask before a refresh / tab close during a running round */
addEventListener('beforeunload', e => { if (gameLive()) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('fullscreenchange', onFSChange);
document.addEventListener('webkitfullscreenchange', onFSChange);
/* While the game runs and the screen is not full, a full-page lock covers everything (icons included):
   any click, tap or key press brings full screen back. Nothing underneath can be pressed. */
const relock = e => { if (gameLive() && !inFS()) { e.preventDefault && e.preventDefault(); goFS(); } };
$('fsLock').addEventListener('pointerdown', relock);
$('fsLock').addEventListener('click', relock);
addEventListener('keydown', relock, true);
$('fs').addEventListener('click', () => { if (gameLive()) { goFS(); return; } inFS() ? leaveFS() : goFS(); });

/* ---------- results (saved to the admin dashboard) ---------- */
function report() {
  if (!state || !state.id || !window.Results) return;
  const status = state.end ? 'completed' : state.expired ? 'expired' : 'playing';
  const endedAt = state.end || (state.expired ? state.expiredAt : null);
  window.Results.push({
    id: state.id, team: state.team, status, stations: clearedCount(), total: TOTAL,
    wrong: state.wrong || 0, fsExits: state.fsExits || 0,
    startedAt: state.start, endedAt: endedAt || null,
    timeMs: endedAt ? (state.end ? state.end - state.start : C.DURATION_MS) : null,
    splits: state.splits || [], updatedAt: Date.now()
  });
}
function ensureRun() {
  if (!state.id) state.id = 'r' + state.start.toString(36) + Math.random().toString(36).slice(2, 7);
  if (!state.splits) state.splits = [];
  if (state.fsExits == null) state.fsExits = 0;
}

function clearedCount() {
  if (!state) return 0;
  if (state.end) return TOTAL;
  let n = 0;
  S.forEach((nd, i) => { if (nd.kind === 'stage' && (i < state.idx || (i === state.idx && state.step === 'direction'))) n++; });
  return n;
}
function expire() {
  if (!state || state.expired || state.end) return;
  state.expired = true; state.expiredAt = state.start + C.DURATION_MS; save();
  moving = false; chip.classList.add('hide'); hidePanel(); sfx.bad();
  paintTimer(); showExpired(); report(); leaveFS(); fsCheck();
}
function showExpired() {
  $('xTeam').textContent = state.team;
  $('xStages').textContent = clearedCount() + ' / ' + TOTAL;
  $('xTime').textContent = '30:00';
  $('expired').classList.remove('hide');
}

function save() { store.set(state); }
function showPanel() { panel.classList.remove('hide'); panel.scrollTop = 0; }
function hidePanel() { panel.classList.add('hide'); }
function say(msg, ms = 2200) {
  toast.textContent = msg; toast.classList.remove('hide');
  clearTimeout(say.t); say.t = setTimeout(() => toast.classList.add('hide'), ms);
}
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function stepsHTML(n) {
  const names = ['Enter clue', 'Answer', 'Direction'];
  return '<ol class="steps">' + names.map((t, i) => `<li class="${i < n ? 'done' : i === n ? 'on' : ''}">${i < n ? '✓ ' : ''}${t}</li>`).join('') + '</ol>';
}
function head(s) {
  const badge = s.kind === 'stage' ? `Station ${s.stage} / ${TOTAL}` : s.kind === 'start' ? 'Start' : 'Extraction';
  return `<div class="p-head"><span class="badge">${badge}</span><span class="place">${s.icon} ${esc(s.name)} <small class="cellref">${s.cell}</small></span></div>`;
}
function reject(f, inp, msg) {
  sfx.bad(); state.wrong = (state.wrong || 0) + 1; save(); report();
  const m = panel.querySelector('.msg');
  m.className = 'msg bad'; m.textContent = msg;
  f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
  if (inp) inp.select();
}
function bindText(onSubmit) {
  const f = panel.querySelector('form'), inp = f.querySelector('input');
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (isOver()) return;
    const v = inp.value.trim(); if (!v) return;
    const res = onSubmit(v);
    if (res !== true) reject(f, inp, res);
  });
  setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 350);
}

function stepClue() {
  const s = S[state.idx];
  panel.innerHTML = `${head(s)}${stepsHTML(0)}
    <p class="story">${s.story}</p>
    <h2 class="phase">Enter the clue</h2>
    <p class="phase-sub">Type the clue called out by your grid-side partner.</p>
    <form class="row big" autocomplete="off"><input type="text" id="clueIn" placeholder="Enter clue" autocapitalize="characters" spellcheck="false" aria-label="Clue"><button class="primary">Submit Clue</button></form>
    <p class="msg" role="status"></p>`;
  showPanel();
  bindText(v => {
    if (!C.matches(v, s.data.paper.clue)) return 'That clue is not correct. Check with your grid-side partner.';
    sfx.ok(); panel.classList.add('flash'); setTimeout(() => panel.classList.remove('flash'), 900);
    state.step = 'question'; save(); stepQuestion(true);
    return true;
  });
}

function stepQuestion(fresh) {
  const s = S[state.idx], q = s.data.monitor;
  const ph = q.placeholder ? '<span class="phtag" title="Edit questions.js">PLACEHOLDER — wording to be confirmed</span>' : '';
  const body = q.type === 'choice'
    ? `<form class="choices" autocomplete="off"><div class="opts" role="radiogroup" aria-label="Answer options">${
        q.options.map((o, i) => `<button type="button" class="opt" role="radio" aria-checked="false" data-k="${o.key}" style="--i:${i}"><b>${o.key}</b><span>${esc(o.text)}</span></button>`).join('')
      }</div><button class="primary wide" id="subAns" type="submit">Submit Answer</button></form>`
    : `<form class="row big" autocomplete="off"><input type="text" id="ansIn" placeholder="Type your answer" spellcheck="false" autocapitalize="off" aria-label="Answer"><button class="primary">Submit Answer</button></form>`;
  panel.innerHTML = `${head(s)}${stepsHTML(1)}
    <p class="success">✓ Clue accepted</p>
    <div class="${fresh ? 'reveal' : ''}"><p class="q">${esc(q.question)}</p>${ph}</div>
    <div class="${fresh ? 'reveal late' : ''}">${body}</div>
    <p class="msg" role="status"></p>`;
  showPanel();
  const done = () => {
    sfx.ok();
    if (s.next) { state.step = 'direction'; state.splits.push({ stage: s.stage, ms: Date.now() - state.start }); save(); report(); stepDirection(); }
    else finish();
  };
  if (q.type === 'choice') {
    const f = panel.querySelector('form'); let pick = null;
    f.querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => {
      if (isOver()) return;
      pick = b.dataset.k;
      f.querySelectorAll('.opt').forEach(x => { const on = x === b; x.classList.toggle('sel', on); x.setAttribute('aria-checked', on); });
      panel.querySelector('.msg').textContent = '';
    }));
    f.addEventListener('submit', e => {
      e.preventDefault();
      if (isOver()) return;
      const m = panel.querySelector('.msg');
      if (!pick) { m.className = 'msg bad'; m.textContent = 'Select an option first.'; return; }
      if (pick !== q.correct) {
        reject(f, null, 'Not quite right. Try again.');
        pick = null; f.querySelectorAll('.opt').forEach(x => { x.classList.remove('sel'); x.setAttribute('aria-checked', 'false'); });
        return;
      }
      done();
    });
  } else {
    bindText(v => C.matches(v, q.correct) ? (done(), true) : 'Not quite right. Try again.');
  }
}

function compassSVG() {
  return `<svg viewBox="-60 -60 120 120" aria-hidden="true">
    <circle r="56" fill="rgba(0,0,0,.4)" stroke="#f2c14e" stroke-opacity=".55" stroke-width="2"/>
    <circle r="44" fill="none" stroke="#fff" stroke-opacity=".12"/>
    <g font-size="12" fill="#cfe0d2" text-anchor="middle" font-family="Cinzel,serif" font-weight="700">
      <text y="-45">N</text><text x="47" y="4">E</text><text y="55">S</text><text x="-47" y="4">W</text></g>
    <g id="needle"><polygon points="0,-36 7,0 -7,0" fill="#f2c14e"/><polygon points="0,36 7,0 -7,0" fill="#6d5b2c"/></g>
    <circle r="4" fill="#0b1c13" stroke="#f2c14e" stroke-width="2"/></svg>`;
}

function stepDirection() {
  const s = S[state.idx], n = S[state.idx + 1], ins = s.next;
  const isStart = s.kind === 'start';
  const tgt = n.kind === 'stage' ? `Station ${n.stage}` : n.name;
  panel.innerHTML = `${head(s)}${isStart ? '' : stepsHTML(2)}
    ${isStart ? '<p class="success">Your journey begins</p>' : '<p class="success">✓ Correct answer</p>'}
    <h2 class="phase">Movement direction</h2>
    <div class="dirrow reveal">
      <div class="compass">${compassSVG()}</div>
      <div><p class="big">Next: ${esc(tgt)} at<b class="cellbig">${n.cell}</b></p>
        <p class="move">${ins.headline}</p></div>
    </div>
    <p class="route">${ins.sentence}</p>
    <button class="primary wide" id="go">Continue — follow the trail →</button>`;
  showPanel();
  const needle = $('needle');
  needle.style.transform = 'rotate(-620deg)';
  void needle.getBoundingClientRect();
  needle.style.transition = 'transform 2.4s cubic-bezier(.2,.9,.2,1.1)';
  requestAnimationFrame(() => { needle.style.transform = `rotate(${ins.bearing}deg)`; });
  sfx.arrive();
  $('go').addEventListener('click', () => {
    if (isOver()) return;
    $('go').disabled = true; travel(state.idx);
  }, { once: true });
}

function showStep() {
  if (isOver()) return;
  const s = S[state.idx];
  if (s.kind === 'extraction') return finish();
  if (s.kind === 'start' || (state.step === 'direction' && s.next)) stepDirection();
  else if (state.step === 'question') stepQuestion();
  else stepClue();
}

/* ---------- travel ---------- */
function travel(i) {
  const seg = segs[i], from = S[i], to = S[i + 1];
  hidePanel();
  yFracT = .52;
  chip.textContent = `Travelling to ${to.cell}…`;
  chip.classList.remove('hide');
  const dur = clamp(seg.len * 8.5, 4500, 8500);
  const t0 = performance.now();
  let lastStep = 0;
  moving = true;
  const ease = p => -(Math.cos(Math.PI * p) - 1) / 2;

  function tick(now) {
    if (state.expired) { moving = false; return; }
    const p = clamp((now - t0) / dur, 0, 1), e = ease(p);
    const l = seg.len * e, pt = seg.path.getPointAtLength(l), pt2 = seg.path.getPointAtLength(Math.min(seg.len, l + 2));
    if (Math.abs(pt2.x - pt.x) > .05) face = pt2.x >= pt.x ? 1 : -1;
    wx = pt.x; wy = pt.y;
    camT = { x: wx, y: wy };
    seg.done.style.strokeDashoffset = seg.len - l;
    if (now - lastStep > 380) { sfx.step(); lastStep = now; }
    if (p < 1) { chip.textContent = `Travelling to ${to.cell} · ${Math.round(p * 100)}%`; requestAnimationFrame(tick); }
    else arrive(i + 1);
  }
  requestAnimationFrame(tick);
}

function arrive(i) {
  moving = false;
  if (state.expired) return;
  state.idx = i; state.step = S[i].kind === 'extraction' ? 'done' : 'clue'; save();
  const s = S[i]; wx = s.x; wy = s.y; camT = { x: s.x, y: s.y };
  yFracT = vw < 700 ? .27 : .38;
  chip.classList.add('hide');
  refreshMarkers(); sfx.arrive();
  say(`📍 You reached ${s.name} · ${s.cell}`);
  if (s.kind === 'extraction') setTimeout(finish, 900);
  else setTimeout(() => { if (!isOver()) stepClue(); }, 900);
}

/* ---------- finish ---------- */
function finish() {
  if (state.end || isOver()) return;
  state.end = Date.now(); state.step = 'done'; save();
  if (S[state.idx].kind === 'stage') state.splits.push({ stage: S[state.idx].stage, ms: state.end - state.start });
  report();
  hidePanel(); refreshMarkers(); paintTimer(); sfx.win(); leaveFS(); fsCheck();
  beam.classList.add('on');
  say('📡 The signal is lit!', 3000);
  mode = 'finale'; introStart = performance.now(); targetScale = overviewScale() * 1.6; yFracT = .6;
  camT = { x: last.x - 300, y: last.y + 200 };
  setTimeout(showFinale, 2600);
}
function showFinale() {
  $('fTeam').textContent = state.team;
  $('fTime').textContent = fmt(state.end - state.start);
  $('finaleText').textContent = EV.finale || '';
  finale.classList.remove('hide');
}

/* ---------- intro / start ---------- */
function enterGame() {
  mode = 'play';
  ensureRun(); save(); report();
  intro.classList.add('hide');
  if (!state.end && !state.expired) { fsGraceUntil = Date.now() + 2500; fsFails = 0; goFS(); }
  const s = S[state.idx];
  wx = s.x; wy = s.y; camT = { x: s.x, y: s.y };
  targetScale = playScale(); yFracT = vw < 700 ? .27 : .38;
  refreshMarkers(); paintTimer(); fsCheck();
  if (state.end) { mode = 'finale'; beam.classList.add('on'); showFinale(); return; }
  if (isOver()) { showExpired(); return; }
  setTimeout(showStep, 1400);
}

const saved = (() => { const v = store.get(); return v && v.team && v.profile === PROFILE.id ? v : null; })();
const team = $('team'), resumeBtn = $('resumeBtn');
if (ROUTE_ERRORS.length) {
  $('beginBtn').disabled = true;
  const e = document.createElement('p'); e.className = 'msg bad';
  e.textContent = 'Route configuration error (route.js): ' + ROUTE_ERRORS.join(' ');
  $('startForm').appendChild(e);
}
if (saved) {
  team.value = saved.team;
  resumeBtn.textContent = saved.end ? 'View my result' : saved.expired ? 'Time expired — view result' : `Resume · Station ${S[saved.idx].stage || 1} of ${TOTAL}`;
  resumeBtn.classList.remove('hide');
  resumeBtn.addEventListener('click', () => { state = saved; enterGame(); });
}
$('startForm').addEventListener('submit', e => {
  e.preventDefault();
  if (ROUTE_ERRORS.length) return;
  const name = team.value.trim(); if (!name) return;
  state = { team: name, profile: PROFILE.id, idx: 0, step: S[0].kind === 'start' ? 'depart' : 'clue', start: Date.now(), end: null, expired: false, hints: 0, wrong: 0, fsExits: 0, splits: [] };
  save(); sfx.arrive(); enterGame();
});
$('mute').addEventListener('click', e => { muted = !muted; e.currentTarget.classList.toggle('off', muted); });
function restartDemo() { store.clear(); location.reload(); }
$('xRestart').addEventListener('click', restartDemo);
{
  const rb = $('restart'); let armed = false, tm = 0;
  rb.addEventListener('click', () => {
    if (!armed) {
      armed = true; rb.textContent = 'Restart demo?';
      rb.style.cssText = 'width:auto;padding:0 14px;border-radius:999px;font-size:13px';
      tm = setTimeout(() => { armed = false; rb.textContent = '↺'; rb.style.cssText = ''; }, 3000);
      return;
    }
    clearTimeout(tm); restartDemo();
  });
}

state = { idx: 0, end: null, start: Date.now() };   // placeholder for intro scene
refreshMarkers();
state = null;
paintTimer();
resize();
scale = targetScale;

/* test hook (read-only helpers used by the automated tests) */
window.__lastSignal = { nodes: S, profile: PROFILE, get state() { return state; } };
})();
