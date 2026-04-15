import { CSV_URLS } from "./config.js";
import { parseCSV, safeText } from "./utils.js";

export async function loadParticipantsFromSheet() {
    const root = document.getElementById("participants");
    if (!root) return;

    root.innerHTML = `<div class="card">Betöltés...</div>`;

    try {
        const res = await fetch(CSV_URLS.PARTICIPANTS);
        const rows = parseCSV(await res.text());

        // Az adatok feldolgozása (a 4. sortól kezdődően)
        const people = rows.slice(4, 10)
            .map(r => ({
                name: safeText(r[1]),
                division: safeText(r[2]),
                wsdcId: safeText(r[3])
            }))
            .filter(p => p.name);

        root.innerHTML = people.map(p => `
            <div class="card member-card">
                <div class="card-content">
                    <h2 class="member-name">${p.name}</h2>
                    <p class="member-division">${p.division}</p>
                    <div class="wsdc-row">
                        <span class="wsdc-label">WSDC: ${p.wsdcId}</span>
                        ${p.wsdcId ? `<a href="https://scoring.dance/huHU/wsdc/registry/${p.wsdcId}.html" 
                           target="_blank" class="wsdc-arrow-link" title="Scoring profil megnyitása">➔</a>` : ''}
                    </div>
                </div>
                <div class="card-footer">
                    <a href="profil.html?id=${p.wsdcId}" class="profile-btn">Profil</a>
                </div>
            </div>
        `).join("");
    } catch (err) {
        root.innerHTML = `<div class="card">Hiba történt a betöltéskor.</div>`;
        throw err;
    }
}

export async function loadProfileFromSheet() {
    console.log("Profil modul készen áll.");
}
