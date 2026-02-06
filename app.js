// =====================
// 1) Paste DexScreener pair URLs here
// =====================
const DEXSCREENERS = {
  AU79: "https://dexscreener.com/solana/cqmwcyb7fgor8z7as56yxbqzwjy7mnactmj6wulhgv5h",
  SLVr: "", // paste SLVr link when you have it
};

// =====================
// 2) Redeemability status (manual, transparent)
// =====================
const REDEEMABILITY = {
  PAXG: "backed",
  XAUT: "backed",
  AU79: "unknown",
  SLVr: "unknown",
  GOLD: "unknown",
  XAUUSDT: "unknown",
  XAGUSDT: "unknown",
};

// =====================
// 3) Summary assets
// Notes:
// - We use CoinGecko for tokenized metals & spot proxy (XAU).
// - We use DexScreener for AU79/SLVr.
// =====================
const SUMMARY_ASSETS = [
  { key: "PAXG", label: "PAXG", source: "coingecko", coingeckoId: "pax-gold" },
  { key: "XAUT", label: "XAUT", source: "coingecko", coingeckoId: "tether-gold" },

  // Spot gold proxy (CoinGecko "Gold (XAU)" page)
  { key: "SPOT_GOLD", label: "Spot Gold (proxy)", source: "coingecko", coingeckoId: "gold-8", hidden: true }, // :contentReference[oaicite:3]{index=3}

  { key: "AU79", label: "AU79", source: "dexscreener", dexUrlKey: "AU79" },
  { key: "SLVr", label: "SLVr", source: "dexscreener", dexUrlKey: "SLVr" },

  // If your $GOLD is a real token, swap this to its DexScreener or CoinGecko id later
  { key: "GOLD", label: "$GOLD", source: "coingecko", coingeckoId: "gold-9" }, // best-effort token match :contentReference[oaicite:4]{index=4}
];

const TV = [
  { container: "tv_paxg",     symbol: "PAXGUSDT" },
  { container: "tv_xauusdt",  symbol: "BINANCE:XAUUSDT.P" },
  { container: "tv_xagusdt",  symbol: "BINANCE:XAGUSDT.P" },
  { container: "tv_gold",     symbol: "GOLDUSDT.P" },
];

const el = (id) => document.getElementById(id);

function setFooterMeta() {
  el("year").textContent = new Date().getFullYear();
  el("lastUpdated").textContent = `Updated: ${new Date().toLocaleString()}`;
}

function fmtMoney(n, max=8) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { style:"currency", currency:"USD", maximumFractionDigits:max });
}
function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const v = Number(n);
  const s = v.toLocaleString(undefined, { maximumFractionDigits:2 });
  return (v >= 0 ? "+" : "") + s + "%";
}
function fmtNum(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits:0 });
}

// ---------------------
// CoinGecko simple price
// ---------------------
async function fetchCoinGecko(ids) {
  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", ids.join(","));
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_24hr_change", "true");
  url.searchParams.set("include_market_cap", "true");

  const res = await fetch(url.toString(), { headers: { accept: "application/json" }});
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  return res.json();
}

// ---------------------
// DexScreener pair snapshot
// /latest/dex/pairs/{chainId}/{pairId} :contentReference[oaicite:5]{index=5}
// ---------------------
function parseDexPairFromUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const chain = parts[0];
    const pair = parts[1];
    if (!chain || !pair) return null;
    return { chain, pair };
  } catch {
    return null;
  }
}

async function fetchDexPairSnapshot(url) {
  const parsed = parseDexPairFromUrl(url);
  if (!parsed) return null;
  const api = `https://api.dexscreener.com/latest/dex/pairs/${encodeURIComponent(parsed.chain)}/${encodeURIComponent(parsed.pair)}`;
  const res = await fetch(api, { headers: { accept: "application/json" }});
  if (!res.ok) throw new Error(`DexScreener error: ${res.status}`);
  const json = await res.json();
  return (json?.pairs && Array.isArray(json.pairs) && json.pairs[0]) ? json.pairs[0] : null;
}

