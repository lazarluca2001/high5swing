import { CSV_URLS, CAL_CONFIG } from './config.js';
import { parseCSV, safeText, parseCalendarDate } from './utils.js';

let allEvents = [];
let activeFilter = null;
let currentMonthIdx = new Date().getMonth();

export async function initCalendarPage() {

    const calGrid = document.getElementById("calendar");
    if (!calGrid) return;

    try {

        const res = await fetch(CSV_URLS.CALENDAR);
        const rows = parseCSV(await res.text());

        const headerIndex = rows.findIndex(r => r.some(c => safeText(c) === "Event"));

        const headers = rows[headerIndex].map(h => safeText(h));

        const eventIdx = headers.indexOf("Event");

        allEvents = rows.slice(headerIndex + 1)
            .filter(r => safeText(r[eventIdx]))
            .map(row => {

                const e = {};

                headers.forEach((h,i)=> e[h] = row[i]);

                e._startTs = parseCalendarDate(e["Start date"]);
                e._endTs = parseCalendarDate(e["End date"]) || e._startTs;

                return e;

            })
            .filter(e=>e._startTs);

        setupControls();
        updateCalendarUI();

    } catch(e){

        calGrid.innerHTML = `<div class="card"><h2>Hiba</h2><p>${e.message}</p></div>`;

    }

}

function setupControls(){

    const sel = document.getElementById("monthSelect");

    if(sel){

        sel.innerHTML = CAL_CONFIG.months.map((m,i)=>
            `<option value="${i}" ${i===currentMonthIdx?"selected":""}>${m}</option>`
        ).join("");

        sel.onchange = e=>{
            currentMonthIdx = parseInt(e.target.value,10);
            updateCalendarUI();
        };

    }

    window.changeMonth = delta=>{
        currentMonthIdx = (currentMonthIdx + delta + 12) % 12;
        if(sel) sel.value = currentMonthIdx;
        updateCalendarUI();
    };

    window.goToToday = ()=>{
        currentMonthIdx = new Date().getMonth();
        if(sel) sel.value = currentMonthIdx;
        updateCalendarUI();
    };

}

function updateCalendarUI(){
    renderCalendar();
    renderMemberFilter();
    updateNextCountdown();
}

function renderCalendar(){

    const cal = document.getElementById("calendar");
    const mHeader = document.getElementById("currentMonthHeader");

    if(!cal) return;

    if(mHeader) mHeader.innerText = CAL_CONFIG.months[currentMonthIdx];

    cal.innerHTML = "";

    CAL_CONFIG.weekdays.forEach(d=>{
        const div = document.createElement("div");
        div.className = "weekday";
        div.textContent = d;
        cal.appendChild(div);
    });

    const firstDay = (new Date(2026,currentMonthIdx,1).getDay()+6)%7;
    const daysInMonth = new Date(2026,currentMonthIdx+1,0).getDate();

    for(let i=0;i<firstDay;i++){
        cal.appendChild(Object.assign(document.createElement("div"),{className:"day empty-day-pre"}));
    }

    for(let d=1;d<=daysInMonth;d++){

        const currTs = new Date(2026,currentMonthIdx,d).setHours(0,0,0,0);

        const dayEvents = allEvents.filter(e=>currTs>=e._startTs && currTs<=e._endTs);

        const dayDiv = document.createElement("div");
        dayDiv.className="day";

        dayDiv.innerHTML = `<span class="day-number">${d}</span>`;

        dayEvents.forEach(e=>{

            const evCard = document.createElement("div");
            evCard.className="event-card";

            evCard.innerHTML = `<div class="event-title">${safeText(e.Event)}</div>`;

            dayDiv.appendChild(evCard);

        });

        cal.appendChild(dayDiv);

    }

}

function renderMemberFilter(){

    const box = document.getElementById("memberFilter");
    if(!box) return;

    box.innerHTML = Object.entries(CAL_CONFIG.members).map(([name,emoji])=>`
        <button class="filter-btn ${activeFilter===name?"active":""}" onclick="window.toggleFilter('${name}')">
            ${emoji} ${name}
        </button>
    `).join("");

    window.toggleFilter = name=>{
        activeFilter = activeFilter===name?null:name;
        updateCalendarUI();
    };

}

function updateNextCountdown(){

    const box = document.getElementById("nextEventContent");
    if(!box) return;

    const now = new Date().setHours(0,0,0,0);

    const next = allEvents
        .filter(e=>e._endTs>=now)
        .sort((a,b)=>a._startTs-b._startTs)[0];

    if(!next){

        box.innerHTML="Nincs több esemény.";

        return;

    }

    const diff = Math.ceil((next._startTs-now)/86400000);

    box.innerHTML=`<strong>${safeText(next.Event)}</strong><br>${diff<=0?"MA kezdődik!":`Még ${diff} nap`}`;

}
