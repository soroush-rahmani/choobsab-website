const SHIPPING_FEE = 200000; // هزینه ارسال ثابت ۲۰۰,۰۰۰ تومان

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

// ۱. خواندن محصولات و رندر فاکتور نهایی
function renderCheckoutSummary() {
  const cart = CartManager.getCart();

  const itemsContainer = document.getElementById("checkoutItemsPreview");
  const subtotalEl = document.getElementById("checkoutSubtotal");
  const shippingEl = document.getElementById("checkoutShippingCost");
  const grandTotalEl = document.getElementById("checkoutGrandTotal");

  if (!itemsContainer) return;

  // اگر سبد خرید خالی بود به صفحه اصلی برگردد
  if (cart.length === 0) {
    alert("سبد خرید شما خالی است!");
    window.location.href = "index.html";
    return;
  }

  let itemsHtml = "";
  let itemsTotal = 0;

  cart.forEach((item) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity) || 1;
    const itemSum = price * qty;
    itemsTotal += itemSum;

    itemsHtml += `
      <div class="preview-item">
        <span class="preview-name">${escapeHtml(item.name || "محصول")} (${qty} عدد)</span>
        <span class="preview-price">${itemSum.toLocaleString()} تومان</span>
      </div>
    `;
  });

  itemsContainer.innerHTML = itemsHtml;

  const grandTotal = itemsTotal + SHIPPING_FEE;

  if (subtotalEl)
    subtotalEl.textContent = itemsTotal.toLocaleString() + " تومان";
  if (shippingEl)
    shippingEl.textContent = SHIPPING_FEE.toLocaleString() + " تومان";
  if (grandTotalEl)
    grandTotalEl.textContent = grandTotal.toLocaleString() + " تومان";
}

// ۲. ارسال فرم ثبت سفارش به API بک‌اند Node.js
window.handleCheckoutSubmit = async function (event) {
  event.preventDefault();

  const cart = JSON.parse(localStorage.getItem("choobsab_decor_cart")) || [];

  if (cart.length === 0) {
    alert("سبد خرید شما خالی است!");
    return;
  }

  const itemsTotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0,
  );
  const grandTotal = itemsTotal + SHIPPING_FEE;

  // همگام‌سازی ساختار داده با پارامترهای دریافت در سرور (server.js)
  const orderData = {
    customerInfo: {
      fullName: document.getElementById("fullName").value.trim(),
      phone: document.getElementById("phoneNumber").value.trim(),
      postalCode: document.getElementById("postalCode")?.value.trim() || "",
      address: document.getElementById("shippingAddress").value.trim(),
      note: document.getElementById("orderNotes")?.value.trim() || "",
    },
    paymentMethod:
      document.querySelector('input[name="paymentMethod"]:checked')?.value ||
      "online",
    items: cart,
    totalPrice: grandTotal,
  };

  try {
    // اگر کاربر تیک «ذخیره آدرس» را زده بود، آدرس را برای دفعات بعد ذخیره کن
    const saveChk = document.getElementById("saveAddressChk");
    if (saveChk && saveChk.checked) {
      try {
        await fetch("/api/user/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData.customerInfo),
        });
      } catch (e) {
        // ذخیره آدرس اختیاری است — خطای آن مانع سفارش نمی‌شود
      }
    }

    // ارسال درخواست POST به سرور
        // آدرس نسبی — چون سرور هم فرانت‌اند و هم API را سرو می‌کند
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();

    if (result.success) {
      // ذخیره اطلاعات سفارش برای نمایش در صفحه موفقیت
      sessionStorage.setItem("choobsab_order_success", JSON.stringify({
        orderId: result.orderId,
        items: orderData.items,
        totalPrice: orderData.totalPrice,
        customerInfo: orderData.customerInfo,
      }));

      // ─── اتصال به درگاه پرداخت زرین‌پال ───
      const paymentRes = await fetch("/api/payment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: result.orderId,
          customerInfo: orderData.customerInfo,
        }),
      });
      const paymentData = await paymentRes.json();

      if (paymentData.success && paymentData.url) {
        // پاک‌سازی سبد خرید قبل از انتقال به درگاه
        localStorage.removeItem("choobsab_decor_cart");
        // انتقال به صفحه پرداخت زرین‌پال
        window.location.href = paymentData.url;
      } else {
        // خطا در ایجاد درخواست پرداخت — نمایش صفحه موفقیت با هشدار
        sessionStorage.setItem("choobsab_order_error", JSON.stringify({
          message: paymentData.message || "خطا در اتصال به درگاه پرداخت.",
        }));
        window.location.href = "order-failed.html";
      }
    } else {
      // خطای اعتبارسنجی از سرور — انتقال به صفحه خطا
      sessionStorage.setItem("choobsab_order_error", JSON.stringify({
        message: result.message || "خطا در ثبت سفارش.",
      }));
      window.location.href = "order-failed.html";
    }
  } catch (error) {
    console.error("خطا در ارتباط با سرور:", error);
    // خطای شبکه/اتصال — انتقال به صفحه خطا
    sessionStorage.setItem("choobsab_order_error", JSON.stringify({
      message: "ارتباط با سرور برقرار نشد. بررسی کنید که سرور Node.js روی پورت 5000 روشن باشد.",
    }));
    window.location.href = "order-failed.html";
  }
};

