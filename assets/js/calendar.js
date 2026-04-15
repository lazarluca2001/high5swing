import { fetchCSV } from "./api.js";
import { safeText, parseCalendarDate } from "./utils.js";
import { CAL_CONFIG } from "./config.js";

let allEvents = [];
let activeFilter = null;
let currentMonthIdx = new Date().getMonth();

export async function initCalendarPage() {
    const cal = document.getElementById("calendar");
    if (!cal) return;

    const rows = await fetchCSV("CALENDAR");

    const headerIndex = rows.findIndex(r => r.some(c => safeText(c) === "Event"));

    if (headerIndex === -1) {
        console.error("Header not found in CSV");
        return;
    }

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
        })
        .filter(e => e._startTs);

    setupUI();
}
