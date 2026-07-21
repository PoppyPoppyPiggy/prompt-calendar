// Step 3: 일정 저장소 모듈 — localStorage 기반 (옵션 B / FR-USER-04 폴백)
// Step 5에서 GitHub Contents API(옵션 A) 저장소로 교체될 인터페이스

const EventStore = {
  KEY: "prompt-calendar:events:user01", // Step 5에서 사용자별 키로 확장

  // 전체 일정 로드
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("[EventStore] 로드 실패 — 빈 목록으로 시작", e);
      return [];
    }
  },

  // 전체 저장 (NFR-04: 실패 시 사용자 안내)
  save(events) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(events));
      return true;
    } catch (e) {
      alert("일정 저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요.");
      console.error("[EventStore] 저장 실패", e);
      return false;
    }
  },

  add(ev) {
    const events = this.load();
    ev.id = this.genId();
    events.push(ev);
    return this.save(events) ? ev : null;
  },

  update(ev) {
    const events = this.load();
    const i = events.findIndex(e => e.id === ev.id);
    if (i === -1) return false;
    events[i] = ev;
    return this.save(events);
  },

  remove(id) {
    const events = this.load().filter(e => e.id !== id);
    return this.save(events);
  },

  get(id) {
    return this.load().find(e => e.id === id) || null;
  },

  // 일정 ID 생성: evt-YYYYMMDD-랜덤4
  genId() {
    const t = new Date();
    const ymd = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`;
    return `evt-${ymd}-${Math.random().toString(36).slice(2, 6)}`;
  }
};

/* ===== Step 4: 캘린더(카테고리) 저장소 (FR-CAL-01~03) ===== */
const CalendarStoreDB = {
  KEY: "prompt-calendar:calendars",

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      const list = raw ? JSON.parse(raw) : null;
      if (list && list.length) return list;
    } catch (e) { console.warn("[CalendarStoreDB] 로드 실패", e); }
    // 최초 실행: 기본 캘린더 생성
    const defaults = [{ id: "default", name: "기본", color: "#4285f4", visible: true }];
    this.save(defaults);
    return defaults;
  },

  save(list) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      alert("캘린더 저장에 실패했습니다.");
      return false;
    }
  },

  // FR-CAL-01: 캘린더 생성 (FR-CAL-02: 색상 지정)
  add(name, color) {
    const list = this.load();
    const cal = { id: "cal-" + Math.random().toString(36).slice(2, 8), name, color, visible: true };
    list.push(cal);
    return this.save(list) ? cal : null;
  },

  // 캘린더 삭제 — 기본 캘린더는 삭제 불가, 소속 일정은 기본으로 이동
  remove(id) {
    if (id === "default") return false;
    const list = this.load().filter(c => c.id !== id);
    if (!this.save(list)) return false;
    const events = EventStore.load().map(ev => (ev.calendar === id ? { ...ev, calendar: "default" } : ev));
    EventStore.save(events);
    return true;
  },

  // FR-CAL-03: 표시/숨김 토글
  setVisible(id, visible) {
    const list = this.load().map(c => (c.id === id ? { ...c, visible } : c));
    return this.save(list);
  },

  get(id) {
    return this.load().find(c => c.id === id) || null;
  }
};
