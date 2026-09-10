(function () {
  "use strict";
  var raw = sessionStorage.getItem("choobsab_order_success");
  if (!raw) { window.location.href = "index.html"; return; }
  var data = {};
  try { data = JSON.parse(raw); } catch (e) { data = {}; }

  function $(id) { return document.getElementById(id); }
  function fa(n) { return Number(n || 0).toLocaleString("fa-IR"); }

  $("trackingCode").textContent = data.orderId || "—";
  $("dName").textContent = (data.customerInfo && data.customerInfo.fullName) || "—";
  $("dPhone").textContent = (data.customerInfo && data.customerInfo.phone) || "—";
  $("dAddress").textContent = (data.customerInfo && data.customerInfo.address) || "—";
  $("dTotal").textContent = fa(data.totalPrice) + " تومان";

  var items = Array.isArray(data.items) ? data.items : [];
  $("itemsList").innerHTML = items.map(function (it) {
    var qty = Number(it.quantity) || 1;
    var price = Number(it.price) || 0;
    return (
      '<div class="item-row">' +
      '<span class="item-name">' + (it.name || "محصول") + '</span>' +
      '<span class="item-qty">' + fa(qty) + ' عدد</span>' +
      '<span class="item-price">' + fa(price * qty) + ' تومان</span>' +
      '</div>'
    );
  }).join("");

  $("copyBtn").addEventListener("click", function () {
    var code = $("trackingCode").textContent;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(function () {
        $("copyBtn").innerHTML = '<i class="fas fa-check"></i> کپی شد';
      });
    }
  });
})();
