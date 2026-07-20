// Step 2~3: 월 뷰 캘린더 렌더링 모듈
// Step 2: 격자·오늘 하이라이트·네비게이션 (FR-VIEW-01, 05, 06)
// Step 3: 일정 표시·날짜 클릭 생성·일정 클릭 상세 (FR-EVENT-01~05 연동)

const CalendarState = {
  viewYear: null,
  viewMonth: null,
  events: []   // EventStore에서 로드된 일정 목록
};

function initCalendar() {
  const now = new Date();
  CalendarState.viewYear = now.getFullYear();
  CalendarState.viewMonth = now.getMonth();
  reloadEvents();
  renderCalendar();
}

// Step 3: 저장소에서 일정 다시 읽기
function reloadEvents() {
  CalendarState.events = EventStore.load();
}

function renderCalendar() {
  const y = CalendarState.viewYear;
  const m = CalendarState.viewMonth;
  const root = document.getElementById("calendar-root");
  root.innerHTML = "";

  document.getElementById("current-month-label").textContent = `${y}년 ${m + 1}월`;

  const firstDay = new Date(y, m, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();

  const today = new Date();
  const isThisMonth = today.getFullYear() === y && today.getMonth() === m;

  for (let i = 0; i < 42; i++) {
    const dayOffset = i - startWeekday + 1;
    const cell = document.createElement("div");
    cell.className = "day-cell";

    let cellDate, dayNum;
    if (dayOffset < 1) {
      dayNum = daysInPrevMonth + dayOffset;
      cellDate = new Date(y, m - 1, dayNum);
      cell.classList.add("other-month");
    } else if (dayOffset > daysInMonth) {
      dayNum = dayOffset - daysInMonth;
      cellDate = new Date(y, m + 1, dayNum);
      cell.classList.add("other-month");
    } else {
      dayNum = dayOffset;
      cellDate = new Date(y, m, dayNum);
    }

    const wd = cellDate.getDay();
    if (wd === 0) cell.classList.add("sun");
    if (wd === 6) cell.classList.add("sat");
    if (isThisMonth && dayOffset === today.getDate() && dayOffset >= 1 && dayOffset <= daysInMonth) {
      cell.classList.add("today");
    }

    const num = document.createElement("span");
    num.className = "day-num";
    num.textContent = dayNum;
    cell.appendChild(num);

    const evBox = document.createElement("div");
    evBox.className = "day-events";
    renderEventsOfDay(evBox, cellDate);
    cell.appendChild(evBox);

    // FR-EVENT-01: 날짜 클릭 → 해당 날짜로 일정 생성 모달
    const dateKey = toDateKey(cellDate);
    cell.dataset.date = dateKey;
    cell.addEventListener("click", () => openCreateModal(dateKey));

    root.appendChild(cell);
  }
}

// 해당 날짜의 일정 칩 렌더링 (표시 기준: 시작일. 멀티데이 바 표시는 Step 6 FR-EVENT-08)
function renderEventsOfDay(container, date) {
  const key = toDateKey(date);
  const dayEvents = CalendarState.events
    .filter(ev => ev.start.slice(0, 10) === key)
    .sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1));

  dayEvents.slice(0, 3).forEach(ev => {
    const chip = document.createElement("div");
    chip.className = "event-chip" + (ev.allDay ? " all-day" : "");
    chip.textContent = ev.allDay ? ev.title : `${ev.start.slice(11, 16)} ${ev.title}`;
    chip.title = ev.title;
    // FR-EVENT-02: 일정 클릭 → 상세 모달 (날짜 셀 클릭과 분리)
    chip.addEventListener("click", (e) => {
      e.stopPropagation();
      openDetailModal(ev.id);
    });
    container.appendChild(chip);
  });
  if (dayEvents.length > 3) {
    const more = document.createElement("div");
    more.className = "event-more";
    more.textContent = `+${dayEvents.length - 3}건`;
    container.appendChild(more);
  }
}

function moveMonth(delta) {
  const d = new Date(CalendarState.viewYear, CalendarState.viewMonth + delta, 1);
  CalendarState.viewYear = d.getFullYear();
  CalendarState.viewMonth = d.getMonth();
  renderCalendar();
}

function goToday() {
  const now = new Date();
  CalendarState.viewYear = now.getFullYear();
  CalendarState.viewMonth = now.getMonth();
  renderCalendar();
}

function toDateKey(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
