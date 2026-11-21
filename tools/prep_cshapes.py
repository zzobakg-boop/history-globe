"""CShapes 2.0 준비 — 정밀 경계(GeoJSON)에 지위·지배국 열(CRAN 패키지판에만 있음)을 붙이고, 이름 검토용 단위 표와 OHM 이름 목록을 만든다.
한 번만 돌리면 된다. 이어서 tools/build_borders.py 1900 1914 → 검토 둘(cs_A·cs_B) → tools/names/merge_cs.py.

받을 것(11/21 받음, ~/data/maps/cshapes/):
  CShapes-2.0.geojson  https://icr.ethz.ch/data/cshapes/  (CC BY-NC-SA 4.0, 26MB) — 지위·지배국 열이 없다
  cshapes_cran.tar.gz  https://cran.r-project.org/package=cshapes (2.0) — inst/extdata/cshapes_2_gw.topojson.xz에 status·owner·b_def가 있다(경계는 거칠다)
실행: ~/.venvs/maps/bin/python tools/prep_cshapes.py [--ohm]
"""
import geopandas as gpd, pandas as pd, json, csv, lzma, os, sys, subprocess, warnings
warnings.filterwarnings('ignore')
D = os.path.expanduser('~/data/maps/cshapes')
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 1) 지위·지배국 붙이기 — 두 판은 같은 710행이고 gwcode + 시작일로 하나씩 맞는다
full = gpd.read_file(f'{D}/CShapes-2.0.geojson')
xz = f'{D}/cran/cshapes/inst/extdata/cshapes_2_gw.topojson.xz'
if not os.path.exists(xz):
    os.makedirs(f'{D}/cran', exist_ok=True)
    subprocess.run(['tar', '-xzf', f'{D}/cshapes_cran.tar.gz', '-C', f'{D}/cran'], check=True)
t = json.loads(lzma.open(xz).read())
A = pd.DataFrame([g['properties'] for g in list(t['objects'].values())[0]['geometries']])
A['k'] = A.gwcode.astype(str) + '_' + A.start
full['k'] = full.gwcode.astype(str) + '_' + full.gwsyear.astype(str) + '-' + full.gwsmonth.astype(str).str.zfill(2) + '-' + full.gwsday.astype(str).str.zfill(2)
m = full.merge(A[['k', 'status', 'owner', 'b_def']], on='k', how='left')
assert m.status.notna().all() and len(m) == len(full) == len(A), f'붙지 않은 행 {m.status.isna().sum()}'
m.drop(columns=['cap_geom']).to_file(f'{D}/cshapes_full_attrs.gpkg', driver='GPKG')
print('지위·지배국 붙음', len(m))

# 2) 이름 검토용 단위 표(해마다 7월 1일)
gw = {r.gwcode: r.cntry_name for r in m.itertuples()}
rows = []
for y in (1900, 1914):
    d = y * 10000 + 701
    s = m[(m.gwsyear * 10000 + m.gwsmonth * 100 + m.gwsday <= d) & (m.gweyear * 10000 + m.gwemonth * 100 + m.gweday > d)]
    rp = s.to_crs('+proj=eqearth').representative_point().to_crs(4326)
    for r, p in zip(s.itertuples(), rp):
        own = r.owner if r.status != 'independent' else ''
        on = gw.get(int(own), own) if str(own).isdigit() else own
        rows.append([y, r.gwcode, r.cntry_name, r.status, on, r.capname, f'{p.x:.1f},{p.y:.1f}', int(r.area)])
w = csv.writer(open(f'{HERE}/tools/names/cs_units.tsv', 'w'), delimiter='\t')
w.writerow(['year', 'gwcode', 'cshapes_name', 'status', 'owner', 'capital', 'lonlat', 'area_km2']); w.writerows(rows)
print('단위 표', len(rows))

# 3) (선택) OpenHistoricalMap(CC0) 나라 경계 이름 — 그 시절 이름·한국어 이름 후보(참고용, 틀릴 수 있다)
if '--ohm' in sys.argv:
    o = os.path.expanduser('~/data/maps/ohm'); os.makedirs(o, exist_ok=True)
    q = '[out:json][timeout:170];relation["boundary"="administrative"]["admin_level"="2"];out tags;'
    subprocess.run(['curl', '-s', '--max-time', '180', 'https://overpass-api.openhistoricalmap.org/api/interpreter', '--data-urlencode', 'data=' + q, '-o', f'{o}/ohm_admin2_tags.json'], check=True)
    def yr(x):
        x = (x or '').strip(); neg = x.startswith('-'); x = x.lstrip('-')
        try: v = int(x[:4])
        except ValueError: return None
        return -v if neg else v
    out = []
    for e in json.load(open(f'{o}/ohm_admin2_tags.json'))['elements']:
        tg = e['tags']; a, b = yr(tg.get('start_date')), yr(tg.get('end_date'))
        if a is not None and a <= 1914 and (b is None or b >= 1900):
            out.append([e['id'], tg.get('name', ''), tg.get('name:ko', ''), tg.get('name:en', ''), tg.get('start_date', ''), tg.get('end_date', '')])
    w = csv.writer(open(f'{o}/ohm_1900_1914.tsv', 'w'), delimiter='\t')
    w.writerow(['ohm_relation', 'name', 'name_ko', 'name_en', 'start', 'end']); w.writerows(sorted(out, key=lambda r: r[1]))
    print('OHM 이름', len(out))
