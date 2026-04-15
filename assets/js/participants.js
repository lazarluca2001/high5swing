import { CSV_URLS } from "./config.js";
import { parseCSV, safeText } from "./utils.js";

export async function loadParticipantsFromSheet() {
    const root = document.getElementById("participants");
    if (!root) return;

    root.innerHTML = `<div class="card">Résztvevők betöltése...</div>`;

    try {
        const res = await fetch(CSV_URLS.PARTICIPANTS, { cache: "no-store" });

        if (!res.ok) {
            throw new Error(`Fetch hiba: ${res.status}`);
        }

        const text = await res.text();
        const rows = parseCSV(text);

        console.log("CSV rows:", rows); // DEBUG

        // ⚠️ header skip biztonságosabban
        const people = rows
            .slice(4) // ha fix a struktúra, maradhat
            .map(r => ({
                name: safeText(r[1]),
                division: safeText(r[2]),
                wsdcId: safeText(r[3])
            }))
            .filter(p => p.name && p.wsdcId);

        if (!people.length) {
            root.innerHTML = `<div class="card">Nincs megjeleníthető adat.</div>`;
            return;
        }

        root.innerHTML = people.map(p => `
            <div class="card member-card">
                <h2 style="font-size:1.2rem; font-weight:900;">${p.name}</h2>
                <p class="muted">${p.division || "—"}</p>
                <div style="margin:10px 0; font-weight:700; opacity:0.8;">
                    WSDC: ${p.wsdcId}
                </div>
                <a href="./profil.html?id=${encodeURIComponent(p.wsdcId)}" class="profile-button">
                    PROFIL →
                </a>
            </div>
        `).join("");

    } catch (e) {
        console.error("Participants load error:", e);
        root.innerHTML = `<div class="card">Hiba történt az adatok betöltésekor.</div>`;
    }
}
