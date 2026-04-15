import { fetchCSV } from "./api.js";
import { safeText } from "./utils.js";

/* =========================
   SEGÉD: CSV → PEOPLE
========================= */
function extractPeople(rows) {
    const headerIndex = rows.findIndex(r =>
        r.some(c => safeText(c).toLowerCase() === "name")
    );

    if (headerIndex === -1) return [];

    const headers = rows[headerIndex].map(h => safeText(h).toLowerCase());

    const nameIdx = headers.indexOf("name");
    const divisionIdx = headers.indexOf("division");
    const wsdcIdx = headers.indexOf("wsdc id");

    if (nameIdx === -1 || wsdcIdx === -1) return [];

    return rows
        .slice(headerIndex + 1)
        .map(r => ({
            name: safeText(r[nameIdx]),
            division: safeText(r[divisionIdx]),
            wsdcId: safeText(r[wsdcIdx])
        }))
        .filter(p => p.name && p.wsdcId);
}

/* =========================
   LISTA BETÖLTÉS
========================= */
export async function loadParticipantsFromSheet() {
    const root = document.getElementById("participants");
    if (!root) return;

    root.innerHTML = `<div class="card">Betöltés...</div>`;

    try {
        const rows = await fetchCSV("PARTICIPANTS");
        const people = extractPeople(rows);

        if (!people.length) {
            root.innerHTML = `<div class="card">Nincs adat</div>`;
            return;
        }

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
        console.error("Participants load error:", e);
        root.innerHTML = `<div class="card">Hiba történt</div>`;
    }
}

/* =========================
   PROFIL BETÖLTÉS  🔥 EZ HIÁNYZOTT
========================= */
export async function loadProfileFromSheet() {
    const container = document.getElementById("profileContainer");
    const loading = document.getElementById("profileLoading");
    const content = document.getElementById("profileContent");

    if (!container || !loading || !content) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        loading.innerHTML = "Hiányzó ID.";
        return;
    }

    try {
        const rows = await fetchCSV("PARTICIPANTS");
        const people = extractPeople(rows);

        const person = people.find(p => p.wsdcId === id);

        if (!person) {
            loading.innerHTML = "Nincs ilyen profil.";
            return;
        }

        // HERO adatok
        const nameEl = document.getElementById("profileName");
        const divisionEl = document.getElementById("profileDivision");
        const wsdcEl = document.getElementById("profileWsdc");
        const initialsEl = document.getElementById("profileInitials");

        if (nameEl) nameEl.innerText = person.name;
        if (divisionEl) divisionEl.innerText = person.division || "—";
        if (wsdcEl) wsdcEl.innerText = person.wsdcId;

        if (initialsEl) {
            initialsEl.innerText = person.name
                .split(" ")
                .map(n => n[0])
                .join("");
        }

        // placeholder content
        content.innerHTML = `
            <div class="card">
                Esemény adatok hamarosan...
            </div>
        `;

        loading.style.display = "none";
        container.style.display = "block";

    } catch (e) {
        console.error("Profile load error:", e);
        loading.innerHTML = "Hiba történt.";
    }
}