// ۳. آدرس‌های ذخیره‌شده در پروفایل — برای پر شدن خودکار فرم
function renderSavedAddresses(addresses) {
  const wrap = document.getElementById("savedAddressesWrap");
  const list = document.getElementById("savedAddressesList");
  if (!wrap || !list) return;
  if (!addresses || !addresses.length) {
    wrap.hidden = true;
    return;
  }
  list.innerHTML = "";
  addresses.forEach((a) => {
    // انتخاب آدرس → پر کردن فرم
    const card = document.createElement("label");
    card.className = "saved-address-item";
    card.innerHTML = `
      <input type="radio" name="savedAddress" value="${a.id}" />
      <span class="saved-address-body">
        <strong>${escapeHtml(a.fullName || "آدرس ذخیره‌شده")}</strong>
        <span>${escapeHtml(a.address)}</span>
      </span>
    `;
    card.addEventListener("change", () => fillFormFromAddress(a));
    list.appendChild(card);
  });
  wrap.hidden = false;
}

function fillFormFromAddress(a) {
  const fields = {
    fullName: a.fullName,
    phoneNumber: a.phone,
    postalCode: a.postalCode,
    shippingAddress: a.address,
    orderNotes: a.note,
  };
  for (const id in fields) {
    const el = document.getElementById(id);
    const val = fields[id];
    if (el && val) el.value = val;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  renderCheckoutSummary();

  // ⚠️ محافظ ورود: صفحه پرداخت فقط برای کاربران واردشده (حساب کاربری با کد یک‌بارمصرف)
  // اگر کاربر وارد نشده باشد، به صفحه اصلی برگردانده می‌شود تا ابتدا ثبت‌نام/ورود کند.
  try {
    const authRes = await fetch("/api/auth/me");
    const authData = await authRes.json();
    if (!authData.user) {
      window.location.href = "index.html";
      return;
    }
  } catch (e) {
    // اگر سرور در دسترس نباشد، ثبت سفارش در سمت سرور هم رد خواهد شد
    console.error("بررسی وضعیت ورود ناموفق بود:", e);
  }

  // بارگذاری آدرس‌های ذخیره‌شده‌ی کاربر برای پر کردن خودکار فرم
  try {
    const addrRes = await fetch("/api/user/addresses");
    const addrData = await addrRes.json();
    renderSavedAddresses((addrData && addrData.addresses) || []);
  } catch (e) {
    console.error("بارگذاری آدرس‌های ذخیره‌شده ناموفق بود:", e);
  }

  // اتصال فرم تسویه حساب به تابع handleCheckoutSubmit
  const checkoutForm = document.getElementById("checkoutForm");
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", handleCheckoutSubmit);
  }
});
