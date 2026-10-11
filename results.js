/* SPARDHA 2K26 · Round 3 — result storage (shared by the game and the admin dashboard)
   One record per run:
   { id, team, status:'playing'|'completed'|'expired', stations, total, wrong, fsExits,
     startedAt, endedAt, timeMs, splits:[{stage, ms}], updatedAt }                      */
(function () {
  'use strict';
  const CFG = window.RESULTS_CONFIG || {};
  const LS_RES = 'spardha-results-v1', LS_OUT = 'spardha-outbox-v1', SS_ADMIN = 'spardha-admin-ok';
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);

  /* ---------- backends: {name, put(rec), del(id), delAll(), subscribe(cb)->stop, isAdmin()} ---------- */
  function localBackend() {
    const all = () => lsGet(LS_RES, {});
    return {
      name: 'local',
      label: 'This browser only',
      async put(r) { const a = all(); a[r.id] = r; lsSet(LS_RES, a); },
      async del(id) { const a = all(); delete a[id]; lsSet(LS_RES, a); },
      async delAll() { lsSet(LS_RES, {}); },
      subscribe(cb) {
        const push = () => cb(Object.values(all()));
        const h = e => { if (!e.key || e.key === LS_RES) push(); };
        window.addEventListener('storage', h); const t = setInterval(push, 2000); push();
        return () => { window.removeEventListener('storage', h); clearInterval(t); };
      },
      async isAdmin() { return passcodeOk(); }
    };
  }

  function firebaseBackend(base) {
    const root = base.replace(/\/+$/, '') + '/' + String(CFG.ROOT || 'spardha2k26/round3').replace(/^\/+|\/+$/g, '');
    const url = p => root + (p ? '/' + p : '') + '.json';
    const j = async (res) => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); };
    return {
      name: 'firebase',
      label: 'Firebase Realtime Database',
      put: r => fetch(url('results/' + r.id), { method: 'PUT', body: JSON.stringify(r) }).then(j),
      del: id => fetch(url('results/' + id), { method: 'DELETE' }).then(j),
      delAll: () => fetch(url('results'), { method: 'DELETE' }).then(j),
      subscribe(cb) {
        let stop = false;
        const pull = async () => {
          try { const d = await fetch(url('results')).then(j); if (!stop) cb(d ? Object.values(d) : []); } catch (e) { if (!stop) cb(null, e); }
        };
        pull(); const t = setInterval(pull, 4000);
        return () => { stop = true; clearInterval(t); };
      },
      async isAdmin() { return passcodeOk(); }
    };
  }

  /* Artifact database. Layout: results/<viewer id> = { runs: { <runId>: record } }.
     Participants can only write their own doc; only editors/owner can read all of them (rules in the page declaration). */
  async function claudeBackend() {
    if (!window.claude || typeof window.claude.use !== 'function') return null;
    const db = await withTimeout(window.claude.use('db').catch(() => null), 6000);
    const user = await withTimeout(window.claude.use('user').catch(() => null), 4000);
    if (!db || !user) return null;
    let uid = null; try { uid = await user.id(); } catch (e) {}
    if (!uid) return null;                       // signed-out visitor → cannot write shared data
    const col = db.collection('results'), owner = {};
    return {
      name: 'claude',
      label: 'Shared artifact database',
      async put(r) {
        r.uid = uid;
        const ref = db.doc('results/' + uid);
        try { await ref.update({ runs: { [r.id]: r } }); }
        catch (e) { await ref.set({ runs: { [r.id]: r } }); }   // first write creates the document
      },
      async del(id) {
        const ref = db.doc('results/' + (owner[id] || uid)), snap = await ref.get();
        const runs = Object.assign({}, snap.exists ? (snap.data().runs || {}) : {}); delete runs[id];
        if (Object.keys(runs).length) await ref.set({ runs }); else await ref.delete();
      },
      async delAll() { const s = await col.get(); for (const d of s.docs) await db.doc('results/' + d.id).delete(); },
      subscribe(cb) {
        return col.onSnapshot(s => {
          const list = [];
          s.docs.forEach(d => Object.values((d.data() || {}).runs || {}).forEach(r => { owner[r.id] = d.id; list.push(r); }));
          cb(list);
        }, e => cb(null, e));
      },
      async isAdmin() { try { return !!(await user.canEdit()); } catch (e) { return false; } }
    };
  }

  /* ---------- admin passcode (static hosting) ---------- */
  function passcodeOk() { try { return sessionStorage.getItem(SS_ADMIN) === '1'; } catch (e) { return false; } }
  function tryPasscode(code) {
    const ok = String(code || '') === String(CFG.ADMIN_PASSCODE || '');
    if (ok) { try { sessionStorage.setItem(SS_ADMIN, '1'); } catch (e) {} }
    return ok;
  }

  /* ---------- init ---------- */
  let backend = null;
  const ready = (async () => {
    if (CFG.FIREBASE_DB_URL) backend = firebaseBackend(CFG.FIREBASE_DB_URL);
    else backend = (await claudeBackend().catch(() => null)) || localBackend();
    flush();
    return backend;
  })();

  /* ---------- outbox: latest record per run, written one at a time, retried until saved ---------- */
  let flushing = false, retry = 0;
  async function flush() {
    if (flushing || !backend) return;
    flushing = true;
    try {
      for (;;) {
        const out = lsGet(LS_OUT, {}), ids = Object.keys(out);
        if (!ids.length) { retry = 0; break; }
        const id = ids[0], rec = out[id];
        try { await backend.put(rec); } catch (e) { retry = setTimeout(() => { retry = 0; flush(); }, 6000); break; }
        const cur = lsGet(LS_OUT, {});
        if (cur[id] && cur[id].updatedAt === rec.updatedAt) delete cur[id];   // newer version arrived meanwhile → keep it
        lsSet(LS_OUT, cur);
      }
    } finally { flushing = false; }
  }
  function push(rec) {
    if (!rec || !rec.id) return;
    const out = lsGet(LS_OUT, {}); out[rec.id] = rec; lsSet(LS_OUT, out);
    if (!retry) flush();
  }

  window.Results = {
    ready, push, tryPasscode, passcodeOk,
    get backend() { return backend; },
    pending: () => Object.keys(lsGet(LS_OUT, {})).length
  };
})();
