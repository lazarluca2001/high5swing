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

    if (!container || !loading || !content) return;

    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    try {
        /* ========= PERSON ========= */
        const rows = await fetchCSV("PARTICIPANTS");
        const people = extractPeople(rows);
        const person = people.find(p => p.wsdcId === id);
        if (!person) return;

        setText("profileName", person.name);
        setText("profileDivision", person.division);
        setText("profileWsdc", person.wsdcId);

        // avatar initials
        setText(
            "profileInitials",
            person.name.split(" ").map(n => n[0]).join("")
        );

        // WSDC link
        const link = document.getElementById("profileScoringLink");
        if (link) {
            link.href = `https://www.worldsdc.com/registry-points/?num=${person.wsdcId}`;
        }

        /* ========= RESULTS ========= */
        const resultRows = await fetchCSV("RESULTS");

        const headerIndex = resultRows.findIndex(r =>
            r.some(c => safeText(c).toLowerCase() === "name")
        );

        if (headerIndex === -1) return;

        const headers = resultRows[headerIndex].map(h => safeText(h).toLowerCase());
        const get = (n) => headers.indexOf(n);

        const idx = {
            name: get("name"),
            division: get("division"),
            event: get("event"),
            date: get("date"),
            role: get("role"),
            leader: get("leader"),
            follower: get("follower"),
            prelim: get("prelim"),
            semi: get("semi"),
            final: get("final"),
            point: get("point"),
            partner: get("partner")
        };

        let results = resultRows
            .slice(headerIndex + 1)
            .filter(r => safeText(r[idx.name]) === person.name)
            .map(r => ({
                division: safeText(r[idx.division]),
                role: safeText(r[idx.role]),
                event: safeText(r[idx.event]),
                dateRaw: safeText(r[idx.date]),
                date: parseDateSafe(r[idx.date]),
                leader: safeText(r[idx.leader]),
                follower: safeText(r[idx.follower]),
                prelim: safeText(r[idx.prelim]),
                semi: safeText(r[idx.semi]),
                final: safeText(r[idx.final]),
                point: (() => {
                    const raw = safeText(r[idx.point]);
                    const cleaned = raw.replace(",", ".").match(/-?\d+(\.\d+)?/);
                    return cleaned ? parseFloat(cleaned[0]) : 0;
                })(),
                partner: safeText(r[idx.partner])
            }))
            .filter(r => r.event && r.date);

        /* ========= ROLE FILTER ========= */
        const filtered = results.filter(r =>
            (r.role || "").toLowerCase() === activeRole.toLowerCase()
        );

        /* ========= CHART ========= */
        renderChart(filtered);

        /* ========= EVENTS RENDER ========= */
        renderEvents(filtered, content);

        loading.style.display = "none";
        container.style.display = "block";

    } catch (e) {
        console.error(e);
    }
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

        // 🔥 FIX 1: csak valid pontok
        const clean = events
            .filter(e => e.point > 0 && e.date)
            .sort((a, b) => a.date - b.date);

        // 🔥 FIX 2: minimum 2 pont
        if (clean.length < 2) return null;

        let cumulative = 0;

        const data = clean.map((e, index) => {
            cumulative += e.point;

            return {
                x: `${e.date.toLocaleDateString("hu-HU")} #${index}`, // 🔥 FIX 3
                y: cumulative,
                event: e.event,
                partner: e.partner
            };
        });

        return {
            label: division,
            data,
            borderColor: COLORS[division] || "#999",
            tension: 0.4,
            pointRadius: 5,
            pointHoverRadius: 7
        };
    }).filter(Boolean);

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

                        if (!tooltip || tooltip.opacity === 0) {
                            tooltipEl.classList.remove("active");
                            return;
                        }

                        const p = tooltip.dataPoints[0].raw;

                        tooltipEl.innerHTML = `
                            <div class="title">${p.event}</div>
                            <div>Pont: ${p.y}</div>
                            <div>Partner: ${p.partner || "-"}</div>
                        `;

                        const rect = ctx.chart.canvas.getBoundingClientRect();

                        tooltipEl.style.left = rect.left + tooltip.caretX + "px";
                        tooltipEl.style.top = rect.top + tooltip.caretY + "px";

                        tooltipEl.classList.add("active");
                    }
                }
            },

            scales: {
                x: {
                    type: "category",
                    ticks: {
                        callback: function(value) {
                            return value.split(" #")[0]; // eltünteti indexet
                        }
                    }
                },
                y: {
                    beginAtZero: true
                }
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

    const sortedDivisions = Object.keys(grouped).sort((a, b) => {
        return DIVISION_ORDER.indexOf(a) - DIVISION_ORDER.indexOf(b);
    });

    let html = `
        <div class="role-switch">
            <button onclick="setRole('Leader')" class="${activeRole==="Leader"?"active":""}">Leader</button>
            <button onclick="setRole('Follower')" class="${activeRole==="Follower"?"active":""}">Follower</button>
        </div>
    `;

    let i = 0;

    sortedDivisions.forEach(division => {

        html += `<h2 class="division-title">${division}</h2>`;

        grouped[division]
            .sort((a, b) => b.date - a.date)
            .forEach(r => {

                html += `
                <div class="event-accordion-item">
                    <div class="event-header" onclick="toggleAccordion(${i})">
                        <div>
                            <div class="event-name">${r.event}</div>
                            <div class="event-date">${r.dateRaw}</div>
                        </div>

                        <div>
                            <span class="res-badge">${r.final || "-"}</span>
                            <span class="res-badge point">+${r.point}</span>
                        </div>
                    </div>

                    <div class="event-body" id="acc-${i}">
                        <div class="details-grid">
                            <div class="det">
                                <label>Partner</label>
                                <span>${r.partner || "-"}</span>
                            </div>

                            <div class="det">
                                <label>Prelim</label>
                                <span>${r.prelim || "-"}</span>
                            </div>

                            <div class="det">
                                <label>Semi</label>
                                <span>${r.semi || "-"}</span>
                            </div>
                        </div>
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
