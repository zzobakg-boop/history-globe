// 역사 지구본 v0.1 — MapLibre GL JS 5.24.1 지구본 + ETOPO 지형 + Cliopatria 해별 경계.
// 단원 자료(units/u5.js)는 Ⅴ단원 흐름 지도 v3의 scenes.js를 그대로 쓴다: SCENES·HOME·COLONY·COLORS·NAMES·paint 함수.
// 상태: year(지금 칠한 해) · sc(장면 번호, -1 = 장면 없음) · si(장면 안 단계).
'use strict';

const UNIT = {
  years: [1688, 1763, 1783, 1789, 1812, 1815, 1830, 1850, 1862, 1871, 1880, 1900, 1914],
  dir: 'data/u5/',
  home: { center: [15, 32], zoom: 2.05, zoomPhone: 1.05 }
};
const BASE = location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
const INK = '#20232b', LAND = '#ebe6d8', NEUTRAL = '#ddd7c6', SEA = '#a9c9de';
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
    CACHE[name] = fetch(BASE + UNIT.dir + name + '.json').then(r => {
      if (!r.ok) throw new Error(name + ' ' + r.status);
      return r.json();
    }).then(t => topojson.feature(t, t.objects[Object.keys(t.objects)[0]]))
      .catch(e => { delete CACHE[name]; throw e; });   // 한 번 끊겨도 다음에 다시 받는다
  }
  return CACHE[name];
}

// ---------- 상태 ----------
const S = { year: 1815, sc: -1, si: 0, relief: true, names: true, mini: false };
const scene = () => S.sc >= 0 ? SCENES[S.sc] : null;
const byId = Object.create(null); SCENES.forEach((s, i) => byId[s.id] = i);
const ALLKEYS = Object.keys(COLORS);

