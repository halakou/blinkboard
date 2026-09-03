(function () {
  var stage = document.getElementById("stage");
  var name = document.getElementById("stage-name");
  if (!stage) return;
  document.querySelectorAll(".look").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var theme = btn.getAttribute("data-theme");
      var label = btn.getAttribute("data-label") || theme;
      stage.setAttribute("data-theme", theme);
      if (name) name.textContent = label;
      document.querySelectorAll(".look").forEach(function (b) {
        b.classList.toggle("on", b === btn);
      });
    });
  });
})();
