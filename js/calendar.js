// Step 2: 월 뷰 캘린더 렌더링 모듈 (FR-VIEW-01, 05, 06)
// - renderCalendar(year, month): 해당 연·월의 격자를 #calendar-root에 렌더링
// - 이벤트 표시 훅(renderEventsOfDay)은 Step 3에서 실제 데이터와 연결됨

const CalendarState = {
  viewYear: null,   // 현재 보고 있는 연도
  viewMonth: null,  // 현재 보고 있는 월 (0~11)
  events: []        // Step 3: 일정 데이터가 여기에 로드됨
};

function initCalendar() {
  const now = new Date();
  CalendarState.viewYear = now.getFullYear();
  CalendarState.viewMonth = now.getMonth();
  renderCalendar();
}

function renderCalendar() {
  const y = CalendarState.viewYear;
  const m = CalendarState.viewMonth;
  const root = document.getElementById("calendar-root");
  root.innerHTML = "";

  // 상단 라벨 갱신 (예: 2026년 7월)
  document.getElementById("current-month-label").textContent = `${y}년 ${m + 1}월`;

  const firstDay = new Date(y, m, 1);
  const startWeekday = firstDay.getDay();          // 이번 달 1일의 요일 (0=일)
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();

  const today = new Date();
  const isThisMonth = today.getFullYear() === y && today.getMonth() === m;

  // 6주 × 7일 = 42칸 고정 렌더링 (달마다 격자 높이가 흔들리지 않도록)
  for (let i = 0; i < 42; i++) {
    const dayOffset = i - startWeekday + 1; // 이번 달 기준 날짜
    const cell = document.createElement("div");
    cell.className = "day-cell";

    let cellDate, dayNum;
    if (dayOffset < 1) {
      // 이전 달 날짜 (흐리게)
      dayNum = daysInPrevMonth + dayOffset;
      cellDate = new Date(y, m - 1, dayNum);
      cell.classList.add("other-month");
    } else if (dayOffset > daysInMonth) {
      // 다음 달 날짜 (흐리게)
      dayNum = dayOffset - daysInMonth;
      cellDate = new Date(y, m + 1, dayNum);
      cell.classList.add("other-month");
    } else {
      dayNum = dayOffset;
      cellDate = new Date(y, m, dayNum);
    }

    // 주말 색상
    const wd = cellDate.getDay();
    if (wd === 0) cell.classList.add("sun");
    if (wd === 6) cell.classList.add("sat");

    // FR-VIEW-05: 오늘 하이라이트
    if (isThisMonth && dayOffset === today.getDate()) cell.classList.add("today");

    // 날짜 숫자
    const num = document.createElement("span");
    num.className = "day-num";
    num.textContent = dayNum;
    cell.appendChild(num);

    // Step 3 연결 지점: 해당 날짜의 일정 요약 표시 영역
    const evBox = document.createElement("div");
    evBox.className = "day-events";
    renderEventsOfDay(evBox, cellDate);
    cell.appendChild(evBox);

    // Step 3 연결 지점: 날짜 클릭 → 일정 생성 (현재는 자리만 확보)
    cell.dataset.date = toDateKey(cellDate);

    root.appendChild(cell);
  }
}

// Step 3에서 실제 일정 데이터로 대체될 훅
function renderEventsOfDay(container, date) {
  const key = toDateKey(date);
  const dayEvents = CalendarState.events.filter(ev => ev.dateKey === key);
  dayEvents.slice(0, 3).forEach(ev => {
    const chip = document.createElement("div");
    chip.className = "event-chip";
    chip.textContent = ev.title;
    container.appendChild(chip);
  });
  if (dayEvents.length > 3) {
    const more = document.createElement("div");
    more.className = "event-more";
    more.textContent = `+${dayEvents.length - 3}건`;
    container.appendChild(more);
  }
}

// FR-VIEW-06: 이전/다음 달 이동
function moveMonth(delta) {
  const d = new Date(CalendarState.viewYear, CalendarState.viewMonth + delta, 1);
  CalendarState.viewYear = d.getFullYear();
  CalendarState.viewMonth = d.getMonth();
  renderCalendar();
}

// FR-VIEW-05: 오늘로 이동
function goToday() {
  const now = new Date();
  CalendarState.viewYear = now.getFullYear();
  CalendarState.viewMonth = now.getMonth();
  renderCalendar();
}

// 날짜 → "YYYY-MM-DD" 키 (로컬 기준)
function toDateKey(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
