export function parseCalendarDate(dateStr) {
    const s = safeText(dateStr);
    if (!s) return null;

    const parts = s
        .replace(/\s/g, "")
        .replace(/\./g, "-")
        .split("-")
        .map(Number);

    if (parts.length < 3) return null;

    const [y, m, d] = parts;

    if (!y || !m || !d) return null;

    const date = new Date(y, m - 1, d);

    if (isNaN(date.getTime())) return null;

    date.setHours(0, 0, 0, 0);

    return date.getTime();
}
