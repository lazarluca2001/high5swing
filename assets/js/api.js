// api.js
import { CSV_URLS } from "./config.js";
import { parseCSV } from "./utils.js";

const cache = {};

export async function fetchCSV(type) {
    if (cache[type]) return cache[type];

    const res = await fetch(CSV_URLS[type]);

    if (!res.ok) {
        throw new Error(`Fetch failed: ${type} (${res.status})`);
    }

    const text = await res.text();
    const parsed = parseCSV(text);

    cache[type] = parsed;

    return parsed;
}
