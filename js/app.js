// Step 3: 앱 초기화, 모달 제어, 일정 CRUD (FR-EVENT-01~05)
let editingId = null; // null = 생성 모드, 값 있으면 수정 모드

document.addEventListener("DOMContentLoaded", () => {
  initCalendar();
  renderCalendarPanel(); // Step 4: 캘린더 패널

  // 네비게이션 (Step 2)
  document.getElementById("btn-prev").addEventListener("click", () => moveMonth(-1));
  document.getElementById("btn-next").addEventListener("click", () => moveMonth(1));
  document.getElementById("btn-today").addEventListener("click", goToday);

  // Step 4: 캘린더 추가 (FR-CAL-01, 02)
  document.getElementById("cal-add").addEventListener("click", addCalendarFromPanel);

  // 툴바 새 일정 버튼
  document.getElementById("btn-new-event").addEventListener("click", () => openCreateModal(toDateKey(new Date())));

  // 일정 폼 모달 버튼
  document.getElementById("ev-save").addEventListener("click", saveEventFromForm);
  document.getElementById("ev-cancel").addEventListener("click", () => closeModal("event-modal"));
  document.getElementById("ev-allday").addEventListener("change", toggleTimeInputs);

  // 상세 모달 버튼
  document.getElementById("dt-close").addEventListener("click", () => closeModal("detail-modal"));
  document.getElementById("dt-edit").addEventListener("click", editFromDetail);
  document.getElementById("dt-delete").addEventListener("click", deleteFromDetail);

  // 오버레이 클릭 시 닫기
  document.querySelectorAll(".modal-overlay").forEach(ov => {
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.remove("open"); });
  });
});

/* ===== FR-EVENT-01: 생성 모달 ===== */
function openCreateModal(dateKey) {
  editingId = null;
  document.getElementById("modal-title").textContent = "일정 만들기";
  document.getElementById("ev-title").value = "";
  document.getElementById("ev-allday").checked = false;
  document.getElementById("ev-start-date").value = dateKey;
  document.getElementById("ev-start-time").value = "09:00";
  document.getElementById("ev-end-date").value = dateKey;
  document.getElementById("ev-end-time").value = "10:00";
  document.getElementById("ev-location").value = "";
  document.getElementById("ev-desc").value = "";
  fillCalendarSelect("default");
  toggleTimeInputs();
  openModal("event-modal");
  document.getElementById("ev-title").focus();
}

/* ===== FR-EVENT-03: 수정 모달 (동일 폼 재사용) ===== */
function openEditModal(id) {
  const ev = EventStore.get(id);
  if (!ev) return;
  editingId = id;
  document.getElementById("modal-title").textContent = "일정 수정";
  document.getElementById("ev-title").value = ev.title;
  document.getElementById("ev-allday").checked = ev.allDay;
  document.getElementById("ev-start-date").value = ev.start.slice(0, 10);
  document.getElementById("ev-start-time").value = ev.allDay ? "09:00" : ev.start.slice(11, 16);
  document.getElementById("ev-end-date").value = ev.end.slice(0, 10);
  document.getElementById("ev-end-time").value = ev.allDay ? "10:00" : ev.end.slice(11, 16);
  document.getElementById("ev-location").value = ev.location || "";
  document.getElementById("ev-desc").value = ev.description || "";
  fillCalendarSelect(ev.calendar || "default");
  toggleTimeInputs();
  openModal("event-modal");
}

/* ===== 저장 (생성/수정 공용) ===== */
function saveEventFromForm() {
  const title = document.getElementById("ev-title").value.trim();
  const allDay = document.getElementById("ev-allday").checked;   // FR-EVENT-05
  const sd = document.getElementById("ev-start-date").value;
  const ed = document.getElementById("ev-end-date").value;
  const st = allDay ? "00:00" : document.getElementById("ev-start-time").value;
  const et = allDay ? "23:59" : document.getElementById("ev-end-time").value;

  // 입력 검증 (NFR-04)
  if (!title) { alert("제목을 입력해주세요."); return; }
  if (!sd || !ed) { alert("시작/종료 날짜를 입력해주세요."); return; }
  const start = `${sd}T${st}:00`;
  const end = `${ed}T${et}:00`;
  if (end < start) { alert("종료 일시가 시작 일시보다 빠릅니다."); return; }

  const ev = {
    id: editingId,
    title,
    start,
    end,
    allDay,
    calendar: document.getElementById("ev-calendar").value || "default",
    location: document.getElementById("ev-location").value.trim(),
    description: document.getElementById("ev-desc").value.trim(),
    repeat: null          // Step 6: 반복 일정(FR-EVENT-06)
  };

  const ok = editingId ? EventStore.update(ev) : EventStore.add(ev);
  if (ok) {
    closeModal("event-modal");
    reloadEvents();
    renderCalendar();
  }
}

