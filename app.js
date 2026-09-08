/* =========================================================
   PROOF OF METAL
   app.js
   Digital Metal Intelligence
========================================================= */

(() => {
  "use strict";

  /* =========================================================
     CONFIGURATION
  ========================================================= */

  const CONFIG = {
    tradingViewTimeout: 15000,
    comparisonHeight: 520,
    marketHeight: 270,

    markets: {
      gold: {
        symbol: "OANDA:XAUUSD",
        label: "XAU/USD",
        name: "GOLD SPOT",
        type: "BENCHMARK",
        metal: "GOLD"
      },

      silver: {
        symbol: "OANDA:XAGUSD",
        label: "XAG/USD",
        name: "SILVER SPOT",
        type: "BENCHMARK",
        metal: "SILVER"
      },

      paxg: {
        symbol: "CRYPTO:PAXGUSD",
        label: "PAXG/USD",
        name: "PAX GOLD",
        type: "TOKEN",
        metal: "GOLD"
      },

      xaut: {
        symbol: "CRYPTO:XAUTUSD",
        label: "XAUT/USD",
        name: "TETHER GOLD",
        type: "TOKEN",
        metal: "GOLD"
      },

      kau: {
        symbol: "CRYPTO:KAUUSD",
        label: "KAU/USD",
        name: "KINESIS GOLD",
        type: "TOKEN",
        metal: "GOLD"
      },

      kag: {
        symbol: "CRYPTO:KAGUSD",
        label: "KAG/USD",
        name: "KINESIS SILVER",
        type: "TOKEN",
        metal: "SILVER"
      }
    }
  };


  /* =========================================================
     HELPERS
  ========================================================= */

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    Array.from(parent.querySelectorAll(selector));


  function getElement(id) {
    return document.getElementById(id);
  }


  function safeText(element, value) {
    if (element) {
      element.textContent = value ?? "";
    }
  }


  /* =========================================================
     TRADINGVIEW LOADER
  ========================================================= */

  function waitForTradingView() {
    return new Promise((resolve, reject) => {

      if (
        window.TradingView &&
        typeof window.TradingView.widget === "function"
      ) {
        resolve();
        return;
      }

      const started = Date.now();

      const timer = setInterval(() => {

        if (
          window.TradingView &&
          typeof window.TradingView.widget === "function"
        ) {
          clearInterval(timer);
          resolve();
          return;
        }

        if (
          Date.now() - started >
          CONFIG.tradingViewTimeout
        ) {
          clearInterval(timer);

          reject(
            new Error(
              "TradingView library did not load."
            )
          );
        }

      }, 100);

    });
  }


  /* =========================================================
     TRADINGVIEW ERROR DISPLAY
  ========================================================= */

  function showWidgetMessage(container, message) {

    if (!container) return;

    container.innerHTML = `
      <div class="widget-status-message">
        <span class="widget-status-dot"></span>
        <span>${message}</span>
      </div>
    `;
  }


  /* =========================================================
     CREATE TRADINGVIEW WIDGET
  ========================================================= */

  function createTradingViewWidget({
    containerId,
    symbol,
    height = CONFIG.marketHeight,
    advanced = false
  }) {

    const container =
      getElement(containerId);

    if (!container) {
      return null;
    }

    container.innerHTML = "";

    if (
      !window.TradingView ||
      typeof window.TradingView.widget !== "function"
    ) {
      showWidgetMessage(
        container,
        "MARKET DATA INITIALIZING..."
      );

      return null;
    }


    const config = {

      container_id: containerId,

      autosize: true,

      width: "100%",

      height,

      symbol,

      interval: advanced ? "60" : "D",

      timezone: "Etc/UTC",

      theme: "dark",

      style: advanced ? "1" : "3",

      locale: "en",

      toolbar_bg: "#080b10",

      enable_publishing: false,

      allow_symbol_change: false,

      hide_side_toolbar: !advanced,

      hide_top_toolbar: !advanced,

      hide_legend: !advanced,

      hide_volume: false,

      withdateranges: advanced,

      save_image: false,

      details: false,

      hotlist: false,

      calendar: false,

      studies: [],

      support_host:
        "https://www.tradingview.com"
    };


    try {

      return new window.TradingView.widget(
        config
      );

    } catch (error) {

      console.error(
        "Proof Of Metal TradingView error:",
        error
      );

      showWidgetMessage(
        container,
        "MARKET DATA UNAVAILABLE"
      );

      return null;
    }
  }


  /* =========================================================
     LIVE MARKET CARDS
  ========================================================= */

  function initializeLiveMarkets() {

    const widgets = [

      {
        id: "goldWidget",
        market: CONFIG.markets.gold,
        height: 270
      },

      {
        id: "silverWidget",
        market: CONFIG.markets.silver,
        height: 270
      },

      {
        id: "paxgWidget",
        market: CONFIG.markets.paxg,
        height: 230
      },

      {
        id: "xautWidget",
        market: CONFIG.markets.xaut,
        height: 230
      },

      {
        id: "kauWidget",
        market: CONFIG.markets.kau,
        height: 230
      },

      {
        id: "kagWidget",
        market: CONFIG.markets.kag,
        height: 230
      }

    ];


    widgets.forEach(item => {

      createTradingViewWidget({
        containerId: item.id,
        symbol: item.market.symbol,
        height: item.height,
        advanced: false
      });

    });


    initializeMarketInteraction();
  }


  /* =========================================================
     LIVE MARKET INTERACTION
  ========================================================= */

  function initializeMarketInteraction() {

    const cards =
      $$(".market-card");


    if (!cards.length) {
      return;
    }


    cards.forEach(card => {

      card.setAttribute(
        "tabindex",
        "0"
      );

      card.setAttribute(
        "role",
        "button"
      );


      const symbol =
        card.dataset.symbol ||
        card.dataset.asset;


      function activateCard() {

        cards.forEach(item => {
          item.classList.remove(
            "market-card-active"
          );
        });

        card.classList.add(
          "market-card-active"
        );


        if (symbol) {
          focusComparison(symbol);
        }

      }


      card.addEventListener(
        "click",
        activateCard
      );


      card.addEventListener(
        "keydown",
        event => {

          if (
            event.key === "Enter" ||
            event.key === " "
          ) {

            event.preventDefault();

            activateCard();

          }

        }
      );

    });

  }


  /* =========================================================
     MARKET SYMBOL NORMALIZATION
  ========================================================= */

  function normalizeSymbol(value) {

    if (!value) return null;

    const normalized =
      value.toLowerCase().trim();


    const aliases = {

      gold:
        "OANDA:XAUUSD",

      xau:
        "OANDA:XAUUSD",

      xauusd:
        "OANDA:XAUUSD",

      silver:
        "OANDA:XAGUSD",

      xag:
        "OANDA:XAGUSD",

      xagusd:
        "OANDA:XAGUSD",

      paxg:
        "CRYPTO:PAXGUSD",

      xaut:
        "CRYPTO:XAUTUSD",

      kau:
        "CRYPTO:KAUUSD",

      kag:
        "CRYPTO:KAGUSD"

    };


    if (aliases[normalized]) {
      return aliases[normalized];
    }


    return value;
  }


  /* =========================================================
     COMPARISON DATA
  ========================================================= */

  const comparisonLabels = {

    "CRYPTO:PAXGUSD": "PAXG",

    "CRYPTO:XAUTUSD": "XAUT",

    "CRYPTO:KAUUSD": "KAU",

    "CRYPTO:KAGUSD": "KAG",

    "OANDA:XAUUSD": "GOLD",

    "OANDA:XAGUSD": "SILVER"

  };


  const comparisonNames = {

    "CRYPTO:PAXGUSD":
      "PAX GOLD",

    "CRYPTO:XAUTUSD":
      "TETHER GOLD",

    "CRYPTO:KAUUSD":
      "KINESIS GOLD",

    "CRYPTO:KAGUSD":
      "KINESIS SILVER",

    "OANDA:XAUUSD":
      "GOLD SPOT",

    "OANDA:XAGUSD":
      "SILVER SPOT"

  };


  function getBenchmark(symbol) {

    if (
      symbol === "CRYPTO:KAGUSD" ||
      symbol === "OANDA:XAGUSD"
    ) {

      return "OANDA:XAGUSD";
    }


    return "OANDA:XAUUSD";
  }


  /* =========================================================
     UPDATE COMPARISON
  ========================================================= */

  function updateComparison(
    symbol,
    title = null
  ) {

    symbol =
      normalizeSymbol(symbol);


    if (!symbol) {
      return;
    }


    const benchmark =
      getBenchmark(symbol);


    safeText(
      getElement("compareTokenLabel"),
      comparisonLabels[symbol] || symbol
    );


    safeText(
      getElement("compareBenchmarkLabel"),
      comparisonNames[benchmark] ||
        benchmark
    );


    safeText(
      getElement("compareTitle"),
      title ||
        comparisonNames[symbol] ||
        comparisonLabels[symbol] ||
        symbol
    );


    safeText(
      getElement("compareBenchmarkShort"),
      benchmark === "OANDA:XAGUSD"
        ? "XAG / USD"
        : "XAU / USD"
    );


    createTradingViewWidget({

      containerId:
        "compareMainWidget",

      symbol,

      height:
        CONFIG.comparisonHeight,

      advanced: true

    });

  }


  /* =========================================================
     COMPARISON TABS
  ========================================================= */

  function initializeComparison() {

    const tabs =
      $$(".compare-tab");


    if (!tabs.length) {
      return;
    }


    tabs.forEach(tab => {

      tab.addEventListener(
        "click",
        () => {

          activateComparisonTab(tab);

        }
      );

    });


    const active =
      $(".compare-tab.active") ||
      tabs[0];


    if (active) {
      activateComparisonTab(active);
    }

  }


  function activateComparisonTab(tab) {

    const tabs =
      $$(".compare-tab");


    tabs.forEach(item => {

      item.classList.toggle(
        "active",
        item === tab
      );

    });


    const symbol =
      normalizeSymbol(
        tab.dataset.symbol
      );


    const title =
      tab.dataset.title ||
      comparisonNames[symbol];


    updateComparison(
      symbol,
      title
    );

  }


  /* =========================================================
     FOCUS COMPARISON
  ========================================================= */

  function focusComparison(symbol) {

    symbol =
      normalizeSymbol(symbol);


    if (!symbol) return;


    const section =
      getElement("compare");


    const tabs =
      $$(".compare-tab");


    let matchingTab = null;


    tabs.forEach(tab => {

      const tabSymbol =
        normalizeSymbol(
          tab.dataset.symbol
        );


      if (tabSymbol === symbol) {
        matchingTab = tab;
      }

    });


    if (matchingTab) {

      activateComparisonTab(
        matchingTab
      );

    } else {

      updateComparison(symbol);

    }


    if (section) {

      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    }

  }


  /* =========================================================
     COMPARE BUTTONS
  ========================================================= */

  function initializeCompareButtons() {

    const buttons =
      $$(".compare-token");


    buttons.forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();


          const symbol =
            normalizeSymbol(
              button.dataset.symbol
            );


          const title =
            button.dataset.title ||
            comparisonNames[symbol];


          const section =
            getElement("compare");


          const tabs =
            $$(".compare-tab");


          let matchingTab = null;


          tabs.forEach(tab => {

            if (
              normalizeSymbol(
                tab.dataset.symbol
              ) === symbol
            ) {

              matchingTab = tab;

            }

          });


          if (matchingTab) {

            activateComparisonTab(
              matchingTab
            );

          } else {

            updateComparison(
              symbol,
              title
            );

          }


          if (section) {

            section.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });

          }

        }
      );

    });

  }


  /* =========================================================
     MOBILE NAVIGATION
  ========================================================= */

  function initializeNavigation() {

    const toggle =
      getElement("navToggle");

    const nav =
      getElement("siteNav");


    if (!toggle || !nav) {
      return;
    }


    function closeNavigation() {

      nav.classList.remove("open");

      toggle.setAttribute(
        "aria-expanded",
        "false"
      );

    }


    toggle.addEventListener(
      "click",
      () => {

        const isOpen =
          nav.classList.contains(
            "open"
          );


        nav.classList.toggle(
          "open",
          !isOpen
        );


        toggle.setAttribute(
          "aria-expanded",
          String(!isOpen)
        );

      }
    );


    $$("a", nav).forEach(link => {

      link.addEventListener(
        "click",
        closeNavigation
      );

    });


    document.addEventListener(
      "keydown",
      event => {

        if (event.key === "Escape") {
          closeNavigation();
        }

      }
    );

  }


  /* =========================================================
     SCROLL SPY
  ========================================================= */

  function initializeScrollSpy() {

    const links =
      $$(".site-nav a");


    const sections =
      $$("main section[id]");


    if (
      !links.length ||
      !sections.length
    ) {
      return;
    }


    if (
      !("IntersectionObserver" in window)
    ) {
      return;
    }


    const observer =
      new IntersectionObserver(
        entries => {

          entries.forEach(entry => {

            if (
              !entry.isIntersecting
            ) {
              return;
            }


            links.forEach(link => {

              const target =
                link.getAttribute(
                  "href"
                );


              link.classList.toggle(
                "active",
                target ===
                  "#" +
                  entry.target.id
              );

            });

          });

        },
        {
          rootMargin:
            "-30% 0px -60% 0px",
          threshold: 0
        }
      );


    sections.forEach(section => {

      observer.observe(section);

    });

  }


  /* =========================================================
     MODAL DATA
  ========================================================= */

  const assetDetails = {

    PAXG: {
      title: "PAXG — PAX Gold",
      text:
        "PAXG is a digital gold asset designed to represent ownership of physical gold. Proof Of Metal tracks its market behavior alongside the XAU/USD gold benchmark."
    },

    XAUT: {
      title: "XAUT — Tether Gold",
      text:
        "XAUT is a digital asset linked to physical gold. Proof Of Metal tracks its market behavior alongside the XAU/USD gold benchmark."
    },

    KAU: {
      title: "KAU — Kinesis Gold",
      text:
        "KAU is a gold-linked digital asset within the Kinesis ecosystem. Proof Of Metal tracks its market behavior against the physical gold benchmark."
    },

    KAG: {
      title: "KAG — Kinesis Silver",
      text:
        "KAG is a silver-linked digital asset within the Kinesis ecosystem. Proof Of Metal compares its market behavior against the physical silver benchmark."
    }

  };


  /* =========================================================
     DETAIL MODAL
  ========================================================= */

  function initializeModal() {

    const modal =
      getElement("detailModal");


    if (!modal) {
      return;
    }


    const close =
      getElement("modalClose");

    const title =
      getElement("modalTitle");

    const content =
      getElement("modalContent");


    const buttons =
      $$("[data-detail]");


    function openModal(asset) {

      const data =
        assetDetails[asset];


      if (!data) {
        return;
      }


      safeText(
        title,
        data.title
      );


      if (content) {

        content.innerHTML = `
          <p>${data.text}</p>
        `;

      }


      modal.classList.add(
        "open"
      );


      modal.setAttribute(
        "aria-hidden",
        "false"
      );


      document.body.classList.add(
        "modal-open"
      );

    }


    function closeModal() {

      modal.classList.remove(
        "open"
      );


      modal.setAttribute(
        "aria-hidden",
        "true"
      );


      document.body.classList.remove(
        "modal-open"
      );

    }


    buttons.forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();

          openModal(
            button.dataset.detail
          );

        }
      );

    });


    if (close) {

      close.addEventListener(
        "click",
        closeModal
      );

    }


    const overlay =
      $(".modal-overlay", modal);


    if (overlay) {

      overlay.addEventListener(
        "click",
        closeModal
      );

    }


    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Escape"
        ) {

          closeModal();

        }

      }
    );

  }


  /* =========================================================
     LAST UPDATED
  ========================================================= */

  function initializeTimestamp() {

    const element =
      getElement("lastUpdated");


    if (!element) {
      return;
    }


    function updateTimestamp() {

      const now =
        new Date();


      const time =
        now.toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit"
          }
        );


      element.textContent =
        `UPDATED ${time}`;

    }


    updateTimestamp();


    window.setInterval(
      updateTimestamp,
      60000
    );

  }


  /* =========================================================
     ACTIVE MARKET STATUS
  ========================================================= */

  function initializeMarketStatus() {

    const status =
      $(".live-status");


    if (!status) {
      return;
    }


    const dot =
      $(".status-dot", status);


    const text =
      $("strong", status);


    if (text) {

      text.textContent =
        "MARKETS ACTIVE";

    }


    if (dot) {

      dot.classList.add(
        "status-live"
      );

    }

  }


  /* =========================================================
     SMOOTH INTERNAL LINKS
  ========================================================= */

  function initializeSmoothLinks() {

    $$('a[href^="#"]').forEach(link => {

      link.addEventListener(
        "click",
        event => {

          const href =
            link.getAttribute(
              "href"
            );


          if (
            !href ||
            href === "#"
          ) {
            return;
          }


          const target =
            document.querySelector(
              href
            );


          if (!target) {
            return;
          }


          event.preventDefault();


          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }
      );

    });

  }


  /* =========================================================
     INITIALIZE TRADINGVIEW
  ========================================================= */

  async function initializeCharts() {

    try {

      await waitForTradingView();

      initializeLiveMarkets();

      initializeComparison();

      document.documentElement.classList.add(
        "tradingview-ready"
      );

    } catch (error) {

      console.error(
        "Proof Of Metal:",
        error
      );


      $$(".tv-mini, .token-chart, .comparison-widget")
        .forEach(container => {

          if (
            !container.innerHTML.trim()
          ) {

            showWidgetMessage(
              container,
              "LIVE MARKET DATA UNAVAILABLE"
            );

          }

        });

    }

  }


  /* =========================================================
     APPLICATION INITIALIZATION
  ========================================================= */

  function initializeApp() {

    initializeNavigation();

    initializeScrollSpy();

    initializeCompareButtons();

    initializeModal();

    initializeTimestamp();

    initializeMarketStatus();

    initializeSmoothLinks();

    initializeCharts();

  }


  /* =========================================================
     DOM READY
  ========================================================= */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeApp,
      {
        once: true
      }
    );

  } else {

    initializeApp();

  }

})();
/* =========================================================
   PROOF SCORE DATA
========================================================= */

