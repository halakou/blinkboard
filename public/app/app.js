(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.setHeaderColor) tg.setHeaderColor("#f6f1e8");
  }

  var state = { planId: "24h", kind: "promo", plans: [] };
  var statusEl = document.getElementById("status");
  var payBtn = document.getElementById("pay");

  function show(msg, err) {
    statusEl.hidden = !msg;
    statusEl.textContent = msg || "";
    statusEl.className = "status" + (err ? " err" : "");
  }

  function botFallback() {
    var url = "https://t.me/BlinkboardBot?start=new";
    if (tg && tg.openTelegramLink) tg.openTelegramLink(url);
    else location.href = url;
  }

  function openInvoice(url) {
    if (tg && tg.openInvoice) {
      tg.openInvoice(url, function (st) {
        if (st === "paid") show("Live. Telegram also sent the URL in chat.");
        else if (st === "cancelled") show("Payment cancelled.", true);
        else if (st === "failed") show("Payment failed. Try again or use the chat bot.", true);
      });
      return;
    }
    if (tg && tg.openTelegramLink) tg.openTelegramLink(url);
    else location.href = url;
  }

  function friendly(err) {
    if (err === "rate" || err === "limit") return "Slow down and try again in a few minutes.";
    if (err === "plan") return "Pick a duration.";
    if (err === "invoice") return "Could not open Stars pay. Use the chat bot.";
    if (err === "json") return "Could not read that form.";
    return null;
  }

  function renderPlans() {
    var box = document.getElementById("plans");
    box.innerHTML = "";
    state.plans.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (p.id === state.planId ? " on" : "");
      b.textContent = p.label + " · €" + (p.eurCents / 100).toFixed(2) + " · " + p.stars + "⭐";
      b.addEventListener("click", function () {
        state.planId = p.id;
        renderPlans();
      });
      box.appendChild(b);
    });
  }

  document.querySelectorAll(".kind").forEach(function (b) {
    b.addEventListener("click", function () {
      state.kind = b.getAttribute("data-kind");
      document.querySelectorAll(".kind").forEach(function (x) {
        x.classList.toggle("on", x === b);
      });
    });
  });

  payBtn.addEventListener("click", function () {
    pay();
  });

  function pay() {
    show("");
    payBtn.disabled = true;
    var body = {
      planId: state.planId,
      kind: state.kind,
      title: document.getElementById("title").value,
      body: document.getElementById("body").value,
      ctaUrl: document.getElementById("cta").value,
      initData: (tg && tg.initData) || "",
    };
    fetch("/api/rent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(function (r) { return r.json().then(function (d) { return { r: r, d: d }; }); })
      .then(function (x) {
        payBtn.disabled = false;
        var d = x.d || {};
        var url = d.invoice_url || d.url;
        if (url) {
          openInvoice(url);
          return;
        }
        var msg = friendly(d.error);
        if (msg) show(msg, true);
        else if (d.message && d.error !== "unauthorized") show(d.message, true);
        else botFallback();
      })
      .catch(function () {
        payBtn.disabled = false;
        botFallback();
      });
  }

  fetch("/api/plans")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      state.plans = (d && d.plans) || [];
      if (state.plans.length && !state.plans.some(function (p) { return p.id === state.planId; })) {
        state.planId = state.plans[0].id;
      }
      renderPlans();
    })
    .catch(function () {
      show("Could not load prices. Use the chat bot.", true);
    });
})();
