export function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"' && inQuotes && next === '"') {
            cell += '"';
            i++;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === "," && !inQuotes) {
            row.push(cell);
            cell = "";
            continue;
        }

        if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && next === "\n") i++;
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
            continue;
        }

        cell += char;
    }

    if (cell.length || row.length) {
        row.push(cell);
        rows.push(row);
    }

    return rows;
}

export function safeText(v) {
    return (v ?? "").toString().trim();
}

export function parseCalendarDate(dateStr) {
    const s = safeText(dateStr);
    if (!s) return null;
    
    // Kezeli a 2026.01.15 formátumot is
    const cleanDate = s.replace(/\s/g, '').replace(/\./g, '-');
    const parsed = Date.parse(cleanDate);
    
    if (!Number.isNaN(parsed)) {
        return new Date(parsed).setHours(0,0,0,0);
    }
    return null;
}
