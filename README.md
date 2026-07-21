# 📅 Prompt Calendar — 프롬프트 기반 일정 관리 웹앱

예스 이앤씨 인턴십 토이 프로젝트. **모든 코드를 LLM 프롬프트로 생성**하고, 전 과정을 프롬프트 로그북·WBS로 관리하며 Step 0~7 단계로 구축한 GitHub Pages 일정 관리 앱.

- **배포**: https://poppypoppypiggy.github.io/prompt-calendar/
- **기술**: 순수 HTML / CSS / Vanilla JS — 프레임워크·빌드 도구 없음, 정적 호스팅
- **데이터**: 레포 내 `data/events/{userId}.json` 파일 DB + GitHub Contents API 동기화

## 주요 기능

| 분류 | 기능 |
|---|---|
| 뷰 | 월 / 주 / 일 / 목록(30일) 뷰, 오늘 하이라이트, 이전·다음 이동 |
| 일정 | 생성·조회·수정·삭제, 종일 일정, 드래그로 날짜 이동, 반복(매일·매주·매월·매년), 멀티데이 표시 |
| 캘린더 | 복수 캘린더(카테고리) 생성, 색상 지정, 표시/숨김, 삭제 시 일정 자동 이관 |
| 데이터 | 사용자별 분리 저장, GitHub 레포 실시간 동기화(커밋 = 변경 로그), 오프라인 localStorage 폴백, JSON 내보내기/가져오기 |
| 부가 | 일정 검색(제목·설명·장소) |

## 아키텍처

```
브라우저 (GitHub Pages 정적 서빙)
 ├─ index.html / css/style.css
 ├─ js/storage.js   … localStorage 저장소 (EventStore, CalendarStoreDB)
 ├─ js/github.js    … GitHub Contents API 동기화 (읽기: 무토큰 / 쓰기: PAT)
 ├─ js/calendar.js  … 4개 뷰 렌더링 + 반복·멀티데이 occurrence 전개 엔진
 └─ js/app.js       … 초기화·CRUD·검색·가져오기/내보내기·사용자/토큰 관리
데이터 (동일 레포)
 └─ data/users.json, data/events/{userId}.json  ← 앱이 커밋으로 갱신
```

**동기화 흐름**: 페이지 로드 → 레포에서 pull(토큰 불필요) → localStorage 캐시 → 일정 변경 시 즉시 push(토큰 필요, 커밋 생성). 오프라인·무토큰이면 localStorage로 동작하고 상태 배지로 표시.

## 사용 방법

1. 배포 URL 접속 → 사용자 선택
2. (쓰기 동기화) 🔑 토큰 설정에 Fine-grained PAT 입력 — `prompt-calendar` 레포 + Contents Read/write 권한만. 토큰은 브라우저 localStorage에만 저장됨
3. 날짜 클릭 = 일정 생성, 일정 클릭 = 상세/수정/삭제, 칩 드래그 = 날짜 이동

## 제약 사항 (토이 프로젝트 단순화)

- 동시 쓰기는 마지막 쓰기 승리(sha 충돌 시 1회 재시도)
- 캘린더 카테고리 목록은 브라우저 로컬 저장 (일정만 레포 동기화)
- 드래그 이동은 데스크톱 전용, 반복 일정은 드래그 제외
- 비인증 읽기는 GitHub API 제한(시간당 60회) 적용
- 우선순위 C 항목(미니캘린더, 브라우저 알림, Todo, 공휴일)은 범위 조정으로 보류

## 진행 이력 (Step 0~7)

- [x] Step 0: 요구사항 확정 — requirements.md v1.0 (FR 27개, NFR 6개)
- [x] Step 1: 골격 배포 (레포 생성, Pages 활성화, 배포 검증 페이지)
- [x] Step 2: 월 뷰 캘린더 (FR-VIEW-01, 05, 06)
- [x] Step 3: 일정 CRUD + 드래그 이동 (FR-EVENT-01~05, 07)
- [x] Step 4: 캘린더 카테고리·색상 (FR-CAL-01~03)
- [x] Step 5: GitHub 레포 데이터 연동 (FR-USER-01~04)
- [x] Step 6: 주/일/목록 뷰·반복·멀티데이·검색·내보내기 (FR-VIEW-02~04, FR-EVENT-06·08, FR-ETC-01·05)
- [x] Step 7: 마감 — 반응형 보강, 문서화, 로그북·WBS 정리

## 산출물

| 산출물 | 위치 |
|---|---|
| 배포 웹앱 | https://poppypoppypiggy.github.io/prompt-calendar/ |
| 소스 코드 | 본 레포 (모든 커밋 이력 = 개발 로그) |
| 요구사항 정의서 | requirements.md v1.0 |
| 프롬프트 로그북 + WBS + 요구사항 추적표 | 프롬프트_관리대장.xlsx |
