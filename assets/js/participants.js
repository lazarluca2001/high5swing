import { CSV_URLS } from "./config.js";
import { parseCSV, safeText } from "./utils.js";

export async function loadParticipantsFromSheet() {
    const root = document.getElementById("participants");
    if (!root) return;
    root.innerHTML = `<div class="card">Résztvevők betöltése...</div>`;

    try {
        const res = await fetch(CSV_URLS.PARTICIPANTS);
        const rows = parseCSV(await res.text());
        const people = rows.slice(4).map(r => ({
            name: safeText(r[1]),
            division: safeText(r[2]),
            wsdcId: safeText(r[3])
        })).filter(p => p.name);

        root.innerHTML = people.map(p => `
            <div class="card member-card">
                <h2>${p.name}</h2>
                <p class="muted">${p.division}</p>
                <div>WSDC: ${p.wsdcId}</div>
                <a href="profil.html?id=${p.wsdcId}" class="profile-button">PROFIL</a>
            </div>
        `).join("");

    } catch (e) {
        root.innerHTML = "Hiba történt a betöltéskor.";
    }
}
