import { setTheme, initGlobalSidebar } from './ui.js';
import { loadParticipantsFromSheet, loadProfileFromSheet } from './participants.js';
import { initCalendarPage } from './calendar.js';

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const savedTheme = localStorage.getItem("theme") || "light";
        setTheme(savedTheme);

        await initGlobalSidebar();
        initSidebarToggle();

        if (document.getElementById("participants")) {
            await loadParticipantsFromSheet();
        }

        if (document.getElementById("profileContent")) {
            await loadProfileFromSheet();
        }

        if (document.getElementById("calendar")) {
            await initCalendarPage();
        }

    } catch (e) {
        console.error("MAIN ERROR:", e);
    }
});

function initSidebarToggle() {
    const btn = document.getElementById("sidebarToggle");
    const sidebar = document.getElementById("calendarSidebar");

    if (!btn || !sidebar) return;

    btn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });
}
