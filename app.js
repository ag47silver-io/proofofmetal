const TV_WIDGETS = [
  // PAXG spot chart
  { container: "tv_paxg", symbol: "PAXGUSDT", title: "PAXG" },

  // Metals perps (common TradingView symbols)
  { container: "tv_xauusdt", symbol: "BINANCE:XAUUSDT.P", title: "XAUUSDT" },
  { container: "tv_xagusdt", symbol: "BINANCE:XAGUSDT.P", title: "XAGUSDT" },

  // $GOLD — using a generic TradingView symbol. If you have the exact market, we can set EXCHANGE:SYMBOL.
  { container: "tv_gold", symbol: "GOLDUSDT.P", title: "GOLD" },
];

function el(id){ return document.getElementById(id); }

function setMeta(){
  el("year").textContent = new Date().getFullYear();
  el("lastUpdated").textContent = `Loaded: ${new Date().toLocaleString()}`;
}

function loadTradingViewScript(){
  return new Promise((resolve) => {
    if (window.TradingView) return resolve();
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/tv.js";
    s.async = true;
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

function mountTV(containerId, symbol){
  // TradingView supports "light" theme for white backgrounds. :contentReference[oaicite:4]{index=4}
  new window.TradingView.widget({
    autosize: true,
    symbol,
    interval: "30",
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "en",
    enable_publishing: false,
    hide_side_toolbar: false,
    allow_symbol_change: true,
    container_id: containerId,
  });
}

async function init(){
  setMeta();
  await loadTradingViewScript();

  TV_WIDGETS.forEach(w => {
    try { mountTV(w.container, w.symbol); }
    catch (e) { console.warn("TradingView mount failed:", w.symbol, e); }
  });
}

init();

