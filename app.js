// 역사 지구본 v0.1 — MapLibre GL JS 5.24.1 지구본 + ETOPO 지형 + Cliopatria 해별 경계.
// 단원 자료(units/u5.js)는 Ⅴ단원 흐름 지도 v3의 scenes.js를 그대로 쓴다: SCENES·HOME·COLONY·COLORS·NAMES·paint 함수.
// 상태: year(지금 칠한 해) · sc(장면 번호, -1 = 장면 없음) · si(장면 안 단계).
'use strict';

const UNIT = {
  years: [1688, 1763, 1783, 1789, 1812, 1815, 1830, 1850, 1862, 1871, 1880, 1900, 1914],
  dir: 'data/u5/',
  home: { center: [15, 32], zoom: 2.05, zoomPhone: 1.05 }
};
const VER = '0.3.0';   // 자료 파일을 갈아 끼우면 올린다 — Pages 캐시(약 10분)에 옛 파일과 새 파일이 섞이지 않게
const BASE = location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
const INK = '#20232b', LAND = '#ebe6d8', NEUTRAL = '#ddd7c6', SEA = '#a9c9de';
// 교과서 밖 나라는 무채색 넷을 번갈아 칠해 이웃끼리 갈리게 한다(11/21 천대현 «경계는 다 보이게, 색은 교과서 나라만»)
const GREYS = ['#ddd7c6', '#d2ccba', '#e5e0d2', '#cbc5b3'];
const greyOf = n => { let h = 0; for (const ch of n) h = (h * 31 + ch.codePointAt(0)) >>> 0; return GREYS[h % GREYS.length]; };
const $ = id => document.getElementById(id);
const isPhone = () => innerWidth <= 720 || innerHeight <= 500;

