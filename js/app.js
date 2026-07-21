// Step 3~5 통합: 앱 초기화, 일정 CRUD, 캘린더 카테고리, 사용자·GitHub 동기화
// Step 5: 사용자 식별(FR-USER-01), 사용자별 분리 저장(FR-USER-02),
//         GitHub 레포 동기화(FR-USER-03), localStorage 폴백(FR-USER-04)

let editingId = null;           // null = 생성 모드
const USER_PREF_KEY = "prompt-calendar:current-user";

document.addEventListener("DOMContentLoaded", async () => {
  // ---- Step 5: 사용자 목록 로드 및 현재 사용자 결정 (FR-USER-01) ----
  await initUsers();

  // ---- Step 5: 원격 동기화 후 캘린더 초기화 ----
  await syncPull();
  initCalendar();
  renderCalendarPanel();

  // 네비게이션 (Step 2)
  document.getElementById("btn-prev").addEventListener("click", () => moveMonth(-1));
  document.getElementById("btn-next").addEventListener("click", () => moveMonth(1));
  document.getElementById("btn-today").addEventListener("click", goToday);

  // 캘린더 카테고리 (Step 4)
  document.getElementById("cal-add").addEventListener("click", addCalendarFromPanel);

  // 일정 CRUD (Step 3)
  document.getElementById("btn-new-event").addEventListener("click", () => openCreateModal(toDateKey(new Date())));
  document.getElementById("ev-save").addEventListener("click", saveEventFromForm);
  document.getElementById("ev-cancel").addEventListener("click", () => closeModal("event-modal"));
  document.getElementById("ev-allday").addEventListener("change", toggleTimeInputs);
  document.getElementById("dt-close").addEventListener("click", () => closeModal("detail-modal"));
  document.getElementById("dt-edit").addEventListener("click", editFromDetail);
  document.getElementById("dt-delete").addEventListener("click", deleteFromDetail);

  // Step 5: 사용자 전환 / 토큰 설정
  document.getElementById("user-select").addEventListener("change", switchUser);
  document.getElementById("btn-token").addEventListener("click", openTokenModal);
  document.getElementById("tk-save").addEventListener("click", saveToken);
  document.getElementById("tk-clear").addEventListener("click", clearToken);
  document.getElementById("tk-close").addEventListener("click", () => closeModal("token-modal"));

  document.querySelectorAll(".modal-overlay").forEach(ov => {
    ov.addEventListener("click", (e) => { if (e.target === ov) ov.classList.remove("open"); });
  });
});

/* =====================================================
   Step 5: 사용자 관리 (FR-USER-01, 02)
===================================================== */
async function initUsers() {
  const sel = document.getElementById("user-select");
  let users = [{ id: "user01", name: "사용자1" }];
  try {
    const res = await fetch("data/users.json", { cache: "no-store" });
    if (res.ok) users = (await res.json()).users;
  } catch (e) { console.warn("users.json 로드 실패 — 기본 사용자 사용", e); }

  sel.innerHTML = "";
  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.name;
    sel.appendChild(opt);
  });

  const saved = localStorage.getItem(USER_PREF_KEY);
  const current = users.some(u => u.id === saved) ? saved : users[0].id;
  sel.value = current;
  EventStore.userId = current; // FR-USER-02: 사용자별 저장 키 분리
}

async function switchUser() {
  const userId = document.getElementById("user-select").value;
  localStorage.setItem(USER_PREF_KEY, userId);
  EventStore.userId = userId;
  await syncPull();
  reloadEvents();
  renderCalendar();
}

/* =====================================================
   Step 5: GitHub 동기화 (FR-USER-03) + 폴백 (FR-USER-04)
===================================================== */
async function syncPull() {
  setSyncStatus("saving", "불러오는 중...");
  const r = await GitHubSync.pull(EventStore.userId);
  if (r.ok) {
    EventStore.save(r.events); // 원격 → 로컬 캐시 (오프라인 대비)
    setSyncStatus(GitHubSync.hasToken() ? "synced" : "read-only",
      GitHubSync.hasToken() ? "레포 동기화됨" : "레포 읽기 전용 (토큰 미설정 — 변경은 이 브라우저에만 저장)");
  } else {
    // FR-USER-04: 원격 실패 → localStorage 폴백
    setSyncStatus("local", "오프라인 — 로컬 저장소 사용 중");
  }
}

