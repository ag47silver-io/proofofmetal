document.addEventListener("DOMContentLoaded", () => {
  // --- Page meta ---
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const updated = document.getElementById("lastUpdated");
  if (updated) updated.textContent = `Loaded: ${new Date().toLocaleString()}`;

  // --- TradingView charts to mount ---
  // If a chart is blank, swap symbol to the exact TradingView listing (EXCHANGE:SYMBOL)
  const TV_WIDGETS = [
    { container: "tv_paxg", symbol: "PAXGUSDT" },

    // Tokenized gold
    { container: "tv_xaut", symbol: "XAUTUSD" },

    // Spot proxies / perps (common TradingView symbols)
    { container: "tv_xauusdt", symbol: "BINANCE:XAUUSDT.P" },
    { container: "tv_xagusdt", symbol: "BINANCE:XAGUSDT.P" },

    // Kinesis / Comtech
    { container: "tv_kau", symbol: "KAUUSD" },
    { container: "tv_cgo", symbol: "CGOUSD" },
    { container: "tv_kag", symbol: "KAGUSD" },
    { container: "tv_gold", symbol: "GOLDUSDT.P" },

  function loadTradingViewScript() {
    return new Promise((resolve, reject) => {
      if (window.TradingView) return resolve();
      const s = document.createElement("script");
      s.src = "https://s3.tradingview.com/tv.js";
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function mountTV(containerId, symbol) {
    const target = document.getElementById(containerId);
    if (!target) {
      console.warn("Missing chart container:", containerId);
      return;
    }

    try {
      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval: "30",
        timezone: "Etc/UTC",
        theme: "light",     // professional, not too dark
        style: "1",
        locale: "en",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        container_id: containerId,
      });
    } catch (e) {
      console.warn("TradingView mount failed:", symbol, e);
    }
  }

  loadTradingViewScript()
    .then(() => {
      TV_WIDGETS.forEach(({ container, symbol }) => mountTV(container, symbol));
    })
    .catch((e) => {
      console.error("TradingView script failed to load:", e);
    });
});