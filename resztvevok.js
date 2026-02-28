// common.js
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDDBNbIkZize7hPMfYPovbLgnIFWNuseLg0mjzDYGhLCwEEiF_-CiXnV76lgg2mvb54QabZ8y3Sork/pub?gid=1410406652&single=true&output=csv";

const MEMBERS = [
  { nick: "Csongi", full: "Ferenczi Csongor", emoji: "🌈" },
  { nick: "Merci",  full: "Angyal Mercédesz", emoji: "🦆" },
  { nick: "Mózes",  full: "Bende Márton",     emoji: "🦄" },
  { nick: "Luca",   full: "Lázár Luca",       emoji: "🐶" },
  { nick: "Zoli",   full: "Dominguez Zoltán", emoji: "🕺" },
  { nick: "Viki",   full: "Németh Viktória",  emoji: "🦦" },
];

const memberByFullName = Object.fromEntries(MEMBERS.map(m => [m.full, m]));
const memberByNick = Object.fromEntries(MEMBERS.map(m => [m.nick, m]));

let membersData = null;

/* Robust CSV parse */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cur); cur = ""; continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur); cur = "";
      if (row.some(cell => String(cell).trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    cur += ch;
  }

  row.push(cur);
  if (row.some(cell => String(cell).trim() !== "")) rows.push(row);

  return rows;
}

function initThemeToggle() {
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");

  const saved = localStorage.getItem("theme");
  if (saved === "dark") root.setAttribute("data-theme", "dark");
  if (toggle) toggle.checked = root.getAttribute("data-theme") === "dark";

  if (toggle) {
    toggle.addEventListener("change", () => {
      const t = toggle.checked ? "dark" : "light";
      root.setAttribute("data-theme", t);
      localStorage.setItem("theme", t);
    });
  }
}

/**
 * membersData[nick] = { nick, full, emoji, divisions: { [division]: [ {event,dateStr,date,role,partner,prelim,semi,final,point} ] } }
 */
async function loadWSDCData() {
  if (membersData) return membersData;

  membersData = {};
  MEMBERS.forEach(m => membersData[m.nick] = { ...m, divisions: {} });

  const res = await fetch(CSV_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("CSV letöltési hiba");

  const text = await res.text();
  const rows = parseCSV(text);

  const headerRowIndex = rows.findIndex(r => {
    const rr = r.map(x => String(x).trim());
    return rr.includes("Name") && rr.includes("Division") && rr.includes("Event") && rr.includes("Date");
  });

  if (headerRowIndex === -1) throw new Error("Nem találom a fejléc sort (Name/Division/Event/Date).");

  const header = rows[headerRowIndex].map(h => String(h).trim());
  const idx = (col) => header.indexOf(col);

  const iName    = idx("Name");
  const iDiv     = idx("Division");
  const iEvent   = idx("Event");
  const iDate    = idx("Date");
  const iRole    = idx("Role");
  const iPrelim  = idx("Prelim");
  const iSemi    = idx("Semi");
  const iFinal   = idx("Final");
  const iPoint   = idx("Point");
  const iPartner = idx("Partner");

  const dataRows = rows.slice(headerRowIndex + 1);

  for (const r of dataRows) {
    const fullName = String(r[iName] ?? "").trim();
    if (!fullName) continue;

    const member = memberByFullName[fullName];
    if (!member) continue; // csak a 6 tag

    const division = String(r[iDiv] ?? "").trim() || "Unknown";
    const event    = String(r[iEvent] ?? "").trim() || "-";
    const dateStr  = String(r[iDate] ?? "").trim() || "";
    const role     = String(r[iRole] ?? "").trim() || "";
    const partner  = String(r[iPartner] ?? "").trim() || "";

    const prelim = String(r[iPrelim] ?? "").trim();
    const semi   = String(r[iSemi] ?? "").trim();
    const final  = String(r[iFinal] ?? "").trim();

    const point = parseInt(String(r[iPoint] ?? "").trim(), 10);
    const p = Number.isFinite(point) ? point : 0;

    if (!membersData[member.nick].divisions[division]) membersData[member.nick].divisions[division] = [];
    membersData[member.nick].divisions[division].push({
      event,
      dateStr,
      date: dateStr ? new Date(dateStr) : null,
      role,
      partner,
      prelim,
      semi,
      final,
      point: p,
    });
  }

  // sort (ascending) for later calculations; render will sort desc where needed
  for (const nick of Object.keys(membersData)) {
    const divs = membersData[nick].divisions;
    for (const d of Object.keys(divs)) {
      divs[d].sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
    }
  }

  return membersData;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}