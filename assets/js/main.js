import { setTheme, injectSidebarLayout } from './ui.js';
import { loadParticipantsFromSheet, loadProfileFromSheet } from './participants.js';
import { initCalendarPage } from './calendar.js';

document.addEventListener("DOMContentLoaded", () => {
    console.log("High Five Swing - App Initializing... 🚀");

    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);

    if (!document.body.classList.contains("calendar-page")) {
        injectSidebarLayout();
    }

    if (document.getElementById("participants")) {
        loadParticipantsFromSheet().catch(err => {
            console.error("Hiba a résztvevők betöltésekor:", err);
        });
    }

    if (document.getElementById("profileContent")) {
        loadProfileFromSheet().catch(err => {
            console.error("Hiba a profil betöltésekor:", err);
        });
    }

    if (document.getElementById("calendar")) {
        initCalendarPage().catch(err => {
            console.error("Hiba a naptár inicializálásakor:", err);
        });
    }

    window.addEventListener("unhandledrejection", (event) => {
        console.warn("Nem kezelt hiba történt:", event.reason);
    });
});
