// Unit tests for core.js, questions.js, route.js  (node unit.js)
global.window = {};
const D = ''+__dirname+'/../';
require(D + 'route.js'); require(D + 'questions.js');
const C = require(D + 'core.js');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { (ok ? pass++ : fail++); console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + extra)); };

/* case-insensitive + trimmed clue validation, every Set A clue */
const clues = ['16','LIFO','TRANSITIVE','DEADLOCK','192.168.1.0','MITM','LOGARITHMIC','80%','3','RAG'];
window.STAGES.forEach((s, i) => {
  const c = clues[i];
  t(`stage ${i+1} stored clue = ${c}`, s.paper.clue === c, s.paper.clue);
  t(`stage ${i+1} clue exact/upper/lower/mixed/padded`,
    [c, c.toUpperCase(), c.toLowerCase(), '  ' + c.toLowerCase() + '  ', c.split('').map((ch, k) => k % 2 ? ch.toLowerCase() : ch.toUpperCase()).join('')].every(v => C.matches(v, s.paper.clue)));
});
t('clue LiFo matches LIFO', C.matches('LiFo', 'LIFO'));
t('clue rag matches RAG', C.matches('rag', 'RAG'));
t('clue transitive matches TRANSITIVE', C.matches('transitive', 'TRANSITIVE'));
t('80 does NOT match 80%', !C.matches('80', '80%'));
t('0.8 does not match 80%', !C.matches('0.8', '80%'));
t('192.168.1.0 keeps dots (1921681 0 rejected)', !C.matches('1921681 0', '192.168.1.0') && !C.matches('192.168.1', '192.168.1.0') && C.matches(' 192.168.1.0 ', '192.168.1.0'));
t('empty / whitespace rejected', !C.matches('', 'LIFO') && !C.matches('   ', 'LIFO'));
t('arbitrary answer rejected', !C.matches('stack', 'LIFO') && !C.matches('LIFOX', 'LIFO') && !C.matches('LI FO', 'LIFO'));
t('3 vs 03 vs three rejected', !C.matches('03', '3') && !C.matches('three', '3'));

/* monitor answers exactly as supplied */
const exp = [['text',['10000']],['B','STACK'],['C','3NF'],['E','ALL OF THE ABOVE'],['C','ROUTER'],['B','INTEGRITY'],['A','SORTED'],['C','PRECISION'],['text',['4']],['C','RESOURCE ALLOCATION GRAPH']];
window.STAGES.forEach((s, i) => {
  const m = s.monitor, e = exp[i];
  if (e[0] === 'text') t(`stage ${i+1} text answer ${e[1]}`, m.type === 'text' && C.matches(e[1][0], m.correct) && !C.matches('1000', m.correct) );
  else t(`stage ${i+1} option ${e[0]} = ${e[1]}`, m.type === 'choice' && m.correct === e[0] && m.options.find(o => o.key === e[0]).text === e[1] && m.options.filter(o => o.key !== e[0]).every(o => o.key !== m.correct));
});
t('text answers case-insensitive', C.matches('10000', ['10000']) && C.matches(' 4 ', ['4']));

/* route validation */
for (const k in window.ROUTE_PROFILES) t(`profile ${k} validates`, C.validateRoute(window.ROUTE_PROFILES[k]).length === 0, C.validateRoute(window.ROUTE_PROFILES[k]));
const P = window.ROUTE_PROFILES.photo;
// photo read independently: Q1..Q10, START, EXTRACTION
t('photo cells = grid photo', JSON.stringify(P.stops) === JSON.stringify(['B2','E1','G3','C4','F4','B6','E6','H5','C7','G7']) && P.start === 'A1' && P.extraction === 'H8');
t('setA cells = supplied R#C# list', JSON.stringify(window.ROUTE_PROFILES.setA.stops) === JSON.stringify(['R1C1','R2C1','R2C2','R2C3','R3C3','R3C4','R4C4','R4C5','R5C5','R5C4']));
// bad routes are rejected
const bad = (mut) => { const p = JSON.parse(JSON.stringify(P)); mut(p); return C.validateRoute(p).length > 0; };
t('rejects off-grid cell', bad(p => p.stops[3] = 'J9'));
t('rejects duplicate cell', bad(p => p.stops[4] = p.stops[3]));
t('rejects 9 stops', bad(p => p.stops.pop()));
t('rejects stop equal to extraction', bad(p => p.stops[9] = 'H8'));
t('rejects garbage label', bad(p => p.stops[0] = 'hello'));
// directions land on target for every leg (both profiles) and match hand-derived table
const hand = ['Move one column east and one row south to B2.','Move three columns east and one row north to E1.','Move two columns east and two rows south to G3.','Move four columns west and one row south to C4.','Move three cells east to F4.','Move four columns west and two rows south to B6.','Move three cells east to E6.','Move three columns east and one row north to H5.','Move five columns west and two rows south to C7.','Move four cells east to G7.','Move one column east and one row south to H8.'];
const seq = [P.start, ...P.stops, P.extraction];
seq.forEach((c, i) => { if (i === seq.length - 1) return; const ins = C.instruction(P, c, seq[i+1]); t(`photo leg ${c}→${seq[i+1]} text`, ins.sentence === hand[i], ins.sentence); t(`photo leg ${c}→${seq[i+1]} lands on target`, C.follow(P, c, ins) === seq[i+1]); });
const A = window.ROUTE_PROFILES.setA, handA = ['south R2C1','east R2C2','east R2C3','south R3C3','east R3C4','south R4C4','east R4C5','south R5C5','west R5C4'];
A.stops.slice(0, -1).forEach((c, i) => { const ins = C.instruction(A, c, A.stops[i+1]); t(`setA leg ${c}→${A.stops[i+1]}`, ins.sentence === `Move one cell ${handA[i].split(' ')[0]} to ${handA[i].split(' ')[1]}.` && C.follow(A, c, ins) === A.stops[i+1], ins.sentence); });
// nodes
const nP = C.buildNodes(P, window.STAGES, {start:{name:'s',icon:'i',story:''},extraction:{name:'e',icon:'i',story:''},stages:Array(10).fill({name:'n',icon:'i',story:''})});
t('photo: 12 nodes (start+10+extraction), last has no next', nP.length === 12 && nP[11].next === null && nP[0].kind === 'start' && nP[11].kind === 'extraction');
const nA = C.buildNodes(A, window.STAGES, {stages:Array(10).fill({name:'n',icon:'i',story:''})});
t('setA: 10 nodes, no invented start/extraction', nA.length === 10 && nA[0].kind === 'stage' && nA[9].next === null);
t('map x/y inside 3200x1800', [...nP, ...nA].every(n => n.x >= 0 && n.x <= 3200 && n.y >= 0 && n.y <= 1800));
/* timer */
t('timer duration exactly 30:00', C.DURATION_MS === 1800000 && C.fmtClock(C.DURATION_MS) === '30:00');
t('timer formats', C.fmtClock(0) === '00:00' && C.fmtClock(61000) === '01:01' && C.fmtClock(1799000) === '29:59' && C.fmtClock(-5) === '00:00');
t('remaining is timestamp-based (tab sleep safe)', C.remaining(1000, 1000 + 10*60*1000) === 20*60*1000 && C.remaining(0, 99*60*1000) === 0);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
