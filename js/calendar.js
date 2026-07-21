// Step 2~6 통합 캘린더 렌더링 모듈
// Step 6: 주/일/목록 뷰(FR-VIEW-02~04), 반복 일정(FR-EVENT-06), 멀티데이 표시(FR-EVENT-08)

const CalendarState = {
  anchor: null,        // 뷰 기준 날짜
  viewMode: "month",  // month | week | day | agenda
  events: []
};

const HOUR_PX = 40;      // 주/일 뷰 1시간 높이
const AGENDA_DAYS = 30;  // 목록 뷰 표시 기간

function initCalendar() {
  CalendarState.anchor = new Date();
  reloadEvents();
  renderView();
}

function reloadEvents() {
  CalendarState.events = EventStore.load();
}

/* =====================================================
   뷰 전환 (FR-VIEW-02~04)
===================================================== */
function setViewMode(mode) {
  CalendarState.viewMode = mode;
  document.querySelectorAll(".view-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.view === mode));
  renderView();
}

function renderView() {
  const show = (id, on) => document.getElementById(id).classList.toggle("hidden", !on);
  const m = CalendarState.viewMode;
  show("month-wrap", m === "month");
  show("week-wrap", m === "week" || m === "day");
  show("agenda-wrap", m === "agenda");

  if (m === "month") renderMonth();
  else if (m === "week") renderTimeGrid(7);
  else if (m === "day") renderTimeGrid(1);
  else renderAgenda();
}

// FR-VIEW-06: 이전/다음 (뷰별 이동 단위)
function moveView(delta) {
  const a = CalendarState.anchor;
  if (CalendarState.viewMode === "month") a.setMonth(a.getMonth() + delta);
  else if (CalendarState.viewMode === "week") a.setDate(a.getDate() + 7 * delta);
  else if (CalendarState.viewMode === "day") a.setDate(a.getDate() + delta);
  // agenda는 항상 오늘 기준
  renderView();
}

// FR-VIEW-05: 오늘로 이동
function goToday() {
  CalendarState.anchor = new Date();
  renderView();
}

/* =====================================================
   반복·멀티데이 전개 (FR-EVENT-06, 08)
===================================================== */
// 표시 범위 내 발생(occurrence)을 날짜별 맵으로 전개
function occurrencesByDay(startKey, endKey) {
  const map = {};
  const cals = CalendarStoreDB.load();
  const calMap = Object.fromEntries(cals.map(c => [c.id, c]));
  const rangeStart = new Date(startKey + "T00:00:00");
  const rangeEnd = new Date(endKey + "T23:59:59");

  CalendarState.events.forEach(ev => {
    const cal = calMap[ev.calendar];
    if (cal && !cal.visible) return; // FR-CAL-03

    baseOccurrences(ev, rangeStart, rangeEnd).forEach(occ => {
      // FR-EVENT-08: 기간(멀티데이)만큼 각 날짜에 배치
      let d = new Date(occ.startKey + "T00:00:00");
      const last = new Date(occ.endKey + "T00:00:00");
      let guard = 0;
      while (d <= last && guard++ < 62) {
        if (d >= rangeStart && d <= rangeEnd) {
          const k = toDateKey(d);
          (map[k] = map[k] || []).push({
            ev, ...occ,
            isStart: toDateKey(d) === occ.startKey,
            color: cal ? cal.color : "#4285f4"
          });
        }
        d.setDate(d.getDate() + 1);
      }
    });
  });

  Object.values(map).forEach(list =>
    list.sort((a, b) => (a.ev.allDay === b.ev.allDay
      ? a.startTime.localeCompare(b.startTime) : a.ev.allDay ? -1 : 1)));
  return map;
}

// FR-EVENT-06: 반복 규칙(매일/매주/매월/매년)에 따른 발생 시작일 생성
function baseOccurrences(ev, rangeStart, rangeEnd) {
  const out = [];
  const baseStartKey = ev.start.slice(0, 10);
  const baseEndKey = ev.end.slice(0, 10);
  const durDays = dayDiff(baseStartKey, baseEndKey);
  const times = { startTime: ev.start.slice(11, 16), endTime: ev.end.slice(11, 16) };
  const push = (sKey) => out.push({ startKey: sKey, endKey: shiftKey(sKey, durDays), ...times });

  if (!ev.repeat) {
    // 반복 없음: 기간이 범위와 겹치면 포함
    if (new Date(baseEndKey + "T23:59:59") >= rangeStart && new Date(baseStartKey + "T00:00:00") <= rangeEnd) push(baseStartKey);
    return out;
  }

  const base = new Date(baseStartKey + "T00:00:00");
  const day = base.getDate();
  let guard = 0;
  for (let i = 0; guard < 1000; i++, guard++) {
    let occ;
    if (ev.repeat === "daily") { occ = new Date(base); occ.setDate(base.getDate() + i); }
    else if (ev.repeat === "weekly") { occ = new Date(base); occ.setDate(base.getDate() + 7 * i); }
    else if (ev.repeat === "monthly") {
      occ = new Date(base.getFullYear(), base.getMonth() + i, day);
      if (occ.getDate() !== day) continue; // 예: 31일 반복은 31일 없는 달 건너뜀
    }
    else if (ev.repeat === "yearly") {
      occ = new Date(base.getFullYear() + i, base.getMonth(), day);
      if (occ.getDate() !== day) continue; // 2/29 윤년 처리
    }
    else break;

    if (occ > rangeEnd) break;
    const occKey = toDateKey(occ);
    if (new Date(shiftKey(occKey, durDays) + "T23:59:59") >= rangeStart) push(occKey);
  }
  return out;
}

/* =====================================================
   월 뷰 (FR-VIEW-01) — Step 6에서 occurrence 기반으로 재구성
===================================================== */
function renderMonth() {
  const a = CalendarState.anchor;
  const y = a.getFullYear(), m = a.getMonth();
  const root = document.getElementById("calendar-root");
  root.innerHTML = "";
  document.getElementById("current-month-label").textContent = `${y}년 ${m + 1}월`;

  const startWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();
  const today = new Date();
  const todayKey = toDateKey(today);

  const gridStart = new Date(y, m, 1 - startWeekday);
  const occMap = occurrencesByDay(toDateKey(gridStart), toDateKey(new Date(y, m, 42 - startWeekday)));

  for (let i = 0; i < 42; i++) {
    const dayOffset = i - startWeekday + 1;
    const cell = document.createElement("div");
    cell.className = "day-cell";

    let cellDate;
    if (dayOffset < 1) { cellDate = new Date(y, m - 1, daysInPrevMonth + dayOffset); cell.classList.add("other-month"); }
    else if (dayOffset > daysInMonth) { cellDate = new Date(y, m + 1, dayOffset - daysInMonth); cell.classList.add("other-month"); }
    else cellDate = new Date(y, m, dayOffset);

    const wd = cellDate.getDay();
    if (wd === 0) cell.classList.add("sun");
    if (wd === 6) cell.classList.add("sat");
    const dateKey = toDateKey(cellDate);
    if (dateKey === todayKey) cell.classList.add("today");

    const num = document.createElement("span");
    num.className = "day-num";
    num.textContent = cellDate.getDate();
    cell.appendChild(num);

    const evBox = document.createElement("div");
    evBox.className = "day-events";
    const occs = occMap[dateKey] || [];
    occs.slice(0, 3).forEach(occ => evBox.appendChild(buildChip(occ)));
    if (occs.length > 3) {
      const more = document.createElement("div");
      more.className = "event-more";
      more.textContent = `+${occs.length - 3}건`;
      evBox.appendChild(more);
    }
    cell.appendChild(evBox);

    cell.dataset.date = dateKey;
    cell.addEventListener("click", () => openCreateModal(dateKey));
    cell.addEventListener("dragover", (e) => { e.preventDefault(); cell.classList.add("drag-over"); });
    cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));
    cell.addEventListener("drop", (e) => {
      e.preventDefault();
      cell.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      if (id) moveEventToDate(id, dateKey);
    });

    root.appendChild(cell);
  }
}

