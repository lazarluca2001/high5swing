import { fetchCSV } from "./api.js";
import { safeText } from "./utils.js";

/* =========================
   SEGÉD: PEOPLE
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
   LISTA
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
        console.error(e);
        root.innerHTML = `<div class="card">Hiba történt</div>`;
    }
}

/* =========================
   PROFIL + RESULTS
========================= */
export async function loadProfileFromSheet() {
    const container = document.getElementById("profileContainer");
    const loading = document.getElementById("profileLoading");
    const content = document.getElementById("profileContent");

    if (!container || !loading || !content) return;

    const id = new URLSearchParams(window.location.search).get("id");

    if (!id) {
        loading.innerHTML = "Hiányzó ID.";
        return;
    }

    try {
        /* ========= PARTICIPANTS ========= */
        const rows = await fetchCSV("PARTICIPANTS");
        const people = extractPeople(rows);

        const person = people.find(p => p.wsdcId === id);

        if (!person) {
            loading.innerHTML = "Nincs ilyen profil.";
            return;
        }

        // HERO
        document.getElementById("profileName").innerText = person.name;
        document.getElementById("profileDivision").innerText = person.division || "—";
        document.getElementById("profileWsdc").innerText = person.wsdcId;
        document.getElementById("profileInitials").innerText =
            person.name.split(" ").map(n => n[0]).join("");

        /* ========= RESULTS ========= */
        const resultRows = await fetchCSV("RESULTS");

        const headerIndex = resultRows.findIndex(r =>
            r.some(c => safeText(c).toLowerCase() === "name")
        );

        if (headerIndex === -1) {
            content.innerHTML = `<div class="card">Nincs eredmény adat</div>`;
            return;
        }

        const headers = resultRows[headerIndex].map(h => safeText(h).toLowerCase());
        const getIdx = (name) => headers.indexOf(name.toLowerCase());

        const nameIdx = getIdx("name");
        const eventIdx = getIdx("event");
        const dateIdx = getIdx("date");
        const prelimIdx = getIdx("prelim");
        const semiIdx = getIdx("semi");
        const finalIdx = getIdx("final");
        const pointIdx = getIdx("point");
        const partnerIdx = getIdx("partner");

        let results = resultRows
            .slice(headerIndex + 1)
            .filter(r => safeText(r[nameIdx]) === person.name)
            .map(r => ({
                event: safeText(r[eventIdx]),
                date: safeText(r[dateIdx]),
                prelim: safeText(r[prelimIdx]),
                semi: safeText(r[semiIdx]),
                final: safeText(r[finalIdx]),
                points: safeText(r[pointIdx]),
                partner: safeText(r[partnerIdx])
            }))
            .filter(r => r.event);

        // dátum szerint csökkenő
        results.sort((a, b) => new Date(b.date) - new Date(a.date));

        /* ========= UI ========= */
        if (!results.length) {
            content.innerHTML = `<div class="card">Nincs még verseny eredmény</div>`;
        } else {
            content.innerHTML = results.map((r, i) => `
                <div class="event-accordion-item">
                    <div class="event-header" onclick="toggleAccordion(${i})">
                        <div class="event-main-data">
                            <div class="event-name">${r.event}</div>
                            <div class="event-date">${r.date}</div>
                        </div>
                        <div>
                            <span class="res-badge">${r.final || "-"}</span>
                            <span class="res-badge point">+${r.points || 0}</span>
                        </div>
                    </div>

                    <div class="event-body" id="acc-${i}">
                        <div class="details-grid">
                            <div class="det">
                                <label>Prelim</label>
                                <span>${r.prelim || "-"}</span>
                            </div>
                            <div class="det">
                                <label>Semi</label>
                                <span>${r.semi || "-"}</span>
                            </div>
                            <div class="det">
                                <label>Final</label>
                                <span>${r.final || "-"}</span>
                            </div>
                            <div class="det full">
                                <label>Partner</label>
                                <span>${r.partner || "-"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join("");
        }

        loading.style.display = "none";
        container.style.display = "block";

    } catch (e) {
        console.error(e);
        loading.innerHTML = "Hiba történt.";
    }
}

/* =========================
   ACCORDION
========================= */
window.toggleAccordion = (i) => {
    const el = document.getElementById(`acc-${i}`);
    if (!el) return;

    el.classList.toggle("active");
};
