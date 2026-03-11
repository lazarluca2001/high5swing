import { CSV_URLS, CAL_CONFIG } from './config.js';
import { parseCSV, safeText, parseDateToSortable } from './utils.js';

let allEvents = [];
let currentMonthIdx = new Date().getMonth();

export async function initCalendar() {
    const calGrid = document.getElementById("calendar");
    if (!calGrid) return;

    const res = await fetch(CSV_URLS.CALENDAR);
    const rows = parseCSV(await res.text());
    const headers = rows.find(r => r.includes("Event")).map(h => safeText(h));
    
    allEvents = rows.slice(rows.indexOf(rows.find(r => r.includes("Event"))) + 1)
        .filter(r => safeText(r[headers.indexOf("Event")]))
        .map(row => {
            const obj = {};
            headers.forEach((h, i) => obj[h] = row[i]);
            obj._startTs = new Date(row[headers.indexOf("Start date")]).getTime();
            return obj;
        });

    renderCalendar();
}

function renderCalendar() {
    const cal = document.getElementById("calendar");
    if (!cal) return;
    cal.innerHTML = "";
    // ... Naptár rajzoló ciklusok ...
}
