export function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];
        if (char === '"' && inQuotes && next === '"') { cell += '"'; i++; continue; }
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === "," && !inQuotes) { row.push(cell); cell = ""; continue; }
        if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && next === "\n") i++;
            row.push(cell); rows.push(row); row = []; cell = ""; continue;
        }
        cell += char;
    }
    if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
    return rows;
}

export const safeText = (v) => (v ?? "").toString().trim();
export const hasValue = (v) => {
    const s = safeText(v);
    return s && !["-", "—", "–", "n/a", "na", "null", "undefined"].includes(s.toLowerCase());
};

export const normKey = (s) => safeText(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
export const normName = (s) => safeText(s).toLowerCase();

export function normDivision(div) {
    const d = normKey(div);
    if (!d) return "—";
    if (d.includes("allstar")) return "allstar";
    if (d.includes("champ")) return "champion";
    if (d.includes("adv")) return "advanced";
    if (d.includes("inter")) return "intermediate";
    if (d.includes("nov")) return "novice";
    if (d.includes("new")) return "newcomer";
    return d;
}

export function normRole(role) {
    const r = normKey(role);
    if (!r) return "—";
    if (r === "l" || r.includes("lead")) return "leader";
    if (r === "f" || r.includes("follow")) return "follower";
    return r;
}

export function parseDateToSortable(dateStr) {
    const s = safeText(dateStr);
    if (!s) return 0;
    const iso = Date.parse(s);
    if (!Number.isNaN(iso)) return iso;
    const m = s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
    return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime() : 0;
}
