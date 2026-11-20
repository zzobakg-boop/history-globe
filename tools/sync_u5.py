"""흐름 지도 원본(scenes.js·overview.json·template.html의 COLORS·NAMES)을 지구본 units/u5.js로 옮긴다.
사용: python3 tools/sync_u5.py"""
import os, re
FM = os.path.expanduser('~/scripts/curriculum-designer/map-render/flowmap')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'units', 'u5.js')
s = open(FM + '/scenes.js', encoding='utf-8').read()
ov = open(FM + '/overview.json', encoding='utf-8').read().strip()
assert '/*OVERVIEW*/null' in s
s = s.replace('/*OVERVIEW*/null', ov, 1)
t = open(FM + '/template.html', encoding='utf-8').read()
extra = [l for l in t.splitlines() if re.match(r'\s*const (COLORS|NAMES) = ', l)]
assert len(extra) == 2, extra
hdr = '// 역사 지구본 Ⅴ단원 자료 — 흐름 지도 v3(scenes.js·overview.json·template의 COLORS·NAMES)을 그대로 옮김. 고칠 때는 원본을 고치고 tools/sync_u5.py로 다시 옮긴다.\n'
open(OUT, 'w', encoding='utf-8').write(hdr + s + '\n' + '\n'.join(x.strip() for x in extra) + '\n')
print('u5.js', os.path.getsize(OUT) // 1024, 'KB')
