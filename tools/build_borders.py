"""지구본 해별 경계 — Cliopatria v0.2.1(CC BY 4.0) 나라를 Natural Earth 10m 땅(PD) 해안선으로 잘라 TopoJSON으로 만든다.
흐름 지도(build_data.py)는 평면 그림이라 18%까지 줄였지만, 지구본은 확대하므로 원래 경계를 거의 그대로 두고 해안선만 촘촘한 땅으로 맞춘다.
실행: ~/.venvs/maps/bin/python tools/build_borders.py [해 ...]  → data/u5/y<해>.json · n<해>.json · land.json
"""
import geopandas as gpd, pandas as pd, subprocess, os, sys, json
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(HERE, 'data', 'u5')
SRC = os.path.expanduser('~/data/maps/cliopatria/cliopatria_polities_only_v021.geojson')
LAND = os.path.expanduser('~/data/maps/ne10/ne_10m_land')
YEARS = [int(a) for a in sys.argv[1:]] or [1688, 1763, 1783, 1789, 1812, 1815, 1830, 1850, 1862, 1871, 1880, 1900, 1914, 2026]
# 1886년부터는 CShapes 2.0(ETH, CC BY-NC-SA 4.0) — 식민지가 하나하나 따로 그려져 있다. Cliopatria는 «영국령 아프리카»를 이집트~남아프리카 한 덩어리로 묶어
# 안쪽 경계가 없었다(11/21 천대현). 지위·지배국 열은 CRAN cshapes 패키지판에만 있어 정밀 경계에 붙여 둔 것(cshapes_full_attrs.gpkg)을 쓴다.
# CShapes가 안 덮는 땅(아라비아 안쪽 등)만 Cliopatria로 채운다.
CS = os.path.expanduser('~/data/maps/cshapes/cshapes_full_attrs.gpkg')
CS_FROM = 1886
DOMINION_GB = {20, 560, 900, 920}
GW2KEY = {200: 'GB', 220: 'FR', 230: 'ES', 235: 'PT', 210: 'NL', 211: 'BE', 255: 'DE', 325: 'IT', 300: 'AT', 365: 'RU',
          640: 'OT', 2: 'US', 740: 'JP', 710: 'QING', 730: 'KR'}
# 2026(지금)은 Natural Earth 10m 나라(5.1.1, 퍼블릭 도메인) — 한국어 이름(NAME_KO)·한국 기준 묶음(ADM0_A3_KO)이 들어 있다(11/21 천대현 «맨 마지막에 2026년도 현재»)
NE = os.path.expanduser('~/data/maps/ne10/ne_10m_admin_0_countries')
NE1 = os.path.expanduser('~/data/maps/ne10/ne_10m_admin_1')
NOW = 2026
SOV2KEY = {'United Kingdom': 'GB', 'France': 'FR', 'Spain': 'ES', 'Portugal': 'PT', 'Netherlands': 'NL', 'Belgium': 'BE', 'Germany': 'DE',
           'Italy': 'IT', 'Austria': 'AT', 'Russia': 'RU', 'United States of America': 'US', 'Japan': 'JP'}
# 한국 기준에서 한 나라인 것(홍콩·마카오 = 중국, 올란드 = 핀란드, 관타나모 = 쿠바). 사람이 다시 묶은 것
NE_JOIN = {'HKG': 'CHN', 'MAC': 'CHN', 'ALD': 'FIN', 'USG': 'CUB'}
# NE 이름을 외교부·교과서 표기로 — 이름을 지우는 것(None)은 작은 분쟁 땅·기지(이름표가 어지럽기만 하다)
NE_NAME = {'CHN': '중국', 'PRK': '북한', 'TWN': '타이완', 'TUR': '튀르키예', 'NCL': '뉴칼레도니아',
           'ATF': '프랑스령 남방 및 남극 지역', 'IOA': '크리스마스섬·코코스 제도(오스트레일리아)', 'GRL': '그린란드(덴마크)', 'FRO': '페로 제도(덴마크)',
           'PGA': None, 'SCR': None, 'BRI': None, 'BRT': None, 'SPI': None, 'ESB': None, 'WSB': None, 'CSI': None, 'ATC': None, 'CLP': None, 'UMI': None}
