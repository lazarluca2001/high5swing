import { CSV_URLS } from "./config.js";
import { parseCSV } from "./utils.js";

const CACHE_TTL = 5 * 60 * 1000; // 5 perc
const cache = {};

export async function fetchCSV(type) {
    const now = Date.now();

    if (cache[type] && (now - cache[type].time < CACHE_TTL)) {
        return cache[type].data;
    }

    const res = await fetch(CSV_URLS[type]);

    if (!res.ok) {
        throw new Error(`Fetch hiba: ${type} (${res.status})`);
    }

    const text = await res.text();
    const parsed = parseCSV(text);

    cache[type] = {
        data: parsed,
        time: now
    };

    return parsed;
}
