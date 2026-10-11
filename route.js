/* ============================================================
   SPARDHA 2K26 · Round 3 · The Last Signal  —  ROUTE CONFIG
   The physical paper grid and the approved route live here only.
   Movement directions are COMPUTED from these cells and validated
   at start-up (see core.js). Nothing is hard-coded in the UI.

   cellStyle "letter" : column letter + row number   (A1 … H8)
   cellStyle "rc"     : row/column numbers            (R1C1 …)
   Rows count DOWN (row 1 = top, North), columns count RIGHT (East),
   exactly as on the grid photo (compass: N up, E right).

   stops[n-1] = the cell where Stage n is done (paper + monitor).
   start      = START cell      (null = Stage 1 is done on the start cell)
   extraction = EXTRACTION cell (null = not established → finish
                                 screen right after Stage 10)
   ============================================================ */

window.ACTIVE_ROUTE = 'photo';          // 'photo' | 'setA'   (or open index.html?route=setA)

window.ROUTE_PROFILES = {

  /* ---- DEFAULT: read directly from the uploaded grid photo (8 × 8) ---- */
  photo: {
    id: 'photo',
    label: 'Grid photo — 8×8, Q1–Q10',
    cellStyle: 'letter', rows: 8, cols: 8,
    start: 'A1',
    extraction: 'H8',
    //        Q1    Q2    Q3    Q4    Q5    Q6    Q7    Q8    Q9    Q10
    stops: ['B2', 'E1', 'G3', 'C4', 'F4', 'B6', 'E6', 'H5', 'C7', 'G7']
  },

  /* ---- ALTERNATIVE: the R#C# coordinates in the Set A table (5 × 5) ----
     These do NOT agree with the grid photo (e.g. the photo has no
     question on R2C1/A2). Kept so the organiser can switch with one
     word if the Set A table turns out to be the correct one.
     The photo does not give a START / EXTRACTION for this layout, so
     none is invented: Stage 1 is done on R1C1 and the game finishes
     right after Stage 10. */
  setA: {
    id: 'setA',
    label: 'Set A table — R#C# coordinates (5×5)',
    cellStyle: 'rc', rows: 5, cols: 5,
    start: null,
    extraction: null,
    stops: ['R1C1', 'R2C1', 'R2C2', 'R2C3', 'R3C3', 'R3C4', 'R4C4', 'R4C5', 'R5C5', 'R5C4']
  }
};
