import { fetchCSV } from "./api.js";
import { safeText, parseCalendarDate } from "./utils.js";
import { CAL_CONFIG } from "./config.js";

let allEvents = [];
let activeFilter = null;
let currentMonthIdx = new Date().getMonth();

/* =========================
   INIT
========================= */
export async function initCalendarPage() {
    const cal = document.getElementById("calendar");
    if (!cal) return;

    try {
        const rows = await fetchCSV("CALENDAR");

        const headerIndex = rows.findIndex(r =>
            r.some(c => safeText(c) === "Event")
        );

        if (headerIndex === -1) {
            console.error("Header not found in CSV");
            return;
        }

        const headers = rows[headerIndex].map(h => safeText(h));
        const eventIdx = headers.indexOf("Event");

        allEvents = rows
            .slice(headerIndex + 1)
            .filter(r => safeText(r[eventIdx]))
            .map(row => {
                const e = {};
                headers.forEach((h, i) => e[h] = row[i]);

                e._startTs = parseCalendarDate(e["Start date"]);
                e._endTs = parseCalendarDate(e["End date"]) || e._startTs;

                e._participants = [];

                Object.entries(CAL_CONFIG.members).forEach(([name, emoji]) => {
                    const status = safeText(e[name]).toLowerCase();
                    if (CAL_CONFIG.validStatuses.includes(status)) {
                        e._participants.push({
                            name,
                            emoji,
                            statusClass: status.includes("talán")
                                ? "status-talan"
                                : "status-biztos"
                        });
                    }
                });

                return e;
            })
            .filter(e => e._startTs);

        setupUI();

    } catch (e) {
        console.error("Calendar init error:", e);
    }
}

/* =========================
   UI SETUP
========================= */
function setupUI() {
    const sel = document.getElementById("monthSelect");
    const filterBox = document.getElementById("memberFilter");

    if (!sel) return;

    // hónap selector
    sel.innerHTML = CAL_CONFIG.months.map((m, i) =>
        `<option value="${i}" ${i === currentMonthIdx ? "selected" : ""}>${m}</option>`
    ).join("");

    sel.onchange = e => {
        currentMonthIdx = +e.target.value;
        renderCalendar();
    };

    // filter click (delegation)
    if (filterBox) {
        filterBox.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;

            const name = btn.dataset.name;
            if (!name) return;

            toggleFilter(name);
        });
    }

    // HTML onclick miatt globál
    window.changeMonth = (d) => {
        currentMonthIdx = (currentMonthIdx + d + 12) % 12;
        sel.value = currentMonthIdx;
        renderCalendar();
    };

    window.goToToday = () => {
        currentMonthIdx = new Date().getMonth();
        sel.value = currentMonthIdx;
        renderCalendar();
    };

    renderCalendar();
    renderFilters();
    renderStats();
}

/* =========================
   FILTER
========================= */
function toggleFilter(name) {
    activeFilter = activeFilter === name ? null : name;
    renderCalendar();
    renderFilters();
}

/* =========================
   CALENDAR RENDER
========================= */
function renderCalendar() {
    const cal = document.getElementById("calendar");
    const header = document.getElementById("currentMonthHeader");

    if (!cal || !header) return;

    header.innerText = CAL_CONFIG.months[currentMonthIdx];

    const fragment = document.createDocumentFragment();

    // weekdays
    CAL_CONFIG.weekdays.forEach(d => {
        const el = document.createElement("div");
        el.className = "weekday";
        el.textContent = d;
        fragment.appendChild(el);
    });

    const year = 2026;
    const firstDay = (new Date(year, currentMonthIdx, 1).getDay() + 6) % 7;
    const days = new Date(year, currentMonthIdx + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        empty.className = "day empty";
        fragment.appendChild(empty);
    }

    const todayTs = new Date().setHours(0, 0, 0, 0);

    for (let d = 1; d <= days; d++) {
        const ts = new Date(year, currentMonthIdx, d).setHours(0, 0, 0, 0);

        const dayEl = document.createElement("div");
        dayEl.className = "day" + (ts === todayTs ? " today" : "");

        dayEl.innerHTML = `<div class="day-number">${d}</div>`;

        const events = allEvents
            .filter(e => ts >= e._startTs && ts <= e._endTs)
            .filter(e =>
                !activeFilter ||
                e._participants.some(p => p.name === activeFilter)
            );

        events.forEach(e => {
            const eventEl = document.createElement("div");
            eventEl.className = "event-card";

            eventEl.innerHTML = `
                <div class="event-title">${e.Event}</div>
                ${e._participants.map(p => `
                    <span class="person-tag ${p.statusClass}">
                        ${p.emoji} ${p.name}
                    </span>
                `).join("")}
            `;

            dayEl.appendChild(eventEl);
        });

        fragment.appendChild(dayEl);
    }

    cal.innerHTML = "";
    cal.appendChild(fragment);
}

/* =========================
   FILTER BUTTONS
========================= */
function renderFilters() {
    const box = document.getElementById("memberFilter");
    if (!box) return;

    box.innerHTML = Object.entries(CAL_CONFIG.members).map(([name, emoji]) => `
        <button 
            class="filter-btn ${activeFilter === name ? "active" : ""}"
            data-name="${name}">
            ${emoji} ${name}
        </button>
    `).join("");
}

/* =========================
   STATS
========================= */
function renderStats() {
    const el = document.getElementById("activityChart");
    if (!el) return;

    const stats = {};

    allEvents.forEach(e => {
        e._participants.forEach(p => {
            stats[p.name] = (stats[p.name] || 0) + 1;
        });
    });

    const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);

    el.innerHTML = sorted.map(([name, val]) => `
        <div class="stat-bar-item">
            <span>${name}</span>
            <span class="stat-val">${val}</span>
        </div>
    `).join("");
}
