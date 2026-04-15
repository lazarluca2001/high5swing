import { CSV_URLS } from "./config.js";
import { parseCSV, safeText } from "./utils.js";

export async function loadProfileFromSheet() {
    const container = document.getElementById("profileContainer");
    const loader = document.getElementById("profileLoading");
    if (!container) return;

    // 1. ID kinyerése az URL-ből (?id=24645)
    const urlParams = new URLSearchParams(window.location.search);
    const wsdcId = urlParams.get('id');

    if (!wsdcId) {
        loader.innerHTML = "Hiba: Nincs megadva táncos azonosító.";
        return;
    }

    try {
        // 2. Adatok betöltése a Sheets-ből (ugyanaz a CSV, mint a listánál)
        const res = await fetch(CSV_URLS.PARTICIPANTS);
        const rows = parseCSV(await res.text());

        // 3. Megkeressük a konkrét embert a WSDC ID alapján (4. oszlop a táblázatban, index: 3)
        const memberData = rows.find(r => safeText(r[3]) === wsdcId);

        if (!memberData) {
            loader.innerHTML = "A keresett táncos nem található a rendszerben.";
            return;
        }

        const member = {
            name: safeText(memberData[1]),
            division: safeText(memberData[2]),
            wsdcId: safeText(memberData[3]),
            points: safeText(memberData[4]) || "0", // Ha van pontszám oszlopod
            events: safeText(memberData[5]) || "-"   // Ha van verseny darabszám oszlopod
        };

        // 4. UI frissítése
        document.getElementById("profileName").innerText = member.name;
        document.getElementById("profileDivision").innerText = member.division;
        document.getElementById("profileWsdc").innerText = `WSDC: ${member.wsdcId}`;
        document.getElementById("profileScoringLink").href = `https://scoring.dance/huHU/wsdc/registry/${member.wsdcId}.html`;
        document.getElementById("statPoints").innerText = member.points;
        document.getElementById("statEvents").innerText = member.events;
        
        // Monogram generálása az avatarhoz
        document.getElementById("profileInitials").innerText = member.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();

        // 5. Betöltő elrejtése, tartalom megjelenítése
        loader.style.display = "none";
        container.style.display = "block";

    } catch (err) {
        console.error("Profil betöltési hiba:", err);
        loader.innerHTML = "Hiba történt az adatok letöltésekor.";
    }
}

export async function loadProfileFromSheet() {
    console.log("Profil modul készen áll.");
}
