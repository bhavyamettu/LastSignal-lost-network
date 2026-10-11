/* ============================================================
   SPARDHA 2K26 · Round 3 — results + admin configuration
   ============================================================
   WHERE RESULTS ARE STORED (first match wins):
     1. FIREBASE_DB_URL set  → Firebase Realtime Database (use this when you host
        the folder on any static site: every team's result lands in one place).
     2. Opened as the Claude artifact → the artifact's shared database.
     3. Otherwise → this browser only (localStorage). Good for a single-PC demo.

   ADMIN: the dashboard is at  admin.html  (or index.html#admin).
   It asks for ADMIN_PASSCODE. Change it before the event.
   ============================================================ */
window.RESULTS_CONFIG = {
  FIREBASE_DB_URL: '',          // e.g. 'https://your-project-default-rtdb.firebaseio.com'
  ROOT: 'spardha2k26/lost-network',   // folder inside the database
  ADMIN_PASSCODE: 'bahkvt'
};
