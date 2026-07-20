// Step 1: 배포 검증 스크립트 — CSS/JS/데이터 파일 로드 여부 확인
document.addEventListener("DOMContentLoaded", () => {
  // JS 로드 확인
  setStatus("js-status", true);

  // CSS 로드 확인 (스타일시트 적용 여부 검사)
  const cssLoaded = getComputedStyle(document.body).fontFamily.length > 0
    && document.styleSheets.length > 0;
  setStatus("css-status", cssLoaded);

  // 데이터 파일(파일 DB) 접근 확인 — Step 5 레포 연동의 사전 검증
  fetch("data/users.json")
    .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); })
    .then(json => setStatus("data-status", true, `성공 (사용자 ${json.users.length}명 로드)`))
    .catch(() => setStatus("data-status", false, "실패 — data/users.json 경로 확인"));

  // 오늘 날짜 표시
  const t = new Date();
  document.getElementById("today-display").textContent =
    `오늘: ${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일`;
});

function setStatus(id, ok, msg) {
  const el = document.getElementById(id);
  el.textContent = msg || (ok ? "성공" : "실패");
  el.className = ok ? "ok" : "fail";
}