const PROOF_SCORES = {

    PAXG: {
        name: "PAX Gold",
        symbol: "PAXG",
        metal: "Gold",

        backing: 30,
        redemption: 18,
        custody: 18,
        transparency: 17,
        liquidity: 5
    },

    XAUT: {
        name: "Tether Gold",
        symbol: "XAUT",
        metal: "Gold",

        backing: 29,
        redemption: 17,
        custody: 17,
        transparency: 15,
        liquidity: 4
    },

    KAU: {
        name: "Kinesis Gold",
        symbol: "KAU",
        metal: "Gold",

        backing: 27,
        redemption: 15,
        custody: 16,
        transparency: 15,
        liquidity: 5
    },

    KAG: {
        name: "Kinesis Silver",
        symbol: "KAG",
        metal: "Silver",

        backing: 28,
        redemption: 15,
        custody: 16,
        transparency: 15,
        liquidity: 5
    }

};
/* =========================================================
   SCORE CALCULATION
========================================================= */

function calculateProofScore(asset) {

    if (!asset) {
        return 0;
    }

    return (
        asset.backing +
        asset.redemption +
        asset.custody +
        asset.transparency +
        asset.liquidity
    );

}


function getScoreBand(score) {

    if (score >= 90) {
        return {
            label: "Very Strong Evidence",
            className: "score-very-strong"
        };
    }

    if (score >= 80) {
        return {
            label: "Strong Evidence",
            className: "score-strong"
        };
    }

    if (score >= 70) {
        return {
            label: "Moderate Evidence",
            className: "score-moderate"
        };
    }

    if (score >= 60) {
        return {
            label: "Limited Evidence",
            className: "score-limited"
        };
    }

    return {
        label: "Insufficient Evidence",
        className: "score-insufficient"
    };

}
