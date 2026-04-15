import { CSV_URLS, CAL_CONFIG } from './config.js';
import { parseCSV, safeText, parseCalendarDate } from './utils.js';

let allEvents = [];
let activeFilter = null;
let currentMonthIdx = new Date().getMonth();

export async function initCalendarPage() {
    const calGrid = document.getElementById("calendar");
    if (!calGrid) return;

    const res = await fetch(CSV_URLS.CALENDAR, { cache: "no-store" });
    const rows = parseCSV(await res.text());

    const headerIndex = rows.findIndex(r => r.some(c => safeText(c) === "Event"));
    const headers = rows[headerIndex].map(h => safeText(h));

    allEvents = rows.slice(headerIndex + 1)
        .filter(r => safeText(r[headers.indexOf("Event")]))
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
                        status,
                        statusClass: status.includes("talán") ? "status-talan" : "status-biztos"
                    });
                }
            });

            return e;
        }).filter(e => e._startTs);

    setupCalendarUI();
}

function setupCalendarUI() {
    const sel = document.getElementById("monthSelect");

    sel.innerHTML = CAL_CONFIG.months.map((m, i) =>
        `<option value="${i}" ${i === currentMonthIdx ? "selected" : ""}>${m}</option>`
    ).join("");

    sel.onchange = (e) => {
        currentMonthIdx = parseInt(e.target.value);
        renderCalendar();
    };

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

    window.toggleFilter = (name) => {
        activeFilter = activeFilter === name ? null : name;
        renderCalendar();
        renderMemberFilter();
    };

    renderCalendar();
    renderMemberFilter();
    renderActivityChart();
}

function renderCalendar() {
    const cal = document.getElementById("calendar");
    const header = document.getElementById("currentMonthHeader");

    header.innerText = CAL_CONFIG.months[currentMonthIdx];

    cal.innerHTML = CAL_CONFIG.weekdays.map(d =>
        `<div class="weekday">${d}</div>`
    ).join("");

    const year = 2026;
    const firstDay = (new Date(year, currentMonthIdx, 1).getDay() + 6) % 7;
    const days = new Date(year, currentMonthIdx + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        cal.innerHTML += `<div class="day empty"></div>`;
    }

    for (let d = 1; d <= days; d++) {
        const ts = new Date(year, currentMonthIdx, d).getTime();

        const events = allEvents.filter(e =>
            ts >= e._startTs && ts <= e._endTs
        ).filter(e =>
            !activeFilter || e._participants.some(p => p.name === activeFilter)
        );

        cal.innerHTML += `
            <div class="day">
                <div class="day-number">${d}</div>
                ${events.map(e => `
                    <div class="event-card">
                        <div class="event-title">${e.Event}</div>
                        ${e._participants.map(p =>
                            `<span class="person-tag ${p.statusClass}">
                                ${p.emoji} ${p.name}
                            </span>`
                        ).join("")}
                    </div>
                `).join("")}
            </div>
        `;
    }
}

function renderMemberFilter() {
    const box = document.getElementById("memberFilter");

    box.innerHTML = Object.entries(CAL_CONFIG.members).map(([name, emoji]) => `
        <button class="filter-btn ${activeFilter === name ? 'active' : ''}"
            onclick="toggleFilter('${name}')">
            ${emoji} ${name}
        </button>
    `).join("");
}

function renderActivityChart() {
    const el = document.getElementById("activityChart");

    const stats = {};

    allEvents.forEach(e => {
        e._participants.forEach(p => {
            stats[p.name] = (stats[p.name] || 0) + 1;
        });
    });

    const sorted = Object.entries(stats).sort((a,b)=>b[1]-a[1]);

    el.innerHTML = sorted.map(([name,val]) => `
        <div class="stat-bar-item">
            <span>${name}</span>
            <span class="stat-val">${val}</span>
        </div>
    `).join("");
}
