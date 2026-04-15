import { fetchCSV } from "./api.js";
import { safeText } from "./utils.js";

/* ========================= */
const DIVISION_ORDER = [
    "Champion",
    "All Star",
    "Advanced",
    "Intermediate",
    "Novice",
    "Newcomer"
];

let activeRole = "Leader";
let chartInstance = null;

/* =========================
   SAFE DOM
========================= */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

/* =========================
   DATE
========================= */
function parseDateSafe(str) {
    const s = safeText(str);
    if (!s) return null;

    const parts = s.replace(/\./g, "-").split("-").map(Number);
    if (parts.length < 3) return null;

    return new Date(parts[0], parts[1] - 1, parts[2]);
}

/* =========================
   PEOPLE
========================= */
function extractPeople(rows) {
    const headerIndex = rows.findIndex(r =>
        r.some(c => safeText(c).toLowerCase() === "name")
    );

    const headers = rows[headerIndex].map(h => safeText(h).toLowerCase());

    return rows
        .slice(headerIndex + 1)
        .map(r => ({
            name: safeText(r[headers.indexOf("name")]),
            division: safeText(r[headers.indexOf("division")]),
            wsdcId: safeText(r[headers.indexOf("wsdc id")])
        }))
        .filter(p => p.name && p.wsdcId);
}

/* =========================
   PROFILE
========================= */
export async function loadProfileFromSheet() {

    const container = document.getElementById("profileContainer");
    const loading = document.getElementById("profileLoading");
    const content = document.getElementById("profileContent");

    if (!container) return;

    const id = new URLSearchParams(window.location.search).get("id");

    const peopleRows = await fetchCSV("PARTICIPANTS");
    const people = extractPeople(peopleRows);
    const person = people.find(p => p.wsdcId === id);

    if (!person) return;

    setText("profileName", person.name);
    setText("profileDivision", person.division);
    setText("profileWsdc", person.wsdcId);
    setText("profileInitials", person.name.split(" ").map(n => n[0]).join(""));

    /* ========= RESULTS ========= */
    const rows = await fetchCSV("RESULTS");

    const headerIndex = rows.findIndex(r =>
        r.some(c => safeText(c).toLowerCase() === "name")
    );

    const headers = rows[headerIndex].map(h => safeText(h).toLowerCase());
    const get = (n) => headers.indexOf(n);

    const idx = {
        name: get("name"),
        division: get("division"),
        event: get("event"),
        date: get("date"),
        role: get("role"),
        final: get("final"),
        point: get("point"),
        partner: get("partner")
    };

    let results = rows
        .slice(headerIndex + 1)
        .filter(r => safeText(r[idx.name]) === person.name)
        .map(r => ({
            division: safeText(r[idx.division]),
            role: safeText(r[idx.role]),
            event: safeText(r[idx.event]),
            dateRaw: safeText(r[idx.date]),
            date: parseDateSafe(r[idx.date]),
            final: safeText(r[idx.final]),
            point: Number(safeText(r[idx.point])) || 0,
            partner: safeText(r[idx.partner])
        }))
        .filter(r => r.date);

    const filtered = results.filter(r =>
        r.role.toLowerCase() === activeRole.toLowerCase()
    );

    renderChart(filtered);
    renderEvents(filtered, content);

    loading.style.display = "none";
    container.style.display = "block";
}

/* =========================
   CHART
========================= */
function renderChart(results) {

    const canvas = document.getElementById("pointsChart");
    if (!canvas) return;

    const COLORS = {
        "Newcomer": "#4DC9F6",
        "Novice": "#CE93D8",
        "Intermediate": "#FFD54F",
        "Advanced": "#66BB6A",
        "All Star": "#6A1B9A",
        "Champion": "#B71C1C"
    };

    const byDivision = {};

    results.forEach(r => {
        if (!byDivision[r.division]) byDivision[r.division] = [];
        byDivision[r.division].push(r);
    });

    const datasets = Object.entries(byDivision).map(([division, events]) => {

        events.sort((a, b) => a.date - b.date);

        let cumulative = 0;

        return {
            label: division,
            data: events.map(e => {
                cumulative += e.point;
                return {
                    x: e.date.toLocaleDateString("hu-HU"),
                    y: cumulative,
                    event: e.event,
                    partner: e.partner
                };
            }),
            borderColor: COLORS[division] || "#999",
            tension: 0.4,
            pointRadius: 5
        };
    });

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
        type: "line",
        data: { datasets },
        options: {
            parsing: false,
            responsive: true,

            interaction: {
                mode: "nearest",
                intersect: false
            },

            plugins: {
                legend: { position: "right" },

                tooltip: {
                    enabled: false,
                    external: function(ctx) {

                        const tooltipEl = document.getElementById("chartTooltip");
                        const tooltip = ctx.tooltip;

                        if (tooltip.opacity === 0) {
                            tooltipEl.classList.remove("active");
                            return;
                        }

                        const p = tooltip.dataPoints[0].raw;

                        tooltipEl.innerHTML = `
                            <div class="title">${p.event}</div>
                            <div>Pont: ${p.y}</div>
                            <div>Partner: ${p.partner || "-"}</div>
                        `;

                        tooltipEl.style.left =
                            ctx.chart.canvas.offsetLeft + tooltip.caretX + "px";
                        tooltipEl.style.top =
                            ctx.chart.canvas.offsetTop + tooltip.caretY + "px";

                        tooltipEl.classList.add("active");
                    }
                }
            },

            scales: {
                x: { type: "category" },
                y: { beginAtZero: true }
            }
        }
    });
}

/* =========================
   EVENTS (ACCORDION)
========================= */
function renderEvents(results, container) {

    const grouped = {};

    results.forEach(r => {
        if (!grouped[r.division]) grouped[r.division] = [];
        grouped[r.division].push(r);
    });

    const sortedDivisions = Object.keys(grouped).sort((a, b) =>
        DIVISION_ORDER.indexOf(a) - DIVISION_ORDER.indexOf(b)
    );

    let html = `
        <div class="role-switch">
            <button onclick="setRole('Leader')" class="${activeRole==="Leader"?"active":""}">Leader</button>
            <button onclick="setRole('Follower')" class="${activeRole==="Follower"?"active":""}">Follower</button>
        </div>
    `;

    let i = 0;

    sortedDivisions.forEach(div => {

        html += `<h2 class="division-title">${div}</h2>`;

        grouped[div]
            .sort((a,b)=>b.date-a.date)
            .forEach(r => {

                html += `
                <div class="event-accordion-item">
                    <div class="event-header" onclick="toggleAccordion(${i})">
                        <div>
                            <div class="event-name">${r.event}</div>
                            <div class="event-date">${r.dateRaw}</div>
                        </div>
                        <div>
                            <span class="res-badge">${r.final}</span>
                            <span class="res-badge point">+${r.point}</span>
                        </div>
                    </div>

                    <div class="event-body" id="acc-${i}">
                        Partner: ${r.partner || "-"}
                    </div>
                </div>
                `;
                i++;
            });
    });

    container.innerHTML = html;
}

/* ========================= */
window.toggleAccordion = (i) => {
    document.getElementById(`acc-${i}`)?.classList.toggle("active");
};

window.setRole = (role) => {
    activeRole = role;
    loadProfileFromSheet();
};
