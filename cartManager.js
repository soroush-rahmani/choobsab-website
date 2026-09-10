// =================== مدیریت مرکزی سبد خرید ===================
// این فایل به عنوان منبع واحد حقیقت برای سبد خرید عمل می‌کند
// همه صفحات (index, cart, checkout) از این فایل استفاده می‌کنند

const CartManager = {
  // خواندن سبد خرید از localStorage
  getCart() {
    try {
      return JSON.parse(localStorage.getItem("choobsab_decor_cart")) || [];
    } catch (e) {
      return [];
    }
  },

  // ذخیره سبد خرید در localStorage
  saveCart(cart) {
    localStorage.setItem("choobsab_decor_cart", JSON.stringify(cart));
  },

  // افزودن محصول به سبد خرید
  addToCart(productId) {
    let productToAdd = null;
    if (typeof storeData !== "undefined") {
      storeData.categories.forEach((cat) => {
        const found = cat.subcategories.find((item) => item.id == productId);
        if (found) productToAdd = found;
      });
    }

    if (!productToAdd) return;

    const cart = this.getCart();
    const existingItem = cart.find((item) => item.id == productId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({
        id: productToAdd.id,
        name: productToAdd.name,
        price: productToAdd.price,
        image:
          productToAdd.images && productToAdd.images[0]
            ? productToAdd.images[0]
            : "",
        quantity: 1,
      });
    }

    this.saveCart(cart);
    this.refreshAllViews();
  },

  // حذف کامل محصول از سبد خرید
  removeFromCart(productId) {
    let cart = this.getCart();
    cart = cart.filter((i) => i.id != productId);
    this.saveCart(cart);
    this.refreshAllViews();
  },

  // کم و زیاد کردن تعداد محصول
  changeQuantity(productId, amount) {
    let cart = this.getCart();
    const item = cart.find((i) => i.id == productId);
    if (!item) return;

    item.quantity += amount;

    if (item.quantity <= 0) {
      cart = cart.filter((i) => i.id != productId);
    }

    this.saveCart(cart);
    this.refreshAllViews();
  },

  // تعداد کل اقلام سبد خرید
  getTotalItems() {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  // جمع کل قیمت سبد خرید
  getTotalPrice() {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  // پاک کردن کامل سبد خرید
  clearCart() {
    localStorage.removeItem("choobsab_decor_cart");
    this.refreshAllViews();
  },

  // به‌روزرسانی تمام بخش‌های UI در کل سایت
  refreshAllViews() {
    // ۱. آپدیت متغیر سراسری cart در script.js (اگر وجود داشته باشد)
    // با try/catch از خطای TDZ (let cart) جلوگیری می‌شود
    try {
      if (typeof cart !== "undefined") {
        cart = this.getCart();
      }
    } catch (e) {
      // متغیر cart هنوز تعریف نشده - مشکلی نیست
    }

    // ۲. آپدیت نشانگر تعداد روی آیکون سبد خرید
    this.updateCartUI();

    // ۳. به‌روزرسانی پنل کشویی (در صورت وجود در صفحه)
    if (typeof renderCartDrawerItems === "function") {
      renderCartDrawerItems();
    }

    // ۴. به‌روزرسانی صفحه اصلی سبد خرید (در صورت وجود)
    if (typeof renderCartPage === "function") {
      renderCartPage();
    }

    // ۵. به‌روزرسانی صفحه تسویه حساب (در صورت وجود)
    if (typeof renderCheckoutSummary === "function") {
      renderCheckoutSummary();
    }
  },

  // آپدیت تعداد روی هدر و جمع کل (هم برای صفحه اصلی و هم پنل کشویی)
  updateCartUI() {
    // همه‌ی نشانگرهای تعداد (هدر دسکتاپ + نوار ناوبری موبایل) با هم آپدیت می‌شوند
    const cartBadges = document.querySelectorAll(".cart-count");
    const totalItems = this.getTotalItems();

    cartBadges.forEach((cartBadge) => {
      cartBadge.textContent = totalItems;
      cartBadge.style.display = totalItems > 0 ? "inline-flex" : "none";
    });

    const totalPrice = this.getTotalPrice();

    // آپدیت جمع کل در صفحه اصلی (index.html)
    const cartTotalPriceElement = document.getElementById("cartTotalPrice");
    if (cartTotalPriceElement) {
      cartTotalPriceElement.textContent =
        totalPrice.toLocaleString() + " تومان";
    }

    // آپدیت جمع کل در پنل کشویی سبد خرید
    const cartDrawerTotalPriceElement = document.getElementById(
      "cartDrawerTotalPrice",
    );
    if (cartDrawerTotalPriceElement) {
      cartDrawerTotalPriceElement.textContent =
        totalPrice.toLocaleString() + " تومان";
    }
  },
};

// =================== توابع سازگاری (Backward Compatibility) ===================
// این توابع برای اینکه کدهای قدیمی که از onclick استفاده می‌کنند خراب نشوند

// افزودن محصول به سبد خرید
function addToCart(productId) {
  CartManager.addToCart(productId);
}

// حذف کامل محصول از سبد خرید
function removeFromCart(productId) {
  CartManager.removeFromCart(productId);
}

// کم و زیاد کردن تعداد محصول
function changeQuantity(productId, amount) {
  CartManager.changeQuantity(productId, amount);
}

// آپدیت تعداد روی هدر و جمع کل
function updateCartUI() {
  CartManager.updateCartUI();
}

// به‌روزرسانی تمام بخش‌های UI در کل سایت
function refreshAllCartViews() {
  CartManager.refreshAllViews();
}

// ذخیره در localStorage و آپدیت UI
function saveCartAndUI() {
  CartManager.refreshAllViews();
}
