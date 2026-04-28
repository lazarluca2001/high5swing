import { CSV_URLS } from "./config.js";
import { parseCSV } from "./utils.js";

const cache = {};

export async function fetchCSV(type) {
    if (cache[type]) return cache[type];

    const url = CSV_URLS[type];
    if (!url) throw new Error(`Nincs URL: ${type}`);

    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Fetch hiba: ${type} (${res.status})`);
    }

    const text = await res.text();
    const data = parseCSV(text);

    cache[type] = data;

    return data;
}
