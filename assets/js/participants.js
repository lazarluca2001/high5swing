import { CSV_URLS } from "./config.js";
import { parseCSV, safeText } from "./utils.js";

// 1. FÜGGVÉNY: A RÉSZTVEVŐK LISTÁJÁNAK BETÖLTÉSE
export async function loadParticipantsFromSheet() {
    const root = document.getElementById("participants");
    if (!root) return;

    root.innerHTML = `<div class="card">Résztvevők betöltése...</div>`;

    try {
        const res = await fetch(CSV_URLS.PARTICIPANTS);
        const csvText = await res.text();
        const rows = parseCSV(csvText);

        // Az adatok a 4. sortól kezdődnek a táblázatod alapján
        const people = rows.slice(4)
            .map(r => ({
                name: safeText(r[1]),
                division: safeText(r[2]),
                wsdcId: safeText(r[3])
            }))
            .filter(p => p.name); // Csak azokat hagyjuk meg, ahol van név

        root.innerHTML = people.map(p => `
            <div class="card member-card">
                <div class="card-body">
                    <h2 style="font-size: 1.25rem; font-weight: 900;">${p.name}</h2>
                    <p class="muted" style="font-size: 0.9rem;">${p.division}</p>
                    <div class="wsdc-row" style="display: flex; align-items: center; gap: 8px; margin-top: 10px; font-weight: bold;">
                        <span>WSDC: ${p.wsdcId}</span>
                        <a href="https://scoring.dance/huHU/wsdc/registry/${p.wsdcId}.html" 
                           target="_blank" class="wsdc-link" style="color: var(--hfs-red); text-decoration: none;">➔</a>
                    </div>
                </div>
                <div class="card-footer" style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                    <a href="profil.html?id=${p.wsdcId}" class="profile-button" 
                       style="display: block; width: 100%; text-align: center; padding: 10px; background: var(--hfs-light-red); color: var(--hfs-red); border-radius: var(--radius-md); font-weight: 800; text-decoration: none;">
                       PROFIL
                    </a>
                </div>
            </div>
        `).join("");
    } catch (err) {
        console.error("Hiba a lista betöltésekor:", err);
        root.innerHTML = `<div class="card">Hiba történt az adatok letöltésekor.</div>`;
    }
}

// 2. FÜGGVÉNY: EGY ADOTT PROFIL BETÖLTÉSE
export async function loadProfileFromSheet() {
    const container = document.getElementById("profileContainer");
    const loader = document.getElementById("profileLoading");
    
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const wsdcId = urlParams.get('id');

    if (!wsdcId) {
        if (loader) loader.innerHTML = "Hiba: Nincs kiválasztva táncos.";
        return;
    }

    try {
        const res = await fetch(CSV_URLS.PARTICIPANTS);
        const rows = parseCSV(await res.text());

        const memberData = rows.find(r => safeText(r[3]) === safeText(wsdcId));

        if (!memberData) {
            if (loader) loader.innerHTML = `A keresett táncos (${wsdcId}) nem található.`;
            return;
        }

        const member = {
            name: safeText(memberData[1]),
            division: safeText(memberData[2]),
            wsdcId: safeText(memberData[3]),
            points: safeText(memberData[4]) || "0",
            events: safeText(memberData[5]) || "0"
        };

        // UI kitöltése
        if (document.getElementById("profileName")) document.getElementById("profileName").innerText = member.name;
        if (document.getElementById("profileDivision")) document.getElementById("profileDivision").innerText = member.division;
        if (document.getElementById("profileWsdc")) document.getElementById("profileWsdc").innerText = `WSDC: ${member.wsdcId}`;
        if (document.getElementById("profileScoringLink")) document.getElementById("profileScoringLink").href = `https://scoring.dance/huHU/wsdc/registry/${member.wsdcId}.html`;
        if (document.getElementById("statPoints")) document.getElementById("statPoints").innerText = member.points;
        if (document.getElementById("statEvents")) document.getElementById("statEvents").innerText = member.events;
        
        if (document.getElementById("profileInitials")) {
            document.getElementById("profileInitials").innerText = member.name.split(' ').map(n => n[0]).join('').toUpperCase();
        }

        if (loader) loader.style.display = "none";
        container.style.display = "block";

    } catch (err) {
        console.error("Hiba a profil betöltésekor:", err);
        if (loader) loader.innerHTML = "Hiba történt a profil adatok letöltésekor.";
    }
}
