import { fetchCSV } from "./api.js";
import { safeText } from "./utils.js";

function extractPeople(rows) {
    const headerIndex = rows.findIndex(r =>
        r.some(c => safeText(c).toLowerCase() === "name")
    );

    if (headerIndex === -1) return [];

    const headers = rows[headerIndex].map(h => safeText(h).toLowerCase());

    const nameIdx = headers.indexOf("name");
    const divisionIdx = headers.indexOf("division");
    const wsdcIdx = headers.indexOf("wsdc id");

    return rows
        .slice(headerIndex + 1)
        .map(r => ({
            name: safeText(r[nameIdx]),
            division: safeText(r[divisionIdx]),
            wsdcId: safeText(r[wsdcIdx])
        }))
        .filter(p => p.name && p.wsdcId);
}

export async function loadParticipantsFromSheet() {
    const root = document.getElementById("participants");
    if (!root) return;

    root.innerHTML = "Betöltés...";

    const rows = await fetchCSV("PARTICIPANTS");
    const people = extractPeople(rows);

    root.innerHTML = people.map(p => `
        <div class="card">
            <h2>${p.name}</h2>
            <p>${p.division}</p>
            <a href="./profil.html?id=${p.wsdcId}">Profil</a>
        </div>
    `).join("");
}

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

        document.getElementById("profileName").innerText = person.name;
        document.getElementById("profileDivision").innerText = person.division;
        document.getElementById("profileWsdc").innerText = person.wsdcId;

        document.getElementById("profileInitials").innerText =
            person.name.split(" ").map(n => n[0]).join("");

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
