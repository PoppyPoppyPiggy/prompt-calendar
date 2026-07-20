// Step 2: 앱 초기화 및 이벤트 바인딩
document.addEventListener("DOMContentLoaded", () => {
  initCalendar();

  document.getElementById("btn-prev").addEventListener("click", () => moveMonth(-1));
  document.getElementById("btn-next").addEventListener("click", () => moveMonth(1));
  document.getElementById("btn-today").addEventListener("click", goToday);

  // 파일 DB 접근 상태 점검 (Step 1 검증 로직 유지 — 콘솔로 이동)
  fetch("data/users.json")
    .then(res => res.json())
    .then(json => console.log(`[파일 DB] users.json 로드 성공: 사용자 ${json.users.length}명`))
    .catch(err => console.warn("[파일 DB] users.json 로드 실패", err));
});
