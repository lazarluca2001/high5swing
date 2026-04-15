import { CSV_URLS, CAL_CONFIG } from './config.js';
import { parseCSV, safeText, parseCalendarDate } from './utils.js';

let allEvents = [];
let activeFilter = null;
let currentMonthIdx = new Date().getMonth();

export async function initCalendarPage() {
    const calGrid = document.getElementById("calendar");
    if (!calGrid) return;

    try {
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
                        e._participants.push({ name, emoji, status, 
                            statusClass: status.includes("talán") ? "status-talan" : "status-biztos" });
                    }
                });
                return e;
            }).filter(e => e._startTs);

        setupCalendarUI();
    } catch (e) { console.error(e); }
}

function setupCalendarUI() {
    const sel = document.getElementById("monthSelect");
    if (sel) {
        sel.innerHTML = CAL_CONFIG.months.map((m, i) => `<option value="${i}" ${i === currentMonthIdx ? "selected" : ""}>${m}</option>`).join("");
        sel.onchange = (e) => { currentMonthIdx = parseInt(e.target.value); renderCalendar(); };
    }
    
    window.changeMonth = (delta) => { currentMonthIdx = (currentMonthIdx + delta + 12) % 12; if(sel) sel.value = currentMonthIdx; renderCalendar(); };
    window.goToToday = () => { currentMonthIdx = new Date().getMonth(); if(sel) sel.value = currentMonthIdx; renderCalendar(); };
    window.toggleFilter = (name) => { activeFilter = activeFilter === name ? null : name; renderCalendar(); renderMemberFilter(); };

    renderCalendar();
    renderMemberFilter();
}

function renderCalendar() {
    const cal = document.getElementById("calendar");
    const mHeader = document.getElementById("currentMonthHeader");
    if (!cal) return;
    if (mHeader) mHeader.innerText = CAL_CONFIG.months[currentMonthIdx];

    cal.innerHTML = CAL_CONFIG.weekdays.map(d => `<div class="weekday">${d}</div>`).join("");

    const year = 2026;
    const firstDay = (new Date(year, currentMonthIdx, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, currentMonthIdx + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) cal.innerHTML += `<div class="day empty-day-pre"></div>`;

    const todayTs = new Date().setHours(0,0,0,0);

    for (let d = 1; d <= daysInMonth; d++) {
        const dayTs = new Date(year, currentMonthIdx, d).getTime();
        const events = allEvents.filter(e => dayTs >= e._startTs && dayTs <= e._endTs)
                                .filter(e => !activeFilter || e._participants.some(p => p.name === activeFilter));

        let evHtml = events.map(e => `
            <div class="event-card">
                <div class="event-title">${e.Event}</div>
                ${e._participants.map(p => `<span class="person-tag ${p.statusClass}">${p.emoji} ${p.name}</span>`).join("")}
            </div>
        `).join("");

        cal.innerHTML += `<div class="day ${dayTs === todayTs ? 'today' : ''}"><span class="day-number">${d}</span>${evHtml}</div>`;
    }
}

function renderMemberFilter() {
    const box = document.getElementById("memberFilter");
    if (!box) return;
    box.innerHTML = Object.entries(CAL_CONFIG.members).map(([name, emoji]) => `
        <button class="filter-btn ${activeFilter === name ? 'active' : ''}" 
                style="${activeFilter === name ? '' : 'opacity:0.6; filter:grayscale(1)'}"
                onclick="toggleFilter('${name}')">
            ${emoji} ${name}
        </button>
    `).join("");
}
