import { CSV_URLS } from "./config.js";
import { parseCSV, safeText } from "./utils.js";

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

        const people = rows
            .slice(4)
            .map(r => ({
                name: safeText(r[1]),
                division: safeText(r[2]),
                wsdcId: safeText(r[3])
            }))
            .filter(p => p.name && p.wsdcId);

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
        console.error(e);
        root.innerHTML = `<div class="card">Hiba történt.</div>`;
    }
}

/* =========================
   PROFIL BETÖLTÉS (HIÁNYZOTT!)
========================= */
export async function loadProfileFromSheet() {
    const container = document.getElementById("profileContainer");
    const loading = document.getElementById("profileLoading");
    const content = document.getElementById("profileContent");

    if (!container || !content) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        loading.innerHTML = "Hiányzó ID.";
        return;
    }

    try {
        const res = await fetch(CSV_URLS.PARTICIPANTS, { cache: "no-store" });
        const rows = parseCSV(await res.text());

        const people = rows.slice(4).map(r => ({
            name: safeText(r[1]),
            division: safeText(r[2]),
            wsdcId: safeText(r[3])
        }));

        const person = people.find(p => p.wsdcId === id);

        if (!person) {
            loading.innerHTML = "Nincs ilyen profil.";
            return;
        }

        // HERO kitöltés
        document.getElementById("profileName").innerText = person.name;
        document.getElementById("profileDivision").innerText = person.division;
        document.getElementById("profileWsdc").innerText = person.wsdcId;
        document.getElementById("profileInitials").innerText =
            person.name.split(" ").map(n => n[0]).join("");

        // egyszerű placeholder (később bővíthető results-szal)
        content.innerHTML = `
            <div class="card">
                Esemény adatok hamarosan...
            </div>
        `;

        loading.style.display = "none";
        container.style.display = "block";

    } catch (e) {
        console.error(e);
        loading.innerHTML = "Hiba történt.";
    }
}
