# Prompt Calendar — 프롬프트 기반 일정 관리 웹앱

예스 이앤씨 인턴십 토이 프로젝트. LLM 프롬프트로 단계별(Step 0~7) 구현하는 GitHub Pages 일정 관리 앱.

- 배포: https://poppypoppypiggy.github.io/prompt-calendar/
- 기술: 순수 HTML / CSS / Vanilla JS (정적 호스팅)
- 데이터: 레포 내 `data/*.json` 파일 DB (Step 5에서 GitHub Contents API 연동)

## 폴더 구조
```
index.html          # 메인 페이지
css/style.css       # 스타일
js/app.js           # 앱 로직
data/users.json     # 사용자 목록 (파일 DB)
data/events/*.json  # 사용자별 일정 데이터
.nojekyll           # GitHub Pages Jekyll 처리 비활성화
```

## 진행 상태
- [x] Step 0: 요구사항 확정 (requirements.md v1.0)
- [x] Step 1: 골격 배포
- [ ] Step 2: 월 뷰 캘린더 (FR-VIEW-01, 05, 06)
- [ ] Step 3: 일정 CRUD — localStorage (FR-EVENT-01~05)
- [ ] Step 4: 캘린더 카테고리·색상 (FR-CAL-01~03)
- [ ] Step 5: GitHub 레포 데이터 연동 (FR-USER-01~04)
- [ ] Step 6: 부가 뷰·기능
- [ ] Step 7: 마감·문서화
