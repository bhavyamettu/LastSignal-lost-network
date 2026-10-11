import sys, json, time
from playwright.sync_api import sync_playwright
URL = 'http://localhost:8765/index.html'
res = []
def ok(n, c, x=''):
    res.append(c); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  -> ' + str(x)), flush=True)
def secs(t): m, s = t.split(':'); return int(m)*60+int(s)

with sync_playwright() as p:
    b = p.chromium.launch()
    # 1) tab sleep: skew Date.now by whole minutes while the page keeps running (simulates a throttled/asleep tab)
    pg = b.new_page(viewport={'width':1600,'height':900}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("window.__skew=0; const _n=Date.now.bind(Date); Date.now=()=>_n()+window.__skew;")
    pg.goto(URL); pg.wait_for_timeout(300)
    pg.fill('#team', 'Clock Team'); pg.click('#beginBtn'); pg.wait_for_timeout(1200)
    a = secs(pg.inner_text('#timer')); ok('timer starts at ~30:00 (%d s)' % a, 1795 <= a <= 1800)
    pg.evaluate("window.__skew += 10*60*1000"); pg.wait_for_timeout(600)
    a2 = secs(pg.inner_text('#timer')); ok('after 10 min asleep timer = ~20:00 (%d s)' % a2, 1195 <= a2 <= 1200)
    pg.wait_for_timeout(5000); a3 = secs(pg.inner_text('#timer'))
    ok('one interval only: 5 real seconds → ~5s drop (got %d)' % (a2 - a3), 4 <= a2 - a3 <= 6)
    pg.evaluate("window.__skew += 15*60*1000"); pg.wait_for_timeout(600)
    ok('<5 min low state styled', 'low' in pg.get_attribute('#timerBox', 'class'), pg.get_attribute('#timerBox','class'))
    pg.evaluate("window.__skew += (4*60+10)*1000"); pg.wait_for_timeout(600)
    ok('<1 min critical state styled', 'crit' in pg.get_attribute('#timerBox', 'class'), pg.get_attribute('#timerBox','class'))
    pg.evaluate("window.__skew += 2*60*1000"); pg.wait_for_timeout(900)
    pg.wait_for_selector('#expired', state='visible', timeout=4000)
    ok('time-expired overlay shown', pg.is_visible('#expired') and 'TIME EXPIRED' in pg.inner_text('#expired').upper())
    ok('timer shows 00:00 and over-state', pg.inner_text('#timer') == '00:00' and 'over' in pg.get_attribute('#timerBox','class'))
    st = pg.evaluate("window.__lastSignal.state"); ok('state.expired = true', st['expired'] is True)
    ok('answers not accepted: panel hidden', 'hide' in pg.get_attribute('#panel','class'))
    pg.evaluate("(()=>{const f=document.querySelector('#panel form'); if(f){f.querySelector('input').value='16'; f.dispatchEvent(new Event('submit',{cancelable:true}));}})()")
    pg.wait_for_timeout(500)
    ok('forced submit after expiry does not reveal a question', pg.locator('.q').count() == 0)
    # reload keeps expired state
    pg.evaluate('window.__skew=0'); pg.reload(); pg.wait_for_timeout(500)
    ok('after reload timer shows 30:00 pre-start but resume offers expired result', 'Time expired' in pg.inner_text('#resumeBtn'), pg.inner_text('#resumeBtn'))
    pg.click('#resumeBtn'); pg.wait_for_selector('#expired', state='visible', timeout=4000)
    ok('resume → expired overlay, timer 00:00', pg.is_visible('#expired') and pg.inner_text('#timer') == '00:00')
    # restart demo
    pg.click('#xRestart'); pg.wait_for_timeout(800)
    ok('Restart Demo → 30:00 + intro + no resume', pg.inner_text('#timer') == '30:00' and pg.is_visible('#intro') and not pg.is_visible('#resumeBtn'))
    ok('no JS errors (timer test)', not errs, errs)

    # 2) expiry with real time, mid-question, plus HUD restart button
    pg2 = b.new_page(viewport={'width':1600,'height':900}); e2=[]
    pg2.on('pageerror', lambda e: e2.append(str(e)))
    pg2.goto(URL); pg2.wait_for_timeout(300)
    pg2.evaluate("""localStorage.setItem('spardha-round3-v2', JSON.stringify({team:'Edge',profile:'photo',idx:2,step:'question',start:Date.now()-(30*60*1000-14000),end:null,expired:false,hints:0,wrong:0}))""")
    pg2.reload(); pg2.wait_for_timeout(400)
    ok('resume button visible with station', 'Station 2' in pg2.inner_text('#resumeBtn'), pg2.inner_text('#resumeBtn'))
    pg2.click('#resumeBtn'); pg2.wait_for_selector('.q', timeout=5000)
    ok('question restored on resume (state persisted)', pg2.locator('.opt').count() == 5)
    pg2.click('.opt[data-k="B"]')
    pg2.wait_for_selector('#expired', state='visible', timeout=25000)
    ok('real-time expiry while a question is open → overlay', True)
    pg2.wait_for_timeout(300)
    ok('stages cleared stat sane', pg2.inner_text('#xStages').startswith('1 /'), pg2.inner_text('#xStages'))
    ok('no JS errors (expiry test)', not e2, e2)

    # 3) HUD restart button (double-click confirm)
    pg3 = b.new_context(viewport={'width':1600,'height':900}).new_page()
    pg3.goto(URL); pg3.fill('#team','R'); pg3.click('#beginBtn'); pg3.wait_for_timeout(1500)
    ok('↺ Restart is hidden while a game is running (keeps full screen locked)', not pg3.is_visible('#restart'))

    # 4) layout: desktop and phone screenshots, no overflow of timer/panel
    for name, vp in [('desktop', {'width':1600,'height':900}), ('laptop', {'width':1280,'height':720}), ('phone', {'width':390,'height':800})]:
        pg4 = b.new_page(viewport=vp)
        pg4.goto(URL); pg4.fill('#team','Layout'); pg4.click('#beginBtn')
        if name != 'phone': pg4.wait_for_selector('#go', timeout=8000)
        else: pg4.wait_for_selector('#go', timeout=8000)
        pg4.wait_for_timeout(2800)
        pg4.screenshot(path=f'/home/claude/tests/shot_{name}_direction.png')
        box = pg4.evaluate("(()=>{const r=document.getElementById('panel').getBoundingClientRect();return [r.left,r.right,r.top,r.bottom,innerWidth,innerHeight]})()")
        ok(f'{name}: panel inside viewport', box[0] >= 0 and box[1] <= box[4] + 1 and box[2] >= 0 and box[3] <= box[5] + 1, box)
        pg4.close()
    b.close()
print(json.dumps({'passed': sum(res), 'failed': len(res) - sum(res)}))
sys.exit(0 if all(res) else 1)
