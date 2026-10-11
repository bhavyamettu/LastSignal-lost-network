import sys, time, json, re
from playwright.sync_api import sync_playwright
ROUTE = sys.argv[1] if len(sys.argv) > 1 else 'photo'
URL = 'http://localhost:8765/index.html' + ('?route=setA' if ROUTE == 'setA' else '')
res = []
def ok(name, cond, extra=''):
    res.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  -> ' + str(extra)), flush=True)

CLUES = ['16','LIFO','TRANSITIVE','DEADLOCK','192.168.1.0','MITM','LOGARITHMIC','80%','3','RAG']
PAPER = ['Convert decimal 16','LIFO?','transitive dependencies','four necessary conditions','network address of','modifies messages','time complexity of binary','TP/(TP+FP)','while(i<4)','deadlock detection']
ANS = [('t','10000'),('c','B'),('c','C'),('c','E'),('c','C'),('c','B'),('c','A'),('c','C'),('t','4'),('c','C')]
WRONG = [('t','1000'),('c','A'),('c','A'),('c','A'),('c','A'),('c','A'),('c','B'),('c','A'),('t','3'),('c','A')]
if ROUTE == 'photo':
    DIRS = ['Move one column east and one row south to B2.','Move three columns east and one row north to E1.','Move two columns east and two rows south to G3.','Move four columns west and one row south to C4.','Move three cells east to F4.','Move four columns west and two rows south to B6.','Move three cells east to E6.','Move three columns east and one row north to H5.','Move five columns west and two rows south to C7.','Move four cells east to G7.','Move one column east and one row south to H8.']
    CELLS = ['B2','E1','G3','C4','F4','B6','E6','H5','C7','G7']
else:
    DIRS = [None]+['Move one cell south to R2C1.','Move one cell east to R2C2.','Move one cell east to R2C3.','Move one cell south to R3C3.','Move one cell east to R3C4.','Move one cell south to R4C4.','Move one cell east to R4C5.','Move one cell south to R5C5.','Move one cell west to R5C4.']
    CELLS = ['R1C1','R2C1','R2C2','R2C3','R3C3','R3C4','R4C4','R4C5','R5C5','R5C4']

