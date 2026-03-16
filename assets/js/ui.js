import { CSV_URLS } from './config.js';
import { parseCSV, safeText, parseCalendarDate } from './utils.js';

export function setTheme(mode) {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem("theme", mode);
}

export async function initGlobalSidebar() {
    initThemeSelectors();
    await renderNextEvent();
}

function initThemeSelectors() {
    const selectors = [
        document.getElementById("themeSelector"),
        document.getElementById("themeSelectorCalendar")
    ].filter(Boolean);

    if (!selectors.length) return;

    const currentTheme = localStorage.getItem("theme") || "light";

    selectors.forEach(selector => {
        selector.value = currentTheme;
        selector.addEventListener("change", (e) => {
            const newTheme = e.target.value;
            setTheme(newTheme);

            selectors.forEach(other => {
                if (other !== selector) other.value = newTheme;
            });
        });
    });
}

async function renderNextEvent() {
    const target = document.getElementById("nextEventContent");
    if (!target) return;

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
        const startIdx = headers.indexOf("Start date");
        const endIdx = headers.indexOf("End date");

        const events = rows
            .slice(headerIndex + 1)
            .filter(r => safeText(r[eventIdx]))
            .map(row => {
                const startTs = parseCalendarDate(row[startIdx]);
                const endTs = parseCalendarDate(row[endIdx]) || startTs;

                return {
                    title: safeText(row[eventIdx]),
                    startTs,
                    endTs
                };
            })
            .filter(e => e.startTs);

        const now = new Date();
        const todayTs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const next = events
            .filter(e => e.endTs >= todayTs)
            .sort((a, b) => a.startTs - b.startTs)[0];

        if (!next) {
            target.innerHTML = "Nincs több esemény.";
            return;
        }

        const diff = Math.ceil((next.startTs - todayTs) / 86400000);
        const startDate = formatHungarianDate(next.startTs);

        target.innerHTML = `
            <div class="next-event-title">${next.title}</div>
            <div class="next-event-date">${startDate}</div>
            <div class="next-event-countdown">
                ${diff <= 0 ? "Ma kezdődik!" : `Még ${diff} nap`}
            </div>
        `;
    } catch (err) {
        console.error("Következő esemény betöltési hiba:", err);
        target.innerHTML = "Nem sikerült betölteni.";
    }
}

function formatHungarianDate(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}.`;
}
