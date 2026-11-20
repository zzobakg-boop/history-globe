# 역사 지구본

중학교 역사① 수업용 지구본. 연도를 고르면 그 무렵 나라 경계가 칠해지고, 장면을 누르면 그곳으로 날아가 교과서 내용을 단계별로 보여 준다.

- 지금 담긴 단원: Ⅴ단원(혁명에서 제국주의까지, 교과서 145~167쪽) — 내용은 Ⅴ단원 흐름 지도 v3과 같다.
- 엔진: MapLibre GL JS 5.24.1(지구본 + 지형), PMTiles 4.3.0, topojson-client 3.1.0 — 학교망에서 CDN이 막혀도 돌게 `lib/`에 직접 둔다(라이선스 파일 같이).
- 한글 이름표는 기기 글꼴(Apple SD Gothic Neo·맑은 고딕·Noto Sans KR)로 그린다 — 크롬북·안드로이드 탭은 모양이 조금 다를 수 있다.
- 검증: `python3 tools/globe_verify.py <주소> <캡처 폴더>`

## 자료 출처
- 나라 경계: Cliopatria v0.2.1 (Seshat Global History Databank), CC BY 4.0 — 단순화함
- 산 높이: ETOPO 2022 (NOAA NCEI) — 미국 정부 저작물. `tools/dem_tiles.py`로 줌 0~5 terrarium 타일로 만듦(바다는 0으로 누름)
- 땅 바탕: Natural Earth (퍼블릭 도메인)
- 글꼴 조각: Noto Sans (SIL OFL 1.1, `fonts/OFL.txt`), openmaptiles/fonts에서 받음
