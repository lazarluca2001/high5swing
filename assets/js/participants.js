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

    if (headerIndex === -1) return [];

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
   PARTICIPANTS LISTA ✅
========================= */
export async function loadParticipantsFromSheet() {
    const root = document.getElementById("participants");
    if (!root) return;

    root.innerHTML = `<div class="card">Betöltés...</div>`;

    try {
        const rows = await fetchCSV("PARTICIPANTS");
        const people = extractPeople(rows);

        root.innerHTML = people.map(p => `
            <div class="card">
                <h2>${p.name}</h2>
                <p>${p.division || "—"}</p>
                <a href="./profil.html?id=${encodeURIComponent(p.wsdcId)}">
                    Profil
                </a>
            </div>
        `).join("");

    } catch (e) {
        console.error(e);
        root.innerHTML = `<div class="card">Hiba történt</div>`;
    }
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
        setText("profileInitials", person.name.split(" ").map(n => n[0]).join(""));

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
                prelim: safeText(r[idx.prelim]),
                semi: safeText(r[idx.semi]),
                final: safeText(r[idx.final]),
                point: Number(safeText(r[idx.point])) || 0,
                partner: safeText(r[idx.partner])
            }))
            .filter(r => r.event && r.date);

        const filtered = results.filter(r =>
            (r.role || "").toLowerCase() === activeRole.toLowerCase()
        );

        renderChart(filtered);
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

        const clean = events
            .filter(e => e.point > 0 && e.date)
            .sort((a, b) => a.date - b.date);

        if (clean.length < 2) return null;

        let cumulative = 0;

        return {
            label: division,
            data: clean.map((e, i) => {
                cumulative += e.point;
                return {
                    x: `${e.date.toLocaleDateString("hu-HU")} #${i}`,
                    y: cumulative,
                    event: e.event,
                    partner: e.partner
                };
            }),
            borderColor: COLORS[division] || "#999",
            tension: 0.4
        };
    }).filter(Boolean);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
        type: "line",
        data: { datasets },
        options: {
            parsing: false,
            plugins: { legend: { position: "right" } },
            scales: {
                x: {
                    type: "category",
                    ticks: {
                        callback: v => v.split(" #")[0]
                    }
                },
                y: { beginAtZero: true }
            }
        }
    });
}

/* =========================
   EVENTS
========================= */
function renderEvents(results, container) {

    const grouped = {};

    results.forEach(r => {
        if (!grouped[r.division]) grouped[r.division] = [];
        grouped[r.division].push(r);
    });

    let html = `
        <div class="role-switch">
            <button onclick="setRole('Leader')">Leader</button>
            <button onclick="setRole('Follower')">Follower</button>
        </div>
    `;

    Object.keys(grouped).forEach(div => {
        html += `<h2>${div}</h2>`;

        grouped[div].forEach((r, i) => {
            html += `
                <div onclick="toggleAccordion(${i})">
                    ${r.event} (+${r.point})
                </div>
                <div id="acc-${i}" style="display:none">
                    Partner: ${r.partner}
                </div>
            `;
        });
    });

    container.innerHTML = html;
}

/* ========================= */
window.toggleAccordion = (i) => {
    const el = document.getElementById(`acc-${i}`);
    if (el) el.style.display = el.style.display === "none" ? "block" : "none";
};

window.setRole = (role) => {
    activeRole = role;
    loadProfileFromSheet();
};
