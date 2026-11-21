# 역사 지구본

중학교 역사① 수업용 지구본. 연도를 고르면 그 무렵 나라 경계가 칠해지고, 장면을 누르면 그곳으로 날아가 교과서 내용을 단계별로 보여 준다.

- 지금 담긴 단원: Ⅴ단원(혁명에서 제국주의까지, 교과서 145~167쪽) — 내용은 Ⅴ단원 흐름 지도 v3과 같다.
- 엔진: MapLibre GL JS 5.24.1(지구본 + 지형), PMTiles 4.3.0, topojson-client 3.1.0 — 학교망에서 CDN이 막혀도 돌게 `lib/`에 직접 둔다(라이선스 파일 같이).
- 한글 이름표는 기기 글꼴(Apple SD Gothic Neo·맑은 고딕·Noto Sans KR)로 그린다 — 크롬북·안드로이드 탭은 모양이 조금 다를 수 있다.
- 검증: `python3 tools/globe_verify.py <주소> <캡처 폴더>`

## 자료 출처
- 나라 경계: Cliopatria v0.2.1 (Seshat Global History Databank), CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) — 해안선을 Natural Earth 10m 땅에 맞춰 자름(`tools/build_borders.py`), 이름을 한국어로 바꿈. 교과서 밖 나라 이름(`data/names_ko.json`)은 독립 검토 둘이 맞춘 것만 싣고, 확인 안 된 이름은 숨긴다
- 1900·1914년 나라·식민지 경계: CShapes 2.0 (ETH 취리히, https://icr.ethz.ch/data/cshapes/), CC BY-NC-SA 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/). 지위·지배국 열은 CRAN `cshapes` 2.0 패키지판에서 붙였다. CShapes가 안 덮는 땅(아라비아 안쪽 등)만 Cliopatria로 채운다. 이 때문에 `data/u5/y1900.json`·`y1914.json`은 CC BY-NC-SA 4.0(비영리·같은 조건 공유)이다. CShapes는 1만㎢ 아래 변화를 넣지 않고, 경계가 정해지지 않았던 곳은 오늘날 경계를 거슬러 썼다(자료 설명서).
- 1900·1914년 이름(`data/names_cs.json`): OpenHistoricalMap(CC0) 이름 목록·위키백과를 보고 독립 검토 둘이 맞춘 것(`tools/names/cs_A.tsv`·`cs_B.tsv`, 갈린 것 `cs_disagree.tsv`, 사람 판정은 `merge_cs.py` MANUAL)
- 산 높이: ETOPO 2022 (NOAA NCEI) — 미국 정부 저작물. `tools/dem_tiles.py`로 줌 0~5 terrarium 타일로 만듦(바다는 0으로 누름)
- 2026년(현재) 나라 경계·이름: Natural Earth 10m admin 0 countries 5.1.1 (퍼블릭 도메인). 한국 기준 묶음(ADM0_A3_KO)을 쓰고, 기본판의 실효 지배 경계 가운데 두 곳을 한국 정부 입장으로 고쳤다 — 크림(NE admin 1 UA-43·UA-40)은 우크라이나, 북위 27°40′ 남쪽 모로코 땅은 서사하라. 골란 고원·동예루살렘은 원자료대로 이스라엘 쪽에 남아 있다. 땅 바탕에 없는 섬(울릉도 등)은 NE 도형 그대로 두고, 독도는 도형이 좌표 격자보다 작아 이름표로 둔다. 이름은 NAME_KO에서 일부를 외교부·교과서 표기로 바꿨다(`tools/build_borders.py` NE_NAME)
- 땅 바탕: Natural Earth (퍼블릭 도메인)
- 글꼴 조각: Noto Sans (SIL OFL 1.1, `fonts/OFL.txt`), openmaptiles/fonts에서 받음
