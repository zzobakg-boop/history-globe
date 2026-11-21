"""역사 지구본 기계 검증 — 폰 390·노트북 1280에서 처음 화면과 장면마다 찍고, 콘솔 오류·실패 요청·첫 화면 시간·메모리를 잰다.
사용: python3 tools/globe_verify.py <주소> <캡처 폴더> [--scenes all|none]"""
import asyncio, sys, time, os, json
from playwright.async_api import async_playwright
U, OUT = sys.argv[1], sys.argv[2]
SC = 'none' if '--scenes' in sys.argv and sys.argv[sys.argv.index('--scenes') + 1] == 'none' else 'all'
os.makedirs(OUT, exist_ok=True)
TIMEOUTS = []
BENIGN = ('GL Driver', 'calculateFogMatrix')   # 소프트웨어 GL 성능 메시지 · 지구본에서 안개 행렬 안 씀(무해)
async def idle(pg, ms=1500, tag=''):
    ok = await pg.evaluate("new Promise(r=>{ if(map.loaded() && !map.isMoving()) setTimeout(()=>r(true),200); map.once('idle',()=>r(true)); setTimeout(()=>r(false),15000); })")
    if not ok: TIMEOUTS.append(tag)
    await pg.wait_for_timeout(ms)
async def run():
    rep = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        for name, vp, mob in [('phone', {'width': 390, 'height': 800}, True), ('desk', {'width': 1280, 'height': 800}, False), ('land', {'width': 844, 'height': 390}, True)]:
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
            n = await pg.evaluate('SCENES.length') if (SC == 'all' and name != 'land') else (1 if name == 'land' else 0)
            for i in range(n):
                await pg.evaluate(f'go({i})'); await idle(pg, 2600)
                sid = await pg.evaluate(f'SCENES[{i}].id')
                await pg.screenshot(path=f'{OUT}/{name}_{i+1:02d}_{sid}.png')
            # 연도 칩 전부 눌러 오류가 없는지
            await pg.evaluate('go(-1)'); await idle(pg, 800)
            # 해마다 경계가 실제로 그려졌나 — 받은 나라 수 = 지도에 넣은 나라 수(이름으로 센다: 본국 도형은 본토·바다 건너 식민지로 쪼개 그린다, 11/21), 큰 연도 글자 = 고른 해(11/21 자료 검토: 빈 지도도 통과하던 구멍)
            for y in await pg.evaluate('UNIT.years'):
                await pg.evaluate(f'setYear({y})'); await pg.wait_for_timeout(700)
                got = await pg.evaluate("(async()=>{ const t = await topo('y'+S.year); await new Promise(r=>setTimeout(r,150)); return [new Set(t.features.filter(f=>f.geometry).map(f=>f.properties.n)).size, new Set(map.getSource('pol').serialize().data.features.map(f=>f.properties.n)).size, document.getElementById('year').textContent]; })()")
                if not got[0] or got[0] != got[1] or got[2] != str(y): errs.append(f'BORDERS {y}: 받음 {got[0]} · 그림 {got[1]} · 연도 글자 {got[2]}')
            # 연타 — 장면·연도를 섞어 빠르게
            await pg.evaluate("(async()=>{ for(let k=0;k<20;k++){ go(k%SCENES.length); setYear(UNIT.years[k%UNIT.years.length]); await new Promise(r=>setTimeout(r,60)); } go(-1); })()")
            await idle(pg, 800, name+':rapid')
            ystate = await pg.evaluate("[S.sc, S.year, document.getElementById('year').textContent]")
            if ystate[0] != -1 or str(ystate[1]) != ystate[2]: errs.append(f'STATE after rapid {ystate}')
            mem = await pg.evaluate("performance.memory ? Math.round(performance.memory.usedJSHeapSize/1e6) : -1")
            errs = [e for e in errs if not any(k in e for k in BENIGN)]
            fails = [f for f in fails if 'ERR_ABORTED' not in f]   # 지도를 움직이며 취소한 타일 요청은 실패가 아니다
            rep[name] = {'ready_s': ready, 'overflow_px': over, 'heapMB': mem, 'errors': errs[:12], 'n_errors': len(errs), 'failed': fails[:12]}
        # 주소 파라미터
        pg = await b.new_page(viewport={'width': 390, 'height': 800})
        perr = []; pg.on('pageerror', lambda e: perr.append(str(e)))
        base = U.split('?')[0]
        for qs, want in [('?s=constructor', 'home:1815'), ('?st=1.5&s=fr2', 'fr2'), ('?s=fr2&st=4', 'fr2:1812'), ('?y=1871', 'home:1871'), ('?s=it1&y=1862', 'it1:1862'), ('?s=zzz&y=9999', 'home:1815')]:
            await pg.goto(base + qs); await pg.wait_for_function('window.__ready', timeout=60000)
            got = await pg.evaluate("(S.sc<0 ? 'home' : SCENES[S.sc].id) + ':' + S.year")   # 주소창이 아니라 앱 상태를 본다
            ok = got == want if want.count(':') else got.startswith(want + ':')
            rep.setdefault('url', []).append(f"{'✓' if ok else '✗'} {qs} → {got}")
        rep['url_pageerrors'] = perr
        await b.close()
    rep['idle_timeouts'] = TIMEOUTS
    print(json.dumps(rep, ensure_ascii=False, indent=1))
    LIMIT = {'ready_s': 12, 'heapMB': 300}   # 소프트웨어 GL 기준 상한 — 넘으면 실패로 센다
    slow = [f'{k}.{m}={v[m]}' for k, v in rep.items() if isinstance(v, dict) for m, lim in LIMIT.items() if v.get(m, 0) > lim]
    if slow: print('상한 넘음:', slow)
    bad = any(v.get('n_errors') or v.get('failed') or v.get('overflow_px') for k, v in rep.items() if isinstance(v, dict)) or rep['url_pageerrors'] or any(x.startswith('✗') for x in rep['url']) or TIMEOUTS or slow
    sys.exit(1 if bad else 0)
asyncio.run(run())