NE_BASE = {'ESB', 'WSB'}   # 키프로스 안 영국 군사 기지 — 영국 식민지 색 점으로 찍히지 않게
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
cs_all = gpd.read_file(CS) if any(y >= CS_FROM for y in YEARS) else None
def ne_now():
    g = gpd.read_file([os.path.join(NE, f) for f in os.listdir(NE) if f.endswith('.shp')][0])
    g = g[~g.ADM0_A3.isin(['ATA', 'VAT'])].copy()   # 남극은 다른 해처럼 바탕 땅으로 · 바티칸(0.44㎢)은 2km 간격 줄이기에 도형이 사라진다(로마 안에 묻힌다)
    k = g.ADM0_A3_KO.where(g.ADM0_A3_KO != '-99', g.ADM0_A3)
    g['k'] = [NE_JOIN.get(x, x) for x in k]
    # 묶을 때 이름·지위는 첫 줄에서 온다 — 본체(ADM0_A3 = 묶음 코드)를 맨 앞에(쿠바가 «관타나모만 해군 기지»로 떴다)
    g = g.assign(main=(g.ADM0_A3 != g.k)).sort_values(['k', 'main'])
    d = g.dissolve('k', aggfunc='first')
    d['geometry'] = d.geometry.buffer(0)
    # NE 기본판은 «실제로 다스리는 쪽» 경계다 — 한국 정부 입장(크림 = 우크라이나, 서사하라 = 모로코 밖)으로 고친다
    a = gpd.read_file([os.path.join(NE1, f) for f in os.listdir(NE1) if f.endswith('.shp')][0])
    crimea = unary_union(a[a.iso_3166_2.isin(['UA-43', 'UA-40'])].geometry.buffer(0))
    d.at['RUS', 'geometry'] = d.at['RUS', 'geometry'].difference(crimea)
    d.at['UKR', 'geometry'] = unary_union([d.at['UKR', 'geometry'], crimea])
    from shapely.geometry import box
    ws = d.at['MAR', 'geometry'].intersection(box(-20, 20, -8.6, 27 + 40 / 60))   # 모로코·서사하라 경계 = 북위 27°40′
    d.at['MAR', 'geometry'] = d.at['MAR', 'geometry'].difference(ws)
    d.at['SAH', 'geometry'] = unary_union([d.at['SAH', 'geometry'], ws])
    rows = []
    for a3, r in d.iterrows():
        gm = r.geometry.intersection(land_geom)
        gm = gm if not gm.is_empty else r.geometry
        own = SOV2KEY.get(r.SOVEREIGNT) if r.SOVEREIGNT != r.ADMIN and a3 not in NE_BASE else None
        t = NE_NAME.get(a3, r.NAME_KO)
        rows.append({'n': f'ne:{a3}', 'st': 'independent' if r.TYPE in ('Sovereign country', 'Country', 'Sovereignty') else 'other',
                     'hk': SOV2KEY.get(r.ADMIN, '') if not own else '', 'ck': own or '', 't': t or '', 'geometry': gm})
    return gpd.GeoDataFrame(rows, crs=4326)
def cs_year(y):
    d = y * 10000 + 701   # 그해 7월 1일
    c = cs_all[(cs_all.gwsyear * 10000 + cs_all.gwsmonth * 100 + cs_all.gwsday <= d) & (cs_all.gweyear * 10000 + cs_all.gwemonth * 100 + cs_all.gweday > d)].copy()
    raw = c.geometry.buffer(0)
    c['geometry'] = raw.intersection(land_geom)
    # 땅 칼에 안 걸리는 작은 섬나라(몰디브)는 원래 경계로 — 통째로 사라졌다(11/21 독립 리뷰 낮음 8)
    c['geometry'] = [gm if not gm.is_empty else rg for gm, rg in zip(c.geometry, raw)]
    c = c[~c.geometry.is_empty]
    own = lambda r: int(r.owner) if str(r.owner).isdigit() else None
    rows = []
    for r in c.itertuples():
        dep = r.status != 'independent'
        o = own(r) if dep else None
        # 영국 자치령(캐나다·남아프리카 연방·오스트레일리아·뉴질랜드)은 CShapes(국제 관계 연구용)가 독립국으로 적지만, 교과서·흐름 지도는 영국 땅으로 본다
        # («오스트레일리아(영국)», 케이프타운까지 이어지는 영국 종단) — 영국 식민지 색으로(11/21)
        if not dep and r.gwcode in DOMINION_GB: dep, o = True, 200
        # 알래스카는 CShapes가 colony로 두지만 1880(Cliopatria)까지 미국 본토 색이었다 — 해가 바뀌며 색이 옅어지지 않게 본토로(독립 리뷰 의심 13)
        if r.gwcode == 3: dep, o = False, None
        # 중국(710)은 1912년부터 중화민국 — 청 색·«청» 이름을 달지 않는다
        hk = '' if dep or (r.gwcode == 710 and y >= 1912) else ('US' if r.gwcode == 3 else GW2KEY.get(r.gwcode, ''))
        rows.append({'n': f'cs:{r.gwcode}', 'st': r.status, 'hk': hk,
                     'ck': GW2KEY.get(o, '') if dep and o is not None else '', 'geometry': r.geometry})
    return gpd.GeoDataFrame(rows, crs=4326)
