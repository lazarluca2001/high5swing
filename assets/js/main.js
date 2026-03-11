/* =========================================================
   HFS COMMUNITY JS – TELJES INTEGRÁLT KÓD (2026)
   + Világos, Sötét és Szivárvány témakezelés
   + Dinamikus Sidebar és CSV Adatkezelés
   ========================================================= */

console.log("High Five Swing site loaded ✅");

// 1) CSV URL-ek
const PARTICIPANTS_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDDBNbIkZize7hPMfYPovbLgnIFWNuseLg0mjzDYGhLCwEEiF_-CiXnV76lgg2mvb54QabZ8y3Sork/pub?gid=689836805&single=true&output=csv";
const RESULTS_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDDBNbIkZize7hPMfYPovbLgnIFWNuseLg0mjzDYGhLCwEEiF_-CiXnV76lgg2mvb54QabZ8y3Sork/pub?gid=1410406652&single=true&output=csv";
const CALENDAR_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDDBNbIkZize7hPMfYPovbLgnIFWNuseLg0mjzDYGhLCwEEiF_-CiXnV76lgg2mvb54QabZ8y3Sork/pub?gid=338581218&single=true&output=csv";

/* ---------------------------
   Utils
--------------------------- */

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function safeText(v) {
  return (v ?? "").toString().trim();
}

function hasValue(v) {
  const s = safeText(v);
  if (!s) return false;
  const n = s.toLowerCase();
  return !["-", "—", "–", "n/a", "na", "null", "undefined"].includes(n);
}

function normName(s) {
  return safeText(s).toLowerCase();
}

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function divisionToClassParticipants(division) {
  return safeText(division).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normKey(s) {
  return safeText(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseDateToSortable(dateStr) {
  const s = safeText(dateStr);
  if (!s) return 0;

  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return iso;

  const m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (m) {
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  }

  return 0;
}

function parseCalendarDate(dateStr) {
  const s = safeText(dateStr);
  if (!s) return null;

  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  let m = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).setHours(0, 0, 0, 0);
  }

  m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (m) {
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).setHours(0, 0, 0, 0);
  }

  return null;
}

function getRoleFieldSize(roleNorm, leaderCount, followerCount) {
  const r = safeText(roleNorm).toLowerCase();
  if (r === "leader") return safeText(leaderCount);
  if (r === "follower") return safeText(followerCount);
  return safeText(leaderCount) || safeText(followerCount) || "";
}

function sortByOrder(keys, order, normalizerFn) {
  const pos = new Map(order.map((k, i) => [k, i]));
  return keys.sort((a, b) => {
    const aa = normalizerFn(a);
    const bb = normalizerFn(b);
    const pa = pos.has(aa) ? pos.get(aa) : 999;
    const pb = pos.has(bb) ? pos.get(bb) : 999;
    return pa - pb || a.localeCompare(b, "hu");
  });
}

function normRole(role) {
  const r = normKey(role);
  if (!r) return "—";
  if (r === "l" || r.includes("lead")) return "leader";
  if (r === "f" || r.includes("follow")) return "follower";
  return r;
}

function normDivision(div) {
  const d = normKey(div);
  if (!d) return "—";
  if (d.includes("allstar")) return "allstar";
  if (d.includes("champ")) return "champion";
  if (d.includes("adv")) return "advanced";
  if (d.includes("inter")) return "intermediate";
  if (d.includes("nov")) return "novice";
  if (d.includes("new")) return "newcomer";
  return d;
}

/* ---------------------------
   Theme Management
--------------------------- */

function setTheme(mode) {
  document.documentElement.dataset.theme = mode;
  localStorage.setItem("theme", mode);

  const selectors = document.querySelectorAll("#themeSelector, #themeSelectorCalendar");
  selectors.forEach((sel) => {
    if (sel.value !== mode) sel.value = mode;
  });
}

function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  setTheme(saved);
}

/* ---------------------------
   Sidebar & Layout Injection
--------------------------- */

function getCurrentPageKey() {
  const p = (location.pathname || "").toLowerCase();
  if (p.includes("naptar")) return "naptar";
  if (p.includes("resztvevok")) return "resztvevok";
  if (p.includes("profil")) return "resztvevok";
  return "kezdo";
}

