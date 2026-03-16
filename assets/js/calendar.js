import { CSV_URLS, CAL_CONFIG } from './config.js';
import { parseCSV, safeText, parseCalendarDate } from './utils.js';
import { setTheme } from './ui.js';

let allEvents = [];
let activeFilter = null;
let currentMonthIdx = new Date().getMonth();

export async function initCalendarPage() {
    const calGrid = document.getElementById("calendar");
    if (!calGrid) return;

    try {
        const res = await fetch(CSV_URLS.CALENDAR, { cache: "no-store" });
        if (!res.ok) {
            throw new Error(`Nem sikerült betölteni a naptár CSV-t (${res.status})`);
        }

        const rows = parseCSV(await res.text());
        const headerIndex = rows.findIndex(r => r.some(c => safeText(c) === "Event"));

        if (headerIndex === -1) {
            throw new Error("Nem található az 'Event' fejléc a naptár táblában.");
        }

        const headers = rows[headerIndex].map(h => safeText(h));
        const eventIdx = headers.indexOf("Event");

        allEvents = rows
            .slice(headerIndex + 1)
            .filter(r => safeText(r[eventIdx]))
            .map(row => {
                const e = {};
                headers.forEach((h, i) => {
                    e[h] = row[i];
                });

                e._startTs = parseCalendarDate(e["Start date"]);
                e._endTs = parseCalendarDate(e["End date"]) || e._startTs;
                e._participants = extractParticipants(e);

                return e;
            })
            .filter(e => e._startTs);

        setupControls();
        updateCalendarUI();
    } catch (e) {
        calGrid.innerHTML = `<div class="card"><h2>Hiba</h2><p>${safeText(e.message)}</p></div>`;
        console.error("Naptár betöltési hiba:", e);
    }
}

function setupControls() {
    const sel = document.getElementById("monthSelect");
    if (sel) {
        sel.innerHTML = CAL_CONFIG.months
            .map((m, i) => `<option value="${i}" ${i === currentMonthIdx ? "selected" : ""}>${m}</option>`)
            .join("");

        sel.onchange = (e) => {
            currentMonthIdx = parseInt(e.target.value, 10);
            updateCalendarUI();
        };
    }

    const themeSelector = document.getElementById("themeSelectorCalendar");
    if (themeSelector) {
        themeSelector.value = localStorage.getItem("theme") || "light";
        themeSelector.addEventListener("change", (e) => {
            setTheme(e.target.value);
        });
    }

    const sidebar = document.getElementById("calendarSidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");
    if (sidebar && sidebarToggle) {
        sidebarToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            document.body.classList.toggle("calendar-sidebar-open", sidebar.classList.contains("open"));
        });

        document.addEventListener("click", (event) => {
            const isMobile = window.innerWidth <= 1024;
            if (!isMobile) return;

            const clickedInsideSidebar = sidebar.contains(event.target);
            const clickedToggle = sidebarToggle.contains(event.target);

            if (!clickedInsideSidebar && !clickedToggle && sidebar.classList.contains("open")) {
                sidebar.classList.remove("open");
                document.body.classList.remove("calendar-sidebar-open");
            }
        });
    }

    window.changeMonth = (delta) => {
        currentMonthIdx = (currentMonthIdx + delta + 12) % 12;
        if (sel) sel.value = currentMonthIdx;
        updateCalendarUI();
    };

    window.goToToday = () => {
        const now = new Date();
        currentMonthIdx = now.getMonth();
        if (sel) sel.value = currentMonthIdx;
        updateCalendarUI();
    };

    window.toggleFilter = (name) => {
        activeFilter = activeFilter === name ? null : name;
        updateCalendarUI();
    };
}

function updateCalendarUI() {
    renderCalendar();
    renderMemberFilter();
    renderActivityChart();
    updateNextCountdown();
}