// ---------- 색 ----------
function hex2rgb(h){ const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mix(a, b, t){ const A = hex2rgb(a), B = hex2rgb(b); return '#' + A.map((v, i) => Math.round(v * t + B[i] * (1 - t)).toString(16).padStart(2, '0')).join(''); }
const colonyColor = k => mix(COLORS[k], LAND, 0.55);
const shade = k => (!k || k === 'INK') ? INK : mix(COLORS[k], INK, 0.8);

// ---------- 자료 ----------
const CACHE = {};
async function topo(name){
  if (!CACHE[name]){
    CACHE[name] = fetch(BASE + UNIT.dir + name + '.json?v=' + VER).then(r => {
      if (!r.ok) throw new Error(name + ' ' + r.status);
      return r.json();
    }).then(t => topojson.feature(t, t.objects[Object.keys(t.objects)[0]]))
      .catch(e => { delete CACHE[name]; throw e; });   // 한 번 끊겨도 다음에 다시 받는다
  }
  return CACHE[name];
}

// ---------- 상태 ----------
const S = { year: 1815, sc: -1, si: 0, relief: true, names: true, mini: innerWidth <= 720 };   // 폰은 설명을 접은 채 열어 지도 칸을 넓힌다(메인 검증 🟡1)
const scene = () => S.sc >= 0 ? SCENES[S.sc] : null;
const byId = Object.create(null); SCENES.forEach((s, i) => byId[s.id] = i);
const ALLKEYS = Object.keys(COLORS);

function paintOf(){ const s = scene(); return s ? s.paint : basePaint; }
// 1886년부터는 CShapes 단위(n = «cs:나라번호»)다 — 본국·식민지가 빌드 때 hk·ck로 이미 갈려 있다(11/21 천대현 «아프리카 안쪽 경계»)
// 외교권만 넘긴 보호국(나라 안은 스스로 다스림)은 식민지 색으로 칠하지 않는다 — «아프가니스탄(영국)»을 식민지로 읽었다(11/21 사회 학생 눈 🟡)
// 아프가니스탄·휴전 오만·몰디브·부탄 / 부하라·히바(러시아). 우간다·나이지리아·모로코처럼 지배국이 안까지 다스린 보호국은 그대로 식민지 색
const LIGHT_PROT = { 700: '영국', 696: '영국', 781: '영국', 760: '영국', 7020: '러시아', 7030: '러시아' };
const paintF = (f, paint, yr) => { const p = f.properties; if (!p.n.startsWith('cs:')) return paint(p.n, yr); if (LIGHT_PROT[p.n.slice(3)]) return null; return p.hk ? [p.hk, false] : p.ck ? [p.ck, true] : null; };
function focusOf(){ const s = scene(); return s ? s.focus : ALLKEYS; }
const onY = o => !o.y || o.y.includes(S.year);
const onS = o => !o.st || S.si < 0 || o.st.includes(S.si);   // 연도 칩으로 고르면(si=-1) 단계 표시를 모두 보인다

// ---------- 지도 ----------
const protocol = new pmtiles.Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

const EMPTY = { type: 'FeatureCollection', features: [] };
const map = new maplibregl.Map({
  container: 'map',
  center: UNIT.home.center,
  zoom: isPhone() ? UNIT.home.zoomPhone : UNIT.home.zoom,
  maxPitch: 70,
  attributionControl: false,
  localIdeographFontFamily: "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif",
  style: {
    version: 8,
    projection: { type: 'globe' },
    glyphs: BASE + 'fonts/{fontstack}/{range}.pbf',
    sky: {
      'sky-color': '#0b1020', 'horizon-color': '#1f2c4a', 'fog-color': '#2a3958',
      'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.6, 'fog-ground-blend': 0.95,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.8, 7, 0]
    },
    sources: {
      dem: { type: 'raster-dem', url: 'pmtiles://' + BASE + 'data/dem/etopo_z5.pmtiles', encoding: 'terrarium', tileSize: 256,
             attribution: 'ETOPO 2022 (NOAA)' },
      dem2: { type: 'raster-dem', url: 'pmtiles://' + BASE + 'data/dem/etopo_z5.pmtiles', encoding: 'terrarium', tileSize: 256 },
      land: { type: 'geojson', data: EMPTY, attribution: 'Natural Earth' },
      nodata: { type: 'geojson', data: EMPTY },
      pol: { type: 'geojson', data: EMPTY, attribution: 'Cliopatria (Seshat) CC BY 4.0' },
      lbl: { type: 'geojson', data: EMPTY },
      lbl2: { type: 'geojson', data: EMPTY },
      pts: { type: 'geojson', data: EMPTY },
      arr: { type: 'geojson', data: EMPTY },
      head: { type: 'geojson', data: EMPTY },
      inf: { type: 'geojson', data: EMPTY }
    },
    layers: [
      { id: 'sea', type: 'background', paint: { 'background-color': SEA } },
      { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': LAND } },
      { id: 'nodata', type: 'fill', source: 'nodata', paint: { 'fill-pattern': 'hatch' } },
      { id: 'pol', type: 'fill', source: 'pol', layout: { 'fill-sort-key': ['get', 'rk'] },
        paint: { 'fill-color': ['get', 'c'], 'fill-opacity': 0.92 } },
      { id: 'relief', type: 'hillshade', source: 'dem2',
        paint: { 'hillshade-exaggeration': 0.55, 'hillshade-shadow-color': '#3b3a36', 'hillshade-highlight-color': '#ffffff',
                 'hillshade-accent-color': '#5b5a55' } },
      { id: 'pol-line', type: 'line', source: 'pol', paint: { 'line-color': '#5f594d', 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.45, 3, 0.8, 6, 1.5], 'line-opacity': 0.9 } },
      { id: 'meridian', type: 'line', source: 'pts', filter: ['==', ['get', 'kind'], 'meridian'],
        paint: { 'line-color': INK, 'line-width': 1.4, 'line-dasharray': [3, 2] } },
      { id: 'inf-halo', type: 'line', source: 'inf', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.85 } },
      { id: 'inf-line', type: 'line', source: 'inf', filter: ['!=', ['get', 'dash'], true], layout: { 'line-cap': 'round' }, paint: { 'line-color': INK, 'line-width': 3 } },
      { id: 'inf-dash', type: 'line', source: 'inf', filter: ['==', ['get', 'dash'], true], paint: { 'line-color': INK, 'line-width': 3, 'line-dasharray': [2.2, 1.6] } },
      { id: 'arr-line', type: 'line', source: 'arr', filter: ['!=', ['get', 'dash'], true], layout: { 'line-cap': 'round' },
        paint: { 'line-color': ['get', 'c'], 'line-width': 3.2 } },
      { id: 'arr-dash', type: 'line', source: 'arr', filter: ['==', ['get', 'dash'], true],
        paint: { 'line-color': ['get', 'c'], 'line-width': 3.2, 'line-dasharray': [2, 1.6] } },
      { id: 'head', type: 'symbol', source: 'head',
        layout: { 'icon-image': 'tri', 'icon-size': 0.7, 'icon-rotate': ['get', 'b'], 'icon-rotation-alignment': 'map',
                  'icon-allow-overlap': true, 'icon-ignore-placement': true },
        paint: { 'icon-color': ['get', 'c'] } },
      // 교과서 밖 나라 이름 — 색 나라 이름표(lbl)보다 아래 층이라 자리다툼에서 진다. 위 층부터 자리를 잡으므로 넓은 나라(0)를 맨 위에 둔다
      // (11/21: 작은 나라 층이 위에 있어 에리트레아·소말릴란드에 에티오피아가 밀려났다)
      { id: 'lbl2-2', type: 'symbol', source: 'lbl2', minzoom: 4, filter: ['==', ['get', 'tier'], 2],
        layout: { 'text-field': ['get', 't'], 'text-font': ['Klokantech Noto Sans Regular'],
                  'text-size': ['interpolate', ['linear'], ['zoom'], 1, 9.5, 4, 11.5, 6, 13.5], 'symbol-sort-key': ['-', 0, ['get', 'a']], 'text-max-width': 6 },
        paint: { 'text-color': ['coalesce', ['get', 'c'], '#6a6558'], 'text-halo-color': 'rgba(255,255,255,0.85)', 'text-halo-width': 1.4 } },
      { id: 'lbl2-1', type: 'symbol', source: 'lbl2', minzoom: 2.6, filter: ['==', ['get', 'tier'], 1],
        layout: { 'text-field': ['get', 't'], 'text-font': ['Klokantech Noto Sans Regular'],
                  'text-size': ['interpolate', ['linear'], ['zoom'], 1, 9.5, 4, 11.5, 6, 13.5], 'symbol-sort-key': ['-', 0, ['get', 'a']], 'text-max-width': 6 },
        paint: { 'text-color': ['coalesce', ['get', 'c'], '#6a6558'], 'text-halo-color': 'rgba(255,255,255,0.85)', 'text-halo-width': 1.4 } },
      { id: 'lbl2-0', type: 'symbol', source: 'lbl2', minzoom: 0, filter: ['==', ['get', 'tier'], 0],
        layout: { 'text-field': ['get', 't'], 'text-font': ['Klokantech Noto Sans Regular'],
                  'text-size': ['interpolate', ['linear'], ['zoom'], 1, 9.5, 4, 11.5, 6, 13.5], 'symbol-sort-key': ['-', 0, ['get', 'a']], 'text-max-width': 6 },
        paint: { 'text-color': ['coalesce', ['get', 'c'], '#6a6558'], 'text-halo-color': 'rgba(255,255,255,0.85)', 'text-halo-width': 1.4 } },
      { id: 'lbl', type: 'symbol', source: 'lbl',
        layout: { 'text-field': ['get', 't'], 'text-font': ['Klokantech Noto Sans Bold'],
                  'text-size': ['interpolate', ['linear'], ['zoom'], 1, ['*', ['get', 'sz'], 0.78], 4, ['get', 'sz'], 6, ['*', ['get', 'sz'], 1.25]],
                  'symbol-sort-key': ['-', 0, ['get', 'sz']], 'text-max-width': 8 },
        paint: { 'text-color': ['get', 'c'], 'text-halo-color': 'rgba(255,255,255,0.92)', 'text-halo-width': 1.8 } },
      { id: 'pt', type: 'circle', source: 'pts', filter: ['==', ['get', 'kind'], 'pt'],
        paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': INK, 'circle-stroke-width': 2.2 } },
      { id: 'pt-lbl', type: 'symbol', source: 'pts', filter: ['==', ['get', 'kind'], 'pt'],
        layout: { 'text-field': ['get', 't'], 'text-font': ['Klokantech Noto Sans Bold'], 'text-size': 13,
                  'text-variable-anchor': ['left', 'right', 'top', 'bottom'], 'text-radial-offset': 0.8, 'text-justify': 'auto' },
        paint: { 'text-color': INK, 'text-halo-color': '#ffffff', 'text-halo-width': 1.8 } },
      { id: 'arr-lbl', type: 'symbol', source: 'pts', filter: ['==', ['get', 'kind'], 'arrlbl'],
        layout: { 'text-field': ['get', 't'], 'text-font': ['Klokantech Noto Sans Bold'], 'text-size': 13, 'text-offset': [0, -1] },
        paint: { 'text-color': ['get', 'c'], 'text-halo-color': '#ffffff', 'text-halo-width': 2 } }
    ]
  }
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

function addImages(){
  // 빗금(자료 없음)
  const c = document.createElement('canvas'); c.width = c.height = 8;
  const g = c.getContext('2d'); g.fillStyle = LAND; g.fillRect(0, 0, 8, 8);
  g.strokeStyle = '#b9b2a0'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(0, 8); g.lineTo(8, 0); g.stroke();
  map.addImage('hatch', g.getImageData(0, 0, 8, 8));
  // 화살촉(위를 향한 세모, SDF라 색을 바꿀 수 있다)
  const t = document.createElement('canvas'); t.width = t.height = 24;
  const h = t.getContext('2d'); h.fillStyle = '#000'; h.beginPath(); h.moveTo(12, 1); h.lineTo(22, 22); h.lineTo(2, 22); h.closePath(); h.fill();
  map.addImage('tri', h.getImageData(0, 0, 24, 24), { sdf: true });
}

// ---------- 기하 ----------
function ringArea(r){ let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); }
function ringCentroid(r){
  let x = 0, y = 0, a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++){
    const f = r[j][0] * r[i][1] - r[i][0] * r[j][1]; a += f; x += (r[j][0] + r[i][0]) * f; y += (r[j][1] + r[i][1]) * f;
  }
  return a ? [x / (3 * a), y / (3 * a)] : r[0];
}
function inRing(pt, r){
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++){
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// 이름표 자리 — 무게중심이 땅 밖(바다·만)이면 그 위도를 가로지르는 가장 긴 땅 구간의 가운데
function labelPt(r){
  const c = ringCentroid(r);
  if (inRing(c, r)) return c;
  const xs = [];
  for (let i = 0, j = r.length - 1; i < r.length; j = i++){
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > c[1]) !== (yj > c[1])) xs.push((xj - xi) * (c[1] - yi) / (yj - yi) + xi);
  }
  xs.sort((a, b) => a - b);
  let best = null;
  for (let k = 0; k + 1 < xs.length; k += 2) if (!best || xs[k + 1] - xs[k] > best[1] - best[0]) best = [xs[k], xs[k + 1]];
  return best ? [(best[0] + best[1]) / 2, c[1]] : r[0];
}
function polys(geom){ if (!geom) return []; return geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : []; }
function bearing(a, b){
  const r = Math.PI / 180, y = Math.sin((b[0] - a[0]) * r) * Math.cos(b[1] * r);
  const x = Math.cos(a[1] * r) * Math.sin(b[1] * r) - Math.sin(a[1] * r) * Math.cos(b[1] * r) * Math.cos((b[0] - a[0]) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
}
function catmull(P, n = 16){
  if (P.length < 3) return P;
  const out = [];
  for (let i = 0; i < P.length - 1; i++){
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
    for (let k = 0; k < n; k++){
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(d => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(P[P.length - 1]);
  return out;
}
function bend2(a, b, k){ const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1]; return [a, [mx - dy * k, my + dx * k], b]; }
function quad(a, c, b, n = 40){ const o = []; for (let i = 0; i <= n; i++){ const t = i / n; o.push([0, 1].map(d => (1 - t) * (1 - t) * a[d] + 2 * (1 - t) * t * c[d] + t * t * b[d])); } return o; }
// 지도 글꼴은 ①②③을 눕혀 그린다(기기 CJK 글꼴로 대체되며 세로쓰기 취급) — 지도 위 글자만 «1 »로 바꾼다(11/20 사회 🟡).
const CIRC = '①②③④⑤⑥⑦⑧⑨⑩';
const mapText = t => String(t).replace(/[①-⑩]/g, c => (CIRC.indexOf(c) + 1) + '. ');
// 지구본에서 자리를 옮길 이름표(흐름 지도는 평면이라 맞던 자리) — 장면 id → 이름 → [경도, 위도]
const LABEL_AT = { as1: { '대한 제국': [127.2, 38.2] }, it1: { '프랑스': [3, 46.6] } };   // it1 프랑스: 사보이아 경계에 붙어 보라 땅을 프랑스로 읽게 됨(11/21 사회 🟡)
// 지구본에서 바꿔 쓰는 장면 이름표 — 영국 색으로 칠한 인도가 회색 «인도»로만 떠 옆의 «오스트레일리아(영국)»와 짝이 안 맞았다(11/21 사회 🟡)
const LABEL_TXT = { as1: { '인도': { t: '인도(영국)', k: 'GB' } } };
// 지구본에서 빼는 장면 이름표 — 아프리카 분할 1914의 «영국·프랑스·독일…»은 식민지 땅 위의 지배국 이름인데, 지구본은 식민지마다 «땅(지배국)»이 붙어 겹치고
// 동아프리카의 «독일»을 독일 본국으로 읽게 했다(11/21 사회 🟡). 색 뜻(범례)이 지배국을 알려 준다
const LABEL_DROP = { af1: ['프랑스', '영국', '벨기에', '독일', '포르투갈', '이탈리아'] };
// 나라 이름표는 본토에 — 한 나라 도형이 식민지까지 묶여 있어 «가장 큰 덩어리»가 아덴·앙골라·자바가 되던 것(11/21 코드 검토 high)
const HOME_AT = { GB: [-1.5, 52.5], FR: [2.5, 46.8], ES: [-3.7, 40.2], PT: [-8, 39.7], RU: [40, 56], AT: [15.5, 47.6], DE: [13.4, 52.5],
  GC: [10, 51], US: [-95, 39], CSA: [-87, 33], OT: [32.8, 39.9], IT: [8, 45], BE: [4.5, 50.7], NL: [5.5, 52.2], JP: [138, 36],
  QING: [110, 32], KR: [127.5, 37.5] };
// 원자료가 본국 도형에 묶어 둔 바다 건너 식민지 — 본국 진한 색이 아니라 식민지 옅은 색으로 칠하고 이름을 단다
// (11/21 천대현 «1900·1914 아프리카 이름이 없다» 점검: 1914 앙골라·모잠비크가 포르투갈 본토색, 한반도·타이완이 일본 본토색이었다)
// 상자 = [서, 남, 동, 북, 이름표, 최소 넓이]. 조각의 이름표 자리가 상자 안이면 식민지로 본다(11/21 메인 🟡: 카나리아 엘이에로가 걸려 서쪽 끝을 -17.3으로, 세우타·멜리야는 최소 넓이로 뺌). 이름표는 아시아 장면의 «오스트레일리아(영국)»처럼 «땅(나라)»
const OVERSEAS = {
  PT: [[10, -19, 25, -4.3, '앙골라(포르투갈)'], [30, -27, 41, -10, '모잠비크(포르투갈)'], [-26, -36, 55, 20], [60, -12, 130, 25]],
  US: [[116, 4, 127.5, 21.5, '필리핀(미국)'], [-86, 19.5, -74, 23.5, '쿠바(미국)'], [-86, 17, -64, 24.5], [-161, 18, -154, 23, '하와이(미국)'], [144, 12, 146, 15], [-171.5, -15, -168, -13]],
  JP: [[124, 33, 128.9, 43.5, '조선(일본)'], [119, 21.5, 122.5, 25.6, '타이완(일본)'], [141, 45.8, 145, 50], [120.5, 38.3, 122.6, 40]],
  ES: [[-17.3, 20, -8, 27.8], [-6.5, 34.6, -1.9, 35.95, null, 0.3], [5, -2, 12, 4], [116, 4, 127.5, 21.5, '필리핀(스페인)'], [-86, 19.5, -74, 23.5, '쿠바(스페인)'], [-86, 17, -64, 24.5]],
  GB: [[44, 12, 54, 19, '아덴(영국)'], [35, 10, 62, 32]], FR: [[-55, 1, -51, 6.5, '기아나(프랑스)']], NL: [[94, -11, 142, 7]],
  DE: [[125, -15, 180, 10, '뉴기니(독일)'], [-175, -15, -170, -12], [119.5, 35.5, 121, 36.6]]
};
const inBox = (p, b) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
// 원자료 식민지 하나가 다른 땅까지 묶은 경우 — 조각 이름표는 상자 안 조각만 그 이름, 나머지는 «○○령»(11/21 메인 🟡: 1900·1914 나이지리아 자리에 «영국령 골드코스트»)
const PART_NAME = { 'British Gold Coast': { at: [[-3.5, 4.5, 1.5, 11.5, '영국령 골드코스트']], other: '영국령' } };
// 범례 이름(흐름 지도 표기)은 여러 해를 묶은 것 — 지도 위 이름표는 그해 이름으로(11/21: 1914년에 «사르데냐·이탈리아»·«프로이센·독일»이 떴다)
const keyName = (k, yr) => k === 'IT' ? (yr >= 1861 ? '이탈리아' : '사르데냐 왕국') : k === 'DE' ? (yr >= 1871 ? '독일' : '프로이센') : (NAMES[k] || k);
const F = (geom, props) => ({ type: 'Feature', geometry: geom, properties: props || {} });
const FC = feats => ({ type: 'FeatureCollection', features: feats });

// ---------- 그리기 ----------
let drawToken = 0, READY = false, shownYear = null, toastT = 0;
function toast(t, ms, info){ const el = $('toast'); el.textContent = t; el.hidden = !t; el.classList.toggle('info', !!info); clearTimeout(toastT); if (t && ms) toastT = setTimeout(() => { el.hidden = true; }, ms); }
let NAMES_KO = {}, NAMES_CS = {};
// CShapes 단위 이름은 해마다 다르다(콩고 자유국 1900 → 벨기에령 콩고 1914) — names_cs.json = {해: {나라번호: 이름}}
const nameOf = (n, yr) => { if (!n.startsWith('cs:')) return NAMES_KO[n]; const t = (NAMES_CS[yr] || {})[n.slice(3)], lp = LIGHT_PROT[n.slice(3)]; return t && lp ? t + '(' + lp + ' 보호국)' : t; };
// CShapes 식민지 이름은 땅 이름만 있다(골드코스트) — 차지한 나라를 괄호로 붙인다. 이름에 이미 나라가 들어 있으면(독일령 동아프리카) 그대로
// 이름 꼴은 «땅(지배국)» 하나로 — «독일령 남서아프리카»·«카메룬(독일)»·장면의 «독일»이 한 화면에 섞여 독일 본국으로 읽혔다(11/21 사회 🟡). «○○령 땅»은 «땅(○○)»으로 바꾼다
const withOwner = (t, k, n) => {
  if (!n.startsWith('cs:')) return t;
  const o = keyName(k, 1914);
  if (t === '영국-이집트령 수단') return '수단(영국·이집트)';
  if (t.startsWith(o + '령 ')) return t.slice(o.length + 2) + '(' + o + ')';
  return t.includes(o) ? t : t + '(' + o + ')';
};
fetch(BASE + 'data/names_cs.json?v=' + VER).then(r => r.ok ? r.json() : {}).then(j => { NAMES_CS = j || {}; if (READY) draw(); }).catch(() => {});
let _unused_names;   // 교과서 밖 나라 이름(검수 끝난 것만) — 영어 이름 → 한국어
fetch(BASE + 'data/names_ko.json?v=' + VER).then(r => r.ok ? r.json() : {}).then(j => { NAMES_KO = j || {}; if (READY) draw(); }).catch(() => {});
async function draw(){
  if (!READY) return;
  const tok = ++drawToken, yr = S.year;
  let pol;
  // 빗금(자료 없음)은 꾸밈이라 못 받아도 경계는 그린다
  const ndP = topo('n' + yr).catch(() => FC([]));
  // 느린 망에서는 받는 몇 초 동안 새 연도 글자 아래 옛 경계가 남는다 — 0.5초 넘으면 받는 중이라고 알린다(11/21 메인 🟡: 3G 전환 2~6초)
  const slow = setTimeout(() => { if (tok === drawToken) toast(yr + '년 지도 받는 중…', 0, true); }, 500);
  try { pol = await topo('y' + yr); }
  catch (e){
    clearTimeout(slow);
    if (tok !== drawToken) return;
    console.error('[지구본]', e);
    // 못 받은 해에 머물지 않는다 — 칩·큰 연도 글자를 마지막으로 그린 해로 되돌린다(학생이 틀린 해를 보지 않게)
    if (shownYear != null && shownYear !== yr){ S.year = shownYear; syncChips(); url(); }
    toast(yr + '년 지도를 받지 못했다. 인터넷 연결을 확인하고 연도를 다시 눌러 보자.', 6000);
    return;
  }
  const nd = await ndP;
  clearTimeout(slow);
  if (tok !== drawToken) return;   // 그 사이 다른 해를 골랐다
  toast('');
  const paint = paintOf(), focus = focusOf();
  const keyArea = {}, grey = [];   // 색 나라 이름표 자리(본토) · 그 밖 이름표(식민지·교과서 밖 나라)
  const areaOf = p => ringArea(p[0]) * Math.cos(ringCentroid(p[0])[1] * Math.PI / 180);
  const feats = [];
  for (const f of pol.features){
    if (!f.geometry) continue;
    const n = f.properties.n, r = paintF(f, paint, yr), umbrella = n.startsWith('('), nm = nameOf(n, yr);   // «(영국 제국)» 같은 괄호 항목 = 식민지 전체를 덮는 겉봉투 — 안쪽 항목과 겹친다
    if (r && focus.includes(r[0])){
      const [k, col] = r;
      if (col){
        feats.push(F(f.geometry, { n, c: colonyColor(k), rk: 1 }));
        // 식민지도 이름을 단다 — 이름표가 없어 1900·1914 아프리카가 빈 땅처럼 보였다(11/21 천대현). 넓은 조각마다 하나씩
        if (!umbrella && nm) for (const p of polys(f.geometry)){
          const a = areaOf(p); if (a <= 2) continue;
          const ll = labelPt(p[0]), pn = PART_NAME[n], hit = pn && pn.at.find(b => inBox(ll, b));
          grey.push({ t: pn ? (hit ? hit[4] : pn.other) : withOwner(nm, k, n), a, ll, c: shade(k), many: true });
        }
        continue;
      }
      // 본국 도형은 조각마다 본토·바다 건너 식민지를 가른다
      const home = [], over = [];
      for (const p of polys(f.geometry)){
        const ll = labelPt(p[0]), b = (OVERSEAS[k] || []).find(b => inBox(ll, b) && !(b[5] && areaOf(p) < b[5]));
        b ? over.push({ p, ll, t: b[4] || (NAMES[k] || k).split('·').pop() + '령' }) : home.push(p);
      }
      if (over.length){
        feats.push(F({ type: 'MultiPolygon', coordinates: over.map(o => o.p) }, { n, c: colonyColor(k), rk: 1 }));
        for (const o of over){ const a = areaOf(o.p); if (a > 2) grey.push({ t: o.t, a, ll: o.ll, c: shade(k), many: true }); }
      }
      if (!home.length) continue;
      feats.push(F({ type: 'MultiPolygon', coordinates: home }, { n, c: COLORS[k], rk: 2 }));
      for (const p of home){
        const a = areaOf(p), isHome = HOME_AT[k] && inRing(HOME_AT[k], p[0]), cur = keyArea[k];
        if (!cur || (isHome && !cur.home) || (isHome === !!cur.home && a > cur.a)) keyArea[k] = { a, home: isHome, ll: labelPt(p[0]) };
      }
      continue;
    }
    // 색을 안 칠한 땅은 모두 회색 이름 — 장면 밖 교과서 나라(이탈리아 장면의 러시아 등)도 여기로 온다
    feats.push(F(f.geometry, { n, c: greyOf(n), rk: 0 }));
    if (!umbrella && nm){
      let big = null;
      for (const p of polys(f.geometry)){ const a = areaOf(p); if (!big || a > big.a) big = { a, p }; }
      if (big) grey.push({ t: nm, a: big.a, ll: labelPt(big.p[0]), up: f.properties.st === 'independent' });   // 독립국(라이베리아 등)은 한 층 일찍 보이게
    }
  }
  map.getSource('pol').setData(FC(feats));
  map.getSource('nodata').setData(nd);
  // 본토가 없고 아주 작은 조각만 남은 나라(1815년 «프로이센 왕국» = 스위스 뇌샤텔 한 조각)는 이름을 달지 않는다 — 엉뚱한 곳에 이름이 뜬다
  for (const k in keyArea) if (!keyArea[k].home && keyArea[k].a < 1) delete keyArea[k];
  // 오스만 제국은 한 덩어리 가운데가 이라크·시리아 사막에 떨어진다 — 교과서 지도처럼 아나톨리아에 단다
  if (keyArea.OT && keyArea.OT.home) keyArea.OT.ll = HOME_AT.OT;
  drawLabels(keyArea, grey);
  drawOverlay();
  legend(pol);
  $('year').textContent = yr;
  shownYear = yr;
  // 쉬는 틈에 앞뒤 해를 미리 받아 둔다 — 다음 연도 칩은 기다리지 않게
  const yi = UNIT.years.indexOf(yr);
  setTimeout(() => [yi - 1, yi + 1].forEach(j => { const y2 = UNIT.years[j]; if (y2) topo('y' + y2).catch(() => {}); }), 1500);
}

function drawLabels(keyArea, grey){
  const s = scene(), out = [];
  if (S.names){
    if (s){
      s.labels.filter(onY).filter(onS).filter(l => !l.reveal || $('p-q').open).filter(l => !(LABEL_DROP[s.id] || []).includes(l.t)).forEach(l => {
        const tx = LABEL_TXT[s.id] && LABEL_TXT[s.id][l.t];
        const t = tx ? tx.t : (isPhone() && l.tS) ? l.tS : l.t, fix = LABEL_AT[s.id] && LABEL_AT[s.id][l.t];
        const ll = fix || ((isPhone() && l.llS) ? l.llS : l.ll);
        out.push(F({ type: 'Point', coordinates: ll }, { t: mapText(t), sz: l.s === 2 ? 17 : l.s === 0 ? 11.5 : 13.5, c: (tx ? tx.k : l.k) ? shade(tx ? tx.k : l.k) : '#5b5a55' }));
      });
    } else {
      const big = Object.entries(keyArea).sort((a, b) => b[1].a - a[1].a);
      big.forEach(([k, v], i) => out.push(F({ type: 'Point', coordinates: v.ll }, { t: keyName(k, S.year), sz: i < 4 ? 15 : 12.5, c: shade(k) })));
    }
  }
  map.getSource('lbl').setData(FC(out));
  // 교과서 밖 나라 — 작은 회색 이름. 넓은 나라는 멀리서도, 작은 나라는 당겨야 보인다(층 셋의 minzoom)
  // 장면 이름표·색 나라 이름표와 같은 이름, 같은 이름의 두 번째(작은) 덩어리는 빼서 «이집트»가 두 번 뜨지 않게 한다
  const seen = new Set(out.map(f => String(f.properties.t).replace(/\s/g, '')));
  // 답을 열어야 뜨는 장면 이름(아프리카 분할의 에티오피아·라이베리아)은 회색 이름으로도 먼저 보이면 안 된다 — 답 선노출(11/21)
  const hide = s ? s.labels.filter(l => l.reveal && !$('p-q').open).map(l => l.t.replace(/\s/g, '')) : [];   // «에티오피아 제국»처럼 뒤가 붙은 이름도
  // 식민지(many)는 떨어진 조각마다 이름을 단다(영국령 아프리카 = 북쪽·남쪽 두 덩어리) — 같은 이름끼리는 지우지 않고, 장면·색 나라 이름표와 겹치는 이름만 뺀다
  const g2 = S.names ? (grey || []).sort((x, y) => y.a - x.a).filter(g => { const k = g.t.replace(/\s/g, ''); if (seen.has(k) || hide.some(h => k.startsWith(h))) return false; if (!g.many) seen.add(k); return true; })
    .map(g => F({ type: 'Point', coordinates: g.ll }, Object.assign({ t: g.t, a: g.a, tier: Math.max(0, (g.a > 60 ? 0 : g.a > 8 ? 1 : 2) - (g.up ? 1 : 0)) }, g.c ? { c: g.c } : {}))) : [];
  GREY = g2; greyVisible();
}
// 회색 이름은 위쪽 연도·단추 띠, 설명 패널, 아래 막대 뒤에 깔리면 지저분하다 — 그 자리에 떨어지는 것은 숨긴다(11/21 사회 🟡). 지도를 움직일 때마다 다시 고른다
let GREY = [];
function greyVisible(){
  const boxes = ['top', 'tools', 'panel', 'bottom'].map($).filter(el => el && !el.hidden && el.offsetParent !== null).map(el => el.getBoundingClientRect());
  const m = 18;
  // 위쪽 띠(연도·단추)와 아래 막대는 화면 폭 전체로 본다 — 띠 사이 빈칸에 걸친 이름도 글자 뒤에 깔려 보인다
  const topLine = Math.max(...['top', 'tools'].map(id => $(id).getBoundingClientRect().bottom)), botLine = $('bottom').getBoundingClientRect().top;
  const vis = GREY.filter(f => {
    const p = map.project(f.geometry.coordinates);
    if (p.y < topLine + m || p.y > botLine - m) return false;
    return !boxes.some(b => p.x > b.left - m && p.x < b.right + m && p.y > b.top - m && p.y < b.bottom + m);
  });
  map.getSource('lbl2').setData(FC(vis));
}

let pills = [];
function drawOverlay(){
  pills.forEach(m => m.remove()); pills = [];
  const s = scene(), pts = [], arr = [], head = [], inf = [];
  if (s){
    if (s.meridian) pts.push(F({ type: 'LineString', coordinates: Array.from({ length: 81 }, (_, i) => [0, -80 + i * 2]) }, { kind: 'meridian' }));
    s.points.filter(onS).forEach(p => pts.push(F({ type: 'Point', coordinates: p.ll }, { kind: 'pt', t: mapText((isPhone() && p.tS) ? p.tS : p.t) })));
    s.arrows.filter(onS).forEach(a => {
      let P = a.pts.slice(); if (P.length === 2) P = bend2(P[0], P[1], a.bend ?? 0.18);
      const line = catmull(P), c = (a.k && a.k !== 'INK') ? COLORS[a.k] : INK;
      arr.push(F({ type: 'LineString', coordinates: line }, { c, dash: !!a.dash }));
      head.push(F({ type: 'Point', coordinates: line[line.length - 1] }, { c, b: bearing(line[line.length - 3] || line[0], line[line.length - 1]) }));
      if (a.both) head.push(F({ type: 'Point', coordinates: line[0] }, { c, b: bearing(line[2] || line[1], line[0]) }));
      if (a.label){
        const at = a.li != null ? a.pts[Math.min(a.li, a.pts.length - 1)] : line[Math.floor(line.length / 2)];
        pts.push(F({ type: 'Point', coordinates: at }, { kind: 'arrlbl', t: mapText((isPhone() && a.labelS) ? a.labelS : a.label), c }));
      }
    });
    s.inf.filter(f => f.from && f.to).forEach(f => {
      const a = f.from, b = f.to, dx = b[0] - a[0], dy = b[1] - a[1], k = (f.dir === 'in' ? 1 : -1) * 0.2;
      const c = [(a[0] + b[0]) / 2 - dy * k, (a[1] + b[1]) / 2 + dx * k], line = quad(a, c, b);
      inf.push(F({ type: 'LineString', coordinates: line }, { dash: f.k === '도움' }));
      head.push(F({ type: 'Point', coordinates: b }, { c: INK, b: bearing(line[line.length - 3], b) }));
      const other = f.s != null && byId[f.s] != null ? SCENES[byId[f.s]] : null;
      const nm = f.lb || (other ? (other.evS || other.ev) : '다음 시간');
      const el = document.createElement(other ? 'button' : 'div');
      el.className = 'inf-pill'; el.textContent = (f.dir === 'in' ? '← ' : '→ ') + nm;
      el.setAttribute('aria-label', (f.dir === 'in' ? '받은 영향: ' : '준 영향: ') + nm);
      if (other){ el.type = 'button'; el.addEventListener('click', e => { e.stopPropagation(); go(byId[f.s]); }); }
      pills.push(new maplibregl.Marker({ element: el }).setLngLat(line[f.dir === 'in' ? 12 : 28]).addTo(map));
    });
  }
  map.getSource('pts').setData(FC(pts));
  map.getSource('arr').setData(FC(arr));
  map.getSource('head').setData(FC(head));
  map.getSource('inf').setData(FC(inf));
}

function josa(w){ const c = w.charCodeAt(w.length - 1) - 0xAC00; return (c >= 0 && c < 11172 && c % 28) ? '이' : '가'; }
function legend(pol){
  const s = scene(), paint = paintOf(), focus = focusOf(), seen = new Map();
  pol.features.forEach(f => { const r = paintF(f, paint, S.year); if (r && focus.includes(r[0])){ const v = seen.get(r[0]) || {}; r[1] ? v.col = true : v.home = true; seen.set(r[0], v); } });
  const out = [];
  (s ? s.focus : [...seen.keys()]).forEach(k => {
    const v = seen.get(k); if (!v) return;
    if (v.home) out.push(`<span><i style="background:${COLORS[k]}"></i>${NAMES[k] || k}</span>`);
    if (v.col && s) out.push(`<span><i style="background:${colonyColor(k)}"></i>${(s.colonyName && s.colonyName[k]) || (NAMES[k] || k) + josa(NAMES[k] || k) + ' 차지한 땅'}</span>`);
  });
  if (!s && [...seen.values()].some(v => v.col)) out.push('<span><i style="background:linear-gradient(90deg,#d99a93,#9fb4d6)"></i>옅은 색 = 그 나라가 차지한 땅</span>');
  out.push(`<span><i style="background:repeating-linear-gradient(45deg,${LAND} 0 3px,#b9b2a0 3px 4px)"></i>자료 없음</span>`);
  $('legend').innerHTML = out.join('');
}

// ---------- 화면 ----------
function chips(){
  $('years').innerHTML = UNIT.years.map(y => `<button type="button" class="chip" data-y="${y}" aria-pressed="${y === S.year}">${y}</button>`).join('');
  $('scenes').innerHTML = SCENES.map((s, i) => `<button type="button" class="chip" data-s="${i}" aria-pressed="${i === S.sc}" title="다시 누르면 장면을 닫는다">${s.country} <small>${s.evS || s.ev}</small></button>`).join('');
}
function syncChips(){
  document.querySelectorAll('#years .chip').forEach(b => b.setAttribute('aria-pressed', +b.dataset.y === S.year));
  document.querySelectorAll('#scenes .chip').forEach(b => b.setAttribute('aria-pressed', +b.dataset.s === S.sc));
  const on = document.querySelector('#scenes .chip[aria-pressed="true"]'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  const oy = document.querySelector('#years .chip[aria-pressed="true"]'); if (oy) oy.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
}
function panel(){
  const s = scene(), P = $('panel');
  if (!s){ P.hidden = true; return; }
  P.hidden = false; P.classList.toggle('mini', isPhone() && S.mini);
  $('p-head').innerHTML = `<div class="who">${s.country}</div><h2 tabindex="-1">${s.ev}</h2><div class="meta">${s.when} · 교과서 ${s.pages}</div>`;
  $('p-body').innerHTML = s.body;
  $('p-sth').innerHTML = `${s.country} 안에서는 <small>— 단계를 누르면 지도가 바뀐다</small>`;
  $('p-dots').innerHTML = s.steps.map((st, i) => `<button type="button" data-i="${i}" aria-current="${i === S.si}" aria-label="${i + 1}단계${st.y ? ' ' + st.y : ''}">${i + 1}</button>`).join('');
  $('p-mini').textContent = S.mini ? '▴ 설명 펴기' : '▾ 설명 접기'; setTimeout(stepLine);
  $('p-steps').innerHTML = s.steps.map((st, i) => `<li><button type="button" data-i="${i}" aria-current="${i === S.si}"><span class="n">${i + 1}</span><span>${st.y ? `<span class="y">${st.y}</span>` : ''}${st.t}</span></button></li>`).join('');
  const item = f => {
    const o = f.s != null && byId[f.s] != null ? SCENES[byId[f.s]] : null;
    const head = o ? `<b>${o.country} · ${f.lb || o.evS || o.ev}</b> — ` : '';
    const body = `${head}${f.w}${f.p ? ` <small>${f.p}</small>` : ''}`;
    return o ? `<button type="button" data-go="${byId[f.s]}">${body}</button>` : `<div class="item">${body}</div>`;
  };
  const inn = s.inf.filter(f => f.dir === 'in'), out = s.inf.filter(f => f.dir === 'out');
  $('p-inf').innerHTML = `<div><h3>← 받은 영향</h3>${inn.length ? inn.map(item).join('') : '<p class="none">교과서는 다른 나라에서 받은 영향을 따로 적지 않았다.</p>'}</div>`
    + `<div><h3>→ 준 영향</h3>${out.length ? out.map(item).join('') : '<p class="none">교과서는 다른 나라에 준 영향을 따로 적지 않았다.</p>'}</div>`;
  if (s.q){ $('p-q').hidden = false; $('p-q').open = false; $('p-q').querySelector('summary').textContent = '💬 ' + s.q; $('p-a').innerHTML = s.a || ''; }
  else $('p-q').hidden = true;
  P.scrollTop = 0;
}
function stepLine(){ const s = scene(), el = $('p-cur'); if (!s || !el) return; const st = s.steps[S.si]; el.innerHTML = st ? `${st.y ? `<b>${st.y}</b> ` : ''}${st.t.replace(/<[^>]+>/g, '')}` : `${S.year}년 경계를 보는 중`; }
function stepCurrent(){ stepLine(); document.querySelectorAll('#p-steps button, #p-dots button').forEach(b => b.setAttribute('aria-current', +b.dataset.i === S.si)); }

function padding(){
  // 패널이 실제로 어디 놓였는지(아래 판 / 오른쪽 판) 재서 여백을 정한다 — 폰 세로·가로·노트북 모두 같은 식.
  const nav = $('bottom').offsetHeight || 120, P = $('panel'), W = innerWidth, H = innerHeight;
  const top = isPhone() ? 92 : 110, pd = { top, bottom: nav + 12, left: 24, right: 24 };
  if (!P.hidden){
    const r = P.getBoundingClientRect();
    if (r.left > W * 0.3) pd.right = W - r.left + 16;          // 오른쪽 판
    else pd.bottom = H - r.top + 10;                           // 아래 판
  }
  // 지도 칸이 너무 좁아지면 여백을 줄인다(카메라 계산이 실패하지 않게)
  if (H - pd.top - pd.bottom < 120){ const k = (H - 120) / (pd.top + pd.bottom); pd.top = Math.max(0, pd.top * k); pd.bottom = Math.max(0, pd.bottom * k); }
  if (W - pd.left - pd.right < 160){ pd.right = Math.max(0, W - pd.left - 160); }
  return pd;
}
function fly(){
  // flyTo의 padding은 지도 상태에 남아 다음 fitBounds 여백과 겹친다 — 가운데만 옮기는 offset을 쓴다.
  const pd = padding(), off = [(pd.left - pd.right) / 2, (pd.top - pd.bottom) / 2], s = scene();
  const flyC = (center, zoom, ms) => map.flyTo({ center, zoom, pitch: 0, bearing: 0, offset: off, duration: ms });
  if (!s){ flyC(UNIT.home.center, isPhone() ? UNIT.home.zoomPhone : UNIT.home.zoom, 1800); return; }
  const [w, so, e, n] = s.view;
  if (isWide(s)){ const c = wideCenter(s, Math.max(0, S.si)); flyC([c[0], c[1]], c.one ? (isPhone() ? 2.4 : 2.8) : (isPhone() ? 1.1 : 1.8), 2000); return; }
  let cam = null;
  try { cam = map.cameraForBounds([[w, so], [e, n]], { padding: pd, maxZoom: 6 }); } catch (err){ console.warn('[지구본] 화면 맞춤 실패', err.message); }
  if (cam && cam.center) map.flyTo({ ...cam, pitch: 0, bearing: 0, duration: 2200 });
  else flyC([(w + e) / 2, (so + n) / 2], 2.5, 2200);   // 여백이 너무 커 맞출 수 없을 때
}
function url(){
  const q = new URLSearchParams();
  if (S.sc >= 0){ q.set('s', SCENES[S.sc].id); if (S.si >= 0) q.set('st', S.si + 1); else q.set('y', S.year); } else q.set('y', S.year);
  history.replaceState(null, '', '?' + q.toString());
}
// 장면 안에서 연도를 고르면 그 해의 단계로 간다. 그 해 단계가 없을 때만 단계 전부를 함께 보인다(11/21 코드 검토: 늘 전부 떠서 어지러움)
function setYear(y){
  S.year = y;
  if (S.sc >= 0){ const s = scene(); S.si = s.steps.findIndex(st => (st.yr || s.year) === y); stepCurrent(); }
  syncChips(); draw(); url();
}
// 세계 장면(폭 150° 넘음)은 bbox 가운데가 엉뚱한 곳(아프리카)이 된다 — 그 단계에 보이는 점·화살표의 가운데로 간다(11/20 사회 학생 눈 🔴).
const WIDE_C = { as1: [118, 24], gb2: [-5, 48] };   // 단계에 점·화살표가 없을 때의 가운데
function wideCenter(s, i){
  const pts = [];
  s.points.filter(p => !p.st || p.st.includes(i)).forEach(p => pts.push(p.ll));
  s.arrows.filter(a => !a.st || a.st.includes(i)).forEach(a => a.pts.forEach(q => pts.push(q)));
  if (!pts.length) return WIDE_C[s.id] || [(s.view[0] + s.view[2]) / 2, 20];
  if (pts.length === 1) return Object.assign(pts[0].slice(), { one: true });
  let x = 0, y = 0, z = 0; const r = Math.PI / 180;
  pts.forEach(([lo, la]) => { x += Math.cos(la * r) * Math.cos(lo * r); y += Math.cos(la * r) * Math.sin(lo * r); z += Math.sin(la * r); });
  return [Math.atan2(y, x) / r, Math.atan2(z, Math.hypot(x, y)) / r];
}
const isWide = s => s.view[2] - s.view[0] > 150;
function startYear(s, i){ return (s.steps[i] && s.steps[i].yr) || s.year || S.year; }
function go(i){
  const prev = S.sc;
  S.sc = i; S.si = 0;
  if (i >= 0) S.year = startYear(SCENES[i], 0);
  syncChips(); panel(); draw(); fly(); url();
  if (i >= 0){ const h = $('p-head').querySelector('h2'); if (h) h.focus({ preventScroll: true }); }
  else if (prev >= 0){ const c = document.querySelector(`#scenes .chip[data-s="${prev}"]`); if (c) c.focus({ preventScroll: true }); }
}
function step(i){ const s = scene(); S.si = i; S.year = startYear(s, i); stepCurrent(); syncChips(); draw(); url(); if (isWide(s)) fly(); }

// ---------- 손 ----------
function hideHint(){ const h = $('hint'); if (h && !h.hidden){ h.hidden = true; try { localStorage.setItem('hg-hint', '1'); } catch (e){} } }
try { if (!localStorage.getItem('hg-hint') && !location.search) $('hint').hidden = false; } catch (e){ $('hint').hidden = false; }
['years', 'scenes', 'tools'].forEach(id => $(id).addEventListener('click', hideHint));
map.on('dragstart', hideHint);
$('years').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) setYear(+b.dataset.y); });
$('scenes').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) go(+b.dataset.s === S.sc ? -1 : +b.dataset.s); });
$('p-steps').addEventListener('click', e => { const b = e.target.closest('button'); if (b) step(+b.dataset.i); });
$('p-dots').addEventListener('click', e => { const b = e.target.closest('button'); if (b) step(+b.dataset.i); });
$('p-inf').addEventListener('click', e => { const b = e.target.closest('button[data-go]'); if (b) go(+b.dataset.go); });
$('p-close').addEventListener('click', () => go(-1));
$('p-mini').addEventListener('click', () => { S.mini = !S.mini; $('panel').classList.toggle('mini', S.mini); $('p-mini').textContent = S.mini ? '▴ 설명 펴기' : '▾ 설명 접기'; fly(); });
$('lg-toggle').addEventListener('click', e => { const o = $('bottom').classList.toggle('lg-open'); e.currentTarget.setAttribute('aria-expanded', o); e.currentTarget.textContent = o ? '색 뜻 ▴' : '색 뜻 ▾'; navVar(); if (scene()) fly(); });
$('p-q').addEventListener('toggle', () => draw());   // 질문을 펴면 숨겨 둔 답 이름표가 드러난다
$('b-home').addEventListener('click', () => go(-1));
$('b-relief').addEventListener('click', e => {
  S.relief = !S.relief; e.currentTarget.setAttribute('aria-pressed', S.relief);
  map.setTerrain(S.relief ? { source: 'dem', exaggeration: 9 } : null);
  map.setLayoutProperty('relief', 'visibility', S.relief ? 'visible' : 'none');
});
$('b-names').addEventListener('click', e => { S.names = !S.names; e.currentTarget.setAttribute('aria-pressed', S.names); draw(); });
$('b-credits').addEventListener('click', () => $('credits').showModal());