// ---------------------
// Risk + redeemability
// ---------------------
function riskFromLiquidity(liqUsd, vol24hUsd) {
  if (liqUsd === null || liqUsd === undefined) return { level: "warn", text: "Liquidity unknown" };

  // Simple, explainable rules:
  if (liqUsd < 25000) return { level: "danger", text: "Very thin liquidity" };
  if (liqUsd < 150000) return { level: "warn", text: "Thin liquidity" };

  // If volume is huge vs liquidity, slippage can still be nasty:
  if (vol24hUsd && liqUsd && (vol24hUsd / liqUsd) > 3) return { level: "warn", text: "High turnover vs liquidity" };

  return { level: "ok", text: "Liquidity OK" };
}

function redeemBadge(key) {
  const v = (REDEEMABILITY[key] || "unknown").toLowerCase();
  if (v === "backed") return `<span class="badge ok">Backed</span>`;
  if (v === "unbacked") return `<span class="badge danger">Unbacked</span>`;
  return `<span class="badge warn">Redeemability: Unknown</span>`;
}

// ---------------------
// Premium/discount vs spot gold proxy
// premium% = (asset / spot_gold - 1) * 100
// ---------------------
function premiumPct(assetPrice, spotGoldPrice) {
  if (!assetPrice || !spotGoldPrice) return null;
  return ((assetPrice / spotGoldPrice) - 1) * 100;
}

// ---------------------
// Summary row renderer
// ---------------------
function renderSummary(cards) {
  const wrap = el("summaryRow");
  wrap.innerHTML = cards
    .filter(c => !c.hidden)
    .map(c => {
      const changeClass = (c.change24h ?? 0) >= 0 ? "pos" : "neg";
      const prem = c.premiumVsGoldPct;
      const premTxt = prem === null ? "—" : fmtPct(prem);
      const premClass = prem === null ? "" : (prem >= 0 ? "pos" : "neg");

      const risk = c.risk;
      const riskBadge = risk ? `<span class="badge ${risk.level}">${risk.text}</span>` : "";

      return `
        <div class="summary-card">
          <div class="summary-top">
            <div>
              <div class="summary-name">${c.label}</div>
              <div class="summary-symbol">${c.sourceLabel}</div>
            </div>
            <div class="${changeClass}">${fmtPct(c.change24h)}</div>
          </div>

          <div class="summary-price">${fmtMoney(c.priceUsd)}</div>

          <div class="kv">
            ${riskBadge}
            ${redeemBadge(c.key)}
          </div>

          <div class="summary-meta">
            <span>Liq: ${c.liquidityUsd ? fmtMoney(c.liquidityUsd, 0) : "—"}</span>
            <span>Vol24h: ${c.volume24hUsd ? fmtMoney(c.volume24hUsd, 0) : "—"}</span>
            <span>Prem vs Gold: <span class="${premClass}">${premTxt}</span></span>
            <span>Mkt Cap/FDV: ${c.marketCapUsd ? "$" + fmtNum(c.marketCapUsd) : "—"}</span>
          </div>
        </div>
      `;
    }).join("");
}

// ---------------------
// Lightweight Charts for DEX tokens
// DexScreener has no OHLCV endpoint; we build candles locally from snapshots. :contentReference[oaicite:6]{index=6}
// ---------------------
function createLWChart(containerId) {
  const container = el(containerId);
  const chart = LightweightCharts.createChart(container, {
    layout: { background: { type: 'solid', color: '#0b0f14' }, textColor: '#e8eef6' },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    timeScale: { timeVisible: true, secondsVisible: false },
    rightPriceScale: { borderVisible: false },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
  });
  const series = chart.addCandlestickSeries();
  const resize = () => chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
  window.addEventListener("resize", resize);
  resize();
  return { chart, series };
}

function candleBucket(tsMs, timeframeSec) {
  const t = Math.floor(tsMs / 1000);
  return Math.floor(t / timeframeSec) * timeframeSec;
}