function getSidebarLinks() {
  const isRootIndex =
    /\/index\.html$/i.test(location.pathname) ||
    location.pathname === "/" ||
    location.pathname.endsWith("/high5swing/") ||
    location.pathname.endsWith("/high5swing");

  if (isRootIndex) {
    return {
      home: "./index.html",
      calendar: "./pages/naptar.html",
      participants: "./pages/resztvevok.html"
    };
  }

  return {
    home: "../index.html",
    calendar: "./naptar.html",
    participants: "./resztvevok.html"
  };
}

function injectSidebarLayout() {
  if (document.body.classList.contains("calendar-page")) return;
  if (document.querySelector(".layout") && document.querySelector(".sidebar")) return;

  const main = document.querySelector("main.container") || document.querySelector("main");
  if (!main) return;

  const pageKey = getCurrentPageKey();
  const links = getSidebarLinks();

  const shell = document.createElement("div");
  shell.className = "shell";

  const layout = document.createElement("div");
  layout.className = "layout";

  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar";

  sidebar.innerHTML = `
    <div class="sidebar-head">
      <div class="sidebar-title">HFS 2026</div>
      <div class="sidebar-sub">Community dashboard</div>
    </div>
    <div class="sidebar-body">
      <div class="side-card">
        <h3>Navigáció</h3>
        <div class="side-nav">
          <a class="side-link ${pageKey === "kezdo" ? "active" : ""}" href="${links.home}">
            <span>🏠 Kezdőlap</span>
          </a>
          <a class="side-link ${pageKey === "naptar" ? "active" : ""}" href="${links.calendar}">
            <span>🗓️ Naptár</span>
          </a>
          <a class="side-link ${pageKey === "resztvevok" ? "active" : ""}" href="${links.participants}">
            <span>👥 Résztvevők</span>
          </a>
        </div>
      </div>

      <div class="side-card">
        <h3>Megjelenés</h3>
        <select id="themeSelector" class="month-select" style="width: 100%; margin-top: 5px;">
          <option value="light">☀️ Világos</option>
          <option value="dark">🌙 Sötét</option>
          <option value="rainbow">🌈 Szivárvány</option>
        </select>
      </div>
    </div>
  `;

  const parent = main.parentNode;
  parent.insertBefore(shell, main);
  layout.appendChild(sidebar);
  layout.appendChild(main);
  shell.appendChild(layout);

  const ts = document.getElementById("themeSelector");
  if (ts) {
    ts.value = localStorage.getItem("theme") || "light";
    ts.addEventListener("change", (e) => setTheme(e.target.value));
  }
}

function setupCalendarThemeSelector() {
  const sel = document.getElementById("themeSelectorCalendar");
  if (!sel) return;
  sel.value = localStorage.getItem("theme") || "light";
  sel.addEventListener("change", (e) => setTheme(e.target.value));
}

/* =========================================================
   Résztvevők
   ========================================================= */

function renderParticipants(list) {
  const root = document.getElementById("participants");
  if (!root) return;

  if (!list.length) {
    root.innerHTML = `<div class="card"><h2>Nincs adat</h2><p>Ellenőrizd a táblázatot / sorokat.</p></div>`;
    return;
  }

  root.innerHTML = list.map((p) => {
    const name = safeText(p.name) || "—";
    const division = safeText(p.division) || "—";
    const wsdcId = safeText(p.wsdcId);
    const divClass = divisionToClassParticipants(division);
    const wsdcHtml = wsdcId
      ? `<a href="https://scoring.dance/huHU/wsdc/registry/${encodeURIComponent(wsdcId)}.html" target="_blank" rel="noopener noreferrer">${wsdcId}</a>`
      : "—";
    const profileUrl = `./profil.html?name=${encodeURIComponent(name)}`;

    return `
      <div class="card">
        <h2>${name}</h2>
        <p><span class="tiny"><strong>WSDC:</strong> ${wsdcHtml}</span></p>
        <p style="margin-top:10px;">
          <span class="badge ${divClass}">${division}</span>
        </p>
        <p style="margin-top:12px;">
          <a class="profile-link" href="${profileUrl}">Profil megnyitása →</a>
        </p>
      </div>
    `;
  }).join("");
}

async function loadParticipantsFromSheet() {
  const root = document.getElementById("participants");
  if (root) {
    root.innerHTML = `<div class="card"><h2>Betöltés…</h2><p>CSV letöltése folyamatban.</p></div>`;
  }

  const res = await fetch(PARTICIPANTS_CSV, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);

  const text = await res.text();
  const rows = parseCSV(text);

  const dataStart = 4;
  const dataEnd = 9;
  const people = [];

  for (let r = dataStart; r <= dataEnd; r++) {
    const row = rows[r];
    if (!row) continue;

    const name = safeText(row[1]);
    const division = safeText(row[2]);
    const wsdcId = safeText(row[3]);

    if (!name && !division && !wsdcId) continue;
    people.push({ name, division, wsdcId });
  }

  renderParticipants(people);
}

