"""역사 지구본 기계 검증 — 폰 390·노트북 1280에서 처음 화면과 장면마다 찍고, 콘솔 오류·실패 요청·첫 화면 시간·메모리를 잰다.
사용: python3 tools/globe_verify.py <주소> <캡처 폴더> [--scenes all|none]"""
import asyncio, sys, time, os, json
from playwright.async_api import async_playwright
U, OUT = sys.argv[1], sys.argv[2]
SC = 'none' if '--scenes' in sys.argv and sys.argv[sys.argv.index('--scenes') + 1] == 'none' else 'all'
os.makedirs(OUT, exist_ok=True)
async def idle(pg, ms=1500):
    await pg.evaluate("new Promise(r=>{ if(map.loaded() && !map.isMoving()) setTimeout(r,200); map.once('idle',()=>r()); setTimeout(r,12000); })")
    await pg.wait_for_timeout(ms)
async def run():
    rep = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        for name, vp, mob in [('phone', {'width': 390, 'height': 800}, True), ('desk', {'width': 1280, 'height': 800}, False)]:
            pg = await b.new_page(viewport=vp, device_scale_factor=2 if mob else 1, is_mobile=mob, has_touch=mob)
            errs, fails = [], []
            pg.on('console', lambda m: errs.append(m.text) if m.type in ('error', 'warning') else None)
            pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
            pg.on('requestfailed', lambda r: fails.append((r.failure or '') + ' ' + r.url.split('/')[-1]))
            pg.on('response', lambda r: fails.append(f'{r.status} {r.url}') if r.status >= 400 else None)
            t = time.time(); await pg.goto(U); await pg.wait_for_function('window.__ready', timeout=60000); await idle(pg)
            ready = round(time.time() - t, 1)
            await pg.screenshot(path=f'{OUT}/{name}_00_home.png')
            over = await pg.evaluate("document.documentElement.scrollWidth - innerWidth")
            n = await pg.evaluate('SCENES.length') if SC == 'all' else 0
            for i in range(n):
                await pg.evaluate(f'go({i})'); await idle(pg, 2600)
                sid = await pg.evaluate(f'SCENES[{i}].id')
                await pg.screenshot(path=f'{OUT}/{name}_{i+1:02d}_{sid}.png')
            # 연도 칩 전부 눌러 오류가 없는지
            await pg.evaluate('go(-1)'); await idle(pg, 800)
            for y in await pg.evaluate('UNIT.years'):
                await pg.evaluate(f'setYear({y})'); await pg.wait_for_timeout(400)
            mem = await pg.evaluate("performance.memory ? Math.round(performance.memory.usedJSHeapSize/1e6) : -1")
            rep[name] = {'ready_s': ready, 'overflow_px': over, 'heapMB': mem, 'errors': errs[:12], 'n_errors': len(errs), 'failed': fails[:12]}
        await b.close()
    print(json.dumps(rep, ensure_ascii=False, indent=1))
asyncio.run(run())
