import { CSV_URLS } from "./config.js";
import { parseCSV, safeText } from "./utils.js";

/**
 * Betölti egy adott táncos profiladatait a Google Sheets-ből
 * az URL-ben található ID alapján.
 */
export async function loadProfileFromSheet() {
    const container = document.getElementById("profileContainer");
    const loader = document.getElementById("profileLoading");
    
    // Csak akkor fusson le, ha a profil oldalon vagyunk (ahol van profileContainer)
    if (!container) return;

    // 1. ID kinyerése az URL-ből (?id=24645)
    const urlParams = new URLSearchParams(window.location.search);
    const wsdcId = urlParams.get('id');

    if (!wsdcId) {
        if (loader) loader.innerHTML = "Hiba: Nincs megadva táncos azonosító.";
        console.warn("Profil betöltése sikertelen: hiányzó ID az URL-ből.");
        return;
    }

    try {
        // 2. Adatok betöltése a Sheets-ből
        const res = await fetch(CSV_URLS.PARTICIPANTS);
        if (!res.ok) throw new Error("Hálózati hiba a CSV letöltésekor");
        
        const csvText = await res.text();
        const rows = parseCSV(csvText);

        // 3. Megkeressük a konkrét embert a WSDC ID alapján (D oszlop, index: 3)
        // Fontos: a safeText segít a szóközök és típusok kezelésében
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

        // 4. UI frissítése - biztonsági ellenőrzéssel (ha egy elem hiányozna a HTML-ből)
        const elName = document.getElementById("profileName");
        const elDiv = document.getElementById("profileDivision");
        const elWsdc = document.getElementById("profileWsdc");
        const elLink = document.getElementById("profileScoringLink");
        const elPoints = document.getElementById("statPoints");
        const elEvents = document.getElementById("statEvents");
        const elInitials = document.getElementById("profileInitials");

        if (elName) elName.innerText = member.name;
        if (elDiv) elDiv.innerText = member.division;
        if (elWsdc) elWsdc.innerText = `WSDC: ${member.wsdcId}`;
        if (elLink) elLink.href = `https://scoring.dance/huHU/wsdc/registry/${member.wsdcId}.html`;
        if (elPoints) elPoints.innerText = member.points;
        if (elEvents) elEvents.innerText = member.events;

        // Monogram generálása (Kezeli a dupla keresztneveket is)
        if (elInitials && member.name) {
            elInitials.innerText = member.name
                .split(' ')
                .filter(part => part.length > 0)
                .map(n => n[0])
                .join('')
                .toUpperCase();
        }

        // 5. Animált átmenet: Betöltő elrejtése, tartalom megjelenítése
        if (loader) loader.style.display = "none";
        container.style.display = "block";
        
        console.log(`Profil sikeresen betöltve: ${member.name}`);

    } catch (err) {
        console.error("Profil betöltési hiba:", err);
        if (loader) loader.innerHTML = "Hiba történt az adatok letöltésekor. Ellenőrizd a táblázat elérését!";
    }
}

/**
 * A résztvevők listájának betöltése (a resztvevok.html oldalhoz)
 */
export async function loadParticipantsFromSheet() {
    const root = document.getElementById("participants");
    if (!root) return;

    root.innerHTML = `<div class="card">Résztvevők betöltése...</div>`;

    try {
        const res = await fetch(CSV_URLS.PARTICIPANTS);
        const rows = parseCSV(await res.text());

        // A fejléc (4 sor) utáni adatok
        const people = rows.slice(4) 
            .map(r => ({
                name: safeText(r[1]),
                division: safeText(r[2]),
                wsdcId: safeText(r[3])
            }))
            .filter(p => p.name);

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
        console.error("Lista betöltési hiba:", err);
        root.innerHTML = `<div class="card">Nem sikerült betölteni a tagokat.</div>`;
    }
}