/* =========================================================
   Profil + eredmények
   ========================================================= */

const ROLE_ORDER = ["leader", "follower"];
const DIVISION_ORDER = ["champion", "allstar", "advanced", "intermediate", "novice", "newcomer"];

function renderResultItem(it) {
  const fieldSize = hasValue(getRoleFieldSize(it.roleNorm, it.leaderCount, it.followerCount))
    ? safeText(getRoleFieldSize(it.roleNorm, it.leaderCount, it.followerCount))
    : "";

  const stats = [];
  if (fieldSize) stats.push(`<div class="stat"><div class="slabel">Indulók</div><div class="svalue">${fieldSize}</div></div>`);
  if (hasValue(it.prelim)) stats.push(`<div class="stat"><div class="slabel">Prelim</div><div class="svalue">${it.prelim}</div></div>`);
  if (hasValue(it.semi)) stats.push(`<div class="stat"><div class="slabel">Semi</div><div class="svalue">${it.semi}</div></div>`);
  if (hasValue(it.partner)) stats.push(`<div class="stat partner"><div class="slabel">Partner</div><div class="svalue">${it.partner}</div></div>`);

  return `
    <details class="result-card">
      <summary class="result-summary">
        <div class="result-left">
          <div class="result-date">${it.date || "—"}</div>
          <div class="result-event">${it.event || "—"}</div>
        </div>
        <div class="result-right">
          <div class="result-col">
            <div class="result-label">Helyezés</div>
            <div class="result-value">${hasValue(it.final) ? it.final : "—"}</div>
          </div>
          <div class="result-col">
            <div class="result-label">Pont</div>
            <div class="result-value">${hasValue(it.points) ? it.points : "0"}</div>
          </div>
        </div>
      </summary>
      <div class="result-body event-body">
        ${stats.length ? `<div class="event-stats">${stats.join("")}</div>` : `<p class="tiny">Nincs további részlet.</p>`}
      </div>
    </details>
  `;
}

function renderProfile(groups) {
  const root = document.getElementById("profileContent");
  if (!root) return;

  const divisions = Object.keys(groups);
  if (!divisions.length) {
    root.innerHTML = `<div class="card"><h2>Nincs találat</h2><p>Ehhez a névhez még nincs eredmény.</p></div>`;
    return;
  }

  const allRolesSet = new Set();
  for (const div in groups) {
    for (const role in groups[div]) {
      allRolesSet.add(role);
    }
  }

  const sortedRoles = sortByOrder(Array.from(allRolesSet), ROLE_ORDER, normRole);
  const sortedDivisions = sortByOrder(divisions, DIVISION_ORDER, normDivision);

  root.innerHTML = sortedRoles.map(roleKey => {
    const roleSections = sortedDivisions.map(divKey => {
      const items = groups[divKey]?.[roleKey];
      if (!items?.length) return "";
      return `
        <section class="block">
          <h2 class="block-title">${items[0].divisionOriginal}</h2>
          <div class="result-list">${items.map(renderResultItem).join("")}</div>
        </section>
      `;
    }).join("");

    return roleSections
      ? `<section class="role-block"><h2 class="block-title">${roleKey === "leader" ? "Leader" : "Follower"}</h2>${roleSections}</section>`
      : "";
  }).join("");
}

async function loadProfileFromSheet() {
  const name = safeText(getParam("name"));
  const titleEl = document.getElementById("profileName");
  if (titleEl) titleEl.textContent = name || "Profil";

  const root = document.getElementById("profileContent");
  if (!name) {
    if (root) root.innerHTML = `<div class="card"><h2>Hiányzó név</h2></div>`;
    return;
  }

  const res = await fetch(RESULTS_CSV, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);

  const rows = parseCSV(await res.text());
  const groups = {};

  for (let r = 4; r < rows.length; r++) {
    const row = rows[r];
    if (!row || normName(row[1]) !== normName(name)) continue;

    const divOrig = safeText(row[2]) || "—";
    const divKey = normDivision(divOrig);
    const roleNorm = normRole(row[5]);

    const item = {
      divisionOriginal: divOrig,
      roleNorm,
      event: safeText(row[3]),
      date: safeText(row[4]),
      leaderCount: row[6],
      followerCount: row[7],
      prelim: row[8],
      semi: row[9],
      final: row[10],
      points: row[11],
      partner: row[18],
      _sort: parseDateToSortable(row[4])
    };

    groups[divKey] ??= {};
    groups[divKey][roleNorm] ??= [];
    groups[divKey][roleNorm].push(item);
  }

  for (const d in groups) {
    for (const r in groups[d]) {
      groups[d][r].sort((a, b) => b._sort - a._sort);
    }
  }

  renderProfile(groups);

  if (typeof initAccordion === "function") {
    initAccordion();
  }
}