// ---------- 시작 ----------
(function readUrl(){
  const q = new URLSearchParams(location.search);
  const s = q.get('s'), y = +q.get('y'), st = +q.get('st');
  if (s && Number.isInteger(byId[s])){
    S.sc = byId[s]; const sc = SCENES[S.sc];
    if (UNIT.years.includes(y) && !q.has('st')){ S.si = -1; S.year = y; }
    else { S.si = Number.isInteger(st) ? Math.max(0, Math.min(st - 1, sc.steps.length - 1)) : 0; S.year = startYear(sc, S.si); }
  }
  else if (UNIT.years.includes(y)) S.year = y;
})();
chips();
map.on('load', () => {
  addImages(); READY = true;
  map.setTerrain({ source: 'dem', exaggeration: 9 });
  (function land(){ topo('land').then(l => map.getSource('land').setData(l)).catch(e => { console.error('[지구본]', e); toast('땅 바탕을 받지 못했다. 다시 받는 중…', 4000); setTimeout(land, 5000); }); })();
  panel(); draw(); syncChips();
  if (S.sc >= 0){ stepCurrent(); fly(); }
  window.__ready = true;
});
map.on('moveend', () => { if (READY) greyVisible(); });
map.on('error', e => console.error('[지구본]', e.error && e.error.message));
function navVar(){ document.documentElement.style.setProperty('--nav', $('bottom').offsetHeight + 'px'); }
navVar();
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { navVar(); if (scene()) $('panel').classList.toggle('mini', isPhone() && S.mini); draw(); }, 200); });
