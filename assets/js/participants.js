import { fetchCSV } from "./api.js";
import { safeText } from "./utils.js";

/* =========================
   PEOPLE
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

    const rows = await fetchCSV("PARTICIPANTS");
    const people = extractPeople(rows);

    root.innerHTML = people.map(p => `
        <div class="card">
            <h2>${p.name}</h2>
            <p>${p.division || "—"}</p>
            <a href="./profil.html?id=${encodeURIComponent(p.wsdcId)}">
                Profil
            </a>
        </div>
    `).join("");
}

/* =========================
   PROFIL
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
        /* ========= PERSON ========= */
        const rows = await fetchCSV("PARTICIPANTS");
        const people = extractPeople(rows);

        const person = people.find(p => p.wsdcId === id);
        if (!person) return;

        document.getElementById("profileName").innerText = person.name;
        document.getElementById("profileDivision").innerText = person.division;
        document.getElementById("profileWsdc").innerText = person.wsdcId;
        document.getElementById("profileInitials").innerText =
            person.name.split(" ").map(n => n[0]).join("");

        /* ========= RESULTS ========= */
        const resultRows = await fetchCSV("RESULTS");

        const headerIndex = resultRows.findIndex(r =>
            r.some(c => safeText(c).toLowerCase() === "name")
        );

        const headers = resultRows[headerIndex].map(h => safeText(h).toLowerCase());
        const get = (n) => headers.indexOf(n);

        const idx = {
            name: get("name"),
            division: get("division"),
            event: get("event"),
            date: get("date"),
            role: get("role"),
            leader: get("leader"),
            follower: get("follower"),
            prelim: get("prelim"),
            semi: get("semi"),
            final: get("final"),
            point: get("point"),
            partner: get("partner")
        };

        let results = resultRows
            .slice(headerIndex + 1)
            .filter(r => safeText(r[idx.name]) === person.name)
            .map(r => ({
                division: safeText(r[idx.division]),
                role: safeText(r[idx.role]),
                event: safeText(r[idx.event]),
                date: safeText(r[idx.date]),
                leader: safeText(r[idx.leader]),
                follower: safeText(r[idx.follower]),
                prelim: safeText(r[idx.prelim]),
                semi: safeText(r[idx.semi]),
                final: safeText(r[idx.final]),
                point: safeText(r[idx.point]),
                partner: safeText(r[idx.partner])
            }))
            .filter(r => r.event);

        /* ========= GROUP ========= */
        const grouped = {};

        results.forEach(r => {
            if (!grouped[r.division]) grouped[r.division] = {};
            if (!grouped[r.division][r.role]) grouped[r.division][r.role] = [];

            grouped[r.division][r.role].push(r);
        });

        /* ========= RENDER ========= */
        let html = "";
        let i = 0;

        Object.entries(grouped).forEach(([division, roles]) => {
            html += `<h2 style="margin-top:20px;">${division}</h2>`;

            Object.entries(roles).forEach(([role, events]) => {
                html += `<h3 style="opacity:.7">${role}</h3>`;

                events.forEach(r => {
                    const placement = parseInt(r.final);
                    let badgeClass = "";

                    if (placement === 1) badgeClass = "gold";
                    else if (placement === 2) badgeClass = "silver";
                    else if (placement === 3) badgeClass = "bronze";

                    html += `
                        <div class="event-accordion-item">
                            <div class="event-header" onclick="toggleAccordion(${i})">
                                <div>
                                    <div class="event-name">${r.event}</div>
                                    <div class="event-date">${r.date}</div>
                                </div>

                                <div>
                                    <span class="res-badge ${badgeClass}">
                                        ${r.final || "-"}
                                    </span>
                                    <span class="res-badge point">
                                        +${r.point || 0}
                                    </span>
                                </div>
                            </div>

                            <div class="event-body" id="acc-${i}">
                                <div class="details-grid">

                                    <div class="det">
                                        <label>Mezőny</label>
                                        <span>
                                           ${
                                               r.role.toLowerCase() === "leader"
                                                   ? (r.leader || "-")
                                                   : (r.follower || "-")
                                           }
                                       </span>
                                    </div>

                                    <div class="det">
                                        <label>Partner</label>
                                        <span>${r.partner || "-"}</span>
                                    </div>

                                    <div class="det">
                                        <label>Prelim</label>
                                        <span>${r.prelim || "-"}</span>
                                    </div>

                                    <div class="det">
                                        <label>Semi</label>
                                        <span>${r.semi || "-"}</span>
                                    </div>

                                </div>
                            </div>
                        </div>
                    `;

                    i++;
                });
            });
        });

        content.innerHTML = html;

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