/* =========================================================
   Naptár
   ========================================================= */

const CAL_CONFIG = {
  members: {
    "Csongi": "🌈",
    "Merci": "🦆",
    "Mózes": "🦄",
    "Luca": "🐶",
    "Zoli": "🕺",
    "Viki": "🦦"
  },
  validStatuses: ["igen", "talán", "talan", "fizetve", "igazolt"],
  months: ["JANUÁR", "FEBRUÁR", "MÁRCIUS", "ÁPRILIS", "MÁJUS", "JÚNIUS", "JÚLIUS", "AUGUSZTUS", "SZEPTEMBER", "OKTÓBER", "NOVEMBER", "DECEMBER"],
  weekdays: ["H", "K", "Sze", "Cs", "P", "Szo", "V"]
};

let allEvents = [];
let activeFilter = null;
let currentMonthIdx = new Date().getMonth();

async function initCalendarPage() {
  const calGrid = document.getElementById("calendar");
  if (!calGrid) return;

  try {
    const res = await fetch(CALENDAR_CSV, { cache: "no-store" });
    if (!res.ok) throw new Error(`Calendar CSV fetch failed: ${res.status}`);

    const text = await res.text();
    const rows = parseCSV(text);

    const headerIndex = rows.findIndex(r => r.some(cell => safeText(cell) === "Event"));
    if (headerIndex === -1) {
      throw new Error("Nem található az Event fejléc a naptár CSV-ben.");
    }

    const headers = rows[headerIndex].map(h => safeText(h));
    const eventIdx = headers.indexOf("Event");
    const startIdx = headers.indexOf("Start date");
    const endIdx = headers.indexOf("End date");

    if (eventIdx === -1 || startIdx === -1 || endIdx === -1) {
      throw new Error("Hiányzik valamelyik szükséges oszlop: Event / Start date / End date.");
    }

    allEvents = rows
      .slice(headerIndex + 1)
      .filter(r => safeText(r[eventIdx]))
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = row[i];
        });

        obj._startTs = parseCalendarDate(row[startIdx]);
        obj._endTs = parseCalendarDate(row[endIdx]) || obj._startTs;
        return obj;
      })
      .filter(e => e._startTs);

    setupCalendarSidebarToggle();
    updateCalendarUI();
  } catch (e) {
    console.error("Calendar init hiba:", e);

    const cal = document.getElementById("calendar");
    if (cal) {
      cal.innerHTML = `<div class="card"><h2>Naptár hiba</h2><p>${safeText(e.message) || "Nem sikerült betölteni a naptár adatokat."}</p></div>`;
    }
  }
}

function updateCalendarUI() {
  renderCalendar(currentMonthIdx);
  setupMonthSelect();
  renderMemberFilter();
  updateActivityChart();
  updateNextCountdown();
}

