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

        const headers = rows[headerIndex].map(safeText);
        const eventIdx = headers.indexOf("Event");

        allEvents = rows
            .slice(headerIndex + 1)
            .filter(r => safeText(r[eventIdx]))
            .map(row => {
                const e = {};
                headers.forEach((h, i) => e[h] = row[i]);

                e._startTs = parseCalendarDate(e["Start date"]);
                e._endTs = parseCalendarDate(e["End date"]) || e._startTs;

                e._participants = Object.entries(CAL_CONFIG.members)
                    .map(([name, emoji]) => {
                        const status = safeText(e[name]).toLowerCase();
                        if (!CAL_CONFIG.validStatuses.includes(status)) return null;

                        return {
                            name,
                            emoji,
                            statusClass: status.includes("talán")
                                ? "status-talan"
                                : "status-biztos"
                        };
                    })
                    .filter(Boolean);

                return e;
            })
            .filter(e => e._startTs);

        setupUI();
        renderCalendar();
        renderFilters();
        renderStats();

    } catch (e) {
        console.error("Calendar init error:", e);
    }
}

/* =========================
   UI
========================= */
function setupUI() {
    const sel = document.getElementById("monthSelect");
    const filterBox = document.getElementById("memberFilter");

    if (!sel) return;

    sel.innerHTML = CAL_CONFIG.months.map((m, i) =>
        `<option value="${i}" ${i === currentMonthIdx ? "selected" : ""}>${m}</option>`
    ).join("");

    sel.onchange = e => {
        currentMonthIdx = +e.target.value;
        renderCalendar();
    };

    if (filterBox) {
        filterBox.onclick = (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            toggleFilter(btn.dataset.name);
        };
    }

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
}

function toggleFilter(name) {
    activeFilter = activeFilter === name ? null : name;
    renderCalendar();
    renderFilters();
}

/* =========================
   RENDER
========================= */
function renderCalendar() {
    const cal = document.getElementById("calendar");
    const header = document.getElementById("currentMonthHeader");

    if (!cal || !header) return;

    header.innerText = CAL_CONFIG.months[currentMonthIdx];

    const fragment = document.createDocumentFragment();

    // WEEKDAYS
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

        // stagger animation delay
        dayEl.style.animationDelay = `${d * 0.01}s`;

        dayEl.innerHTML = `<div class="day-number">${d}</div>`;

        const events = allEvents
            .filter(e => ts >= e._startTs && ts <= e._endTs)
            .filter(e =>
                !activeFilter ||
                e._participants.some(p => p.name === activeFilter)
            );

        // max 3 event
        events.slice(0, 3).forEach(e => {
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

            // click interaction
            eventEl.onclick = () => {
                eventEl.classList.toggle("open");
            };

            dayEl.appendChild(eventEl);
        });

        // +X esemény badge
        if (events.length > 3) {
            const more = document.createElement("div");
            more.className = "more-events";
            more.textContent = `+${events.length - 3} esemény`;
            dayEl.appendChild(more);
        }

        fragment.appendChild(dayEl);
    }

    cal.innerHTML = "";
    cal.appendChild(fragment);
}

/* =========================
   FILTERS
========================= */
function renderFilters() {
    const box = document.getElementById("memberFilter");
    if (!box) return;

    box.innerHTML = Object.entries(CAL_CONFIG.members).map(([name, emoji]) => `
        <button class="filter-btn ${activeFilter === name ? "active" : ""}" data-name="${name}">
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

    el.innerHTML = Object.entries(stats)
        .sort((a, b) => b[1] - a[1])
        .map(([name, val]) => `
            <div class="stat-bar-item">
                <span>${name}</span>
                <span class="stat-val">${val}</span>
            </div>
        `).join("");
}
