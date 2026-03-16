import { CSV_URLS } from "./config.js";
import { parseCSV, safeText } from "./utils.js";

export async function loadParticipantsFromSheet() {
    const root = document.getElementById("participants");
    if (!root) return;

    root.innerHTML = `<div class="card">Betöltés...</div>`;

    const res = await fetch(CSV_URLS.PARTICIPANTS);
    const rows = parseCSV(await res.text());

    const people = rows.slice(4, 10)
        .map(r => ({
            name: safeText(r[1]),
            division: safeText(r[2]),
            wsdcId: safeText(r[3])
        }))
        .filter(p => p.name);

    root.innerHTML = people.map(p => `
        <div class="card">
            <h2>${p.name}</h2>
            <p>${p.division}</p>
            <p>${p.wsdcId}</p>
        </div>
    `).join("");
}

export async function loadProfileFromSheet() {
    console.log("Profil modul készen áll.");
}
