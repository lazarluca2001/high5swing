console.log("High Five Swing site loaded ✅");

// 1) Résztvevők (CSV)
const PARTICIPANTS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDDBNbIkZize7hPMfYPovbLgnIFWNuseLg0mjzDYGhLCwEEiF_-CiXnV76lgg2mvb54QabZ8y3Sork/pub?gid=689836805&single=true&output=csv";

// 2) Eredmények (CSV)
const RESULTS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDDBNbIkZize7hPMfYPovbLgnIFWNuseLg0mjzDYGhLCwEEiF_-CiXnV76lgg2mvb54QabZ8y3Sork/pub?gid=1410406652&single=true&output=csv";

// 3) Naptár (CSV)
const CALENDAR_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDDBNbIkZize7hPMfYPovbLgnIFWNuseLg0mjzDYGhLCwEEiF_-CiXnV76lgg2mvb54QabZ8y3Sork/pub?gid=338581218&single=true&output=csv";

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

/* ---------------------------
   Theme
--------------------------- */

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    document.documentElement.dataset.theme = "light";
  }
}

function setTheme(mode) {
  if (mode === "dark") {
    document.documentElement.dataset.theme = "dark";
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.dataset.theme = "light";
    localStorage.setItem("theme", "light");
  }
}

/* ---------------------------
   Sidebar inject (nem naptár oldalon)
--------------------------- */

function getCurrentPageKey() {
  const p = (location.pathname || "").toLowerCase();
  if (p.includes("naptar")) return "naptar";
  if (p.includes("resztvevok")) return "resztvevok";
  if (p.includes("profil")) return "resztvevok";
  return "kezdo";
}

