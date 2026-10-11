/* ============================================================
   SPARDHA 2K26 · Round 3 — core logic (no DOM)
   Normalisation, grid maths, movement-instruction generation and
   route validation. Used by app.js and by the test-suite.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const num = n => (n >= 0 && n <= 9 ? WORDS[n] : String(n));

  /* Case-insensitive, whitespace-trimmed comparison.
     Punctuation is KEPT so "80%" ≠ "80" and "192.168.1.0" ≠ "1921681 0". */
  const norm = s => String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
  const matches = (input, accepted) => {
    const v = norm(input);
    return v !== '' && [].concat(accepted).some(a => norm(a) === v);
  };

  /* ---------- grid ---------- */
  function parseCell(p, label) {
    const t = String(label == null ? '' : label).trim().toUpperCase();
    let m, r, c;
    if (p.cellStyle === 'letter') {
      m = /^([A-Z])(\d{1,2})$/.exec(t); if (!m) return null;
      c = m[1].charCodeAt(0) - 64; r = +m[2];
    } else {
      m = /^R(\d{1,2})C(\d{1,2})$/.exec(t); if (!m) return null;
      r = +m[1]; c = +m[2];
    }
    if (r < 1 || c < 1 || r > p.rows || c > p.cols) return null;
    return { r, c };
  }
  const cellLabel = (p, cell) => p.cellStyle === 'letter'
    ? String.fromCharCode(64 + cell.c) + cell.r
    : 'R' + cell.r + 'C' + cell.c;

  /* rows grow SOUTH, columns grow EAST (as on the paper grid) */
  function instruction(p, fromLabel, toLabel) {
    const a = parseCell(p, fromLabel), b = parseCell(p, toLabel);
    if (!a || !b) throw new Error(`Bad cell in leg ${fromLabel} → ${toLabel}`);
    const dr = b.r - a.r, dc = b.c - a.c;
    if (!dr && !dc) throw new Error(`Leg ${fromLabel} → ${toLabel} does not move`);
    const parts = [];
    if (dc) parts.push({ n: Math.abs(dc), unit: 'column', dir: dc > 0 ? 'East' : 'West' });
    if (dr) parts.push({ n: Math.abs(dr), unit: 'row', dir: dr > 0 ? 'South' : 'North' });
    const to = cellLabel(p, b);
    let sentence;
    if (parts.length === 1) {
      const q = parts[0];
      sentence = `Move ${num(q.n)} ${q.n === 1 ? 'cell' : 'cells'} ${q.dir.toLowerCase()} to ${to}.`;
    } else {
      sentence = 'Move ' + parts.map(q => `${num(q.n)} ${q.unit}${q.n === 1 ? '' : 's'} ${q.dir.toLowerCase()}`).join(' and ') + ` to ${to}.`;
    }
    return {
      from: cellLabel(p, a), to, dr, dc, parts, sentence,
      headline: parts.map(q => `${q.n} ${q.dir.toUpperCase()}`).join(' · '),
      bearing: ((Math.atan2(dc, -dr) * 180 / Math.PI) + 360) % 360
    };
  }
  /* apply an instruction to a cell – used to prove it lands on the target */
  function follow(p, fromLabel, ins) {
    const a = parseCell(p, fromLabel);
    let r = a.r, c = a.c;
    ins.parts.forEach(q => {
      if (q.dir === 'East') c += q.n; if (q.dir === 'West') c -= q.n;
      if (q.dir === 'South') r += q.n; if (q.dir === 'North') r -= q.n;
    });
    return cellLabel(p, { r, c });
  }

  /* ---------- nodes (start → 10 stages → extraction) ---------- */
  function hasStartLeg(p) {
    return !!(p.start && p.stops.length && norm(p.start) !== norm(p.stops[0]));
  }
  function validateRoute(p, expectedStops = 10) {
    const err = [];
    if (!p || !p.stops) return ['Route profile missing.'];
    if (!Number.isInteger(p.rows) || !Number.isInteger(p.cols)) err.push('rows/cols must be integers.');
    if (p.stops.length !== expectedStops) err.push(`Route needs exactly ${expectedStops} stops (has ${p.stops.length}).`);
    const seq = [];
    if (hasStartLeg(p)) seq.push({ k: 'start', l: p.start });
    p.stops.forEach((l, i) => seq.push({ k: 'stage ' + (i + 1), l }));
    if (p.extraction) seq.push({ k: 'extraction', l: p.extraction });
    const seen = {};
    seq.forEach(s => {
      const c = parseCell(p, s.l);
      if (!c) { err.push(`${s.k}: "${s.l}" is not a valid cell on this ${p.rows}×${p.cols} grid.`); return; }
      const key = cellLabel(p, c);
      if (seen[key]) err.push(`${s.k}: cell ${key} is already used by ${seen[key]}.`);
      seen[key] = s.k;
    });
    if (!err.length) {
      for (let i = 0; i < seq.length - 1; i++) {
        try {
          const ins = instruction(p, seq[i].l, seq[i + 1].l);
          if (follow(p, seq[i].l, ins) !== ins.to) err.push(`leg ${seq[i].k} → ${seq[i + 1].k}: instruction does not land on ${ins.to}.`);
        } catch (e) { err.push(e.message); }
      }
    }
    return err;
  }

  function buildNodes(p, stages, flavour) {
    const total = p.stops.length, nodes = [];
    const pos = c => ({
      x: Math.round(300 + (c.c - 1) * (2600 / Math.max(1, p.cols - 1))),
      y: Math.round(260 + (c.r - 1) * (1280 / Math.max(1, p.rows - 1)))
    });
    const mk = (kind, label, f, extra) => {
      const c = parseCell(p, label), cell = cellLabel(p, c);
      return Object.assign({ kind, cell, rc: c, name: f.name, icon: f.icon, story: f.story }, pos(c), extra);
    };
    if (hasStartLeg(p)) nodes.push(mk('start', p.start, flavour.start, { stage: 0, tag: 'START' }));
    p.stops.forEach((l, i) => {
      const n = mk('stage', l, flavour.stages[i], { stage: i + 1, total });
      n.tag = `STATION ${i + 1}`;
      n.data = stages[i];
      nodes.push(n);
    });
    if (p.extraction) nodes.push(mk('extraction', p.extraction, flavour.extraction, { stage: 0, tag: 'EXTRACTION' }));
    /* direction from every node to the next one */
    nodes.forEach((n, i) => { n.next = nodes[i + 1] ? instruction(p, n.cell, nodes[i + 1].cell) : null; });
    return nodes;
  }

  /* ---------- timer ---------- */
  const DURATION_MS = 30 * 60 * 1000;
  const remaining = (start, ref) => Math.max(0, start + DURATION_MS - ref);
  const fmtClock = ms => {
    const s = Math.max(0, Math.ceil(ms / 1000)), p = n => String(n).padStart(2, '0');
    return p(Math.floor(s / 60)) + ':' + p(s % 60);
  };

  return { norm, matches, parseCell, cellLabel, instruction, follow, hasStartLeg, validateRoute, buildNodes, DURATION_MS, remaining, fmtClock };
});
