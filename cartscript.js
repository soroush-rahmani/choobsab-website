// تابع escapeHtml برای جلوگیری از حملات XSS
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, String.fromCharCode(38) + "amp;")
    .replace(/</g, String.fromCharCode(60) + "lt;")
    .replace(/>/g, String.fromCharCode(62) + "gt;")
    .replace(/"/g, String.fromCharCode(34) + "quot;")
    .replace(/'/g, String.fromCharCode(39) + "#039;");
}

// ۱. تابع اصلی رندر صفحه سبد خرید (cart.html)
function renderCartPage() {
  const container =
    document.getElementById("mainCartItemsContainer") ||
    document.getElementById("cartItemsContainer");
  const subtotalEl = document.getElementById("cartSubtotal");
  const totalPriceEl = document.getElementById("cartTotalPrice");
  const checkoutBtn = document.getElementById("btnGoToCheckout");

  if (!container) return;

  // خواندن سبد خرید مستقیماً از LocalStorage
  const cart = JSON.parse(localStorage.getItem("choobsab_decor_cart")) || [];

  // نمایش پیام در صورت خالی بودن سبد خرید + مخفی کردن دکمه ثبت سفارش
  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-msg">
        <p>سبد خرید شما خالی است!</p>
        <a href="index.html" class="btn-back-shop">بازگشت به فروشگاه</a>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = "۰ تومان";
    if (totalPriceEl) totalPriceEl.textContent = "۰ تومان";

    // عدم نمایش دکمه در صورت خالی بودن سبد
    if (checkoutBtn) {
      checkoutBtn.style.display = "none";
    }
    return;
  }

  // نمایش دکمه در صورت وجود محصول در سبد
  if (checkoutBtn) {
    checkoutBtn.style.display = "flex";
  }

  // ساخت لیست کارت‌ها و محاسبه قیمت کل
  let html = "";
  let totalSum = 0;

  cart.forEach((item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 1;
    const itemTotal = price * qty;
    totalSum += itemTotal;

    html += `
      <div class="cart-item-card" data-id="${escapeHtml(item.id)}">
        <img src="${escapeHtml(item.image || "images/default.jpg")}" alt="${escapeHtml(item.name || "محصول")}" class="cart-item-img">
        
        <div class="cart-item-details">
          <h3 class="cart-item-title">${escapeHtml(item.name || "بدون نام")}</h3>
          <div class="cart-item-price">${price.toLocaleString()} تومان</div>
        </div>

        <div class="cart-item-controls">
          <button class="qty-btn" data-action="decrease">-</button>
          <span class="qty-display">${qty}</span>
          <button class="qty-btn" data-action="increase">+</button>
        </div>

        <div class="cart-item-total-price">
          ${itemTotal.toLocaleString()} تومان
        </div>

        <button class="remove-btn" data-action="remove" title="حذف">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;
  });

  container.innerHTML = html;

  if (subtotalEl) subtotalEl.textContent = totalSum.toLocaleString() + " تومان";
  if (totalPriceEl)
    totalPriceEl.textContent = totalSum.toLocaleString() + " تومان";
}

// ۲. تابع تغییر تعداد اختصاصی صفحه cart.html
window.cartPageChangeQty = function (productId, amount) {
  CartManager.changeQuantity(productId, amount);
};

// ۳. تابع حذف اختصاصی صفحه cart.html
window.cartPageRemove = function (productId) {
  CartManager.removeFromCart(productId);
};

// Event delegation برای دکمه‌های صفحه سبد خرید
function initCartPageEvents() {
  const container =
    document.getElementById("mainCartItemsContainer") ||
    document.getElementById("cartItemsContainer");
  if (!container) return;

  container.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const card = btn.closest(".cart-item-card");
    if (!card) return;
    const productId = card.dataset.id;

    const action = btn.dataset.action;
    if (action === "increase") {
      cartPageChangeQty(productId, 1);
    } else if (action === "decrease") {
      cartPageChangeQty(productId, -1);
    } else if (action === "remove") {
      cartPageRemove(productId);
    }
  });
}

// اجرا به محض لود شدن کامل صفحه
document.addEventListener("DOMContentLoaded", () => {
  renderCartPage();
  initCartPageEvents();
});
