export function setTheme(mode) {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem("theme", mode);
}

export function injectSidebarLayout() {
    if (document.querySelector(".sidebar")) return;

    const main = document.querySelector("main.container") || document.querySelector("main");
    if (!main) return;

    const shell = document.createElement("div");
    shell.className = "shell";

    const layout = document.createElement("div");
    layout.className = "layout";

    const sidebar = document.createElement("aside");
    sidebar.className = "sidebar";

    sidebar.innerHTML = `
        <div class="sidebar-head">
            <div class="sidebar-title">HFS 2026</div>
            <div class="sidebar-sub">Community dashboard</div>
        </div>

        <div class="sidebar-body">

            <div class="side-card">
                <h3>Navigáció</h3>
                <div class="side-nav">
                    <a class="side-link" href="../index.html">🏠 Kezdőlap</a>
                    <a class="side-link" href="./naptar.html">🗓️ Naptár</a>
                    <a class="side-link" href="./resztvevok.html">👥 Résztvevők</a>
                </div>
            </div>

            <div class="side-card">
                <h3>Megjelenés</h3>
                <select id="themeSelector" class="month-select">
                    <option value="light">☀️ Világos</option>
                    <option value="dark">🌙 Sötét</option>
                    <option value="rainbow">🌈 Szivárvány</option>
                </select>
            </div>

        </div>
    `;

    const parent = main.parentNode;

    parent.insertBefore(shell, main);
    shell.appendChild(layout);

    layout.appendChild(sidebar);
    layout.appendChild(main);

    const selector = document.getElementById("themeSelector");

    if (selector) {
        selector.value = localStorage.getItem("theme") || "light";
        selector.addEventListener("change", e => setTheme(e.target.value));
    }
}
