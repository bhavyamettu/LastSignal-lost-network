# SPARDHA 2K26 · The Uncharted — Round 3: The Lost Network (Set A)

Monitor-side web app. The grid-side participant works on the paper grid and calls out a clue; the monitor-side participant uses this app.

## Flow
Enter clue → question appears → answer → MOVEMENT DIRECTION → Continue (forest travel) → next clue … → extraction.
A wrong clue or answer never advances. A 30:00 countdown runs from "Begin the journey" and never resets between stages.

## Run
Open `index.html` in a browser (no build, no dependencies; Google Fonts load when online).
For hosting, upload the folder to any static host. Progress is saved in the browser (localStorage).
Use one browser tab per team: tabs on the same browser share saved progress.
Restart Demo: the ↺ button (press twice) or the button on the time-expired screen.

## Where things live
| File | Contents |
|---|---|
| `questions.js` | Set A: paper questions, expected clues (never shown), monitor questions, options, correct answers |
| `route.js` | Grid cells, start, extraction, route profiles (`photo` default, `setA` alternative) |
| `core.js` | Case-insensitive matching, direction generation, route validation, timer maths |
| `stations.js` | Forest names/icons/stories only |
| `app.js`, `style.css`, `index.html` | Scene, game logic, look and feel |

## Full screen (locked)
Full screen starts with "Begin the journey" (or Resume) and is kept until the last question is finished or the 30:00 are over.
If it is left (Esc, F11, browser button), a full-page lock covers the game, including every icon; any click, tap or key press returns to full screen.
The full-screen and restart icons are hidden while a round is running. Each exit is counted and shown to the admin.
Browsers cannot block Esc/F11 outright; the lock makes leaving pointless and visible.

## Results + admin dashboard
Every team is saved the moment it begins and updated after every station, wrong try, full-screen exit, finish or time-out.
Open `admin.html` (or `index.html#admin`); nothing in the game links to it. It asks for `ADMIN_PASSCODE` in `config.js` (currently `bahkvt`).
Shows rank, status, stations, time, wrong tries, full-screen exits, split times, live updates, CSV export, delete/clear.

Where results go (`config.js`):
1. `FIREBASE_DB_URL` set: Firebase Realtime Database, so every team on any device lands in one dashboard (create a free Realtime Database, paste its URL, set rules to allow read/write on `spardha2k26/round3`; the passcode is only a front-door check, so lock the rules down or delete the data after the event).
2. Published as the Claude artifact: the artifact's shared database. Only the owner/Editors can read all results; participants must be signed in with Contributor access.
3. Otherwise: this browser only (single-PC demo).

## Route
`route.js` → `ACTIVE_ROUTE = 'photo'` (8×8 grid photo: START A1, Q1 B2, Q2 E1, Q3 G3, Q4 C4, Q5 F4, Q6 B6, Q7 E6, Q8 H5, Q9 C7, Q10 G7, EXTRACTION H8)
or `'setA'` (the R#C# list from the Set A table). Test the alternative with `index.html?route=setA`.
Directions are computed from the cells and validated at start-up; a bad route blocks the game with an error.

## Needs confirmation
- The photo and the Set A R#C# coordinates disagree; the photo is the default.
- Assumed: stage n = Qn on the photo; the team starts on START and is first sent to Q1.
- Directions state the net move (e.g. "three columns east and one row north"); no path order is given.
- Monitor-side question wording and wrong options were not supplied: a DRAFT was written in `questions.js`
  (correct answers/letters exactly as supplied). Review and edit; set `placeholder:true` on any item to show a PLACEHOLDER tag.
- Clues are in the page source (`questions.js`), though never on screen.

## Tests (in `tests/`)
`node tests/unit.js`; browser tests `tests/e2e.py [photo|setA]` and `tests/e2e_timer.py` need Python Playwright and a local server on port 8765.

## True kiosk mode (recommended for the event)
A web page can never fully block Esc/F11; browsers keep that for the user's safety. The game already locks Esc where the browser allows it
(Chrome/Edge on https or localhost, top-level page) and puts an unclosable lock over the game if full screen is left.
For a 100% lock, start the round PCs with `start-kiosk-windows.bat` (or `start-kiosk-mac.command`): Chrome opens in kiosk mode, where Esc and F11 do nothing.
Pass your hosted address as the first argument to open that instead of the local file.
