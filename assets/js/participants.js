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
        console.error("Hiba a lista betöltésekor:", err);
        root.innerHTML = `<div class="card">Hiba történt az adatok letöltésekor.</div>`;
    }
}

// 2. FÜGGVÉNY: EGY ADOTT PROFIL ÉS ÖSSZES EREDMÉNY BETÖLTÉSE
export async function loadProfileFromSheet() {
    const container = document.getElementById("profileContainer");
    const loader = document.getElementById("profileLoading");
    const resultsDiv = document.getElementById("profileContent");
    
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const wsdcId = urlParams.get('id');

    if (!wsdcId) {
        if (loader) loader.innerHTML = "Hiba: Nincs kiválasztva táncos.";
        return;
    }

    try {
        // --- 1. Alapadatok lekérése ---
        const resMember = await fetch(CSV_URLS.PARTICIPANTS);
        const rowsMember = parseCSV(await resMember.text());
        const memberData = rowsMember.find(r => safeText(r[3]) === safeText(wsdcId));

        if (!memberData) {
            if (loader) loader.innerHTML = `A keresett táncos (${wsdcId}) nem található.`;
            return;
        }

        const memberName = safeText(memberData[1]);

        // UI Alapok
        if (document.getElementById("profileName")) document.getElementById("profileName").innerText = memberName;
        if (document.getElementById("profileDivision")) document.getElementById("profileDivision").innerText = safeText(memberData[2]);
        if (document.getElementById("profileWsdc")) document.getElementById("profileWsdc").innerText = `WSDC: ${wsdcId}`;
        if (document.getElementById("profileScoringLink")) document.getElementById("profileScoringLink").href = `https://scoring.dance/huHU/wsdc/registry/${wsdcId}.html`;
        if (document.getElementById("profileInitials")) {
            document.getElementById("profileInitials").innerText = memberName.split(' ').map(n => n[0]).join('').toUpperCase();
        }

        // --- 2. Versenyeredmények lekérése és feldolgozása ---
        const resResults = await fetch(CSV_URLS.RESULTS);
        const rowsResults = parseCSV(await resResults.text());

        // Szűrés a névre (B oszlop = index 1) és adatok mapelése a megadott oszlopok alapján
        const results = rowsResults
            .filter(r => safeText(r[1]) === memberName)
            .map(r => ({
                division: safeText(r[2]),
                event: safeText(r[3]),
                date: safeText(r[4]),
                role: safeText(r[5]),
                // Indulók számának kinyerése Role alapján (Leader: G/6, Follower: H/7)
                count: safeText(r[5]) === "Leader" ? safeText(r[6]) : safeText(r[7]),
                prelim: safeText(r[8]),
                semi: safeText(r[9]),
                final: safeText(r[10]),
                point: safeText(r[11]),
                partner: safeText(r[18]) // S oszlop = index 18
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date)); // Legfrissebb elől

        // --- 3. UI Renderelés: Esemény kártyák (Harmonika) ---
        if (resultsDiv) {
            if (results.length > 0) {
                resultsDiv.innerHTML = results.map((r, index) => `
                    <div class="event-accordion-item">
                        <div class="event-header" onclick="toggleAccordion(${index})">
                            <div class="event-main-data">
                                <span class="event-name">${r.event}</span>
                                <span class="event-date">${r.date}</span>
                            </div>
                            <div class="event-badges">
                                ${r.final !== "-" ? `<span class="res-badge final">Hely: ${r.final}</span>` : ""}
                                ${r.point !== "0" && r.point !== "-" ? `<span class="res-badge point">+${r.point} pont</span>` : ""}
                            </div>
                        </div>
                        <div id="collapse-${index}" class="event-body">
                            <div class="details-grid">
                                ${r.count !== "-" ? `<div class="det"><label>Mezőny</label><span>${r.count} fő</span></div>` : ""}
                                ${r.prelim !== "-" ? `<div class="det"><label>Prelim</label><span>${r.prelim}</span></div>` : ""}
                                ${r.semi !== "-" ? `<div class="det"><label>Semi</label><span>${r.semi}</span></div>` : ""}
                                ${r.point !== "-" ? `<div class="det"><label>Pont</label><span>${r.point}</span></div>` : ""}
                                ${r.partner !== "-" ? `<div class="det full"><label>Partner</label><span>${r.partner}</span></div>` : ""}
                            </div>
                        </div>
                    </div>
                `).join("");
            } else {
                resultsDiv.innerHTML = `<p class="muted" style="text-align:center;">Még nincsenek rögzített eredmények.</p>`;
            }
        }

        // --- 4. Statisztikák számítása (Jobb oldal) ---
        calculateAndRenderStats(results);

        if (loader) loader.style.display = "none";
        container.style.display = "block";

    } catch (err) {
        console.error("Hiba a profil betöltésekor:", err);
        if (loader) loader.innerHTML = "Hiba történt az adatok letöltésekor.";
    }
}

function calculateAndRenderStats(results) {
    // Top 5 Partner (pontok alapján összesítve)
    const partnerStats = {};
    results.forEach(r => {
        if (r.partner !== "-" && r.partner !== "") {
            if (!partnerStats[r.partner]) partnerStats[r.partner] = 0;
            partnerStats[r.partner] += parseInt(r.point) || 0;
        }
    });

    const topPartners = Object.entries(partnerStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const partnerList = document.getElementById("topPartners");
    if (partnerList) {
        partnerList.innerHTML = topPartners.map(([name, pts]) => `
            <div class="stat-row">
                <span class="name">${name}</span>
                <span class="val">${pts} pts</span>
            </div>
        `).join("") || "Nincs adat";
    }

    // Top 5 Verseny (pontszám alapján)
    const topEvents = [...results]
        .sort((a, b) => (parseInt(b.point) || 0) - (parseInt(a.point) || 0))
        .slice(0, 5);

    const eventList = document.getElementById("topEvents");
    if (eventList) {
        eventList.innerHTML = topEvents.map(r => `
            <div class="stat-row">
                <span class="name">${r.event}</span>
                <span class="val">${r.point} pts</span>
            </div>
        `).join("") || "Nincs adat";
    }
}

// Harmonika kezelő segédfüggvény (globálissá tesszük az onclick-hez)
window.toggleAccordion = (index) => {
    const target = document.getElementById(`collapse-${index}`);
    const isVisible = target.classList.contains('active');
    
    // Minden más kártyát bezárunk
    document.querySelectorAll('.event-body').forEach(el => el.classList.remove('active'));
    
    // Ha az aktuális nem volt nyitva, kinyitjuk
    if (!isVisible) {
        target.classList.add('active');
    }
};
