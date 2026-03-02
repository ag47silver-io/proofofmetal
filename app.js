document.addEventListener("DOMContentLoaded", () => {
  // -------------------------
  // Meta
  // -------------------------
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const lastUpdatedEl = document.getElementById("lastUpdated");
  if (lastUpdatedEl) lastUpdatedEl.textContent = `Loaded: ${new Date().toLocaleString()}`;

  // -------------------------
  // TradingView config
  // -------------------------
  const TV_WIDGETS = [
    { container: "tv_paxg",    symbol: "PAXGUSDT" },
    { container: "tv_xaut",    symbol: "XAUTUSD" },               // if blank, try XAUTUSDT or EXCHANGE:XAUTUSD
    { container: "tv_xauusdt", symbol: "BINANCE:XAUUSDT.P" },
    { container: "tv_xagusdt", symbol: "BINANCE:XAGUSDT.P" },
    { container: "tv_kau",     symbol: "KAUUSD" },                // may need exact TradingView listing
    { container: "tv_cgo",     symbol: "CGOUSD" },                // may need exact TradingView listing
    { container: "tv_kag",     symbol: "KAGUSD" },                // may need exact TradingView listing
    { container: "tv_gold",    symbol: "GOLDUSDT.P" }             // placeholder proxy
  ];

  // -------------------------
  // Theme (light/dark)
  // -------------------------
  const THEME_KEY = "pom_theme";

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;

    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);

    const icon = document.getElementById("themeIcon");
    if (icon) icon.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  function getActiveTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  // -------------------------
  // TradingView loader + mount
  // -------------------------
  function loadTradingViewScript() {
    return new Promise((resolve, reject) => {
      if (window.TradingView && window.TradingView.widget) return resolve();

      const s = document.createElement("script");
      s.src = "https://s3.tradingview.com/tv.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load TradingView script"));
      document.head.appendChild(s);
    });
  }

  function mountTV(containerId, symbol, theme) {
    const el = document.getElementById(containerId);
    if (!el) return;

    // Allow re-mounting (theme toggle + modal)
    el.innerHTML = "";

    try {
      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval: "30",
        timezone: "Etc/UTC",
        theme: theme, // "light" or "dark"
        style: "1",
        locale: "en",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        container_id: containerId
      });
    } catch (e) {
      console.warn("TradingView mount failed:", containerId, symbol, e);
    }
  }

  async function remountAllTradingView(theme) {
    await loadTradingViewScript();
    for (const w of TV_WIDGETS) mountTV(w.container, w.symbol, theme);
  }

  // -------------------------
  // Chart click-to-zoom (modal)
  // -------------------------
  const modal = document.getElementById("chartModal");
  const modalClose = document.getElementById("chartModalClose");
  const modalTitle = document.getElementById("chartModalTitle");
  const modalTVId = "chartModalTV";

  let modalOpen = false;
  let activeModalSymbol = null;
  let activeModalTitle = null;

  function openModalForWidget(widget, titleText) {
    if (!modal) return;

    modalOpen = true;
    activeModalSymbol = widget.symbol;
    activeModalTitle = titleText || widget.symbol;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (modalTitle) modalTitle.textContent = activeModalTitle;

    // Ensure script is loaded before mounting in modal
    loadTradingViewScript()
      .then(() => {
        mountTV(modalTVId, activeModalSymbol, getActiveTheme());
      })
      .catch((e) => console.warn(e));
  }

  function closeModal() {
    if (!modal) return;

    modalOpen = false;
    activeModalSymbol = null;
    activeModalTitle = null;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    // Clear modal container
    const el = document.getElementById(modalTVId);
    if (el) el.innerHTML = "";

    // Refresh all charts back in the grid
    remountAllTradingView(getActiveTheme()).catch(() => {});
  }

  // Backdrop click (requires data-close="1")
  modal?.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close === "1") closeModal();
  });

  modalClose?.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOpen) closeModal();
  });

  function attachZoomHandlers() {
    for (const w of TV_WIDGETS) {
      const chartEl = document.getElementById(w.container);
      if (!chartEl) continue;

      chartEl.style.cursor = "zoom-in";
      if (chartEl.dataset.zoomBound === "1") continue;
      chartEl.dataset.zoomBound = "1";

      chartEl.addEventListener("click", () => {
        const card = chartEl.closest(".chart-card");
        const title = card?.querySelector(".chart-head h3")?.textContent?.trim();
        openModalForWidget(w, title);
      });
    }
  }

  // Helper: remount modal chart when theme changes
  function remountModalIfOpen() {
    if (!modalOpen || !activeModalSymbol) return;

    const el = document.getElementById(modalTVId);
    if (el) el.innerHTML = "";

    loadTradingViewScript()
      .then(() => {
        mountTV(modalTVId, activeModalSymbol, getActiveTheme());
      })
      .catch((e) => console.warn(e));
  }

  // -------------------------
  // Premium/Heat helpers
  // -------------------------
  async function fetchJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function fmtPct(x) {
    const sign = x >= 0 ? "+" : "";
    return `${sign}${x.toFixed(2)}%`;
  }

  function setHeat(elId, pct) {
    const el = document.getElementById(elId);
    if (!el) return;

    const DISCOUNT = -0.50;
    const PREMIUM = 0.50;

    el.classList.remove("discount", "neutral", "premium", "nodata");

    if (pct <= DISCOUNT) {
      el.classList.add("discount");
      el.textContent = `HEAT: Discount (${fmtPct(pct)})`;
    } else if (pct >= PREMIUM) {
      el.classList.add("premium");
      el.textContent = `HEAT: Premium (${fmtPct(pct)})`;
    } else {
      el.classList.add("neutral");
      el.textContent = `HEAT: Near Spot (${fmtPct(pct)})`;
    }
  }

  function setNoData(premId, heatId, msg) {
    const premEl = document.getElementById(premId);
    if (premEl) premEl.textContent = msg;

    const heatEl = document.getElementById(heatId);
    if (!heatEl) return;

    heatEl.classList.remove("discount", "neutral", "premium", "nodata");
    heatEl.classList.add("nodata");
    heatEl.textContent = "HEAT: No data";
  }

  async function updatePremiums() {
    let spotGold = null;
    let spotSilver = null;

    try {
      const xau = await fetchJSON("https://api.binance.com/api/v3/ticker/price?symbol=XAUUSDT");
      spotGold = parseFloat(xau.price);
    } catch {
      spotGold = null;
    }

    try {
      const xag = await fetchJSON("https://api.binance.com/api/v3/ticker/price?symbol=XAGUSDT");
      spotSilver = parseFloat(xag.price);
    } catch {
      spotSilver = null;
    }

    // PAXG vs spot gold
    try {
      if (!spotGold) throw new Error("No gold spot");
      const paxg = await fetchJSON("https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT");
      const paxgPx = parseFloat(paxg.price);
      const prem = ((paxgPx - spotGold) / spotGold) * 100;

      const el = document.getElementById("prem_paxg");
      if (el) el.textContent = `PAXG Premium vs Spot: ${fmtPct(prem)}`;
      setHeat("heat_paxg", prem);
    } catch {
      setNoData("prem_paxg", "heat_paxg", "PAXG Premium vs Spot: — (source unavailable)");
    }

    // XAUT vs spot gold
    try {
      if (!spotGold) throw new Error("No gold spot");
      const xaut = await fetchJSON("https://api.binance.com/api/v3/ticker/price?symbol=XAUTUSDT");
      const xautPx = parseFloat(xaut.price);
      const prem = ((xautPx - spotGold) / spotGold) * 100;

      const el = document.getElementById("prem_xaut");
      if (el) el.textContent = `XAUT Premium vs Spot: ${fmtPct(prem)}`;
      setHeat("heat_xaut", prem);
    } catch {
      setNoData("prem_xaut", "heat_xaut", "XAUT Premium vs Spot: — (source unavailable)");
    }

    // KAU vs spot gold
    try {
      if (!spotGold) throw new Error("No gold spot");
      const kau = await fetchJSON("https://api.binance.com/api/v3/ticker/price?symbol=KAUUSDT");
      const kauPx = parseFloat(kau.price);
      const prem = ((kauPx - spotGold) / spotGold) * 100;

      const el = document.getElementById("prem_kau");
      if (el) el.textContent = `KAU Premium vs Spot: ${fmtPct(prem)}`;
      setHeat("heat_kau", prem);
    } catch {
      setNoData("prem_kau", "heat_kau", "KAU Premium vs Spot: — (source unavailable)");
    }

    // KAG vs spot silver
    try {
      if (!spotSilver) throw new Error("No silver spot");
      const kag = await fetchJSON("https://api.binance.com/api/v3/ticker/price?symbol=KAGUSDT");
      const kagPx = parseFloat(kag.price);
      const prem = ((kagPx - spotSilver) / spotSilver) * 100;

      const el = document.getElementById("prem_kag");
      if (el) el.textContent = `KAG Premium vs Spot: ${fmtPct(prem)}`;
      setHeat("heat_kag", prem);
    } catch {
      setNoData("prem_kag", "heat_kag", "KAG Premium vs Spot: — (source unavailable)");
    }
  }

  // -------------------------
  // Boot sequence
  // -------------------------
  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  const toggleBtn = document.getElementById("themeToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", async () => {
      const next = getActiveTheme() === "dark" ? "light" : "dark";
      applyTheme(next);

      // Remount main charts
      await remountAllTradingView(next);

      // Remount modal chart (if open) so it matches theme
      remountModalIfOpen();
    });
  }

  remountAllTradingView(initialTheme)
    .then(() => attachZoomHandlers())
    .catch(err => console.error(err))
    .finally(() => {
      updatePremiums().catch(() => {});
      setInterval(() => updatePremiums().catch(() => {}), 60000);
    });
});