// 일정 칩 생성 (월 뷰) — 멀티데이 이어짐 표시, 반복 표시
function buildChip(occ) {
  const ev = occ.ev;
  const chip = document.createElement("div");
  chip.className = "event-chip" + (ev.allDay ? " all-day" : "") + (occ.isStart ? "" : " cont");
  const rep = ev.repeat ? "↻ " : "";
  chip.textContent = !occ.isStart ? `◂ ${ev.title}`
    : ev.allDay ? rep + ev.title : `${rep}${occ.startTime} ${ev.title}`;
  chip.title = ev.title;
  chip.style.background = occ.color;

  // FR-EVENT-07: 드래그 이동 — 반복 일정 제외, 시작일 칩만
  if (!ev.repeat && occ.isStart) {
    chip.draggable = true;
    chip.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", ev.id);
      e.dataTransfer.effectAllowed = "move";
    });
  }
  chip.addEventListener("click", (e) => { e.stopPropagation(); openDetailModal(ev.id); });
  return chip;
}

/* =====================================================
   주/일 뷰 (FR-VIEW-02, 03) — 시간대 타임라인
===================================================== */
function renderTimeGrid(numDays) {
  const a = new Date(CalendarState.anchor);
  const start = new Date(a);
  if (numDays === 7) start.setDate(a.getDate() - a.getDay()); // 주 시작 = 일요일

  const endKey = toDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + numDays - 1));
  const occMap = occurrencesByDay(toDateKey(start), endKey);
  const todayKey = toDateKey(new Date());

  // 라벨
  const label = document.getElementById("current-month-label");
  if (numDays === 1) {
    const wd = ["일","월","화","수","목","금","토"][a.getDay()];
    label.textContent = `${a.getFullYear()}년 ${a.getMonth() + 1}월 ${a.getDate()}일 (${wd})`;
  } else {
    const e = new Date(start); e.setDate(start.getDate() + 6);
    label.textContent = `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 ~ ${e.getMonth() + 1}월 ${e.getDate()}일`;
  }

  // 헤더 + 종일 행
  const head = document.getElementById("tg-head");
  head.innerHTML = "";
  head.appendChild(el("div", "tg-gutter-head", ""));
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = toDateKey(d);
    const h = el("div", "tg-day-head" + (k === todayKey ? " today" : ""),
      `${d.getMonth() + 1}/${d.getDate()} (${["일","월","화","수","목","금","토"][d.getDay()]})`);
    h.addEventListener("click", () => openCreateModal(k));
    // 종일·멀티데이 일정
    const ad = el("div", "tg-allday", "");
    (occMap[k] || []).filter(o => o.ev.allDay).slice(0, 3).forEach(o => {
      const c = el("div", "event-chip all-day", (o.isStart ? "" : "◂ ") + o.ev.title);
      c.style.background = o.color;
      c.addEventListener("click", (e) => { e.stopPropagation(); openDetailModal(o.ev.id); });
      ad.appendChild(c);
    });
    h.appendChild(ad);
    head.appendChild(h);
  }

  // 시간 격자
  const gutter = document.getElementById("tg-gutter");
  gutter.innerHTML = "";
  for (let h = 0; h < 24; h++) gutter.appendChild(el("div", "tg-hour-label", `${String(h).padStart(2, "0")}:00`));

  const cols = document.getElementById("tg-cols");
  cols.innerHTML = "";
  cols.style.gridTemplateColumns = `repeat(${numDays}, 1fr)`;
  for (let i = 0; i < numDays; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const k = toDateKey(d);
    const col = el("div", "tg-col" + (k === todayKey ? " today" : ""), "");
    col.style.height = (24 * HOUR_PX) + "px";
    col.addEventListener("click", () => openCreateModal(k));

    (occMap[k] || []).filter(o => !o.ev.allDay).forEach(o => {
      const [sh, sm] = o.startTime.split(":").map(Number);
      // 같은 날 안에서의 종료 시각 (멀티데이 시간 일정은 그 날 끝까지)
      const sameDayEnd = (o.startKey === o.endKey);
      const [eh, em] = sameDayEnd ? o.endTime.split(":").map(Number) : [24, 0];
      const top = (sh + sm / 60) * HOUR_PX;
      const height = Math.max(((eh + em / 60) - (sh + sm / 60)) * HOUR_PX, 18);
      const block = el("div", "tg-event", `${o.ev.repeat ? "↻ " : ""}${o.startTime} ${o.ev.title}`);
      block.style.top = top + "px";
      block.style.height = height + "px";
      block.style.background = o.color;
      block.title = o.ev.title;
      block.addEventListener("click", (e) => { e.stopPropagation(); openDetailModal(o.ev.id); });
      col.appendChild(block);
    });
    cols.appendChild(col);
  }

  // 오전 7시 근처로 스크롤
  document.getElementById("tg-scroll").scrollTop = 7 * HOUR_PX;
}

