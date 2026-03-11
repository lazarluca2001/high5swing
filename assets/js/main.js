import { setTheme, injectSidebarLayout } from './ui.js';
import { loadParticipants, loadProfile } from './participants.js';
import { initCalendar } from './calendar.js';

document.addEventListener("DOMContentLoaded", () => {
    // 1. Téma beállítása
    setTheme(localStorage.getItem("theme") || "light");

    // 2. Sidebar ha nem naptár oldal
    injectSidebarLayout();

    // 3. Oldalspecifikus funkciók indítása
    if (document.getElementById("participants")) loadParticipants();
    if (document.getElementById("profileContent")) loadProfile();
    if (document.getElementById("calendar")) initCalendar();
});
