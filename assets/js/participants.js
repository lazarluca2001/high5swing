import { CSV_URLS, ROLE_ORDER, DIVISION_ORDER } from './config.js';
import { parseCSV, safeText, normName, normDivision, normRole, parseDateToSortable, hasValue } from './utils.js';

export async function loadParticipants() {
    const root = document.getElementById("participants");
    if (!root) return;
    root.innerHTML = `<div class="card"><h2>Betöltés...</h2></div>`;

    try {
        const res = await fetch(CSV_URLS.PARTICIPANTS);
        const rows = parseCSV(await res.text());
        const people = rows.slice(4, 10).filter(r => safeText(r[1])).map(r => ({
            name: safeText(r[1]),
            division: safeText(r[2]),
            wsdcId: safeText(r[3])
        }));

        root.innerHTML = people.map(p => `
            <div class="card">
                <h2>${p.name}</h2>
                <p>WSDC: ${p.wsdcId || '—'}</p>
                <span class="badge ${p.division.toLowerCase()}">${p.division}</span>
                <a class="profile-link" href="./profil.html?name=${encodeURIComponent(p.name)}">Profil →</a>
            </div>
        `).join("");
    } catch (e) { console.error(e); }
}

export async function loadProfile() {
    const root = document.getElementById("profileContent");
    const nameParam = new URL(window.location.href).searchParams.get("name");
    if (!root || !nameParam) return;

    const res = await fetch(CSV_URLS.RESULTS);
    const rows = parseCSV(await res.text());
    // ... Itt a korábbi profil szűrési és csoportosítási logika ...
    // (A helytakarékosság miatt ide a meglévő profil renderelő kódodat kell beilleszteni)
}
