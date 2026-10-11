# Full-screen lock + result storage + admin dashboard.  Needs: python -m http.server 8767 (in the game folder)
import time
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8771/'
res = []
def ok(n, c, x=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  -> ' + str(x)), flush=True)
CLUES = ['1101','QUEUE','INSERT','ROUTER','TRANSPORT','PRIMARY KEY','ROUND ROBIN','DIJKSTRA','DHCP','BELLMAN-FORD']
ANS = [('t', '1001'), ('t', 'STACK'), ('t', 'ORDER BY'), ('t', 'O(log n)'), ('t', 'ARP'), ('t', 'ATOMICITY'), ('t', 'HOLD AND WAIT'), ('t', '32'), ('t', 'MERGE SORT'), ('t', 'TO ENFORCE A RELATIONSHIP TO A KEY IN ANOTHER TABLE')]
inFS = lambda pg: pg.evaluate("!!document.fullscreenElement")
vis = lambda pg, s: pg.is_visible(s)

with sync_playwright() as p:
    b = p.chromium.launch(args=['--enable-features=Fullscreen'])
    ctx = b.new_context(viewport={'width':1400,'height':800})
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + 'index.html'); pg.wait_for_timeout(400)
    ok('brand title is large', pg.evaluate("parseFloat(getComputedStyle(document.querySelector('.brand b')).fontSize)") >= 40)
    ok('admin hidden for participants', not vis(pg, '#adminView') and pg.locator('a[href*=admin]').count() == 0)
    pg.fill('#team', 'Alpha'); pg.click('#beginBtn'); pg.wait_for_timeout(3000)
    ok('game start → full screen', inFS(pg))
    ok('lock hidden while in full screen', not vis(pg, '#fsLock'))
    ok('fs toggle + restart hidden during game', not vis(pg, '#fs') and not vis(pg, '#restart'))
    # leave full screen (as Esc would) → lock covers the game
    pg.evaluate("document.exitFullscreen()"); pg.wait_for_timeout(500)
    ok('after exit: lock overlay shown', vis(pg, '#fsLock') and not inFS(pg))
    ok('lock covers the icons', pg.evaluate("document.elementFromPoint(innerWidth-30, 40).closest('#fsLock') !== null"))
    # click where an icon sits → full screen returns, icon not triggered
    pg.mouse.click(1400-40, 40); pg.wait_for_timeout(700)
    ok('click on icon area → back to full screen', inFS(pg) and not vis(pg, '#fsLock'))
    for i in range(3):
        pg.evaluate("document.exitFullscreen()"); pg.wait_for_timeout(400)
        pg.keyboard.press('a'); pg.wait_for_timeout(600)
        ok(f'exit #{i+1} → key press restores full screen', inFS(pg))
    st = pg.evaluate("window.__lastSignal.state"); ok('exits counted in state', st['fsExits'] == 4, st['fsExits'])
    pg.click('#mute'); pg.wait_for_timeout(300)
    ok('mute icon press keeps full screen', inFS(pg))
    # drive the game
    pg.wait_for_selector('text=Movement direction', timeout=8000); pg.click('#go')
    adm = ctx.new_page(); adm.goto(BASE + 'admin.html'); adm.wait_for_timeout(500)
    ok('admin page asks for passcode', vis(adm, '#adPass') and not vis(adm, '#adBody'))
    adm.fill('#adPass', 'wrong'); adm.press('#adPass', 'Enter'); adm.wait_for_timeout(200)
    ok('wrong passcode refused', 'Wrong' in adm.inner_text('#adMsg') and not vis(adm, '#adBody'))
    adm.fill('#adPass', 'bahkvt'); adm.press('#adPass', 'Enter'); adm.wait_for_selector('#adBody tr.ad-row', timeout=5000)
    ok('admin sees live team "Alpha" as Playing', 'Alpha' in adm.inner_text('#adBody') and 'Playing' in adm.inner_text('#adBody'))
    pg.bring_to_front()
    for i in range(10):
        pg.wait_for_selector('#clueIn', state='visible', timeout=30000)
        pg.fill('#clueIn', CLUES[i]); pg.press('#clueIn', 'Enter'); pg.wait_for_selector('.q', timeout=3000)
        if i == 1:   # one wrong try
            pg.fill('#ansIn','zzz'); pg.press('#ansIn','Enter'); pg.wait_for_timeout(250)
            ok('wrong typed answer rejected', 'Not quite' in pg.inner_text('.msg') and pg.locator('.q').count()==1)
        k, v = ANS[i]
        if k == 'c': pg.click(f'.opt[data-k="{v}"]'); pg.click('#subAns')
        else: pg.fill('#ansIn', v); pg.press('#ansIn', 'Enter')
        if i < 9:
            pg.wait_for_selector('#go', timeout=3000)
            ok(f'stage {i+1} answered → still full screen', inFS(pg))
            if i == 4:
                adm.bring_to_front(); adm.wait_for_timeout(2500)
                ok('admin shows 5/10 live', '5 / 10' in adm.inner_text('#adBody'), adm.inner_text('#adBody'))
                pg.bring_to_front()
            pg.click('#go')
        else:
            pg.wait_for_selector('#go', timeout=3000); ok('stage 10 → still full screen', inFS(pg)); pg.click('#go')
    pg.wait_for_selector('#finale:not(.hide)', timeout=40000); pg.wait_for_timeout(600)
    ok('finish → full screen released + no lock', not inFS(pg) and not vis(pg, '#fsLock'))
    adm.bring_to_front(); adm.wait_for_timeout(2500)
    txt = adm.inner_text('#adBody')
    ok('admin: Alpha Completed 10 / 10', 'Completed' in txt and '10 / 10' in txt, txt)
    ok('admin: wrong attempts + fs exits recorded', '4' in txt and '1' in txt)
    adm.click('#adBody tr.ad-row'); adm.wait_for_timeout(200)
    ok('admin: split times expand (10 stations)', adm.locator('.ad-splits li').count() == 10, adm.locator('.ad-splits li').count())
    with adm.expect_download(timeout=4000) as d: adm.click('#adCsv')
    ok('CSV export works', d.value.suggested_filename.endswith('.csv'))
    # expiry record
    pg2 = ctx.new_page(); pg2.goto(BASE + 'index.html'); pg2.wait_for_timeout(300)
    pg2.evaluate("localStorage.clear && 0"); 
    pg2.fill('#team', 'Beta'); pg2.click('#beginBtn'); pg2.wait_for_timeout(800)
    pg2.evaluate("(()=>{const s=JSON.parse(localStorage.getItem('spardha-round3-v2'));})()")
    pg2.evaluate("window.__lastSignal.state.start -= 30*60*1000"); pg2.wait_for_selector('#expired:not(.hide)', timeout=5000); pg2.wait_for_timeout(500)
    ok('expiry → full screen released', not inFS(pg2) and not vis(pg2, '#fsLock'))
    adm.bring_to_front(); adm.wait_for_timeout(2500)
    ok('admin: Beta Time expired', 'Time expired' in adm.inner_text('#adBody'), adm.inner_text('#adBody'))
    # clear all
    adm.click('#adClear'); adm.click('#adClear'); adm.wait_for_timeout(500)
    ok('clear all empties table', 'No results yet' in adm.inner_text('#adBody'))
    # admin overlay in game page
    pg3 = ctx.new_page(); pg3.goto(BASE + 'index.html#admin'); pg3.wait_for_timeout(800)
    ok('index.html#admin shows gate/dashboard', vis(pg3, '#adminView'))
    # fresh context (another browser profile) has no admin access
    c2 = b.new_context(); q = c2.new_page(); q.goto(BASE + 'admin.html'); q.wait_for_timeout(400)
    ok('new browser: passcode required', vis(q, '#adPass') and not vis(q, '#adBody'))
    ok('no JS errors', not errs, errs)
    b.close()
print('\n%d/%d passed' % (sum(res), len(res)))