async function syncPush() {
  const events = EventStore.load();
  if (!GitHubSync.hasToken()) {
    setSyncStatus("read-only", "레포 읽기 전용 (토큰 미설정 — 변경은 이 브라우저에만 저장)");
    return;
  }
  setSyncStatus("saving", "레포에 저장 중...");
  const r = await GitHubSync.push(EventStore.userId, events);
  if (r.ok) setSyncStatus("synced", "레포 동기화됨");
  else if (r.reason === "auth") setSyncStatus("error", "토큰 인증 실패 — 토큰을 확인해주세요");
  else setSyncStatus("local", "레포 저장 실패 — 로컬에만 저장됨 (NFR-04)");
}

function setSyncStatus(state, msg) {
  const badge = document.getElementById("sync-badge");
  badge.className = "sync-badge " + state;
  badge.textContent = msg;
}

/* ---- 토큰 설정 모달 ---- */
function openTokenModal() {
  document.getElementById("tk-input").value = GitHubSync.getToken();
  openModal("token-modal");
}
function saveToken() {
  const v = document.getElementById("tk-input").value.trim();
  if (!v) { alert("토큰을 입력해주세요. (삭제하려면 '토큰 삭제' 버튼)"); return; }
  GitHubSync.setToken(v);
  closeModal("token-modal");
  syncPush(); // 저장 즉시 현재 로컬 데이터를 레포에 반영
}
function clearToken() {
  GitHubSync.clearToken();
  closeModal("token-modal");
  setSyncStatus("read-only", "레포 읽기 전용 (토큰 미설정 — 변경은 이 브라우저에만 저장)");
}

/* =====================================================
   Step 3: 일정 CRUD (FR-EVENT-01~05)
===================================================== */
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

function saveEventFromForm() {
  const title = document.getElementById("ev-title").value.trim();
  const allDay = document.getElementById("ev-allday").checked;
  const sd = document.getElementById("ev-start-date").value;
  const ed = document.getElementById("ev-end-date").value;
  const st = allDay ? "00:00" : document.getElementById("ev-start-time").value;
  const et = allDay ? "23:59" : document.getElementById("ev-end-time").value;

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
    repeat: null
  };

  const ok = editingId ? EventStore.update(ev) : EventStore.add(ev);
  if (ok) {
    closeModal("event-modal");
    reloadEvents();
    renderCalendar();
    syncPush(); // Step 5: 변경 즉시 레포 반영
  }
}

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

function deleteFromDetail() {
  const id = document.getElementById("detail-modal").dataset.eventId;
  const ev = EventStore.get(id);
  if (!ev) return;
  if (!confirm(`'${ev.title}' 일정을 삭제할까요?`)) return;
  if (EventStore.remove(id)) {
    closeModal("detail-modal");
    reloadEvents();
    renderCalendar();
    syncPush(); // Step 5
  }
}

/* =====================================================
   Step 4: 캘린더 패널 (FR-CAL-01~03)
===================================================== */
function renderCalendarPanel() {
  const list = CalendarStoreDB.load();
  const box = document.getElementById("calendar-list");
  box.innerHTML = "";
  list.forEach(cal => {
    const item = document.createElement("label");
    item.className = "calendar-item";

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
        syncPush(); // 일정 소속 변경도 레포 반영
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

/* ===== 공통 유틸 ===== */
function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

function toggleTimeInputs() {
  const allDay = document.getElementById("ev-allday").checked;
  document.getElementById("ev-start-time").disabled = allDay;
  document.getElementById("ev-end-time").disabled = allDay;
}
