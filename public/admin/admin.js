(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }
  var statusEl = document.getElementById("status");
  function show(msg, err) {
    statusEl.hidden = !msg;
    statusEl.textContent = msg || "";
    statusEl.className = "status" + (err ? " err" : "");
  }
  function initData() {
    return (tg && tg.initData) || "";
  }
  function api(op, extra) {
    var body = Object.assign({ op: op, initData: initData() }, extra || {});
    return fetch("/api/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().then(function (d) {
        return { r: r, d: d };
      });
    });
  }
  function renderStats(s) {
    if (!s) return;
    document.getElementById("stats").textContent =
      "live " + (s.live || 0) +
      "\nexpired " + (s.expired || 0) +
      "\nblocked " + (s.blocked || 0) +
      "\npending " + (s.pending || 0) +
      "\nviews " + (s.views || 0) +
      "\nstars " + (s.stars || 0);
  }
  function load() {
    api("stats").then(function (x) {
      if (!x.d || !x.d.ok) {
        show("Open this panel from the Blinkboard bot as admin.", true);
        return;
      }
      document.getElementById("who").textContent = "id " + (x.d.id || "");
      renderStats(x.d.stats);
      return api("live");
    }).then(function (x) {
      if (!x || !x.d || !x.d.ok) return;
      var box = document.getElementById("list");
      box.innerHTML = "";
      (x.d.pages || []).forEach(function (p) {
        var row = document.createElement("div");
        row.className = "status";
        row.style.marginBottom = "8px";
        row.textContent = p.code + " · " + p.kind + " · " + p.title;
        var ex = document.createElement("button");
        ex.className = "chip";
        ex.textContent = "Expire";
        ex.addEventListener("click", function () {
          api("expire", { code: p.code }).then(function () { load(); });
        });
        var bl = document.createElement("button");
        bl.className = "chip";
        bl.textContent = "Block";
        bl.addEventListener("click", function () {
          api("block", { code: p.code, reason: "admin" }).then(function () { load(); });
        });
        row.appendChild(document.createElement("br"));
        row.appendChild(ex);
        row.appendChild(bl);
        box.appendChild(row);
      });
    }).catch(function () {
      show("Could not load admin API.", true);
    });
  }
  load();
})();
