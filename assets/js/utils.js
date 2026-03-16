/**
 * HFS COMMUNITY - UTILS (2026)
 * Segédfüggvények a CSV feldolgozáshoz és adatkezeléshez.
 */

/**
 * Megbízható CSV parser, amely kezeli az idézőjelek közötti vesszőket is.
 * @param {string} text - A nyers CSV szöveg.
 * @returns {Array} - Tömbök tömbje (sorok és cellák).
 */
export function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        // Idézőjelen belüli dupla idézőjel (escape)
        if (char === '"' && inQuotes && next === '"') {
            cell += '"';
            i++;
            continue;
        }

        // Idézőjel ki/be kapcsolása
        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        // Cellahatároló vessző
        if (char === "," && !inQuotes) {
            row.push(cell);
            cell = "";
            continue;
        }

        // Sorvége jel (LF vagy CRLF)
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

    // Utolsó sor kezelése, ha nincs lezárva sortöréssel
    if (cell.length || row.length) {
        row.push(cell);
        rows.push(row);
    }

    return rows;
}

/**
 * Biztonságos szövegkezelő (null/undefined védelem és trim).
 */
export function safeText(v) {
    return (v ?? "").toString().trim();
}

/**
 * Naptári dátum értelmezése (Timestamp-re alakítás).
 * Kezeli: "2026.03.16.", "2026-03-16", "16/03/2026" formátumokat.
 * @param {string} dateStr 
 * @returns {number|null} - Unix timestamp (ms) vagy null.
 */
export function parseCalendarDate(dateStr) {
    let s = safeText(dateStr);
    if (!s) return null;

    // Google Sheets gyakran rak pontot a végére (pl. 2026.01.01.), ezt lecsípjük
    if (s.endsWith('.')) s = s.slice(0, -1);

    // 1. Próbálkozás: Szabványos Date.parse (kicsit módosítva a pontok miatt)
    // A pontokat kötőjelre cseréljük, hogy a böngészők jobban szeressék
    const normalized = s.replace(/\./g, '-');
    const parsed = Date.parse(normalized);
    
    if (!Number.isNaN(parsed)) {
        const d = new Date(parsed);
        // Időinfó lenullázása, hogy csak a nap számítson az összehasonlításnál
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }

    // 2. Próbálkozás: Manuális RegEx (éééé.hh.nn vagy nn.hh.éééé)
    // Ez a fallback, ha a böngésző nem enné meg a normalizált dátumot
    const m = s.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/) || // ISO / Magyar
              s.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);   // EU / Magyar fordított

    if (m) {
        // Ha az első csoport 4 jegyű, akkor az az év
        if (m[1].length === 4) {
            const y = Number(m[1]);
            const mIdx = Number(m[2]) - 1;
            const d = Number(m[3]);
            return new Date(y, mIdx, d).setHours(0, 0, 0, 0);
        } else {
            // Egyébként az utolsó csoport az év
            const y = Number(m[3]);
            const mIdx = Number(m[2]) - 1;
            const d = Number(m[1]);
            return new Date(y, mIdx, d).setHours(0, 0, 0, 0);
        }
    }

    return null;
}
