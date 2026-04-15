import { fetchCSV } from './api.js';
import { safeText, parseCalendarDate } from './utils.js';

/* =========================
   THEME
========================= */
export function setTheme(mode) {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem("theme", mode);
}

/* =========================
   GLOBAL SIDEBAR INIT
========================= */
export async function initGlobalSidebar() {
    initThemeSelectors();
    await renderNextEvent();
}

/* =========================
   THEME SELECTOR
========================= */
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

            // sync más selectekkel
            selectors.forEach(other => {
                if (other !== selector) {
                    other.value = newTheme;
                }
            });
        });
    });
}

/* =========================
   NEXT EVENT
========================= */
async function renderNextEvent() {
    const target = document.getElementById("nextEventContent");
    if (!target) return;

    target.innerHTML = `<div class="muted">Betöltés...</div>`;

    try {
        // 🔥 KÖZPONTI FETCH
        const rows = await fetchCSV("CALENDAR");

        const headerIndex = rows.findIndex(r =>
            r.some(c => safeText(c) === "Event")
        );

        if (headerIndex === -1) {
            throw new Error("Nem található az 'Event' fejléc.");
        }

        const headers = rows[headerIndex].map(h => safeText(h));

        const eventIdx = headers.indexOf("Event");
        const startIdx = headers.indexOf("Start date");
        const endIdx = headers.indexOf("End date");

        if (eventIdx === -1 || startIdx === -1) {
            throw new Error("Hiányzó oszlopok a naptárban.");
        }

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
        const todayTs = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
        ).getTime();

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
        console.error("Következő esemény hiba:", err);
        target.innerHTML = "Nem sikerült betölteni.";
    }
}

/* =========================
   DATE FORMAT
========================= */
function formatHungarianDate(ts) {
    const d = new Date(ts);

    return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}.`;
}
