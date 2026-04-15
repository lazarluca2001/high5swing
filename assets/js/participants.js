import { fetchCSV } from "./api.js";
import { safeText } from "./utils.js";

/* =========================
   CONFIG
========================= */
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
   SAFE DOM SETTER 🔥
========================= */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

/* =========================
   DATE PARSER
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
   LISTA
========================= */
export async function loadParticipantsFromSheet() {
    const root = document.getElementById("participants");
    if (!root) return;

    root.innerHTML = `<div class="card">Betöltés...</div>`;

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
}

/* =========================
   PROFIL
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

        // 🔥 SAFE SET
        setText("profileName", person.name);
        setText("profileDivision", person.division);
        setText("profileWsdc", person.wsdcId);
        setText(
            "profileInitials",
            person.name.split(" ").map(n => n[0]).join("")
        );

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

        /* ========= FILTER ========= */
        const filtered = results.filter(r =>
            (r.role || "").toLowerCase() === activeRole.toLowerCase()
            && r.point > 0
        );

        renderChart(filtered);

        /* ========= RENDER ========= */
        content.innerHTML = `<div class="card">Események: ${filtered.length}</div>`;

        loading.style.display = "none";
        container.style.display = "block";

    } catch (e) {
        console.error(e);
    }
}

/* =========================
   CHART (FIXED)
========================= */
function renderChart(results) {
    if (typeof Chart === "undefined") {
        console.error("Chart.js nincs betöltve");
        return;
    }

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

        const cleanEvents = events
            .filter(e => e.point > 0 && e.date)
            .sort((a, b) => a.date - b.date);

        if (cleanEvents.length < 2) return null;

        let cumulative = 0;

        const data = cleanEvents.map(e => {
            cumulative += e.point;

            return {
                x: e.date.toLocaleDateString("hu-HU"),
                y: cumulative
            };
        });

        return {
            label: division,
            data,
            borderColor: COLORS[division] || "#999",
            tension: 0.4,
            pointRadius: 5
        };
    }).filter(Boolean);

    if (datasets.length === 0) {
        console.warn("Nincs elég adat a grafikonhoz");
        return;
    }

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
        type: "line",
        data: { datasets },
        options: {
            parsing: false,
            responsive: true,
            plugins: {
                legend: { position: "right" }
            },
            scales: {
                x: { type: "category" },
                y: { beginAtZero: true }
            }
        }
    });
}

/* ========================= */
window.setRole = (role) => {
    activeRole = role;
    loadProfileFromSheet();
};