function paintOf(){ const s = scene(); return s ? s.paint : basePaint; }
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
      { id: 'pol-line', type: 'line', source: 'pol', paint: { 'line-color': '#6c665a', 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.3, 5, 0.9], 'line-opacity': 0.8 } },
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
      { id: 'pt', type: 'circle', source: 'pts', filter: ['==', ['get', 'kind'], 'pt'],
        paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': INK, 'circle-stroke-width': 2.2 } },
      { id: 'pt-lbl', type: 'symbol', source: 'pts', filter: ['==', ['get', 'kind'], 'pt'],
        layout: { 'text-field': ['get', 't'], 'text-font': ['Klokantech Noto Sans Bold'], 'text-size': 13,
                  'text-variable-anchor': ['left', 'right', 'top', 'bottom'], 'text-radial-offset': 0.8, 'text-justify': 'auto' },
        paint: { 'text-color': INK, 'text-halo-color': '#ffffff', 'text-halo-width': 1.8 } },
      { id: 'arr-lbl', type: 'symbol', source: 'pts', filter: ['==', ['get', 'kind'], 'arrlbl'],
        layout: { 'text-field': ['get', 't'], 'text-font': ['Klokantech Noto Sans Bold'], 'text-size': 13, 'text-offset': [0, -1] },
        paint: { 'text-color': ['get', 'c'], 'text-halo-color': '#ffffff', 'text-halo-width': 2 } },
      { id: 'lbl', type: 'symbol', source: 'lbl',
        layout: { 'text-field': ['get', 't'], 'text-font': ['Klokantech Noto Sans Bold'],
                  'text-size': ['interpolate', ['linear'], ['zoom'], 1, ['*', ['get', 'sz'], 0.78], 4, ['get', 'sz'], 6, ['*', ['get', 'sz'], 1.25]],
                  'symbol-sort-key': ['-', 0, ['get', 'sz']], 'text-max-width': 8 },
        paint: { 'text-color': ['get', 'c'], 'text-halo-color': 'rgba(255,255,255,0.92)', 'text-halo-width': 1.8 } }
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
const F = (geom, props) => ({ type: 'Feature', geometry: geom, properties: props || {} });
const FC = feats => ({ type: 'FeatureCollection', features: feats });

// ---------- 그리기 ----------
let drawToken = 0, READY = false;
function toast(t){ const el = $('toast'); el.textContent = t; el.hidden = !t; }
async function draw(){
  if (!READY) return;
  const tok = ++drawToken, yr = S.year;
  let pol, nd;
  try { [pol, nd] = await Promise.all([topo('y' + yr), topo('n' + yr)]); toast(''); }
  catch (e){ if (tok === drawToken) toast(yr + '년 지도를 받지 못했다. 인터넷 연결을 확인하고 연도를 다시 눌러 보자.'); console.error('[지구본]', e); return; }
  if (tok !== drawToken) return;   // 그 사이 다른 해를 골랐다
  const paint = paintOf(), focus = focusOf();
  const keyArea = {};   // 나라 이름표 자리: 그 나라(본토) 가장 큰 덩어리
  const feats = pol.features.filter(f => f.geometry).map(f => {
    const r = paint(f.properties.n, yr);
    let c = NEUTRAL, rk = 0;
    if (r && focus.includes(r[0])){
      const [k, col] = r; c = col ? colonyColor(k) : COLORS[k]; rk = col ? 1 : 2;
      if (!col) for (const p of polys(f.geometry)){
        const a = ringArea(p[0]) * Math.cos(ringCentroid(p[0])[1] * Math.PI / 180);
        if (!keyArea[k] || a > keyArea[k].a) keyArea[k] = { a, ll: ringCentroid(p[0]) };
      }
    }
    return F(f.geometry, { n: f.properties.n, c, rk });
  });
  map.getSource('pol').setData(FC(feats));
  map.getSource('nodata').setData(nd);
  drawLabels(keyArea);
  drawOverlay();
  legend(pol);
  $('year').textContent = yr;
}

function drawLabels(keyArea){
  const s = scene(), out = [];
  if (S.names){
    if (s){
      s.labels.filter(onY).filter(onS).filter(l => !l.reveal || $('p-q').open).forEach(l => {
        const ll = (isPhone() && l.llS) ? l.llS : l.ll, t = (isPhone() && l.tS) ? l.tS : l.t;
        out.push(F({ type: 'Point', coordinates: ll }, { t, sz: l.s === 2 ? 17 : l.s === 0 ? 11.5 : 13.5, c: l.k ? shade(l.k) : '#5b5a55' }));
      });
    } else {
      const big = Object.entries(keyArea).sort((a, b) => b[1].a - a[1].a);
      big.forEach(([k, v], i) => out.push(F({ type: 'Point', coordinates: v.ll }, { t: NAMES[k] || k, sz: i < 4 ? 15 : 12.5, c: shade(k) })));
    }
  }
  map.getSource('lbl').setData(FC(out));
}

let pills = [];
function drawOverlay(){
  pills.forEach(m => m.remove()); pills = [];
  const s = scene(), pts = [], arr = [], head = [], inf = [];
  if (s){
    if (s.meridian) pts.push(F({ type: 'LineString', coordinates: Array.from({ length: 81 }, (_, i) => [0, -80 + i * 2]) }, { kind: 'meridian' }));
    s.points.filter(onS).forEach(p => pts.push(F({ type: 'Point', coordinates: p.ll }, { kind: 'pt', t: (isPhone() && p.tS) ? p.tS : p.t })));
    s.arrows.filter(onS).forEach(a => {
      let P = a.pts.slice(); if (P.length === 2) P = bend2(P[0], P[1], a.bend ?? 0.18);
      const line = catmull(P), c = (a.k && a.k !== 'INK') ? COLORS[a.k] : INK;
      arr.push(F({ type: 'LineString', coordinates: line }, { c, dash: !!a.dash }));
      head.push(F({ type: 'Point', coordinates: line[line.length - 1] }, { c, b: bearing(line[line.length - 3] || line[0], line[line.length - 1]) }));
      if (a.both) head.push(F({ type: 'Point', coordinates: line[0] }, { c, b: bearing(line[2] || line[1], line[0]) }));
      if (a.label){
        const at = a.li != null ? a.pts[Math.min(a.li, a.pts.length - 1)] : line[Math.floor(line.length / 2)];
        pts.push(F({ type: 'Point', coordinates: at }, { kind: 'arrlbl', t: (isPhone() && a.labelS) ? a.labelS : a.label, c }));
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
  pol.features.forEach(f => { const r = paint(f.properties.n, S.year); if (r && focus.includes(r[0])){ const v = seen.get(r[0]) || {}; r[1] ? v.col = true : v.home = true; seen.set(r[0], v); } });
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
function stepCurrent(){ document.querySelectorAll('#p-steps button').forEach(b => b.setAttribute('aria-current', +b.dataset.i === S.si)); }

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
  if (e - w > 150){ flyC([(w + e) / 2, 20], isPhone() ? 0.95 : 1.75, 2000); return; }
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
function setYear(y){ S.year = y; if (S.sc >= 0){ S.si = -1; stepCurrent(); } syncChips(); draw(); url(); }
function startYear(s, i){ return (s.steps[i] && s.steps[i].yr) || s.year || S.year; }
function go(i){
  const prev = S.sc;
  S.sc = i; S.si = 0;
  if (i >= 0) S.year = startYear(SCENES[i], 0);
  syncChips(); panel(); draw(); fly(); url();
  if (i >= 0){ const h = $('p-head').querySelector('h2'); if (h) h.focus({ preventScroll: true }); }
  else if (prev >= 0){ const c = document.querySelector(`#scenes .chip[data-s="${prev}"]`); if (c) c.focus({ preventScroll: true }); }
}
function step(i){ const s = scene(); S.si = i; S.year = startYear(s, i); stepCurrent(); syncChips(); draw(); url(); }

// ---------- 손 ----------
$('years').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) setYear(+b.dataset.y); });
$('scenes').addEventListener('click', e => { const b = e.target.closest('.chip'); if (b) go(+b.dataset.s === S.sc ? -1 : +b.dataset.s); });
$('p-steps').addEventListener('click', e => { const b = e.target.closest('button'); if (b) step(+b.dataset.i); });
$('p-inf').addEventListener('click', e => { const b = e.target.closest('button[data-go]'); if (b) go(+b.dataset.go); });
$('p-close').addEventListener('click', () => go(-1));
$('p-mini').addEventListener('click', () => { S.mini = !S.mini; $('panel').classList.toggle('mini', S.mini); $('p-mini').textContent = S.mini ? '▴ 설명 펴기' : '▾ 설명 접기'; fly(); });
$('lg-toggle').addEventListener('click', e => { const o = $('bottom').classList.toggle('lg-open'); e.currentTarget.setAttribute('aria-expanded', o); });
$('p-q').addEventListener('toggle', () => draw());
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
  topo('land').then(l => map.getSource('land').setData(l));
  panel(); draw(); syncChips();
  if (S.sc >= 0){ stepCurrent(); fly(); }
  window.__ready = true;
});
map.on('error', e => console.error('[지구본]', e.error && e.error.message));
function navVar(){ document.documentElement.style.setProperty('--nav', $('bottom').offsetHeight + 'px'); }
navVar();
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { navVar(); if (scene()) $('panel').classList.toggle('mini', isPhone() && S.mini); draw(); }, 200); });
