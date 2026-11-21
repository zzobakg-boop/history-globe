"""CShapes 단위 이름 — 검토 둘(cs_A·cs_B)을 맞춰 data/names_cs.json을 만든다.
채택: 둘이 같은 이름(띄어쓰기·에스파냐/스페인 무시)이고 둘 다 확신이 low가 아니고 period_ok가 no가 아님 → 그 이름.
      아니면 A가 high·period_ok yes이고 B도 low가 아님 → A 이름(지난 두 차례와 같은 규칙).
      나머지는 이름을 달지 않는다(지어내지 않는다). 갈린 줄은 cs_disagree.tsv로 남겨 사람이 본다."""
import csv, json, os
H = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: list(csv.DictReader(open(os.path.join(H, f)), delimiter='\t'))
A, B = rd('cs_A.tsv'), rd('cs_B.tsv')
assert len(A) == len(B) and all(a['gwcode'] == b['gwcode'] and a['year'] == b['year'] for a, b in zip(A, B)), '두 검토의 행이 어긋남'
norm = lambda t: t.replace('에스파냐', '스페인').strip()
key = lambda t: norm(t).replace(' ', '')
out, dis = {}, []
for a, b in zip(A, B):
    ka, kb = norm(a['korean']), norm(b['korean'])
    ok = lambda r: r['confidence'] != 'low' and r['period_ok'] != 'no'
    if ka and key(ka) == key(kb) and ok(a) and ok(b): t = ka
    elif ka and a['confidence'] == 'high' and a['period_ok'] == 'yes' and ok(b): t = ka   # B도 low·시대 no가 아니어야(독립 리뷰 낮음 11)
    else: t = None
    if key(ka) != key(kb): dis.append([a['year'], a['gwcode'], a['cshapes_name'], ka, kb, a['confidence'], b['confidence'], 'A' if t else '숨김'])
    if t: out.setdefault(a['year'], {})[a['gwcode']] = t
# 사람이 가른 것(검토 둘 다 medium이라 숨겨진 넓은 땅) — 근거를 남긴다(11/21 역사)
MANUAL = {('1900', '815'): '베트남', ('1914', '815'): '베트남',   # 두 검토 모두 같은 땅으로 봄, 표기만 갈림(안남·통킹·코친차이나) — 교과서 5-3 서술 «베트남»
          ('1914', '484'): '중부 콩고',                           # Moyen-Congo, OHM 1903~1910 «모옌콩고 식민지» — 뜻을 옮긴 A 표기
          ('1914', '822'): '말레이 비연방주',                       # B high
          ('1900', '490'): '콩고 자유국(벨기에 국왕)',   # 1885~1908 레오폴드 2세의 개인 땅 — 벨기에 나라 땅이 아니다(아시아 장면 범례 «벨기에 국왕의 땅»과 같게)
          # 사회 학생 눈(11/21 ℹ️): 중2에게 낯선 이름을 풀되 시대는 지킨다 — 독일 식민지의 이름은 Togo(Togoland는 영어 별칭), 가라후토는 사할린 남부
          ('1900', '460'): '토고', ('1914', '460'): '토고', ('1914', '7351'): '사할린 남부',
          ('1900', '730'): '대한 제국'}   # 흐름 지도·장면 표기와 띄어쓰기 맞춤(독립 리뷰 낮음 12)
for (y, gw), t in MANUAL.items(): out.setdefault(y, {})[gw] = t
json.dump(out, open(os.path.join(H, '..', '..', 'data', 'names_cs.json'), 'w'), ensure_ascii=False, indent=0)
w = csv.writer(open(os.path.join(H, 'cs_disagree.tsv'), 'w'), delimiter='\t')
w.writerow(['year', 'gwcode', 'cshapes_name', 'A', 'B', 'A_conf', 'B_conf', '채택']); w.writerows(dis)
print('이름', sum(len(v) for v in out.values()), '/', len(A), '· 갈림', len(dis), '· 숨김', len(A) - sum(len(v) for v in out.values()))
