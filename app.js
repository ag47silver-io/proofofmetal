document.addEventListener("DOMContentLoaded", () => {
  // Meta
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const updated = document.getElementById("lastUpdated");
  if (updated) updated.textContent = `Loaded: ${new Date().toLocaleString()}`;

  // TradingView mounts
  const TV_WIDGETS = [
    { container: "tv_paxg", symbol: "PAXGUSDT" },
    { container: "tv_xaut", symbol: "XAUTUSD" },
    { container: "tv_xauusdt", symbol: "BINANCE:XAUUSDT.P" },
    { container: "tv_xagusdt", symbol: "BINANCE:XAGUSDT.P" },
    { container: "tv_kau", symbol: "KAUUSD" },
    { container: "tv_cgo", symbol: "CGOUSD" },
    { container: "tv_kag", symbol: "KAGUSD" },

    // $GOLD = placeholder proxy until we wire DexScreener/CMC by contract
    { container: "tv_gold", symbol: "GOLDUSDT.P" },
  ];

  function loadTV() {
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

  function mount(containerId, symbol) {
    const el = document.getElementById(containerId);
    if (!el) return console.warn("Missing chart container:", containerId);

    try {
      new window.TradingView.widget({
        autosize: true,
        symbol,
        interval: "30",
        timezone: "Etc/UTC",
        theme: "light",   // professional, not too dark
        style: "1",
        locale: "en",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        container_id: containerId,
      });
    } catch (e) {
      console.warn("TV mount failed:", symbol, e);
    }
  }

  loadTV()
    .then(() => TV_WIDGETS.forEach(w => mount(w.container, w.symbol)))
    .catch(err => console.error("TradingView failed to load:", err));
});
function setHeat(elId, pct){
  const el = document.getElementById(elId);
  if (!el) return;

  const DISCOUNT = -0.50;
  const PREMIUM  =  0.50;

  el.classList.remove("discount","neutral","premium","nodata");

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

function setNoData(elId, msg){
  const el = document.getElementById(elId);
  if (!el) return;
  el.classList.remove("discount","neutral","premium","nodata");
  el.classList.add("nodata");
  el.textContent = `HEAT: ${msg}`;
}
// --- KAU premium vs Gold spot proxy (XAUUSDT) ---
try {
  const xau = await fetchJSON("https://api.binance.com/api/v3/ticker/price?symbol=XAUUSDT");
  const spotGold = parseFloat(xau.price);

  const kau = await fetchJSON("https://api.binance.com/api/v3/ticker/price?symbol=KAUUSDT");
  const kauPx = parseFloat(kau.price);

  const kauPrem = ((kauPx - spotGold) / spotGold) * 100;

  const kauEl = document.getElementById("prem_kau");
  if (kauEl) kauEl.textContent = `KAU Premium vs Spot: ${fmtPct(kauPrem)}`;

  setHeat("heat_kau", kauPrem);
} catch (e) {
  const kauEl = document.getElementById("prem_kau");
  if (kauEl) kauEl.textContent = "KAU Premium vs Spot: — (price source unavailable)";
  setNoData("heat_kau", "No data");
}


// --- KAG premium vs Silver spot proxy (XAGUSDT) ---
try {
  const xag = await fetchJSON("https://api.binance.com/api/v3/ticker/price?symbol=XAGUSDT");
  const spotSilver = parseFloat(xag.price);

  const kag = await fetchJSON("https://api.binance.com/api/v3/ticker/price?symbol=KAGUSDT");
  const kagPx = parseFloat(kag.price);

  const kagPrem = ((kagPx - spotSilver) / spotSilver) * 100;

  const kagEl = document.getElementById("prem_kag");
  if (kagEl) kagEl.textContent = `KAG Premium vs Spot: ${fmtPct(kagPrem)}`;

  setHeat("heat_kag", kagPrem);
} catch (e) {
  const kagEl = document.getElementById("prem_kag");
  if (kagEl) kagEl.textContent = "KAG Premium vs Spot: — (price source unavailable)";
  setNoData("heat_kag", "No data");
}
