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

/* ========================= */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}

/* ========================= */
function parseDateSafe(str) {
    const s = safeText(str);
    if (!s) return null;

    const parts = s.replace(/\./g, "-").split("-").map(Number);
    if (parts.length < 3) return null;

    return new Date(parts[0], parts[1] - 1, parts[2]);
}

/* ========================= */
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

/* ========================= */
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

/* ========================= */
export async function loadProfileFromSheet() {

    const container = document.getElementById("profileContainer");
    const loading = document.getElementById("profileLoading");
    const content = document.getElementById("profileContent");

    if (!container || !loading || !content) return;

    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;

    try {
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
                date: parseDateSafe(r[idx.date]),
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

/* ========================= */
/* 🔥 JAVÍTOTT CHART */
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

    const allDates = [...new Set(
        results
            .filter(r => r.point > 0 && r.date)
            .map(r => r.date.getTime())
    )].sort((a, b) => a - b);

    const labels = allDates.map(ts =>
        new Date(ts).toLocaleDateString("hu-HU")
    );

    const byDivision = {};
    results.forEach(r => {
        if (!byDivision[r.division]) byDivision[r.division] = [];
        byDivision[r.division].push(r);
    });

    const datasets = Object.entries(byDivision).map(([division, events]) => {

        const sorted = events
            .filter(e => e.point > 0 && e.date)
            .sort((a, b) => a.date - b.date);

        if (sorted.length === 0) return null;

        let cumulative = 0;
        const dataMap = {};

        sorted.forEach(e => {
            cumulative += e.point;
            dataMap[e.date.getTime()] = cumulative;
        });

        let lastValue = 0;

        const data = allDates.map(ts => {
            if (dataMap[ts] !== undefined) {
                lastValue = dataMap[ts];
            }
            return lastValue;
        });

        return {
            label: division,
            data,
            borderColor: COLORS[division] || "#999",
            tension: 0.4
        };
    }).filter(Boolean);

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets
        },
        options: {
            plugins: {
                legend: { position: "right" }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

/* ========================= */
function renderEvents(results, container) {

    const grouped = {};

    results.forEach(r => {
        if (!grouped[r.division]) grouped[r.division] = [];
        grouped[r.division].push(r);
    });

    let html = `
        <div class="role-switch">
            <button class="${activeRole === 'Leader' ? 'active' : ''}" onclick="setRole('Leader')">Leader</button>
            <button class="${activeRole === 'Follower' ? 'active' : ''}" onclick="setRole('Follower')">Follower</button>
        </div>
    `;

    Object.keys(grouped).forEach(div => {

        html += `<div class="division-block">`;
        html += `<div class="division-header">${div}</div>`;
        html += `<div class="event-list">`;

        grouped[div].forEach((r, i) => {

            const id = `${div}-${i}`;

            const badgeClass =
                r.final === "1" ? "gold" :
                r.final === "2" ? "silver" :
                r.final === "3" ? "bronze" : "";

            html += `
                <div class="event-card" data-event-id="${id}">

                    <div class="event-top">
                        <div class="event-title">${r.event}</div>

                        <div class="event-badges">
                            ${r.final ? `<span class="res-badge ${badgeClass}">${r.final}</span>` : ""}
                            <span class="points-badge">+${r.point}</span>
                        </div>
                    </div>

                    <div class="event-expand" id="exp-${id}">
                        <div class="event-details">
                            <div><b>Partner:</b> ${r.partner || "—"}</div>
                            <div><b>Prelim:</b> ${r.prelim || "-"}</div>
                            <div><b>Semi:</b> ${r.semi || "-"}</div>
                        </div>
                    </div>

                </div>
            `;
        });

        html += `</div></div>`;
    });

    container.innerHTML = html;
}

let openEventId = null;

document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-event-id]");
    if (!btn) return;

    const id = btn.dataset.eventId;

    if (openEventId && openEventId !== id) {
        document.getElementById(`exp-${openEventId}`)?.classList.remove("open");
    }

    const el = document.getElementById(`exp-${id}`);
    if (!el) return;

    const isOpen = el.classList.contains("open");

    el.classList.toggle("open", !isOpen);
    openEventId = isOpen ? null : id;
});
