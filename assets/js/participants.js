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
            name: safeText(r[1]), division: safeText(r[2]), wsdcId: safeText(r[3])
        })).filter(p => p.name);

        root.innerHTML = people.map(p => `
            <div class="card member-card">
                <h2 style="font-size: 1.25rem; font-weight: 900;">${p.name}</h2>
                <p class="muted">${p.division}</p>
                <div style="margin: 10px 0; font-weight: bold;">WSDC: ${p.wsdcId} <a href="https://scoring.dance/huHU/wsdc/registry/${p.wsdcId}.html" target="_blank">➔</a></div>
                <a href="profil.html?id=${p.wsdcId}" class="profile-button" style="display:block; text-align:center; padding:10px; background:var(--hfs-light-red); color:var(--hfs-red); border-radius:var(--radius-md); font-weight:800; text-decoration:none;">PROFIL</a>
            </div>
        `).join("");
    } catch (e) { root.innerHTML = "Hiba történt a betöltéskor."; }
}

export async function loadProfileFromSheet() {
    const container = document.getElementById("profileContainer");
    const loader = document.getElementById("profileLoading");
    const resultsDiv = document.getElementById("profileContent");
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const wsdcId = urlParams.get('id');
    if (!wsdcId) { loader.innerHTML = "Nincs azonosító megadva."; return; }

    try {
        const [resM, resR] = await Promise.all([fetch(CSV_URLS.PARTICIPANTS), fetch(CSV_URLS.RESULTS)]);
        const rowsMember = parseCSV(await resM.text());
        const rowsResults = parseCSV(await resR.text());

        const memberData = rowsMember.find(r => safeText(r[3]) === safeText(wsdcId));
        if (!memberData) { loader.innerHTML = "A táncos nem található."; return; }

        const name = safeText(memberData[1]);
        document.getElementById("profileName").innerText = name;
        document.getElementById("profileDivision").innerText = safeText(memberData[2]);
        document.getElementById("profileWsdc").innerText = `WSDC ID: ${wsdcId}`;
        document.getElementById("profileScoringLink").href = `https://scoring.dance/huHU/wsdc/registry/${wsdcId}.html`;
        document.getElementById("profileInitials").innerText = name.split(' ').map(n => n[0]).join('').toUpperCase();

        const results = rowsResults.filter(r => safeText(r[1]) === name).map(r => ({
            event: safeText(r[3]), date: safeText(r[4]), role: safeText(r[5]),
            count: safeText(r[5]) === "Leader" ? safeText(r[6]) : safeText(r[7]),
            prelim: safeText(r[8]), semi: safeText(r[9]), final: safeText(r[10]),
            point: safeText(r[11]), partner: safeText(r[18])
        })).sort((a, b) => new Date(b.date) - new Date(a.date));

        resultsDiv.innerHTML = results.map((r, i) => `
            <div class="event-accordion-item">
                <div class="event-header" onclick="toggleAccordion(${i})">
                    <div><strong>${r.event}</strong><br><small class="muted">${r.date}</small></div>
                    <div>
                        ${r.final !== "-" ? `<span class="res-badge final">Hely: ${r.final}</span>` : ""}
                        ${r.point !== "0" ? `<span class="res-badge point">+${r.point} pont</span>` : ""}
                    </div>
                </div>
                <div id="collapse-${i}" class="event-body">
                    <div class="details-grid">
                        <div class="det"><label>Mezőny</label><span>${r.count} fő</span></div>
                        <div class="det"><label>Prelim</label><span>${r.prelim}</span></div>
                        <div class="det"><label>Semi</label><span>${r.semi}</span></div>
                        <div class="det full"><label>Partner</label><span>${r.partner}</span></div>
                    </div>
                </div>
            </div>
        `).join("");

        renderStats(results);
        loader.style.display = "none"; container.style.display = "block";
    } catch (e) { loader.innerHTML = "Hiba történt az adatok betöltésekor."; }
}

function renderStats(results) {
    const pMap = {};
    results.forEach(r => { if(r.partner !== "-") pMap[r.partner] = (pMap[r.partner] || 0) + (parseInt(r.point) || 0); });
    const topP = Object.entries(pMap).sort((a,b) => b[1]-a[1]).slice(0,5);
    document.getElementById("topPartners").innerHTML = topP.map(([n, p]) => `<div class="stat-row"><span>${n}</span><span class="val">${p} pts</span></div>`).join("");

    const topE = [...results].sort((a,b) => (parseInt(b.point)||0)-(parseInt(a.point)||0)).slice(0,5);
    document.getElementById("topEvents").innerHTML = topE.map(r => `<div class="stat-row"><span>${r.event}</span><span class="val">${r.point} pts</span></div>`).join("");
}

window.toggleAccordion = (i) => {
    const el = document.getElementById(`collapse-${i}`);
    const active = el.classList.contains('active');
    document.querySelectorAll('.event-body').forEach(b => b.classList.remove('active'));
    if (!active) el.classList.add('active');
};