function injectSidebarLayout() {
  if (document.body.classList.contains("calendar-page")) return;
  if (document.querySelector(".layout") && document.querySelector(".sidebar")) return;

  const main = document.querySelector("main.container");
  if (!main) return;

  const pageKey = getCurrentPageKey();

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
          <a class="side-link ${pageKey === "kezdo" ? "active" : ""}" href="../index.html">
            <span>🏠 Kezdőlap</span><span class="hint">overview</span>
          </a>
          <a class="side-link ${pageKey === "naptar" ? "active" : ""}" href="./naptar.html">
            <span>🗓️ Naptár</span><span class="hint">eventek</span>
          </a>
          <a class="side-link ${pageKey === "resztvevok" ? "active" : ""}" href="./resztvevok.html">
            <span>👥 Résztvevők</span><span class="hint">profilok</span>
          </a>
        </div>
      </div>

      <div class="side-card">
        <h3>Téma</h3>
        <div class="theme-row">
          <div>
            <div style="font-weight:900; letter-spacing:-0.2px;">Sötét mód</div>
            <div class="tiny muted">megőrizve böngészőben</div>
          </div>
          <div id="themeSwitch" class="switch" data-on="false" aria-label="Dark mode"></div>
        </div>
      </div>
    </div>
  `;

  const parent = main.parentNode;
  const marker = document.createComment("layout-marker");
  parent.insertBefore(marker, main);

  layout.appendChild(sidebar);
  layout.appendChild(main);
  shell.appendChild(layout);

  parent.insertBefore(shell, marker);
  parent.removeChild(marker);

  const sw = document.getElementById("themeSwitch");
  if (sw) {
    const isDark = document.documentElement.dataset.theme === "dark";
    sw.dataset.on = isDark ? "true" : "false";

    sw.addEventListener("click", () => {
      const nowDark = document.documentElement.dataset.theme === "dark";
      setTheme(nowDark ? "light" : "dark");
      sw.dataset.on = (!nowDark) ? "true" : "false";
    });
  }
}

/* =========================================================
   Résztvevők (resztvevok.html)
   ========================================================= */

function renderParticipants(list) {
  const root = document.getElementById("participants");
  if (!root) return;

  if (!list.length) {
    root.innerHTML = `<div class="card"><h2>Nincs adat</h2><p>Ellenőrizd a táblázatot / sorokat.</p></div>`;
    return;
  }

  root.innerHTML = list
    .map((p) => {
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
    })
    .join("");
}

async function loadParticipantsFromSheet() {
  const root = document.getElementById("participants");
  if (root) root.innerHTML = `<div class="card"><h2>Betöltés…</h2><p>CSV letöltése folyamatban.</p></div>`;

  const res = await fetch(PARTICIPANTS_CSV, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  const text = await res.text();

  const rows = parseCSV(text);

  const dataStart = 4;
  const dataEnd = 9;

  const COL_NAME = 1;
  const COL_DIV = 2;
  const COL_WSDC = 3;

  const people = [];
  for (let r = dataStart; r <= dataEnd; r++) {
    const row = rows[r];
    if (!row) continue;

    const name = safeText(row[COL_NAME]);
    const division = safeText(row[COL_DIV]);
    const wsdcId = safeText(row[COL_WSDC]);

    if (!name && !division && !wsdcId) continue;
    people.push({ name, division, wsdcId });
  }

  renderParticipants(people);
}

/* =========================================================
   Profil + eredmények (profil.html)
   ========================================================= */

function parseDateToSortable(dateStr) {
  const s = safeText(dateStr);
  if (!s) return 0;

  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return iso;

  const m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const yy = Number(m[3]);
    return new Date(yy, mm, dd).getTime();
  }
  return 0;
}

function getRoleFieldSize(roleNorm, leaderCount, followerCount) {
  const r = safeText(roleNorm).toLowerCase();
  if (r === "leader") return safeText(leaderCount);
  if (r === "follower") return safeText(followerCount);
  return safeText(leaderCount) || safeText(followerCount) || "";
}

const ROLE_ORDER = ["leader", "follower"];
const DIVISION_ORDER = ["champion", "allstar", "advanced", "intermediate", "novice", "newcomer"];

function normKey(s) {
  return safeText(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
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

function sortByOrder(keys, order, normalizerFn) {
  const pos = new Map(order.map((k, i) => [k, i]));
  return keys.sort((a, b) => {
    const aa = normalizerFn(a);
    const bb = normalizerFn(b);
    const pa = pos.has(aa) ? pos.get(aa) : 999;
    const pb = pos.has(bb) ? pos.get(bb) : 999;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b, "hu");
  });
}

function prettyRole(roleNorm) {
  if (roleNorm === "leader") return "Leader";
  if (roleNorm === "follower") return "Follower";
  return roleNorm;
}

function prettyDivision(divNorm, original) {
  return safeText(original) || divNorm;
}

function renderResultItem(it) {
  const date = safeText(it.date) || "—";
  const event = safeText(it.event) || "—";

  const finalPlace = hasValue(it.final) ? safeText(it.final) : "—";
  const points = hasValue(it.points) ? safeText(it.points) : "0";

  const prelim = hasValue(it.prelim) ? safeText(it.prelim) : "";
  const semi = hasValue(it.semi) ? safeText(it.semi) : "";

  const fieldSizeRaw = getRoleFieldSize(it.roleNorm, it.leaderCount, it.followerCount);
  const fieldSize = hasValue(fieldSizeRaw) ? safeText(fieldSizeRaw) : "";

  const partner = hasValue(it.partner) ? safeText(it.partner) : "";

  const stats = [];

  if (fieldSize) {
    stats.push(`
      <div class="stat">
        <div class="slabel">Indulók</div>
        <div class="svalue">${fieldSize}</div>
      </div>
    `);
  }

  if (prelim) {
    stats.push(`
      <div class="stat">
        <div class="slabel">Prelim</div>
        <div class="svalue">${prelim}</div>
      </div>
    `);
  }

  if (semi) {
    stats.push(`
      <div class="stat">
        <div class="slabel">Semi</div>
        <div class="svalue">${semi}</div>
      </div>
    `);
  }

  if (partner) {
    stats.push(`
      <div class="stat partner">
        <div class="slabel">Partner</div>
        <div class="svalue">${partner}</div>
      </div>
    `);
  }

  return `
    <details class="result-card">
      <summary class="result-summary">
        <div class="result-left">
          <div class="result-date">${date}</div>
          <div class="result-event">${event}</div>
        </div>
        <div class="result-right">
          <div class="result-col">
            <div class="result-label">Helyezés</div>
            <div class="result-value">${finalPlace}</div>
          </div>
          <div class="result-col">
            <div class="result-label">Pont</div>
            <div class="result-value">${points}</div>
          </div>
        </div>
      </summary>

      <div class="result-body event-body">
        ${
          stats.length
            ? `<div class="event-stats">${stats.join("")}</div>`
            : `<div class="card"><p class="tiny">Nincs további részlet.</p></div>`
        }
      </div>
    </details>
  `;
}

function renderProfile(groups) {
  const root = document.getElementById("profileContent");
  if (!root) return;

  const divisions = Object.keys(groups);
  if (!divisions.length) {
    root.innerHTML = `
      <div class="card">
        <h2>Nincs találat</h2>
        <p>Ehhez a névhez még nincs (vagy nem egyezik pontosan) eredmény a táblában.</p>
      </div>
    `;
    return;
  }

  const allRolesSet = new Set();
  for (const div of divisions) {
    for (const role of Object.keys(groups[div])) allRolesSet.add(role);
  }
  const allRoles = Array.from(allRolesSet);

  const sortedRoles = sortByOrder(allRoles, ROLE_ORDER, normRole);
  const sortedDivisions = sortByOrder(divisions, DIVISION_ORDER, normDivision);

  root.innerHTML = sortedRoles
    .map((roleKey) => {
      const roleSections = sortedDivisions
        .map((divisionKey) => {
          const items = groups[divisionKey]?.[roleKey];
          if (!items || !items.length) return "";

          const divTitle = prettyDivision(normDivision(divisionKey), items[0].divisionOriginal);

          return `
            <section class="block">
              <h2 class="block-title">${divTitle}</h2>
              <div class="result-list">
                ${items.map(renderResultItem).join("")}
              </div>
            </section>
          `;
        })
        .join("");

      if (!roleSections) return "";

      return `
        <section class="role-block">
          <h2 class="block-title">${prettyRole(roleKey)}</h2>
          ${roleSections}
        </section>
      `;
    })
    .join("");
}

function initAccordion(rootSelector = "#profileContent") {
  const root = document.querySelector(rootSelector);
  if (!root) return;

  root.addEventListener("toggle", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLDetailsElement)) return;
    if (!t.open) return;

    root.querySelectorAll("details.result-card[open]").forEach((d) => {
      if (d !== t) d.open = false;
    });
  });
}

async function loadProfileFromSheet() {
  const nameParam = getParam("name");
  const name = safeText(nameParam);

  const titleEl = document.getElementById("profileName");
  if (titleEl) titleEl.textContent = name ? name : "Profil";

  const root = document.getElementById("profileContent");
  if (root) root.innerHTML = `<div class="card"><h2>Betöltés…</h2><p>Eredmények importálása folyamatban.</p></div>`;

  if (!name) {
    if (root) root.innerHTML = `<div class="card"><h2>Hiányzó név</h2><p>A profil URL-ben nincs megadva a <code>?name=</code> paraméter.</p></div>`;
    return;
  }

  const res = await fetch(RESULTS_CSV, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  const text = await res.text();
  const rows = parseCSV(text);

  const dataStart = 4;

  const COL_NAME = 1;
  const COL_DIV = 2;
  const COL_EVENT = 3;
  const COL_DATE = 4;
  const COL_ROLE = 5;
  const COL_LEADER = 6;
  const COL_FOLLOWER = 7;
  const COL_PRELIM = 8;
  const COL_SEMI = 9;
  const COL_FINAL = 10;
  const COL_POINT = 11;
  const COL_PARTNER = 18;

  const groups = {};

  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    const rowName = safeText(row[COL_NAME]);
    if (!rowName) continue;
    if (normName(rowName) !== normName(name)) continue;

    const divisionOriginal = safeText(row[COL_DIV]) || "—";
    const divisionKey = normDivision(divisionOriginal) || divisionOriginal;

    const roleOriginal = safeText(row[COL_ROLE]) || "—";
    const roleNorm = normRole(roleOriginal);

    const item = {
      divisionOriginal,
      roleNorm,
      event: safeText(row[COL_EVENT]),
      date: safeText(row[COL_DATE]),
      leaderCount: safeText(row[COL_LEADER]),
      followerCount: safeText(row[COL_FOLLOWER]),
      prelim: safeText(row[COL_PRELIM]),
      semi: safeText(row[COL_SEMI]),
      final: safeText(row[COL_FINAL]),
      points: safeText(row[COL_POINT]),
      partner: safeText(row[COL_PARTNER]),
      _sort: parseDateToSortable(row[COL_DATE]),
    };

    groups[divisionKey] ??= {};
    groups[divisionKey][roleNorm] ??= [];
    groups[divisionKey][roleNorm].push(item);
  }

  for (const div of Object.keys(groups)) {
    for (const role of Object.keys(groups[div])) {
      groups[div][role].sort((a, b) => b._sort - a._sort);
    }
  }

  renderProfile(groups);
  initAccordion("#profileContent");
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
    "Zoli": "🕺"
  },
  validStatuses: ["igen", "talán", "talan", "fizetve", "igazolt"],
  months: ["JANUÁR","FEBRUÁR","MÁRCIUS","ÁPRILIS","MÁJUS","JÚNIUS","JÚLIUS","AUGUSZTUS","SZEPTEMBER","OKTÓBER","NOVEMBER","DECEMBER"],
  weekdays: ["H","K","Sze","Cs","P","Szo","V"]
};

let allEvents = [];
let activeFilter = null;
let currentMonthIdx = new Date().getMonth();

function parseCalendarDate(d) {
  if (!d) return null;
  const clean = d.toString().trim().replace(/\.$/, "");
  if (!clean) return null;

  if (clean.includes("-")) {
    const dt = new Date(clean);
    return Number.isNaN(dt.getTime()) ? null : dt.setHours(0, 0, 0, 0);
  }

  const parts = clean.split(".");
  if (parts.length === 3) {
    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const dt = new Date(year, month, day);
    return Number.isNaN(dt.getTime()) ? null : dt.setHours(0, 0, 0, 0);
  }

  return null;
}

async function initCalendarPage() {
  if (!document.getElementById("calendar")) return;

  try {
    const res = await fetch(CALENDAR_CSV, { cache: "no-store" });
    if (!res.ok) throw new Error(`Calendar CSV fetch failed: ${res.status}`);
    const csv = await res.text();
    const rows = parseCSV(csv);

    const headerIndex = rows.findIndex((r) => r.includes("Event"));
    if (headerIndex === -1) throw new Error("Calendar header not found");

    const headers = rows[headerIndex];

    allEvents = rows.slice(headerIndex + 1)
      .filter((r) => safeText(r[headers.indexOf("Event")]))
      .map((row) => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        obj._startTs = parseCalendarDate(row[headers.indexOf("Start date")]);
        obj._endTs = parseCalendarDate(row[headers.indexOf("End date")]) || obj._startTs;
        return obj;
      })
      .filter((e) => e._startTs);

    setupCalendarSidebarToggle();
    updateCalendarUI();
  } catch (e) {
    console.error("Naptár adatbetöltési hiba:", e);
    const nextBox = document.getElementById("nextEventContent");
    if (nextBox) nextBox.textContent = "Hiba a betöltésnél.";
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
  const fragment = document.createDocumentFragment();

  const monthHeader = document.getElementById("currentMonthHeader");
  if (monthHeader) monthHeader.innerText = CAL_CONFIG.months[monthIndex];

  CAL_CONFIG.weekdays.forEach((d) => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = d;
    fragment.appendChild(div);
  });

  const firstDay = (new Date(2026, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(2026, monthIndex + 1, 0).getDate();
  const todayTs = new Date().setHours(0, 0, 0, 0);

  for (let i = 0; i < firstDay; i++) {
    const div = document.createElement("div");
    div.className = "day empty-day-pre";
    fragment.appendChild(div);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const currTs = new Date(2026, monthIndex, d).setHours(0, 0, 0, 0);
    const dayEvents = allEvents.filter((e) => currTs >= e._startTs && currTs <= e._endTs);

    const dayDiv = document.createElement("div");
    dayDiv.className = `day ${todayTs === currTs ? "today" : ""}`;
    dayDiv.innerHTML = `<span class="day-number">${d}</span>`;

    dayEvents.forEach((e) => {
      let tagsHtml = "";

      Object.entries(CAL_CONFIG.members).forEach(([name, emoji]) => {
        const status = safeText(e[name]).toLowerCase();
        if (CAL_CONFIG.validStatuses.some((vs) => status.includes(vs))) {
          if (!activeFilter || activeFilter === name) {
            const isTalan = status.includes("talan") || status.includes("talán");
            tagsHtml += `<div class="person-tag ${isTalan ? "status-talan" : "status-biztos"}"><span>${emoji}</span><span>${name}</span></div>`;
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

    fragment.appendChild(dayDiv);
  }

  cal.appendChild(fragment);
}

function setupMonthSelect() {
  const sel = document.getElementById("monthSelect");
  if (!sel) return;

  sel.innerHTML = CAL_CONFIG.months
    .map((m, i) => `<option value="${i}" ${i === currentMonthIdx ? "selected" : ""}>${m}</option>`)
    .join("");

  sel.onchange = (e) => {
    currentMonthIdx = parseInt(e.target.value, 10);
    renderCalendar(currentMonthIdx);
  };
}

window.changeMonth = (delta) => {
  currentMonthIdx = (currentMonthIdx + delta + 12) % 12;
  renderCalendar(currentMonthIdx);

  const sel = document.getElementById("monthSelect");
  if (sel) sel.value = currentMonthIdx;
};

window.goToToday = () => {
  currentMonthIdx = new Date().getMonth();
  renderCalendar(currentMonthIdx);

  const sel = document.getElementById("monthSelect");
  if (sel) sel.value = currentMonthIdx;
};

function renderMemberFilter() {
  const box = document.getElementById("memberFilter");
  if (!box) return;

  box.innerHTML = Object.entries(CAL_CONFIG.members)
    .map(([name, emoji]) => `
      <button class="filter-btn ${activeFilter === name ? "active" : ""}" type="button" data-member="${name}">
        <span>${emoji}</span> ${name}
      </button>
    `)
    .join("");

  box.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.member;
      activeFilter = activeFilter === name ? null : name;
      updateCalendarUI();
    });
  });
}

function updateActivityChart() {
  const container = document.getElementById("activityChart");
  if (!container) return;

  container.innerHTML = Object.entries(CAL_CONFIG.members)
    .map(([name, emoji]) => {
      const count = allEvents.filter((e) => {
        const s = safeText(e[name]).toLowerCase();
        return CAL_CONFIG.validStatuses.some((vs) => s.includes(vs));
      }).length;

      const height = Math.min(80, (count / 20) * 80);

      return `
        <div class="chart-column-wrapper">
          <div class="chart-bar" style="height:${height}px"></div>
          <span class="chart-label">${count}</span>
          <span class="chart-emoji">${emoji}</span>
        </div>
      `;
    })
    .join("");
}

function updateNextCountdown() {
  const box = document.getElementById("nextEventContent");
  if (!box) return;

  const now = new Date().setHours(0, 0, 0, 0);
  const next = allEvents
    .filter((e) => e._endTs >= now)
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
  const sidebar = document.getElementById("calendarSidebar");
  if (!btn || !sidebar) return;

  btn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    document.body.classList.toggle("calendar-sidebar-open", sidebar.classList.contains("open"));
  });
}

/* ---------------------------
   INIT
--------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();

  if (!document.body.classList.contains("calendar-page")) {
    injectSidebarLayout();
  }

  const participantsRoot = document.getElementById("participants");
  const profileRoot = document.getElementById("profileContent");

  if (participantsRoot) {
    loadParticipantsFromSheet().catch((err) => {
      console.error(err);
      participantsRoot.innerHTML = `<div class="card"><h2>Hiba a betöltésnél</h2><p>${safeText(err.message)}</p></div>`;
    });
  }

  if (profileRoot) {
    loadProfileFromSheet().catch((err) => {
      console.error(err);
      profileRoot.innerHTML = `<div class="card"><h2>Hiba a betöltésnél</h2><p>${safeText(err.message)}</p></div>`;
    });
  }

  initCalendarPage().catch((err) => {
    console.error(err);
  });
});
