import { fetchCSV } from "./api.js";
import { safeText } from "./utils.js";

function extractPeople(rows) {
    const headerIndex = rows.findIndex(r =>
        r.some(c => safeText(c).toLowerCase() === "name")
    );

    if (headerIndex === -1) return [];

    const headers = rows[headerIndex].map(h => safeText(h).toLowerCase());

    const nameIdx = headers.indexOf("name");
    const divisionIdx = headers.indexOf("division");
    const wsdcIdx = headers.indexOf("wsdc id");

    return rows
        .slice(headerIndex + 1)
        .map(r => ({
            name: safeText(r[nameIdx]),
            division: safeText(r[divisionIdx]),
            wsdcId: safeText(r[wsdcIdx])
        }))
        .filter(p => p.name && p.wsdcId);
}

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
