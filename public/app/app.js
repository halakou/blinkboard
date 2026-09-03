(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.setHeaderColor) tg.setHeaderColor("#0d1117");
    if (tg.setBackgroundColor) tg.setBackgroundColor("#0d1117");
  }

  var state = { planId: "24h", kind: "promo", theme: "eightbit", plans: [], lastCode: "" };
  var statusEl = document.getElementById("status");
  var payBtn = document.getElementById("pay");
  if (tg && tg.MainButton) {
    payBtn.hidden = true;
    document.body.classList.add("has-main-btn");
  }
  var titleEl = document.getElementById("title");
  var bodyEl = document.getElementById("body");
  var ctaEl = document.getElementById("cta");

  function show(msg, err) {
    statusEl.hidden = !msg;
    statusEl.textContent = msg || "";
    statusEl.className = "status" + (err ? " err" : "");
  }

  function haptic() {
    try { if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); } catch (e) {}
  }

  function botFallback() {
    var url = "https://t.me/BlinkboardBot?start=new";
    if (tg && tg.openTelegramLink) tg.openTelegramLink(url);
    else location.href = url;
  }

  function openLink(url) {
    if (tg && tg.openLink) tg.openLink(url, { try_instant_view: false });
    else location.href = url;
  }

  function currentPlan() {
    for (var i = 0; i < state.plans.length; i++) if (state.plans[i].id === state.planId) return state.plans[i];
    return null;
  }

  function payLabel() {
    var p = currentPlan();
    return p ? "Pay " + p.stars + " Stars · " + p.label : "Pay with Stars";
  }

  function syncMain() {
    var label = payLabel();
    payBtn.textContent = label;
    if (!tg || !tg.MainButton) {
      payBtn.hidden = false;
      document.body.classList.remove("has-main-btn");
      return;
    }
    payBtn.hidden = true;
    document.body.classList.add("has-main-btn");
    try {
      if (tg.MainButton.setParams) {
        tg.MainButton.setParams({ text: label, color: "#238636", text_color: "#ffffff" });
      } else {
        tg.MainButton.setText(label);
      }
      tg.MainButton.show();
    } catch (e) {
      try { tg.MainButton.setText(label); tg.MainButton.show(); } catch (e2) {}
    }
  }

  function preview() {
    document.getElementById("stage").setAttribute("data-theme", state.theme);
    document.getElementById("pv-kind").textContent = state.kind;
    var p = currentPlan();
    document.getElementById("pv-plan").textContent = p ? p.label : "";
    document.getElementById("pv-title").textContent = titleEl.value.trim() || "Your headline";
    document.getElementById("pv-body").textContent = bodyEl.value.trim() || "The page text appears here as you type.";
    document.getElementById("title-n").textContent = titleEl.value.length + "/80";
    document.getElementById("body-n").textContent = bodyEl.value.length + "/600";
    document.getElementById("cta-need").textContent = state.kind === "link" ? "(required)" : "(optional)";
  }

  function openInvoice(url) {
    if (tg && tg.openInvoice) {
      tg.openInvoice(url, function (st) {
        if (st === "paid") {
          var page = state.lastCode ? "https://blinkboard.pages.dev/a/" + state.lastCode : "";
          show(page ? "Live: " + page : "Live. Check chat for the URL.");
          loadMine();
        } else if (st === "cancelled") show("Payment cancelled.", true);
        else if (st === "failed") show("Payment failed. Try again or use chat.", true);
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
    if (err === "open_chat") return "Open this Mini App from @BlinkboardBot.";
    return null;
  }

  function renderPlans() {
    var box = document.getElementById("plans");
    box.innerHTML = "";
    state.plans.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (p.id === state.planId ? " on" : "");
      b.textContent = p.label + " · " + p.stars + "⭐";
      b.addEventListener("click", function () {
        state.planId = p.id;
        haptic();
        renderPlans();
        preview();
        syncMain();
      });
      box.appendChild(b);
    });
  }

  function renderThemes() {
    var box = document.getElementById("themes");
    var list = [
      { id: "classic", label: "Classic" },
      { id: "eightbit", label: "8-bit" },
      { id: "midnight", label: "Midnight" },
      { id: "poster", label: "Poster" },
    ];
    box.innerHTML = "";
    list.forEach(function (th) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (th.id === state.theme ? " on" : "");
      b.textContent = th.label;
      b.addEventListener("click", function () {
        state.theme = th.id;
        haptic();
        renderThemes();
        preview();
      });
      box.appendChild(b);
    });
  }

  document.querySelectorAll(".kind").forEach(function (b) {
    b.addEventListener("click", function () {
      state.kind = b.getAttribute("data-kind");
      haptic();
      document.querySelectorAll(".kind").forEach(function (x) { x.classList.toggle("on", x === b); });
      preview();
    });
  });

  ["input", "change"].forEach(function (ev) {
    titleEl.addEventListener(ev, preview);
    bodyEl.addEventListener(ev, preview);
  });

  function pay() {
    show("");
    payBtn.disabled = true;
    if (tg && tg.MainButton) tg.MainButton.showProgress();
    var body = {
      planId: state.planId,
      kind: state.kind,
      theme: state.theme,
      title: titleEl.value,
      body: bodyEl.value,
      ctaUrl: ctaEl.value,
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
        if (tg && tg.MainButton) tg.MainButton.hideProgress();
        var d = x.d || {};
        if (d.code) state.lastCode = d.code;
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
        if (tg && tg.MainButton) tg.MainButton.hideProgress();
        botFallback();
      });
  }

  payBtn.addEventListener("click", pay);
  if (tg && tg.MainButton) {
    tg.MainButton.onClick(pay);
  }

  var sample = document.getElementById("sample");
  if (sample) {
    sample.addEventListener("click", function (e) {
      e.preventDefault();
      openLink("https://blinkboard.pages.dev/preview/eightbit");
    });
  }

  function loadMine() {
    var initData = (tg && tg.initData) || "";
    if (!initData) return;
    fetch("/api/mine", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ initData: initData }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !d.pages || !d.pages.length) return;
        var wrap = document.getElementById("mine-wrap");
        var box = document.getElementById("mine");
        wrap.hidden = false;
        box.innerHTML = "";
        d.pages.forEach(function (p) {
          var a = document.createElement("a");
          a.className = "mine-item";
          a.href = "https://blinkboard.pages.dev/a/" + p.code;
          a.textContent = p.code + " · " + (p.theme || "") + " · " + p.title;
          a.addEventListener("click", function (e) {
            e.preventDefault();
            openLink(a.href);
          });
          box.appendChild(a);
        });
      })
      .catch(function () {});
  }

  fetch("/api/plans")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      state.plans = (d && d.plans) || [];
      if (state.plans.length && !state.plans.some(function (p) { return p.id === state.planId; })) {
        state.planId = state.plans[0].id;
      }
      renderPlans();
      renderThemes();
      preview();
      syncMain();
      loadMine();
    })
    .catch(function () {
      show("Could not load prices. Use the chat bot.", true);
    });
})();