function renderCalendar(monthIndex) {
  const cal = document.getElementById("calendar");
  if (!cal) return;

  cal.innerHTML = "";
  const frag = document.createDocumentFragment();

  const mHeader = document.getElementById("currentMonthHeader");
  if (mHeader) mHeader.innerText = CAL_CONFIG.months[monthIndex];

  CAL_CONFIG.weekdays.forEach(d => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = d;
    frag.appendChild(div);
  });

  const firstDay = (new Date(2026, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(2026, monthIndex + 1, 0).getDate();
  const todayTs = new Date().setHours(0, 0, 0, 0);

  for (let i = 0; i < firstDay; i++) {
    const div = document.createElement("div");
    div.className = "day empty-day-pre";
    frag.appendChild(div);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const currTs = new Date(2026, monthIndex, d).setHours(0, 0, 0, 0);
    const dayEvents = allEvents.filter(e => currTs >= e._startTs && currTs <= e._endTs);

    const dayDiv = document.createElement("div");
    dayDiv.className = `day ${todayTs === currTs ? "today" : ""}`;
    dayDiv.innerHTML = `<span class="day-number">${d}</span>`;

    dayEvents.forEach(e => {
      let tagsHtml = "";

      Object.entries(CAL_CONFIG.members).forEach(([name, emoji]) => {
        const status = safeText(e[name]).toLowerCase();

        if (CAL_CONFIG.validStatuses.some(vs => status.includes(vs))) {
          if (!activeFilter || activeFilter === name) {
            const isTalan = status.includes("talan") || status.includes("talán");
            tagsHtml += `
              <div class="person-tag ${isTalan ? "status-talan" : "status-biztos"}">
                <span>${emoji}</span>
                <span>${name}</span>
              </div>
            `;
          }
        }
      });

      if (tagsHtml || !activeFilter) {
        const card = document.createElement("div");
        card.className = "event-card";
        card.innerHTML = `
          <span class="event-title">${safeText(e.Event)}</span>
          <div class="participants-container">${tagsHtml}</div>
        `;
        dayDiv.appendChild(card);
      }
    });

    frag.appendChild(dayDiv);
  }

  cal.appendChild(frag);
}

function setupMonthSelect() {
  const sel = document.getElementById("monthSelect");
  if (!sel) return;

  sel.innerHTML = CAL_CONFIG.months
    .map((m, i) => `<option value="${i}" ${i === currentMonthIdx ? "selected" : ""}>${m}</option>`)
    .join("");

  sel.onchange = (e) => {
    currentMonthIdx = parseInt(e.target.value, 10);
    updateCalendarUI();
  };
}

window.changeMonth = (delta) => {
  currentMonthIdx = (currentMonthIdx + delta + 12) % 12;
  updateCalendarUI();
};

window.goToToday = () => {
  currentMonthIdx = new Date().getMonth();
  updateCalendarUI();
};

function renderMemberFilter() {
  const box = document.getElementById("memberFilter");
  if (!box) return;

  box.innerHTML = Object.entries(CAL_CONFIG.members).map(([name, emoji]) => `
    <button class="filter-btn ${activeFilter === name ? "active" : ""}" type="button" data-member="${name}">
      <span>${emoji}</span> ${name}
    </button>
  `).join("");

  box.querySelectorAll(".filter-btn").forEach(btn => {
    btn.onclick = () => {
      activeFilter = activeFilter === btn.dataset.member ? null : btn.dataset.member;
      updateCalendarUI();
    };
  });
}

function updateActivityChart() {
  const container = document.getElementById("activityChart");
  if (!container) return;

  container.innerHTML = Object.entries(CAL_CONFIG.members).map(([name, emoji]) => {
    const count = allEvents.filter(e =>
      CAL_CONFIG.validStatuses.some(vs => safeText(e[name]).toLowerCase().includes(vs))
    ).length;

    return `
      <div class="chart-column-wrapper">
        <div class="chart-bar" style="height:${Math.min(80, (count / 20) * 80)}px"></div>
        <span class="chart-label">${count}</span>
        <span class="chart-emoji">${emoji}</span>
      </div>
    `;
  }).join("");
}

function updateNextCountdown() {
  const box = document.getElementById("nextEventContent");
  if (!box) return;

  const now = new Date().setHours(0, 0, 0, 0);
  const next = allEvents
    .filter(e => e._endTs >= now)
    .sort((a, b) => a._startTs - b._startTs)[0];

  if (!next) {
    box.innerHTML = `<div class="muted">Nincs közelgő esemény.</div>`;
    return;
  }

  const diff = Math.round((next._startTs - now) / 86400000);

  box.innerHTML = `
    <div class="next-event-title">${safeText(next.Event)}</div>
    <div class="next-event-countdown">${diff > 0 ? `Még ${diff} nap` : "Ma kezdődik! 🔥"}</div>
  `;
}

function setupCalendarSidebarToggle() {
  const btn = document.getElementById("sidebarToggle");
  const sb = document.getElementById("calendarSidebar");

  if (btn && sb) {
    btn.onclick = () => {
      sb.classList.toggle("open");
      document.body.classList.toggle("calendar-sidebar-open", sb.classList.contains("open"));
    };
  }
}

/* ---------------------------
   INIT
--------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupCalendarThemeSelector();

  if (!document.body.classList.contains("calendar-page")) {
    injectSidebarLayout();
  }

  if (document.getElementById("participants")) {
    loadParticipantsFromSheet().catch(console.error);
  }

  if (document.getElementById("profileContent")) {
    loadProfileFromSheet().catch(console.error);
  }

  initCalendarPage().catch(console.error);
});
