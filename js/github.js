// Step 5: GitHub 레포 데이터 연동 모듈 — 옵션 A (FR-USER-03)
// 읽기: Contents API GET (Public 레포, 토큰 없이도 가능)
// 쓰기: Contents API PUT (사용자 입력 토큰 필요 — localStorage에만 보관, NFR-05)

const GitHubSync = {
  OWNER: "PoppyPoppyPiggy",
  REPO: "prompt-calendar",
  BRANCH: "main",
  TOKEN_KEY: "prompt-calendar:token",
  shaMap: {}, // userId → 마지막으로 알고 있는 파일 sha (커밋 충돌 방지용)

  /* ---- 토큰 관리 (localStorage에만 보관, 코드에 하드코딩 금지) ---- */
  getToken() { return localStorage.getItem(this.TOKEN_KEY) || ""; },
  setToken(t) { localStorage.setItem(this.TOKEN_KEY, t.trim()); },
  clearToken() { localStorage.removeItem(this.TOKEN_KEY); },
  hasToken() { return !!this.getToken(); },

  headers(json) {
    const h = { "Accept": "application/vnd.github+json" };
    if (json) h["Content-Type"] = "application/json";
    const t = this.getToken();
    if (t) h["Authorization"] = "Bearer " + t;
    return h;
  },

  fileUrl(userId) {
    return `https://api.github.com/repos/${this.OWNER}/${this.REPO}/contents/data/events/${userId}.json`;
  },

  /* ---- 원격 읽기 (FR-USER-03) ----
     반환: { ok, events, reason }
     - ok=true  : 원격 데이터 수신 (파일 없으면 빈 목록)
     - ok=false : 네트워크/API 오류 → 호출측에서 localStorage 폴백 (FR-USER-04) */
  async pull(userId) {
    try {
      const res = await fetch(this.fileUrl(userId) + "?ref=" + this.BRANCH, {
        headers: this.headers(false),
        cache: "no-store"
      });
      if (res.status === 404) {
        // 파일이 아직 없음 — 첫 push에서 생성됨
        delete this.shaMap[userId];
        return { ok: true, events: [], reason: "no-file" };
      }
      if (!res.ok) return { ok: false, events: [], reason: "http-" + res.status };
      const body = await res.json();
      this.shaMap[userId] = body.sha;
      const text = this.base64ToUtf8(body.content.replace(/\n/g, ""));
      const parsed = JSON.parse(text);
      return { ok: true, events: parsed.events || [], reason: "loaded" };
    } catch (e) {
      console.warn("[GitHubSync] pull 실패", e);
      return { ok: false, events: [], reason: "network" };
    }
  },

  /* ---- 원격 쓰기 (FR-USER-03) — 토큰 필요.
     충돌(409/422) 시 sha 재조회 후 1회 재시도 ---- */
  async push(userId, events, retried) {
    if (!this.hasToken()) return { ok: false, reason: "no-token" };
    try {
      const payload = {
        message: `chore(data): ${userId} 일정 갱신 (${events.length}건)`,
        branch: this.BRANCH,
        content: this.utf8ToBase64(JSON.stringify({ events }, null, 2))
      };
      if (this.shaMap[userId]) payload.sha = this.shaMap[userId];

      const res = await fetch(this.fileUrl(userId), {
        method: "PUT",
        headers: this.headers(true),
        body: JSON.stringify(payload)
      });

      if ((res.status === 409 || res.status === 422) && !retried) {
        // sha 불일치(다른 곳에서 커밋됨) → 최신 sha 받아 1회 재시도 (마지막 쓰기 승리)
        await this.pull(userId);
        return this.push(userId, events, true);
      }
      if (res.status === 401 || res.status === 403) return { ok: false, reason: "auth" };
      if (!res.ok) return { ok: false, reason: "http-" + res.status };

      const body = await res.json();
      this.shaMap[userId] = body.content.sha;
      return { ok: true, reason: "pushed" };
    } catch (e) {
      console.warn("[GitHubSync] push 실패", e);
      return { ok: false, reason: "network" };
    }
  },

  /* ---- UTF-8 안전 base64 변환 (한글 일정 제목 대응) ---- */
  utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin);
  },
  base64ToUtf8(b64) {
    return new TextDecoder().decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
  }
};