/* ===== FR-EVENT-02: 상세 모달 ===== */
function openDetailModal(id) {
  const ev = EventStore.get(id);
  if (!ev) return;
  document.getElementById("detail-modal").dataset.eventId = id;
  document.getElementById("dt-title").textContent = ev.title;
  document.getElementById("dt-time").textContent = ev.allDay
    ? `${ev.start.slice(0, 10)} (종일)`
    : `${ev.start.slice(0, 10)} ${ev.start.slice(11, 16)} ~ ${ev.end.slice(0, 10)} ${ev.end.slice(11, 16)}`;
  const dtCal = CalendarStoreDB.get(ev.calendar);
  document.getElementById("dt-calendar").innerHTML = dtCal
    ? `<span class="cal-dot" style="background:${dtCal.color}"></span>${dtCal.name}` : "-";
  document.getElementById("dt-location").textContent = ev.location || "-";
  document.getElementById("dt-desc").textContent = ev.description || "-";
  openModal("detail-modal");
}

function editFromDetail() {
  const id = document.getElementById("detail-modal").dataset.eventId;
  closeModal("detail-modal");
  openEditModal(id);
}

/* ===== FR-EVENT-04: 삭제 (확인 후) ===== */
function deleteFromDetail() {
  const id = document.getElementById("detail-modal").dataset.eventId;
  const ev = EventStore.get(id);
  if (!ev) return;
  if (!confirm(`'${ev.title}' 일정을 삭제할까요?`)) return;
  if (EventStore.remove(id)) {
    closeModal("detail-modal");
    reloadEvents();
    renderCalendar();
  }
}

/* ===== 공통 모달/폼 유틸 ===== */
function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

// FR-EVENT-05: 종일 체크 시 시간 입력 비활성화
function toggleTimeInputs() {
  const allDay = document.getElementById("ev-allday").checked;
  document.getElementById("ev-start-time").disabled = allDay;
  document.getElementById("ev-end-time").disabled = allDay;
}


/* ===== Step 4: 캘린더 패널 (FR-CAL-01~03) ===== */
function renderCalendarPanel() {
  const list = CalendarStoreDB.load();
  const box = document.getElementById("calendar-list");
  box.innerHTML = "";
  list.forEach(cal => {
    const item = document.createElement("label");
    item.className = "calendar-item";

    // FR-CAL-03: 표시/숨김 토글
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = cal.visible;
    chk.addEventListener("change", () => {
      CalendarStoreDB.setVisible(cal.id, chk.checked);
      renderCalendar();
    });

    const dot = document.createElement("span");
    dot.className = "cal-dot";
    dot.style.background = cal.color;

    const name = document.createElement("span");
    name.textContent = cal.name;

    item.appendChild(chk);
    item.appendChild(dot);
    item.appendChild(name);

    // 기본 캘린더 외에는 삭제 버튼
    if (cal.id !== "default") {
      const del = document.createElement("button");
      del.className = "cal-del";
      del.textContent = "×";
      del.title = "캘린더 삭제";
      del.addEventListener("click", (e) => {
        e.preventDefault();
        if (!confirm(`'${cal.name}' 캘린더를 삭제할까요?\n소속 일정은 '기본' 캘린더로 이동합니다.`)) return;
        CalendarStoreDB.remove(cal.id);
        renderCalendarPanel();
        reloadEvents();
        renderCalendar();
      });
      item.appendChild(del);
    }
    box.appendChild(item);
  });
}

function addCalendarFromPanel() {
  const nameInput = document.getElementById("cal-name");
  const name = nameInput.value.trim();
  const color = document.getElementById("cal-color").value;
  if (!name) { alert("캘린더 이름을 입력해주세요."); return; }
  if (CalendarStoreDB.load().some(c => c.name === name)) { alert("같은 이름의 캘린더가 이미 있습니다."); return; }
  if (CalendarStoreDB.add(name, color)) {
    nameInput.value = "";
    renderCalendarPanel();
  }
}

// 일정 폼의 캘린더 select 채우기
function fillCalendarSelect(selectedId) {
  const sel = document.getElementById("ev-calendar");
  sel.innerHTML = "";
  CalendarStoreDB.load().forEach(cal => {
    const opt = document.createElement("option");
    opt.value = cal.id;
    opt.textContent = cal.name;
    if (cal.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}
