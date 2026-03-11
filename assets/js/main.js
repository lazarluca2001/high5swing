import { setTheme, injectSidebarLayout } from './ui.js';
import { loadParticipantsFromSheet, loadProfileFromSheet } from './participants.js';
import { initCalendarPage } from './calendar.js';

/**
 * HFS COMMUNITY JS – BELÉPÉSI PONT (2026)
 * Ez a fájl koordinálja a modulok futtatását az oldal típusa alapján.
 */

document.addEventListener("DOMContentLoaded", () => {
    console.log("High Five Swing - App Initializing... 🚀");

    // 1) Téma inicializálása (LocalStorage-ból vagy alapértelmezett 'light')
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);

    // 2) Globális UI elemek (Sidebar) injektálása
    // Csak akkor fut le, ha nem a naptár oldalon vagyunk (ott más a layout)
    if (!document.body.classList.contains("calendar-page")) {
        injectSidebarLayout();
    }

    // 3) Oldalspecifikus modulok indítása
    // Megnézzük, léteznek-e az adott oldalra jellemző DOM elemek (ID-k)

    // A) Résztvevők listája oldal
    if (document.getElementById("participants")) {
        loadParticipantsFromSheet().catch(err => {
            console.error("Hiba a résztvevők betöltésekor:", err);
        });
    }

    // B) Egyéni Profil oldal
    if (document.getElementById("profileContent")) {
        loadProfileFromSheet().catch(err => {
            console.error("Hiba a profil betöltésekor:", err);
        });
    }

    // C) Naptár oldal
    if (document.getElementById("calendar")) {
        initCalendarPage().catch(err => {
            console.error("Hiba a naptár inicializálásakor:", err);
        });
    }

    // 4) Hibakezelés a globális eseményekhez (opcionális)
    window.addEventListener('unhandledrejection', (event) => {
        console.warn('Nem kezelt hiba történt:', event.reason);
    });
});