function renderCalendar() {
    const cal = document.getElementById("calendar");
    const mHeader = document.getElementById("currentMonthHeader");
    if (!cal) return;

    if (mHeader) {
        mHeader.innerText = CAL_CONFIG.months[currentMonthIdx];
    }

    cal.innerHTML = "";

    CAL_CONFIG.weekdays.forEach((d) => {
        const div = document.createElement("div");
        div.className = "weekday";
        div.textContent = d;
        cal.appendChild(div);
    });

    const year = 2026;
    const firstDay = (new Date(year, currentMonthIdx, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, currentMonthIdx + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        empty.className = "day empty-day-pre";
        cal.appendChild(empty);
    }

    const today = new Date();
    const todayTs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    for (let d = 1; d <= daysInMonth; d++) {
        const dayTs = new Date(year, currentMonthIdx, d).getTime();

        const dayEvents = allEvents
            .filter((e) => dayTs >= e._startTs && dayTs <= e._endTs)
            .filter((e) => !activeFilter || e._participants.some(p => p.name === activeFilter))
            .sort((a, b) => a._startTs - b._startTs);

        const dayDiv = document.createElement("div");
        dayDiv.className = "day";

        if (dayTs === todayTs) {
            dayDiv.classList.add("today");
        }

        const dayNumber = document.createElement("span");
        dayNumber.className = "day-number";
        dayNumber.textContent = d;
        dayDiv.appendChild(dayNumber);

        dayEvents.forEach((e) => {
            const evCard = document.createElement("div");
            evCard.className = "event-card";

            const title = document.createElement("div");
            title.className = "event-title";
            title.textContent = safeText(e.Event);
            evCard.appendChild(title);

            if (e._participants.length) {
                const participants = document.createElement("div");
                participants.className = "participants-container";

                e._participants.forEach((p) => {
                    if (activeFilter && p.name !== activeFilter) return;

                    const tag = document.createElement("div");
                    tag.className = `person-tag ${p.statusClass}`;
                    tag.innerHTML = `<span>${p.emoji}</span><span>${p.name}</span>`;
                    participants.appendChild(tag);
                });

                if (participants.childElementCount > 0) {
                    evCard.appendChild(participants);
                }
            }

            dayDiv.appendChild(evCard);
        });

        cal.appendChild(dayDiv);
    }

    const totalCells = firstDay + daysInMonth;
    const trailingDays = (7 - (totalCells % 7)) % 7;

    for (let i = 0; i < trailingDays; i++) {
        const empty = document.createElement("div");
        empty.className = "day empty-day-post";
        cal.appendChild(empty);
    }
}

function renderMemberFilter() {
    const box = document.getElementById("memberFilter");
    if (!box) return;

    box.innerHTML = Object.entries(CAL_CONFIG.members)
        .map(([name, emoji]) => `
            <button
                class="filter-btn ${activeFilter === name ? "active" : ""}"
                onclick="window.toggleFilter('${name}')"
                type="button"
            >
                ${emoji} ${name}
            </button>
        `)
        .join("");
}

function renderActivityChart() {
    const box = document.getElementById("activityChart");
    if (!box) return;

    const counts = Object.keys(CAL_CONFIG.members).map((name) => {
        const count = allEvents.filter(e => e._participants.some(p => p.name === name)).length;
        return {
            name,
            emoji: CAL_CONFIG.members[name],
            count
        };
    });

    const max = Math.max(...counts.map(c => c.count), 1);

    box.innerHTML = counts.map(({ name, emoji, count }) => {
        const height = Math.max(10, Math.round((count / max) * 120));
        return `
            <div class="chart-column-wrapper" title="${name}: ${count} esemény">
                <div class="chart-value">${count}</div>
                <div class="chart-bar" style="height:${height}px;"></div>
                <div class="chart-label">${name}</div>
                <div class="chart-emoji">${emoji}</div>
            </div>
        `;
    }).join("");
}

function updateNextCountdown() {
    const box = document.getElementById("nextEventContent");
    if (!box) return;

    const now = new Date();
    const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const next = allEvents
        .filter(e => e._endTs >= todayTs)
        .filter(e => !activeFilter || e._participants.some(p => p.name === activeFilter))
        .sort((a, b) => a._startTs - b._startTs)[0];

    if (!next) {
        box.innerHTML = "Nincs több esemény.";
        return;
    }

    const diff = Math.ceil((next._startTs - todayTs) / 86400000);
    const startDate = formatHungarianDate(next._startTs);

    box.innerHTML = `
        <div class="next-event-title">${safeText(next.Event)}</div>
        <div class="next-event-date">${startDate}</div>
        <div class="next-event-countdown">
            ${diff <= 0 ? "Ma kezdődik!" : `Még ${diff} nap`}
        </div>
    `;
}

function extractParticipants(eventObj) {
    const participants = [];

    Object.entries(CAL_CONFIG.members).forEach(([name, emoji]) => {
        const rawStatus = normalizeStatus(eventObj[name]);

        if (!CAL_CONFIG.validStatuses.includes(rawStatus)) return;

        participants.push({
            name,
            emoji,
            status: rawStatus,
            statusClass: rawStatus === "talán" || rawStatus === "talan" ? "status-talan" : "status-biztos"
        });
    });

    return participants;
}

function normalizeStatus(value) {
    return safeText(value).toLowerCase();
}

function formatHungarianDate(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}.`;
}