function startDexLiveCandles({ key, url, containerId, linkElId, noteElId, timeframeSec = 60, pollMs = 15000 }) {
  const linkEl = el(linkElId);
  const noteEl = el(noteElId);

  if (!url) {
    noteEl.textContent = "Paste DexScreener link in app.js to enable live chart.";
    linkEl.href = "#";
    linkEl.onclick = (e) => e.preventDefault();
    return;
  }

  linkEl.href = url;
  noteEl.textContent = "Live candles start when you open the page (no historical candles from DexScreener API).";

  const { series } = createLWChart(containerId);

  // Build candles in-memory
  const candles = new Map(); // timeSec -> { time, open, high, low, close }
  const setSeries = () => {
    const arr = Array.from(candles.values()).sort((a,b) => a.time - b.time);
    series.setData(arr);
  };

  async function tick() {
    try {
      const snap = await fetchDexPairSnapshot(url);
      const price = snap?.priceUsd ? Number(snap.priceUsd) : null;
      if (!price) return;

      const now = Date.now();
      const bucket = candleBucket(now, timeframeSec); // seconds
      const existing = candles.get(bucket);

      if (!existing) {
        candles.set(bucket, { time: bucket, open: price, high: price, low: price, close: price });
      } else {
        existing.high = Math.max(existing.high, price);
        existing.low = Math.min(existing.low, price);
        existing.close = price;
        candles.set(bucket, existing);
      }

      // Keep last ~200 candles
      const keys = Array.from(candles.keys()).sort((a,b) => a-b);
      while (keys.length > 220) {
        candles.delete(keys.shift());
      }

      setSeries();
    } catch {
      // ignore transient errors
    }
  }

  tick();
  setInterval(tick, pollMs);
}

// ---------------------
// Load summary data
// ---------------------
async function loadSummary() {
  const cgAssets = SUMMARY_ASSETS.filter(a => a.source === "coingecko");
  const cgIds = [...new Set(cgAssets.map(a => a.coingeckoId))];

  let cgJson = {};
  try {
    if (cgIds.length) cgJson = await fetchCoinGecko(cgIds);
  } catch {
    cgJson = {};
  }

  // Spot gold proxy (CoinGecko gold-8)
  const spotGoldUsd = cgJson["gold-8"]?.usd ?? null;

  const cards = [];
  for (const a of SUMMARY_ASSETS) {
    if (a.source === "coingecko") {
      const j = cgJson[a.coingeckoId] || {};
      const priceUsd = j.usd ?? null;

      cards.push({
        key: a.key,
        label: a.label,
        hidden: !!a.hidden,
        sourceLabel: "CoinGecko",
        priceUsd,
        change24h: j.usd_24h_change ?? null,
        liquidityUsd: null,
        volume24hUsd: null,
        marketCapUsd: j.usd_market_cap ?? null,
        risk: null,
        premiumVsGoldPct: (a.key !== "SPOT_GOLD" && spotGoldUsd && priceUsd) ? premiumPct(priceUsd, spotGoldUsd) : null,
      });
    } else {
      const url = DEXSCREENERS[a.dexUrlKey];
      const snap = url ? await fetchDexPairSnapshot(url).catch(() => null) : null;

      const liq = snap?.liquidity?.usd !== undefined ? Number(snap.liquidity.usd) : null;
      const vol = snap?.volume?.h24 !== undefined ? Number(snap.volume.h24) : null;
      const priceUsd = snap?.priceUsd ? Number(snap.priceUsd) : null;

      cards.push({
        key: a.key,
        label: a.label,
        sourceLabel: "DexScreener",
        priceUsd,
        change24h: snap?.priceChange?.h24 !== undefined ? Number(snap.priceChange.h24) : null,
        liquidityUsd: liq,
        volume24hUsd: vol,
        marketCapUsd: snap?.fdv !== undefined ? Number(snap.fdv) : null,
        risk: riskFromLiquidity(liq, vol),
        premiumVsGoldPct: (spotGoldUsd && priceUsd) ? premiumPct(priceUsd, spotGoldUsd) : null,
      });
    }
  }

  renderSummary(cards);
  setFooterMeta();
}

// ---------------------
// TradingView embed script loader
// ---------------------
function loadTradingViewScript() {
  return new Promise((resolve) => {
    if (window.TradingView) return resolve();
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/tv.js";
    s.async = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
}

function mountTVWidget(containerId, symbol) {
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

async function init() {
  // Summary row refresh
  await loadSummary();
  setInterval(loadSummary, 60_000);

  // TradingView charts
  await loadTradingViewScript();
  TV.forEach(({ container, symbol }) => mountTVWidget(container, symbol));

  // Lightweight live DEX charts (built from snapshots)
  startDexLiveCandles({
    key: "AU79",
    url: DEXSCREENERS.AU79,
    containerId: "lw_au79",
    linkElId: "au79_link",
    noteElId: "au79_note",
  });

  startDexLiveCandles({
    key: "SLVr",
    url: DEXSCREENERS.SLVr,
    containerId: "lw_slvr",
    linkElId: "slvr_link",
    noteElId: "slvr_note",
  });
}

init();
