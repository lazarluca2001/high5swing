import { safeText } from './utils.js';

export function setTheme(mode) {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem("theme", mode);
    document.querySelectorAll("#themeSelector, #themeSelectorCalendar").forEach(sel => {
        if (sel.value !== mode) sel.value = mode;
    });
}

export function injectSidebarLayout() {
    if (document.body.classList.contains("calendar-page") || document.querySelector(".sidebar")) return;
    const main = document.querySelector("main.container") || document.querySelector("main");
    if (!main) return;

    const isRoot = /\/index\.html$/i.test(location.pathname) || location.pathname === "/" || location.pathname.endsWith("/high5swing/");
    const links = {
        home: isRoot ? "./index.html" : "../index.html",
        calendar: isRoot ? "./pages/naptar.html" : "./naptar.html",
        participants: isRoot ? "./pages/resztvevok.html" : "./resztvevok.html"
    };

    const shell = document.createElement("div");
    shell.className = "shell";
    shell.innerHTML = `
        <div class="layout">
            <aside class="sidebar">
                <div class="sidebar-head"><div class="sidebar-title">HFS 2026</div><div class="sidebar-sub">Community</div></div>
                <div class="sidebar-body">
                    <div class="side-card">
                        <h3>Navigáció</h3>
                        <div class="side-nav">
                            <a class="side-link" href="${links.home}">🏠 Kezdőlap</a>
                            <a class="side-link" href="${links.calendar}">🗓️ Naptár</a>
                            <a class="side-link" href="${links.participants}">👥 Résztvevők</a>
                        </div>
                    </div>
                    <div class="side-card">
                        <h3>Megjelenés</h3>
                        <select id="themeSelector" class="month-select" style="width: 100%;">
                            <option value="light">☀️ Világos</option>
                            <option value="dark">🌙 Sötét</option>
                            <option value="rainbow">🌈 Szivárvány</option>
                        </select>
                    </div>
                </div>
            </aside>
        </div>
    `;
    
    const layout = shell.querySelector(".layout");
    main.parentNode.insertBefore(shell, main);
    layout.appendChild(main);

    const ts = document.getElementById("themeSelector");
    if (ts) {
        ts.value = localStorage.getItem("theme") || "light";
        ts.addEventListener("change", (e) => setTheme(e.target.value));
    }
}
