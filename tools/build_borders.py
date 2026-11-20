"""지구본 해별 경계 — Cliopatria v0.2.1(CC BY 4.0) 나라를 Natural Earth 10m 땅(PD) 해안선으로 잘라 TopoJSON으로 만든다.
흐름 지도(build_data.py)는 평면 그림이라 18%까지 줄였지만, 지구본은 확대하므로 원래 경계를 거의 그대로 두고 해안선만 촘촘한 땅으로 맞춘다.
실행: ~/.venvs/maps/bin/python tools/build_borders.py [해 ...]  → data/u5/y<해>.json · n<해>.json · land.json
"""
import geopandas as gpd, subprocess, os, sys, json
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, 'data', 'u5')
SRC = os.path.expanduser('~/data/maps/cliopatria/cliopatria_polities_only_v021.geojson')
LAND = os.path.expanduser('~/data/maps/ne10/ne_10m_land')
YEARS = [int(a) for a in sys.argv[1:]] or [1688, 1763, 1783, 1789, 1812, 1815, 1830, 1850, 1862, 1871, 1880, 1900, 1914]
TMP = '/tmp/hg_borders'
os.makedirs(TMP, exist_ok=True)

def ms(src, out, *args):
    subprocess.run(['mapshaper', src, *args, '-o', 'format=topojson', 'quantization=100000', out], check=True, capture_output=True)

# 땅: 10m을 한 번 줄여(6%) 바탕과 자르는 칼로 같이 쓴다 — 바탕 해안선과 나라 해안선이 딱 맞는다
shp = [f for f in os.listdir(LAND) if f.endswith('.shp')][0]
# 섬 거르기는 5㎢까지만 — 300㎢로 거르면 바레인·네덜란드령 안틸레스·마긴다나오가 땅째 사라진다(11/21 자료 검토)
ms(os.path.join(LAND, shp), f'{OUT}/land.json', '-simplify', '6%', 'keep-shapes', '-clean', '-filter-slivers', 'min-area=5km2')
subprocess.run(['mapshaper', f'{OUT}/land.json', '-o', 'format=geojson', f'{TMP}/land.geojson'], check=True, capture_output=True)
land_geom = unary_union(gpd.read_file(f'{TMP}/land.geojson').geometry.buffer(0))

g = gpd.read_file(SRC)
for y in YEARS:
    s = g[(g.FromYear <= y) & (g.ToYear >= y)][['Name', 'geometry']].rename(columns={'Name': 'n'}).copy()
    s['geometry'] = s.geometry.buffer(0).intersection(land_geom)
    # 땅 칼에 안 걸리는 작은 섬나라는 원래 경계를 그대로 둔다(없어지는 것보다 해안선이 거친 편이 낫다)
    raw = g[(g.FromYear <= y) & (g.ToYear >= y)].set_index('Name').geometry.buffer(0)
    s['geometry'] = [geom if not geom.is_empty else raw[n] for n, geom in zip(s.n, s.geometry)]
    s.to_file(f'{TMP}/y{y}.geojson', driver='GeoJSON')
    # 원자료가 거칠어(1815년 나라 145개에 꼭짓점 2만 7천) 더 줄이지 않는다 — 땅으로 자른 해안선만 그대로
    ms(f'{TMP}/y{y}.geojson', f'{OUT}/y{y}.json')   # -clean은 겹친 나라(식민지 괄호 항목)를 지워 버려 쓰지 않는다
    t = json.load(open(f'{OUT}/y{y}.json')); geo = list(t['objects'].values())[0]['geometries']
    empty = sorted(x.get('properties', {}).get('n', '?') for x in geo if not x.get('type'))
    assert len(geo) == len(s) and not empty, f'{y}년: 나라 {len(s)}개 중 {len(geo)}개만 나옴, 빈 도형 {empty}'
    # 자료 없음 = 땅 − 나라들 (넓이 1.5 제곱도 넘는 덩어리만, 남극은 뺀다)
    nd = land_geom.difference(unary_union(s.geometry.buffer(0)).buffer(0.05))
    parts = [p for p in getattr(nd, 'geoms', [nd]) if p.area > 1.5 and p.centroid.y > -58]
    gpd.GeoDataFrame(geometry=parts, crs=4326).to_file(f'{TMP}/n{y}.geojson', driver='GeoJSON')
    ms(f'{TMP}/n{y}.geojson', f'{OUT}/n{y}.json', '-simplify', '30%', 'keep-shapes')
    print(y, len(s), '나라', os.path.getsize(f'{OUT}/y{y}.json') // 1024, 'KB')
print('land', os.path.getsize(f'{OUT}/land.json') // 1024, 'KB')