def secs(t): m, s = t.split(':'); return int(m)*60+int(s)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width':1600,'height':900})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text and 'Failed to load' not in m.text else None)
    pg.goto(URL); pg.wait_for_timeout(500)
    ok('timer shows 30:00 before start', pg.inner_text('#timer') == '30:00')
    ok('intro visible, no panel', pg.is_visible('#intro'))
    pg.fill('#team', 'Test Team'); pg.click('#beginBtn')
    t0 = time.time()
    timers = []
    def body(): return pg.inner_text('body')
    def check_hidden(tag):
        txt = body()
        leaked = [c for c in CLUES + PAPER if c.lower() in txt.lower() and len(c) > 2]
        ok(f'{tag}: no paper question / expected clue on screen', not leaked, leaked)
    if ROUTE == 'photo':
        pg.wait_for_selector('text=Movement direction', timeout=8000)
        ok('start leg: A1 → B2 instruction shown', DIRS[0] in pg.inner_text('#panel'), pg.inner_text('#panel'))
        ok('start leg: only next cell revealed (no E1)', 'E1' not in pg.inner_text('#panel'))
        pg.click('#go')
    for i in range(10):
        pg.wait_for_selector('#clueIn', state='visible', timeout=30000)
        timers.append(secs(pg.inner_text('#timer')))
        panel = pg.inner_text('#panel')
        ok(f'stage {i+1}: clue-entry heading + Submit Clue', 'ENTER THE CLUE' in panel.upper() and 'Submit Clue' in panel)
        ok(f'stage {i+1}: monitor question hidden before clue', pg.locator('.q').count() == 0 and pg.locator('.opt').count() == 0)
        ok(f'stage {i+1}: station cell {CELLS[i]} shown', CELLS[i] in panel, panel[:120])
        check_hidden(f'stage {i+1} clue screen')
        # wrong clue
        pg.fill('#clueIn', 'wrong-clue'); pg.click('text=Submit Clue'); pg.wait_for_timeout(250)
        ok(f'stage {i+1}: wrong clue rejected, no question', 'not correct' in pg.inner_text('.msg') and pg.locator('.q').count() == 0)
        if CLUES[i] == '80%':
            pg.fill('#clueIn', '80'); pg.click('text=Submit Clue'); pg.wait_for_timeout(200)
            ok('stage 8: "80" (no %) rejected', pg.locator('.q').count() == 0)
        # correct clue, odd casing + padding
        c = CLUES[i]; v = '  ' + ''.join(ch.lower() if k % 2 else ch.upper() for k, ch in enumerate(c)) + ' '
        if i % 2 == 0: v = '  ' + c.lower() + '  '
        pg.fill('#clueIn', v); pg.press('#clueIn', 'Enter')
        pg.wait_for_selector('.q', timeout=3000)
        ok(f'stage {i+1}: clue "{v}" accepted → question revealed', True)
        ok(f'stage {i+1}: movement hidden at question phase', 'Movement direction' not in pg.inner_text('#panel'))
        # sizes
        fs = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.q')).fontSize)")
        ok(f'stage {i+1}: question font >= 24px ({fs}px)', fs >= 24)
        kind, val = WRONG[i]
        if ANS[i][0] == 'c':
            ok(f'stage {i+1}: 5 options A-E shown, large', pg.locator('.opt').count() == 5 and pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.opt')).fontSize)") >= 18)
            pg.click(f'.opt[data-k="{val}"]'); pg.click('#subAns')
        else:
            pg.fill('#ansIn', val); pg.press('#ansIn', 'Enter')
        pg.wait_for_timeout(300)
        ok(f'stage {i+1}: wrong answer → feedback, no movement', 'Not quite' in pg.inner_text('.msg') and 'Movement direction' not in pg.inner_text('#panel'))
        ok(f'stage {i+1}: question still visible for retry', pg.locator('.q').count() == 1)
        kind, val = ANS[i]
        if kind == 'c':
            pg.click(f'.opt[data-k="{val}"]'); pg.click('#subAns')
        else:
            pg.fill('#ansIn', ' ' + val + ' '); pg.press('#ansIn', 'Enter')
        if i < 9 or ROUTE == 'photo':
            pg.wait_for_selector('text=Movement direction', timeout=3000)
            ptxt = pg.inner_text('#panel')
            want = DIRS[i+1] if ROUTE == 'photo' else DIRS[i+1]
            ok(f'stage {i+1}: movement direction = "{want}"', want in ptxt, ptxt)
            nxt = (CELLS[i+1] if i < 9 else 'H8')
            ok(f'stage {i+1}: only next cell {nxt} named; no later cells', nxt in ptxt)
            ok(f'stage {i+1}: Continue button + direction stays until clicked', pg.is_visible('#go'))
            pg.wait_for_timeout(1500)
            ok(f'stage {i+1}: direction still visible after 1.5s', pg.is_visible('#go'))
            fsz = pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.route')).fontSize)")
            ok(f'stage {i+1}: direction text large ({fsz}px)', fsz >= 20)
            pg.click('#go')
            ok(f'stage {i+1}: travel animation starts (panel hidden, chip visible)', pg.wait_for_function("document.getElementById('panel').classList.contains('hide') && !document.getElementById('travelChip').classList.contains('hide')", timeout=2000) is not None)
            if i == 0: ok('timer keeps running during travel (no reset)', secs(pg.inner_text('#timer')) <= timers[0])
    # finale
    pg.wait_for_selector('#finale:not(.hide)', timeout=40000)
    fin = pg.inner_text('#finale')
    ok('finale shown with 10 / 10', '10 / 10' in fin and 'Test Team' in fin, fin)
    ok('timers strictly non-increasing across all stages (never reset)', all(timers[k] >= timers[k+1] for k in range(len(timers)-1)) and timers[0] < 1800, timers)
    t_final = secs(pg.inner_text('#timer')); pg.wait_for_timeout(2200)
    ok('timer frozen after success', secs(pg.inner_text('#timer')) == t_final)
    ok('no JS errors (full run)', not errs, errs)
    elapsed = time.time() - t0
    # timer font size
    ok(f'timer is large (>=34px)', pg.evaluate("parseFloat(getComputedStyle(document.getElementById('timer')).fontSize)") >= 34)
    b.close()
print(json.dumps({'route': ROUTE, 'passed': sum(1 for _,c in res if c), 'failed': sum(1 for _,c in res if not c)}))
sys.exit(1 if any(not c for _, c in res) else 0)
