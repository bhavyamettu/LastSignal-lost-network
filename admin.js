/* SPARDHA 2K26 · Round 3 — admin dashboard (renders into #adminRoot). Admin-only. */
(function () {
  'use strict';
  const root = document.getElementById('adminRoot');
  if (!root) return;
  const R = window.Results, TOTAL_DEFAULT = 10;
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clock = ms => { const s = Math.max(0, Math.round(ms / 1000)), p = n => String(n).padStart(2, '0'); return p(Math.floor(s / 60)) + ':' + p(s % 60); };
  const when = t => t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
  let rows = [], open = {}, q = '', stop = null, tick = 0, armed = false, armT = 0, err = null;

  const elapsed = r => r.status === 'playing' ? Date.now() - r.startedAt : (r.timeMs != null ? r.timeMs : 0);
  const order = r => (r.status === 'completed' ? 0 : 1);
  function sorted() {
    return rows.filter(r => r && r.id && (!q || String(r.team).toLowerCase().includes(q)))
      .sort((a, b) => order(a) - order(b) || (order(a) === 0 ? a.timeMs - b.timeMs : (b.stations - a.stations) || elapsed(a) - elapsed(b)));
  }

  /* ---------- gate ---------- */
  async function start() {
    root.innerHTML = '<div class="ad-wrap"><p class="ad-muted">Checking access…</p></div>';
    const b = await R.ready;
    /* artifact: only the owner / Editors may open it at all; every mode then also needs the admin passcode */
    if (b.name === 'claude' && !(await b.isAdmin())) return gate(b, true);
    if (R.passcodeOk()) return dashboard(b);
    gate(b, false);
  }
  function gate(b, denied) {
    root.innerHTML = `<div class="ad-wrap ad-gate"><p class="ad-kick">SPARDHA 2K26 · ROUND 3</p><h1>Admin only</h1>
      ${denied
        ? `<p class="ad-muted">This dashboard is for the event admins. Participants cannot open it.</p>`
        : `<p class="ad-muted">Enter the admin passcode to see the results.</p>
           <form id="adForm" autocomplete="off"><label for="adPass">Passcode</label><input id="adPass" type="password" autocomplete="off" autofocus><button class="ad-btn gold" type="submit">Open dashboard</button><p class="ad-msg bad" id="adMsg" role="status"></p></form>`}
      </div>`;
    const f = document.getElementById('adForm');
    if (f) f.addEventListener('submit', e => {
      e.preventDefault();
      if (R.tryPasscode(document.getElementById('adPass').value)) dashboard(b);
      else { const m = document.getElementById('adMsg'); m.textContent = 'Wrong passcode.'; }
    });
  }

  /* ---------- dashboard ---------- */
  function dashboard(b) {
    root.innerHTML = `<div class="ad-wrap">
      <header class="ad-head">
        <div><p class="ad-kick">SPARDHA 2K26 · THE UNCHARTED</p><h1>The Lost Network · Results</h1></div>
        <div class="ad-tools">
          <span class="ad-chip" id="adMode" title="Where results are stored"><i class="dot"></i>${esc(b.label)}</span>
          <input id="adSearch" type="search" placeholder="Search team" aria-label="Search team">
          <button class="ad-btn" id="adCsv" type="button">Export CSV</button>
          <button class="ad-btn danger" id="adClear" type="button">Clear all</button>
        </div>
      </header>
      <p class="ad-msg" id="adNote" role="status"></p>
      <section class="ad-tiles" id="adTiles"></section>
      <section class="ad-tablewrap"><table class="ad-table"><thead><tr>
        <th>#</th><th>Team</th><th>Status</th><th>Stations</th><th>Time</th><th>Wrong</th><th>Full-screen exits</th><th>Updated</th></tr></thead>
        <tbody id="adBody"></tbody></table></section></div>`;
    document.getElementById('adSearch').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); paint(); });
    document.getElementById('adCsv').addEventListener('click', () => exportCsv());
    const clr = document.getElementById('adClear');
    clr.addEventListener('click', async () => {
      if (!armed) { armed = true; clr.textContent = 'Press again to delete ALL results'; armT = setTimeout(() => { armed = false; clr.textContent = 'Clear all'; }, 4000); return; }
      clearTimeout(armT); armed = false; clr.textContent = 'Clear all';
      try { await b.delAll(); localStorage.removeItem('spardha-outbox-v1'); rows = []; paint(); note('All results deleted.'); } catch (e) { note('Could not delete: ' + (e && e.message || e), true); }
    });
    document.getElementById('adBody').addEventListener('click', e => {
      const del = e.target.closest('[data-del]');
      if (del) { const id = del.dataset.del; b.del(id).then(() => { rows = rows.filter(r => r.id !== id); paint(); }).catch(x => note('Could not delete: ' + (x && x.message || x), true)); return; }
      const tr = e.target.closest('tr[data-id]'); if (!tr) return;
      open[tr.dataset.id] = !open[tr.dataset.id]; paint();
    });
    if (stop) stop();
    stop = b.subscribe((list, e) => { if (list) { rows = list; err = null; } else err = e; paint(); });
    clearInterval(tick); tick = setInterval(() => { document.querySelectorAll('[data-live]').forEach(n => { n.textContent = clock(Date.now() - +n.dataset.live); }); }, 1000);
  }
  function note(m, bad) { const n = document.getElementById('adNote'); if (n) { n.textContent = m; n.className = 'ad-msg' + (bad ? ' bad' : ''); } }

  function paint() {
    const list = sorted(), all = rows.filter(r => r && r.id);
    const done = all.filter(r => r.status === 'completed'), play = all.filter(r => r.status === 'playing'), exp = all.filter(r => r.status === 'expired');
    const best = done.length ? Math.min(...done.map(r => r.timeMs)) : null;
    const tile = (l, v, s) => `<div class="ad-tile"><span>${l}</span><b>${v}</b>${s ? `<small>${s}</small>` : ''}</div>`;
    const tiles = document.getElementById('adTiles'); if (!tiles) return;
    tiles.innerHTML = tile('Teams attempted', all.length) + tile('Solved all questions', done.length) + tile('Time limit reached', exp.length, exp.length ? 'ran out of time' : '') + tile('Playing now', play.length) +
      tile('Fastest solve', best == null ? '-' : clock(best), best == null ? '' : esc(done.find(r => r.timeMs === best).team));
    if (err) note('Cannot read results: ' + (err.message || err.code || err), true);
    const body = document.getElementById('adBody');
    if (!list.length) { body.innerHTML = `<tr><td colspan="8" class="ad-empty">${all.length ? 'No team matches your search.' : 'No results yet. A team appears here the moment it presses “Begin the journey”.'}</td></tr>`; return; }
    body.innerHTML = list.map((r, i) => {
      const total = r.total || TOTAL_DEFAULT, pct = Math.round((r.stations || 0) / total * 100);
      const label = { completed: 'Completed', expired: 'Time expired', playing: 'Playing' }[r.status] || r.status;
      const t = r.status === 'playing' ? `<span data-live="${r.startedAt}">${clock(elapsed(r))}</span>` : clock(elapsed(r));
      let main = `<tr class="ad-row ${open[r.id] ? 'open' : ''}" data-id="${esc(r.id)}" tabindex="0">
        <td class="num">${i + 1}</td><td class="team">${esc(r.team)}</td>
        <td><span class="ad-pill ${esc(r.status)}">${label}</span></td>
        <td><div class="ad-bar" aria-label="${r.stations || 0} of ${total}"><i style="width:${pct}%"></i></div><span class="num small">${r.stations || 0} / ${total}</span></td>
        <td class="num">${t}</td><td class="num">${r.wrong || 0}</td><td class="num ${r.fsExits ? 'warn' : ''}">${r.fsExits || 0}</td><td class="num small">${when(r.updatedAt)}</td></tr>`;
      if (open[r.id]) {
        const sp = (r.splits || []).map(s => `<li><span>Station ${s.stage}</span><b>${clock(s.ms)}</b></li>`).join('') || '<li class="ad-muted">No station cleared yet.</li>';
        main += `<tr class="ad-detail"><td></td><td colspan="7"><ul class="ad-splits">${sp}</ul>
          <p class="ad-muted small">Started ${when(r.startedAt)}${r.endedAt ? ' · Ended ' + when(r.endedAt) : ''} · <button class="ad-link" data-del="${esc(r.id)}" type="button">Delete this result</button></p></td></tr>`;
      }
      return main;
    }).join('');
  }

  async function exportCsv() {
    const cell = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const head = ['Rank', 'Team', 'Status', 'Stations', 'Time (mm:ss)', 'Wrong attempts', 'Full-screen exits', 'Started', 'Ended', 'Station split times'];
    const lines = [head.map(cell).join(',')].concat(sorted().map((r, i) => [i + 1, r.team, r.status, (r.stations || 0) + '/' + (r.total || TOTAL_DEFAULT), clock(elapsed(r)), r.wrong || 0, r.fsExits || 0,
      r.startedAt ? new Date(r.startedAt).toLocaleString() : '', r.endedAt ? new Date(r.endedAt).toLocaleString() : '',
      (r.splits || []).map(s => 'S' + s.stage + ' ' + clock(s.ms)).join(' | ')].map(cell).join(',')));
    const csv = '﻿' + lines.join('\r\n'), name = 'spardha-round3-results.csv';
    try {
      const d = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
      if (d) { await d.save({ filename: name, data: csv }); note('CSV ready.'); return; }
    } catch (e) { if (e && e.code === 'declined') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  window.AdminDash = { start };
  if (document.body.dataset.admin === 'page') start();
})();