def era(y):
    s = g[(g.FromYear <= y) & (g.ToYear >= y)][['Name', 'geometry']].rename(columns={'Name': 'n'}).copy()
    s['geometry'] = s.geometry.buffer(0).intersection(land_geom)
    # 땅 칼에 안 걸리는 작은 섬나라는 원래 경계를 그대로 둔다(없어지는 것보다 해안선이 거친 편이 낫다)
    raw = g[(g.FromYear <= y) & (g.ToYear >= y)].set_index('Name').geometry.buffer(0)
    s['geometry'] = [geom if not geom.is_empty else raw[n] for n, geom in zip(s.n, s.geometry)]
    if y >= CS_FROM:
        c = cs_year(y)
        cover = unary_union(c.geometry.buffer(0)).buffer(0.02)
        # Cliopatria는 CShapes가 비운 땅만 — 괄호 겉봉투·좁은 띠(경계선이 살짝 어긋난 틈)는 버린다
        s = s[~s.n.str.startswith('(')].copy()
        s['geometry'] = s.geometry.buffer(0).difference(cover)
        s['geometry'] = [gm if gm.is_empty else unary_union([p for p in getattr(gm, 'geoms', [gm]) if p.area > 0.3] or [gm.__class__()]) for gm in s.geometry]
        s = s[~s.geometry.is_empty & s.geometry.notna()]
        # 같은 나라가 두 자료에 걸친 곳(아라비아 홍해 쪽 오스만 띠 등)은 CShapes 조각에 합친다 — 같은 색 사이에 경계선이 하나 더 보였다(11/21 메인 ℹ️)
        SAME = {'Ottoman Empire': 640, 'Russian Empire': 365, 'Empire of Japan': 740, 'German Empire': 255}
        for nm, gwc in SAME.items():
            hit = c.n == f'cs:{gwc}'
            if nm in set(s.n) and hit.any():
                i = c.index[hit][0]
                # 두 자료 사이 2km 틈(cover 여유)을 메우고 다시 땅으로 잘라 해안선은 그대로 둔다
                c.at[i, 'geometry'] = unary_union([c.at[i, 'geometry'], *s[s.n == nm].geometry]).buffer(0.03).buffer(-0.03).intersection(land_geom)
                s = s[s.n != nm]
        s = gpd.GeoDataFrame(pd.concat([c, s], ignore_index=True), crs=4326)
    return s
for y in YEARS:
    s = ne_now() if y == NOW else era(y)
    s.to_file(f'{TMP}/y{y}.geojson', driver='GeoJSON')
    # 원자료가 거칠어(1815년 나라 145개에 꼭짓점 2만 7천) 더 줄이지 않는다 — 땅으로 자른 해안선만 그대로
    # CShapes는 꼭짓점이 촘촘해 파일이 세 배(1MB)가 된다 — 2km 간격으로 맞닿은 선째 줄인다(이웃 사이 틈이 안 생긴다). 해안선은 땅 6%판이라 거의 안 바뀐다
    ms(f'{TMP}/y{y}.geojson', f'{OUT}/y{y}.json', *(['-simplify', 'interval=2000', 'keep-shapes'] if y >= CS_FROM else []))   # -clean은 겹친 나라(식민지 괄호 항목)를 지워 버려 쓰지 않는다
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
