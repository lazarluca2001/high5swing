import { CSV_URLS } from "./config.js";
import { parseCSV, safeText } from "./utils.js";

/* =========================
   SEGÉD: CSV → PEOPLE
========================= */
function extractPeople(rows) {
    const headerIndex = rows.findIndex(r =>
        r.some(c => safeText(c).toLowerCase() === "name")
    );

    if (headerIndex === -1) {
        console.error("Participants header not found");
        return [];
    }

    const headers = rows[headerIndex].map(h => safeText(h).toLowerCase());

    const nameIdx = headers.indexOf("name");
    const divisionIdx = headers.indexOf("division");
    const wsdcIdx = headers.indexOf("wsdc id");

    if (nameIdx === -1 || wsdcIdx === -1) {
        console.error("Missing required columns");
        return [];
    }

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

    root.innerHTML = `<div class="card">Résztvevők betöltése...</div>`;

    try {
        const res = await fetch(CSV_URLS.PARTICIPANTS, { cache: "no-store" });

        if (!res.ok) throw new Error(`Fetch hiba: ${res.status}`);

        const rows = parseCSV(await res.text());
        const people = extractPeople(rows);

        if (!people.length) {
            root.innerHTML = `<div class="card">Nincs adat.</div>`;
            return;
        }

        root.innerHTML = people.map(p => `
            <div class="card member-card">
                <h2>${p.name}</h2>
                <p class="muted">${p.division || "—"}</p>
                <div>WSDC: ${p.wsdcId}</div>
                <a href="./profil.html?id=${encodeURIComponent(p.wsdcId)}">
                    PROFIL →
                </a>
            </div>
        `).join("");

    } catch (e) {
        console.error("Participants load error:", e);
        root.innerHTML = `<div class="card">Hiba történt.</div>`;
    }
}

/* =========================
   PROFIL BETÖLTÉS
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
        const res = await fetch(CSV_URLS.PARTICIPANTS, { cache: "no-store" });

        if (!res.ok) throw new Error(`Fetch hiba: ${res.status}`);

        const rows = parseCSV(await res.text());
        const people = extractPeople(rows);

        const person = people.find(p => p.wsdcId === id);

        if (!person) {
            loading.innerHTML = "Nincs ilyen profil.";
            return;
        }

        // HERO kitöltés (null-safe)
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
