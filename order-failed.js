(function () {
  "use strict";
  var raw = sessionStorage.getItem("choobsab_order_error");
  if (!raw) { window.location.href = "checkout.html"; return; }
  var data = {};
  try { data = JSON.parse(raw); } catch (e) { data = {}; }
  var msg = data.message || "خطای ناشناخته در ثبت سفارش.";
  document.getElementById("errorMsg").textContent = msg;
})();
