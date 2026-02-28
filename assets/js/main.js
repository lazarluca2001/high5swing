console.log("High Five Swing site loaded ✅");

// 1) Résztvevők (korábbi CSV)
const PARTICIPANTS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDDBNbIkZize7hPMfYPovbLgnIFWNuseLg0mjzDYGhLCwEEiF_-CiXnV76lgg2mvb54QabZ8y3Sork/pub?gid=689836805&single=true&output=csv";

// 2) Eredmények (új CSV)
const RESULTS_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDDBNbIkZize7hPMfYPovbLgnIFWNuseLg0mjzDYGhLCwEEiF_-CiXnV76lgg2mvb54QabZ8y3Sork/pub?gid=1410406652&single=true&output=csv";

// --- CSV parser ---
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

function normName(s) {
  return safeText(s).toLowerCase();
}

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// --- Résztvevők badge színek (Novice/Intermediate/...) ---
function divisionToClassParticipants(division) {
  return safeText(division).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/* =========================================================
   RÉSZTVEVŐK LISTA (resztvevok.html)
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
          <p class="tiny"><strong>WSDC:</strong> ${wsdcHtml}</p>
          <p style="margin-top:10px;"><span class="badge ${divClass}">${division}</span></p>
          <p class="tiny" style="margin-top:12px;">
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

  // 4. sor header, 5-10 adatok
  const dataStart = 4;
  const dataEnd = 9;

  // B,C,D
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
   PROFIL + EREDMÉNYEK (profil.html)
   ========================================================= */

function parseScoreXY(v) {
  const s = safeText(v);
  return s || "";
}

function parseDateToSortable(dateStr) {
  const s = safeText(dateStr);
  if (!s) return 0;

  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return iso;

  // DD.MM.YYYY vagy DD/MM/YYYY
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

// --- Sorrendek ---
const ROLE_ORDER = ["leader", "follower"];
const DIVISION_ORDER = ["champion", "allstar", "advanced", "intermediate", "novice", "newcomer"];

// Normalizálás
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
  // A címben maradhat az eredeti felirat, de a sorrend norm alapján megy
  return safeText(original) || divNorm;
}

function renderResultItem(it) {
  const date = safeText(it.date) || "—";
  const event = safeText(it.event) || "—";

  const finalPlace = safeText(it.final) || "—";
  const points = safeText(it.points) || "—";

  const prelim = parseScoreXY(it.prelim);
  const semi = parseScoreXY(it.semi);

  const fieldSize = getRoleFieldSize(it.roleNorm, it.leaderCount, it.followerCount);
  const partner = safeText(it.partner);

  const prelimRow = prelim ? `<div class="kv"><span>Prelim</span><span class="mono">${prelim}</span></div>` : "";
  const semiRow = semi ? `<div class="kv"><span>Semi</span><span class="mono">${semi}</span></div>` : "";
  const fieldRow = fieldSize ? `<div class="kv"><span>Létszám (${prettyRole(it.roleNorm)})</span><span class="mono">${fieldSize}</span></div>` : "";
  const partnerRow = partner ? `<div class="kv"><span>Partner (döntő)</span><span>${partner}</span></div>` : "";

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

      <div class="result-body">
        ${
          prelimRow || semiRow || fieldRow || partnerRow
            ? `<div class="result-grid">${prelimRow}${semiRow}${fieldRow}${partnerRow}</div>`
            : `<div class="muted tiny">Nincs további részlet.</div>`
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

  // összes role összegyűjtése
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

          // division cím az első item eredetijéből
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

  // B=1 Name, C=2 Division, D=3 Event, E=4 Date, F=5 Role, G=6 Leader, H=7 Follower,
  // I=8 Prelim, J=9 Semi, K=10 Final, L=11 Point, S=18 Partner
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

  // groups: { [divisionOriginal]: { [roleNorm]: [items...] } }
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

  // Rendezés: legfrissebb elöl
  for (const div of Object.keys(groups)) {
    for (const role of Object.keys(groups[div])) {
      groups[div][role].sort((a, b) => b._sort - a._sort);
    }
  }

  renderProfile(groups);
}

/* =========================================================
   INIT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
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
});