/* =====================================================
   목록(Agenda) 뷰 (FR-VIEW-04) — 오늘부터 30일
===================================================== */
function renderAgenda() {
  const today = new Date();
  const endD = new Date(today); endD.setDate(today.getDate() + AGENDA_DAYS - 1);
  const occMap = occurrencesByDay(toDateKey(today), toDateKey(endD));
  document.getElementById("current-month-label").textContent = `다가오는 일정 (${AGENDA_DAYS}일)`;

  const root = document.getElementById("agenda-root");
  root.innerHTML = "";
  let count = 0;
  for (let i = 0; i < AGENDA_DAYS; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const k = toDateKey(d);
    const occs = (occMap[k] || []).filter(o => o.isStart); // 시작일 기준 1회만 표시
    if (!occs.length) continue;
    count += occs.length;

    const wd = ["일","월","화","수","목","금","토"][d.getDay()];
    root.appendChild(el("div", "agenda-date" + (i === 0 ? " today" : ""),
      `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd})${i === 0 ? " · 오늘" : ""}`));

    occs.forEach(o => {
      const row = el("div", "agenda-item", "");
      const dot = el("span", "cal-dot", ""); dot.style.background = o.color;
      row.appendChild(dot);
      row.appendChild(el("span", "agenda-time", o.ev.allDay ? "종일" : `${o.startTime}~${o.startKey === o.endKey ? o.endTime : "…"}`));
      row.appendChild(el("span", "agenda-title", `${o.ev.repeat ? "↻ " : ""}${o.ev.title}${o.ev.location ? " · " + o.ev.location : ""}`));
      row.addEventListener("click", () => openDetailModal(o.ev.id));
      root.appendChild(row);
    });
  }
  if (!count) root.appendChild(el("p", "agenda-empty", "다가오는 일정이 없습니다."));
}

/* =====================================================
   드래그 이동 (FR-EVENT-07)
===================================================== */
function moveEventToDate(id, targetKey) {
  const ev = EventStore.get(id);
  if (!ev || ev.repeat) return; // 반복 일정은 드래그 이동 제외
  const startKey = ev.start.slice(0, 10);
  if (startKey === targetKey) return;
  const diffDays = dayDiff(startKey, targetKey);
  ev.start = shiftKey(startKey, diffDays) + ev.start.slice(10);
  ev.end = shiftKey(ev.end.slice(0, 10), diffDays) + ev.end.slice(10);
  if (EventStore.update(ev)) {
    reloadEvents();
    renderView();
    if (typeof syncPush === "function") syncPush();
  }
}

/* ===== 날짜 유틸 ===== */
function toDateKey(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
function dayDiff(fromKey, toKey) {
  return Math.round((new Date(toKey + "T00:00:00") - new Date(fromKey + "T00:00:00")) / 86400000);
}
function shiftKey(key, days) {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}
function el(tag, cls, text) {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// 하위 호환: 기존 코드에서 renderCalendar() 호출 시 현재 뷰 재렌더
function renderCalendar() { renderView(); }
