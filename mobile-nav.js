// =================== نوار ناوبری پایینی موبایل (Mobile Bottom Navigation) ===================
// این فایل در تمام صفحات سایت لود می‌شود و نوار ناوبری ثابت پایینی موبایل را
// با سه المان «فروشگاه»، «سبد خرید» و «دسته‌بندی» تزریق می‌کند (الگوی footer.js).
//
// رفتار هوشمند:
//  - فروشگاه: همیشه به صفحه اصلی فروشگاه (index.html) لینک می‌شود.
//  - سبد خرید: اگر صفحه کشوی سبد خرید داشته باشد، آن را باز می‌کند؛
//    در غیر این صورت (cart.html و checkout.html) به صفحه سبد خرید می‌رود.
//  - دسته‌بندی: اگر صفحه سایدبار دسته‌بندی داشته باشد، آن را باز می‌کند؛
//    در غیر این صورت به صفحه اصلی فروشگاه می‌رود.
//
// نشانگر تعداد (badge) سبد خرید هم توسط cartManager.js (تابع updateCartUI)
// به‌صورت خودکار برای همه‌ی .cart-count ها به‌روزرسانی می‌شود.

(function () {
  // تشخیص اینکه صفحه فعلی، فروشگاه (index) است یا نه
  function isStorePage() {
    const path = window.location.pathname.toLowerCase();
    return (
      path.endsWith("index.html") ||
      path.endsWith("/") ||
      path.endsWith("/index.html") ||
      path === ""
    );
  }

  function injectMobileNav() {
    if (document.querySelector(".mobile-bottom-nav")) return;

    const nav = document.createElement("nav");
    nav.className = "mobile-bottom-nav";
    nav.setAttribute("aria-label", "ناوبری اصلی موبایل");

    const storeClass = isStorePage() ? " mobile-nav-item is-active" : " mobile-nav-item";

    nav.innerHTML = `
      <a href="index.html" class="${storeClass}">
        <i class="fas fa-store"></i>
        <span class="mobile-nav-label">فروشگاه</span>
      </a>
      <button type="button" class="mobile-nav-item" id="mobileNavCategoryBtn">
        <i class="fas fa-th-large"></i>
        <span class="mobile-nav-label">دسته‌بندی</span>
      </button>
      <button type="button" class="mobile-nav-item" id="mobileNavCartBtn">
        <i class="fas fa-shopping-cart"></i>
        <span class="mobile-nav-label">سبد خرید</span>
        <span class="cart-count mobile-nav-badge">۰</span>
      </button>
    `;

    document.body.appendChild(nav);

    // دکمه دسته‌بندی: باز کردن سایدبار اگر وجود دارد
    const categoryBtn = document.getElementById("mobileNavCategoryBtn");
    if (categoryBtn) {
      categoryBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (document.getElementById("sidebar") && typeof toggleSidebar === "function") {
          toggleSidebar();
        } else {
          window.location.href = "index.html";
        }
      });
    }

    // دکمه سبد خرید: باز کردن کشوی سبد اگر وجود دارد
    const cartBtn = document.getElementById("mobileNavCartBtn");
    if (cartBtn) {
      cartBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (document.getElementById("cartDrawer") && typeof openCartDrawer === "function") {
          openCartDrawer();
        } else {
          window.location.href = "cart.html";
        }
      });
    }

    // آپدیت اولیه نشانگر تعداد سبد خرید در نوار ناوبری
    try {
      if (
        typeof CartManager !== "undefined" &&
        typeof CartManager.updateCartUI === "function"
      ) {
        CartManager.updateCartUI();
      }
    } catch (err) {
      // در صورت نبودن CartManager خطا نگیریم
    }
  }

  // تشخیص صفحه فعلی برای هایلایت دکمه فعال ناوبری بالایی
  function getCurrentPageToken() {
    const path = window.location.pathname.toLowerCase();
    if (path.endsWith("custom.html")) return "custom";
    if (path.endsWith("about.html")) return "about";
    if (path.endsWith("contact.html")) return "contact";
    return "store";
  }

  // تزریق ناوبری بالایی موبایل (فروشگاه، محصولات سفارشی، درباره ما، تماس با ما)
  // داخل search-wrapper قرار می‌گیرد تا همراه نوار جستجو چسبان شود
  function injectMobileTopNav() {
    if (document.querySelector(".mobile-top-nav")) return;
    const searchWrapper = document.querySelector(".search-wrapper");
    if (!searchWrapper) return;

    const current = getCurrentPageToken();

    const links = [
      { href: "index.html", label: "فروشگاه", token: "store" },
      { href: "custom.html", label: "محصولات سفارشی", token: "custom" },
      { href: "about.html", label: "درباره ما", token: "about" },
      { href: "contact.html", label: "تماس با ما", token: "contact" },
    ];

    const nav = document.createElement("div");
    nav.className = "mobile-top-nav";
    nav.setAttribute("aria-label", "ناوبری بالایی موبایل");

    nav.innerHTML = links
      .map(
        (l) =>
          `<a href="${l.href}"${
            l.token === current ? ' class="is-active"' : ""
          }>${l.label}</a>`,
      )
      .join("");

    // اضافه‌کردن به آخر search-wrapper تا همراه نوار جستجو چسبان شود
    searchWrapper.appendChild(nav);
  }

  // باز/بسته کردن زیردسته‌های سایدبار در موبایل با کلیک کاربر (تک‌تک و مستقل)
  function initSidebarSubmenuToggles() {
    const menu = document.getElementById("sidebarMenu");
    if (!menu || menu.dataset.mobileSubmenuReady === "1") return;
    menu.dataset.mobileSubmenuReady = "1";

    menu.addEventListener("click", (e) => {
      // فقط در حالت موبایل (هاور دسکتاپ دست‌نخورده بماند)
      if (!window.matchMedia("(max-width: 1023.98px)").matches) return;

      const link = e.target.closest("a");
      if (!link) return;

      const li = link.closest("li.has-submenu");
      if (!li) return;

      // فقط کلیک روی لینک اصلی خود دسته، نه لینک‌های زیردسته
      if (link.parentElement !== li) {
        // لینک‌های زیردسته که هنوز href="#" دارند نباید صفحه را به بالا بپرند
        if (link.getAttribute("href") === "#") {
          e.preventDefault();
        }
        return;
      }

      e.preventDefault();
      li.classList.toggle("open");

      // فقط یک زیردسته در هر لحظه باز باشد (بقیه بسته می‌شوند)
      menu.querySelectorAll("li.has-submenu.open").forEach((item) => {
        if (item !== li) item.classList.remove("open");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      injectMobileNav();
      injectMobileTopNav();
      initSidebarSubmenuToggles();
    });
  } else {
    injectMobileNav();
    injectMobileTopNav();
    initSidebarSubmenuToggles();
  }
})();
