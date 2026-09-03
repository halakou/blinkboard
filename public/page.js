(function () {
  var el = document.getElementById("left");
  var root = document.querySelector(".board");
  if (!el || !root) return;
  var exp = Number(root.getAttribute("data-exp") || 0);
  function tick() {
    var left = exp - Date.now();
    if (left <= 0) {
      el.textContent = "expired";
      return;
    }
    var s = Math.floor(left / 1000);
    var d = Math.floor(s / 86400);
    s -= d * 86400;
    var h = Math.floor(s / 3600);
    s -= h * 3600;
    var m = Math.floor(s / 60);
    s -= m * 60;
    el.textContent = (d ? d + "d " : "") + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0") + " left";
    requestAnimationFrame(function () { setTimeout(tick, 1000); });
  }
  tick();
})();
