import { CSV_URLS, ROLE_ORDER, DIVISION_ORDER } from './config.js';
import { 
    parseCSV, safeText, hasValue, normName, normKey, 
    normDivision, normRole, parseDateToSortable 
} from './utils.js';

/* --- Résztvevők listázása --- */
export async function loadParticipantsFromSheet() {
    const root = document.getElementById("participants");
    if (!root) return;

    root.innerHTML = `<div class="card"><h2>Betöltés…</h2><p>Adatok szinkronizálása...</p></div>`;

    try {
        const res = await fetch(CSV_URLS.PARTICIPANTS, { cache: "no-store" });
        const rows = parseCSV(await res.text());

        // A táblázat 5. sorától (index 4) a 10. soráig (index 9) olvassuk az alap adatokat
        const people = [];
        for (let r = 4; r <= 9; r++) {
            const row = rows[r];
            if (!row) continue;
            const name = safeText(row[1]);
            if (name) {
                people.push({
                    name,
                    division: safeText(row[2]) || "—",
                    wsdcId: safeText(row[3])
                });
            }
        }

        renderParticipants(people);
    } catch (e) {
        root.innerHTML = `<div class="card"><h2>Hiba</h2><p>${e.message}</p></div>`;
    }
}

function renderParticipants(list) {
    const root = document.getElementById("participants");
    if (!list.length) {
        root.innerHTML = `<div class="card"><h2>Nincs adat</h2></div>`;
        return;
    }

    root.innerHTML = list.map(p => {
        const divClass = p.division.toLowerCase().replace(/[^a-z0-9]+/g, "");
        const wsdcLink = p.wsdcId 
            ? `<a href="https://scoring.dance/huHU/wsdc/registry/${p.wsdcId}.html" target="_blank">${p.wsdcId}</a>` 
            : "—";

        return `
            <div class="card">
                <h2>${p.name}</h2>
                <p><span class="tiny"><strong>WSDC:</strong> ${wsdcLink}</span></p>
                <p style="margin-top:10px;"><span class="badge ${divClass}">${p.division}</span></p>
                <p style="margin-top:12px;">
                    <a class="profile-link" href="./profil.html?name=${encodeURIComponent(p.name)}">Profil megnyitása →</a>
                </p>
            </div>
        `;
    }).join("");
}

/* --- Egyéni Profil kezelése --- */
export async function loadProfileFromSheet() {
    const root = document.getElementById("profileContent");
    const titleEl = document.getElementById("profileName");
    const nameParam = new URL(window.location.href).searchParams.get("name");

    if (!root) return;
    if (!nameParam) {
        root.innerHTML = `<div class="card"><h2>Hiányzó név a paraméterben</h2></div>`;
        return;
    }

    if (titleEl) titleEl.textContent = nameParam;

    try {
        const res = await fetch(CSV_URLS.RESULTS, { cache: "no-store" });
        const rows = parseCSV(await res.text());
        const groups = {};

        // Eredmények feldolgozása (4. sortól lefelé)
        for (let r = 4; r < rows.length; r++) {
            const row = rows[r];
            if (!row || normName(row[1]) !== normName(nameParam)) continue;

            const divKey = normDivision(row[2]);
            const roleKey = normRole(row[5]);

            const item = {
                divisionOriginal: safeText(row[2]),
                roleNorm: roleKey,
                event: safeText(row[3]),
                date: safeText(row[4]),
                leaderCount: row[6],
                followerCount: row[7],
                prelim: row[8],
                semi: row[9],
                final: row[10],
                points: row[11],
                partner: row[18],
                _sort: parseDateToSortable(row[4])
            };

            groups[divKey] = groups[divKey] || {};
            groups[divKey][roleKey] = groups[divKey][roleKey] || [];
            groups[divKey][roleKey].push(item);
        }

        renderProfile(groups);
    } catch (e) {
        console.error("Profil hiba:", e);
    }
}

function renderProfile(groups) {
    const root = document.getElementById("profileContent");
    const divisions = Object.keys(groups);

    if (!divisions.length) {
        root.innerHTML = `<div class="card"><h2>Nincs találat</h2><p>Még nincsenek versenyeredmények rögzítve.</p></div>`;
        return;
    }

    // Szerepkörök és divíziók sorrendbe rakása a config alapján
    const allRoles = ["leader", "follower"].filter(r => 
        divisions.some(d => groups[d][r])
    );

    root.innerHTML = allRoles.map(role => {
        const content = DIVISION_ORDER.map(divKey => {
            const items = groups[divKey]?.[role];
            if (!items) return "";

            items.sort((a, b) => b._sort - a._sort); // Legfrissebb elől

            return `
                <section class="block">
                    <h2 class="block-title">${items[0].divisionOriginal}</h2>
                    <div class="result-list">
                        ${items.map(it => `
                            <details class="result-card">
                                <summary class="result-summary">
                                    <div class="result-left">
                                        <div class="result-date">${it.date}</div>
                                        <div class="result-event">${it.event}</div>
                                    </div>
                                    <div class="result-right">
                                        <div class="result-col">
                                            <div class="result-label">Helyezés</div>
                                            <div class="result-value">${hasValue(it.final) ? it.final : "—"}</div>
                                        </div>
                                        <div class="result-col">
                                            <div class="result-label">Pont</div>
                                            <div class="result-value">${hasValue(it.points) ? it.points : "0"}</div>
                                        </div>
                                    </div>
                                </summary>
                                <div class="result-body event-body">
                                    <div class="event-stats">
                                        ${it.partner ? `<div class="stat">Partner: ${it.partner}</div>` : ""}
                                        <div class="stat">L: ${it.leaderCount || "?"} | F: ${it.followerCount || "?"}</div>
                                    </div>
                                </div>
                            </details>
                        `).join("")}
                    </div>
                </section>
            `;
        }).join("");

        return `<div class="role-group"><h1>${role.toUpperCase()}</h1>${content}</div>`;
    }).join("");
}
