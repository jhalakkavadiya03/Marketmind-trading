(function () {
    "use strict";

    const WATCHLIST = [
        { sym: "RELIANCE.NS", ex: "NSE", seed: 101, base: 2847.35, chg: 1.5 },
        { sym: "TCS", ex: "NSE", seed: 202, base: 3456.2, chg: -0.32 },
        { sym: "INFY", ex: "NSE", seed: 303, base: 1523.9, chg: 0.88 },
        { sym: "HDFCBANK", ex: "NSE", seed: 404, base: 1678.0, chg: -0.21 },
        { sym: "ICICIBANK", ex: "NSE", seed: 505, base: 1124.55, chg: 0.67 },
        { sym: "SBIN", ex: "NSE", seed: 606, base: 789.3, chg: 1.12 },
        { sym: "BHARTIARTL", ex: "NSE", seed: 707, base: 1345.0, chg: -0.45 },
        { sym: "WIPRO", ex: "NSE", seed: 808, base: 298.4, chg: 0.15 },
    ];

    const TICKER_LINES = [
        ["NIFTY 50", "+0.42%", true],
        ["SENSEX", "+0.38%", true],
        ["BANK NIFTY", "−0.12%", false],
        ["USD/INR", "−0.05%", false],
        ["FINNIFTY", "+0.21%", true],
        ["MIDCAP", "+0.09%", true],
    ];

    let activeSymbol = WATCHLIST[0];
    let lastTradePrice = activeSymbol.base;
    let chart = null;
    let candleSeries = null;
    let volumeSeries = null;
    let orderSide = "buy";

    function mulberry32(a) {
        return function () {
            let t = (a += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function formatINR(n) {
        return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function isLightTheme() {
        return document.documentElement.dataset.theme === "light";
    }

    function initTheme() {
        const saved = localStorage.getItem("mm-theme");
        const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
        const theme = saved || (prefersLight ? "light" : "dark");
        document.documentElement.dataset.theme = theme;
        syncThemeIcon();
    }

    function toggleTheme() {
        const next = isLightTheme() ? "dark" : "light";
        document.documentElement.dataset.theme = next;
        localStorage.setItem("mm-theme", next);
        syncThemeIcon();
        applyChartTheme();
    }

    function syncThemeIcon() {
        const glyph = document.querySelector("#btn-theme .icon-btn__glyph");
        if (!glyph) return;
        glyph.classList.toggle("theme-sun", !isLightTheme());
        glyph.classList.toggle("theme-moon", isLightTheme());
    }

    function chartLayoutOptions() {
        const light = isLightTheme();
        return {
            layout: {
                background: { type: "solid", color: light ? "#ffffff" : "#131722" },
                textColor: light ? "#475569" : "#b2b5be",
            },
            grid: {
                vertLines: { color: light ? "rgba(15, 23, 42, 0.07)" : "rgba(42, 46, 57, 0.55)" },
                horzLines: { color: light ? "rgba(15, 23, 42, 0.07)" : "rgba(42, 46, 57, 0.55)" },
            },
            rightPriceScale: { borderColor: light ? "#e2e8f0" : "#2a2e39" },
            timeScale: { borderColor: light ? "#e2e8f0" : "#2a2e39", timeVisible: true, secondsVisible: false },
        };
    }

    function applyChartTheme() {
        if (!chart) return;
        chart.applyOptions(chartLayoutOptions());
    }
    async function getLivePrice() {
  const res = await fetch("http://127.0.0.1:5000/price/reliance");
  const data = await res.json();

  document.getElementById("header-last").innerText =
    "₹ " + data.price;
}
    async function updatePrice() {
  const res = await fetch("http://127.0.0.1:5000/price/reliance");
  const data = await res.json();

  document.getElementById("header-last").innerText =
    "₹ " + data.price;
}

setInterval(updatePrice, 2000);
    function generateCandles(seed, basePrice, dayCount) {
        const rand = mulberry32(seed);
        const data = [];
        const vol = [];
        let close = basePrice * (0.92 + rand() * 0.08);
        const start = new Date();
        start.setUTCDate(start.getUTCDate() - dayCount);
        for (let i = 0; i < dayCount; i++) {
            const d = new Date(start);
            d.setUTCDate(d.getUTCDate() + i);
            const t = d.toISOString().slice(0, 10);
            const drift = (rand() - 0.49) * (basePrice * 0.012);
            const open = close;
            close = Math.max(basePrice * 0.5, open + drift);
            const range = basePrice * (0.004 + rand() * 0.012);
            const high = Math.max(open, close) + rand() * range;
            const low = Math.min(open, close) - rand() * range;
            const v = Math.floor(800000 + rand() * 4e6);
            data.push({
                time: t,
                open: +open.toFixed(2),
                high: +high.toFixed(2),
                low: +low.toFixed(2),
                close: +close.toFixed(2),
            });
            vol.push({
                time: t,
                value: v,
                color: close >= open ? "rgba(38, 166, 154, 0.45)" : "rgba(239, 83, 80, 0.45)",
            });
        }
        return { candles: data, volume: vol, lastClose: close };
    }

    const TF_DAYS = { "1D": 90, "1W": 180, "1M": 365, "3M": 520, "1Y": 900 };

    function tfLabel(tf) {
        const map = {
            "1D": "Daily",
            "1W": "Weekly",
            "1M": "Monthly",
            "3M": "Quarter",
            "1Y": "Year",
        };
        return map[tf] || tf;
    }

    function buildChart() {
        const container = document.getElementById("chart-container");
        if (!container || typeof LightweightCharts === "undefined") return;

        const w = container.clientWidth;
        const h = container.clientHeight;

        chart = LightweightCharts.createChart(container, {
            ...chartLayoutOptions(),
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: { color: "#758696", width: 1, style: LightweightCharts.LineStyle.Dashed },
                horzLine: { color: "#758696", width: 1, style: LightweightCharts.LineStyle.Dashed },
            },
            width: w,
            height: h,
        });

        candleSeries = chart.addCandlestickSeries({
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderVisible: false,
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350",
        });

        volumeSeries = chart.addHistogramSeries({
            color: "#26a69a",
            priceFormat: { type: "volume" },
            priceScaleId: "",
        });

        volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.85, bottom: 0 },
        });

        const ro = new ResizeObserver((entries) => {
            const cr = entries[0].contentRect;
            chart.applyOptions({ width: cr.width, height: cr.height });
            chart.timeScale().fitContent();
        });
        ro.observe(container);
    }

    function setOhlcFromBar(bar) {
        if (!bar) return;
        const ids = ["stat-o", "stat-h", "stat-l", "stat-c"];
        const vals = [bar.open, bar.high, bar.low, bar.close];
        ids.forEach((id, i) => {
            const el = document.getElementById(id);
            if (el) el.textContent = formatINR(vals[i]);
        });
    }

    function loadSymbol(item, tf) {
        activeSymbol = item;
        const days = TF_DAYS[tf] || 90;
        const { candles, volume, lastClose } = generateCandles(item.seed, item.base, days);
        const lastBar = candles[candles.length - 1];

        const nameEl = document.getElementById("symbol-name");
        const metaEl = document.getElementById("symbol-meta");
        if (nameEl) nameEl.textContent = item.sym;
        if (metaEl) metaEl.textContent = `${item.ex} · Equity · INR`;

        const pct = item.chg;
        const prev = lastClose / (1 + pct / 100);
        const delta = lastClose - prev;
        const sign = delta >= 0 ? "+" : "";
        const up = delta >= 0;

        document.getElementById("header-last").textContent = formatINR(lastClose);
        const chEl = document.getElementById("header-change");
        chEl.textContent = `${sign}${delta.toFixed(2)} (${sign}${pct.toFixed(2)}%)`;
        chEl.classList.toggle("up", up);
        chEl.classList.toggle("down", !up);

        lastTradePrice = lastClose;
        setOhlcFromBar(lastBar);

        const hint = document.getElementById("chart-hint");
        if (hint) hint.textContent = `OHLC · ${tfLabel(tf)} · demo`;

        const mkt = document.getElementById("order-type").value === "market";
        const priceInput = document.getElementById("price-input");
        if (mkt) {
            priceInput.value = "";
            priceInput.placeholder = "Market";
        } else {
            priceInput.placeholder = "Limit";
            priceInput.value = lastClose.toFixed(2);
        }

        if (candleSeries && volumeSeries && chart) {
            candleSeries.setData(candles);
            volumeSeries.setData(volume);
            chart.timeScale().fitContent();
        }

        updateEstValue(lastClose);
        renderDepth(lastClose);
        highlightWatchlist(item.sym);
    }

    function highlightWatchlist(sym) {
        document.querySelectorAll(".watchlist__item").forEach((el) => {
            el.classList.toggle("watchlist__item--active", el.dataset.sym === sym);
        });
    }

    function renderWatchlist(filter) {
        const ul = document.getElementById("watchlist");
        const q = (filter || "").trim().toLowerCase();
        ul.innerHTML = "";
        WATCHLIST.filter((w) => w.sym.toLowerCase().includes(q)).forEach((w) => {
            const chgPct = w.chg;
            const up = chgPct >= 0;
            const li = document.createElement("li");
            li.className = "watchlist__item" + (w.sym === activeSymbol.sym ? " watchlist__item--active" : "");
            li.dataset.sym = w.sym;
            li.innerHTML = `
        <span class="watchlist__sym">${w.sym}</span>
        <span class="watchlist__px">${formatINR(w.base)}</span>
        <span class="watchlist__ex">${w.ex}</span>
        <span class="watchlist__chg ${up ? "up" : "down"}">${up ? "+" : ""}${chgPct.toFixed(2)}%</span>
      `;
            li.addEventListener("click", () => {
                const tf = document.querySelector(".tf--active")?.dataset.tf || "1D";
                loadSymbol(w, tf);
            });
            ul.appendChild(li);
        });
    }

    function renderDepth(last) {
        const box = document.getElementById("depth-rows");
        box.innerHTML = "";
        const step = Math.max(0.05, last * 0.0003);
        for (let i = 0; i < 5; i++) {
            const bid = last - step * (i + 1);
            const ask = last + step * (i + 1);
            const row = document.createElement("div");
            row.className = "depth__row";
            row.innerHTML = `
        <div class="depth__cell depth__cell--bid">
          <span>${formatINR(bid)}</span><span>${(420 + i * 73) % 997}</span>
        </div>
        <div class="depth__cell depth__cell--ask">
          <span>${formatINR(ask)}</span><span>${(310 + i * 61) % 887}</span>
        </div>
      `;
            box.appendChild(row);
        }
    }

    function getLastFromChart() {
        return lastTradePrice;
    }

    function updateEstValue(lastPx) {
        const qty = parseInt(document.getElementById("qty").value, 10) || 0;
        const type = document.getElementById("order-type").value;
        let px = lastPx;
        if (type !== "market") {
            const v = parseFloat(document.getElementById("price-input").value);
            if (!Number.isNaN(v)) px = v;
        }
        document.getElementById("est-value").textContent = qty ? formatINR(px * qty) : "₹—";
    }

    function showToast(msg) {
        const t = document.getElementById("toast");
        t.textContent = msg;
        t.classList.add("toast--show");
        clearTimeout(showToast._id);
        showToast._id = setTimeout(() => t.classList.remove("toast--show"), 2600);
    }

    function setTfAria(activeBtn) {
        document.querySelectorAll(".tf").forEach((b) => {
            b.classList.toggle("tf--active", b === activeBtn);
            b.setAttribute("aria-selected", b === activeBtn ? "true" : "false");
        });
    }

    function setOrderSide(side) {
        orderSide = side;
        const panel = document.querySelector(".panel--order");
        panel.classList.toggle("order-side-sell", side === "sell");
        document.querySelectorAll(".order-tab").forEach((b) => {
            const on = b.dataset.side === side;
            b.classList.toggle("order-tab--active", on);
            b.setAttribute("aria-selected", on ? "true" : "false");
        });
        const submit = document.getElementById("btn-submit-order");
        submit.textContent = side === "buy" ? "Place buy order" : "Place sell order";
    }

    function buildTicker() {
        const el = document.getElementById("ticker");
        if (!el) return;
        const parts = TICKER_LINES.map(([label, pct, up]) => {
            const cls = up ? "up" : "down";
            return `<span>${label} <strong class="${cls}">${pct}</strong></span>`;
        });
        const row = parts.join("");
        el.innerHTML = row + row;
    }

    window.getPrediction = async function () {
    const out = document.getElementById("predict-result");
    out.textContent = "Fetching real prediction...";

    try {
        const res = await fetch("http://127.0.0.1:5000/predict", {
            method: "POST",   // ✅ FIX
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                input: 10   // 👈 dummy input (backend ke hisaab se change karo)
            })
        });

        const data = await res.json();

        const price = data.prediction || data.predicted_price;

        out.innerHTML = `
            <span class="up">Predicted Price</span><br>
            ₹ ${Number(price).toFixed(2)}
        `;
    } catch (err) {
        out.textContent = "Backend connection error ❌";
        console.error(err);
    }
};
    function init() {
        initTheme();

        const tfBtn = document.querySelector(".tf--active");
        const tf = tfBtn?.dataset?.tf || "1D";

        buildChart();
        if (!chart) {
            const el = document.getElementById("chart-container");
            if (el) {
                el.innerHTML =
                    '<p style="padding:24px;color:var(--text-muted);font-size:13px;line-height:1.5;">Chart library failed to load. Check your network and refresh.</p>';
            }
        }

        buildTicker();

        renderWatchlist("");
        loadSymbol(activeSymbol, tf);

        document.getElementById("watchlist-search").addEventListener("input", (e) => {
            renderWatchlist(e.target.value);
        });

        document.querySelectorAll(".tf").forEach((btn) => {
            btn.addEventListener("click", () => {
                setTfAria(btn);
                loadSymbol(activeSymbol, btn.dataset.tf);
            });
        });

        document.querySelectorAll(".order-tab").forEach((btn) => {
            btn.addEventListener("click", () => setOrderSide(btn.dataset.side));
        });

        document.getElementById("order-type").addEventListener("change", () => {
            const last = lastTradePrice;
            const mkt = document.getElementById("order-type").value === "market";
            const priceInput = document.getElementById("price-input");
            if (mkt) {
                priceInput.value = "";
                priceInput.placeholder = "Market";
            } else {
                priceInput.placeholder = "Limit";
                priceInput.value = last.toFixed(2);
            }
            updateEstValue(last);
        });

        ["qty", "price-input"].forEach((id) => {
            document.getElementById(id).addEventListener("input", () => updateEstValue(getLastFromChart()));
        });

        document.getElementById("btn-submit-order").addEventListener("click", () => {
            const qty = parseInt(document.getElementById("qty").value, 10) || 0;
            if (qty < 1) {
                showToast("Enter a valid quantity.");
                return;
            }
            const side = orderSide === "buy" ? "Buy" : "Sell";
            showToast(`${side} ${qty} ${activeSymbol.sym} — demo only (not sent).`);
        });

        document.getElementById("btn-predict").addEventListener("click", () => window.getPrediction());

        document.querySelector(".watchlist-tabs").addEventListener("click", (e) => {
            const tab = e.target.closest(".tab");
            if (!tab) return;
            document.querySelectorAll(".watchlist-tabs .tab").forEach((t) => {
                t.classList.remove("tab--active");
                t.setAttribute("aria-selected", "false");
            });
            tab.classList.add("tab--active");
            tab.setAttribute("aria-selected", "true");
            showToast(tab.dataset.tab === "hot" ? "Movers uses the same list in this demo." : "Watchlist");
        });

        document.getElementById("btn-layout").addEventListener("click", () => {
            showToast("Layout presets would go here.");
        });

        const themeBtn = document.getElementById("btn-theme");
        if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

        const fsBtn = document.getElementById("btn-fullscreen");
        const chartWs = document.querySelector(".chart-workspace");
        if (fsBtn && chartWs) {
            const syncFsUi = () => {
                const on = chartWs.classList.contains("is-expanded");
                fsBtn.setAttribute("aria-label", on ? "Exit expanded chart" : "Expand chart");
                fsBtn.textContent = on ? "✕" : "⛶";
            };
            fsBtn.addEventListener("click", () => {
                chartWs.classList.toggle("is-expanded");
                syncFsUi();
                const on = chartWs.classList.contains("is-expanded");
                showToast(on ? "Chart expanded — Esc or ✕ to exit." : "Chart restored.");
                requestAnimationFrame(() => {
                    if (chart) chart.timeScale().fitContent();
                });
            });
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && chartWs.classList.contains("is-expanded")) {
                    chartWs.classList.remove("is-expanded");
                    syncFsUi();
                    requestAnimationFrame(() => {
                        if (chart) chart.timeScale().fitContent();
                    });
                }
            });
        }

        setOrderSide("buy");
        syncThemeIcon();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
