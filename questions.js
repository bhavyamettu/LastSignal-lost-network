/* ============================================================
   SPARDHA 2K26 · Round 3 · The Lost Network  —  SET A
   QUESTIONS, CLUES AND ANSWERS live in this file only.

   paper    – what the GRID-SIDE participant solves on paper.
              Kept here for validation only. NEVER shown on screen.
       question – paper question (reference only)
       clue     – the clue the grid-side participant calls out
                  (case-insensitive, trimmed; punctuation such as
                   "80%" or "192.168.1.0" must match exactly)

   monitor  – what the MONITOR-SIDE participant sees after the
              correct clue is entered.
       type     – "choice" (options A–E; not used in this build) or "text"
       question – question wording shown on screen
       options  – (choice) [{ key:"A", text:"..." }, ...]
       correct  – (choice) the correct option key, e.g. "B"
                  (text)   list of accepted answers
       placeholder – true while the wording is NOT yet official.
                  A visible "PLACEHOLDER" tag is shown on screen until
                  you set this to false.

   NOTE: every monitor-side question is a typed answer (no options). Case-insensitive and trimmed;
   extra accepted spellings are listed in each `correct` array. Wording of the questions was supplied by the organiser.
   ============================================================ */

(function () {
  const O = (...t) => t.map((text, i) => ({ key: 'ABCDE'[i], text }));
  const choice = (question, options, correct) => ({ type: 'choice', question, options: O(...options), correct, placeholder: false });

  window.STAGES = [
    { stage: 1, paper: { question: 'Convert decimal 13 to binary.', clue: '1101' },
      monitor: { type: 'text', question: 'What is the binary representation of decimal 9?', correct: ['1001'], placeholder: false } },
    { stage: 2, paper: { question: 'Which data structure follows FIFO (First In, First Out)?', clue: 'QUEUE' },
      monitor: { type: 'text', question: 'Which data structure is commonly used to implement a stack of function calls?', correct: ['STACK'], placeholder: false } },
    { stage: 3, paper: { question: 'Which SQL command adds a new row to a table?', clue: 'INSERT' },
      monitor: { type: 'text', question: 'Which SQL clause sorts query results?', correct: ['ORDER BY'], placeholder: false } },
    { stage: 4, paper: { question: 'Which network device forwards packets between different IP networks?', clue: 'ROUTER' },
      monitor: { type: 'text', question: 'What is the worst-case time complexity of binary search on a sorted array?', correct: ['O(log n)', 'O(logn)', 'O(log(n))'], placeholder: false } },
    { stage: 5, paper: { question: 'Which OSI layer is responsible for end-to-end transport and reliability?', clue: 'TRANSPORT' },
      monitor: { type: 'text', question: 'Which protocol maps an IPv4 address to a MAC address on a local network?', correct: ['ARP'], placeholder: false } },
    { stage: 6, paper: { question: 'Which database key uniquely identifies each row and cannot contain NULL?', clue: 'PRIMARY KEY' },
      monitor: { type: 'text', question: 'Which ACID property means a transaction is completed entirely or not at all?', correct: ['ATOMICITY'], placeholder: false } },
    { stage: 7, paper: { question: 'Which CPU scheduling algorithm assigns each process a fixed time slice?', clue: 'ROUND ROBIN' },
      monitor: { type: 'text', question: 'Which deadlock condition means a resource can be held by one process while another waits for it?', correct: ['HOLD AND WAIT'], placeholder: false } },
    { stage: 8, paper: { question: 'Which graph algorithm finds shortest paths from one source when all edge weights are nonnegative?', clue: 'DIJKSTRA' },
      monitor: { type: 'text', question: 'How many total addresses are in an IPv4 /27 subnet?', correct: ['32'], placeholder: false } },
    { stage: 9, paper: { question: 'Which protocol dynamically assigns IP addresses to devices on a network?', clue: 'DHCP' },
      monitor: { type: 'text', question: 'Which divide-and-conquer sorting algorithm guarantees O(n log n) worst-case time?', correct: ['MERGE SORT'], placeholder: false } },
    { stage: 10, paper: { question: 'Which algorithm can detect a reachable negative-weight cycle while computing single-source shortest paths?', clue: 'BELLMAN-FORD' },
      monitor: { type: 'text', question: 'What is the purpose of a foreign key in a relational database?', correct: ['TO ENFORCE A RELATIONSHIP TO A KEY IN ANOTHER TABLE', 'ENFORCE A RELATIONSHIP TO A KEY IN ANOTHER TABLE', 'TO ENFORCE A RELATIONSHIP'], placeholder: false } }
  ];
})();
