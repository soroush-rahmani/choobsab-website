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

// تعریف سراسری سبد خرید با خواندن امن از localStorage
// let cart = JSON.parse(localStorage.getItem('choobsab_decor_cart')) || [];
// تابع باز و بسته کردن سایدبار با کلیک روی دکمه هدر
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return; // اگر سایدبار در صفحه نیست، خارج شو
  // کلاس open را اضافه یا حذف می‌کند
  sidebar.classList.toggle("open");
}

// =================== عملکرد دکمه بازگشت به بالا ===================
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

// فقط اگر دکمه در صفحه وجود داشت (index.html) فعال شود
if (scrollToTopBtn) {
  // نمایش دکمه هنگام اسکرول به پایین
  window.addEventListener("scroll", () => {
    // اگر بیشتر از 300 پیکسل به پایین اسکرول شد، دکمه را نشان بده
    if (window.scrollY > 50) {
      scrollToTopBtn.classList.add("show");
    } else {
      scrollToTopBtn.classList.remove("show");
    }
  });

  // بازگشت نرم به بالا با کلیک روی دکمه
  scrollToTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // این ویژگی باعث می‌شود پرش ناگهانی نداشته باشیم
    });
  });
}

// =================== بستن سایدبار با کلیک خارج از آن ===================
document.addEventListener("click", function (event) {
  const sidebar = document.getElementById("sidebar");
  const headerCategoryBtn = document.querySelector(".category-btn"); // دکمه داخل هدر
  const mobileNav = document.querySelector(".mobile-bottom-nav"); // نوار ناوبری موبایل

  // اگر سایدبار در این صفحه وجود ندارد، خارج شو (cart.html و checkout.html)
  if (!sidebar) return;

  // بررسی می‌کنیم که آیا سایدبار با کلیک باز شده است؟ (کلاس open دارد؟)
  if (sidebar.classList.contains("open")) {
    // اگر کلیکِ کاربر نه روی خود سایدبار بود و نه روی دکمه‌ای که آن را باز می‌کند
    // (دکمه دسکتاپ یا دکمه دسته‌بندی نوار ناوبری موبایل)
    if (
      !sidebar.contains(event.target) &&
      !(headerCategoryBtn && headerCategoryBtn.contains(event.target)) &&
      !(mobileNav && mobileNav.contains(event.target))
    ) {
      // کلاس open را بردار تا سایدبار بسته شود
      sidebar.classList.remove("open");
    }
  }
});

// =================== افکت ظاهر شدن نوار جستجو (موبایل) و هدر پایین (دسکتاپ) ===================
// در دسکتاپ: هدر پایین (header-bottom) همراه کاربر ثابت می‌شود و با اسکرول به پایین
// مخفی و با اسکرول به بالا ظاهر می‌شود.
// در موبایل: نوار جستجو (search-wrapper) به همراه ناوبری بالایی دقیقاً همین رفتار را دارد.
const headerBottom = document.querySelector(".header-bottom");
const headerTop = document.querySelector(".header-top");
const searchWrapper = document.querySelector(".search-wrapper");
let lastScrollY = window.scrollY;
let stickyThreshold = 0;

// تشخیص حالت موبایل (هماهنگ با media query در style/mobile.css)
const isMobileLayout = () =>
  window.matchMedia("(max-width: 1023.98px)").matches;

// جای‌نگهدار (Spacer): وقتی المان fixed می‌شود، این جای‌نگهدار ارتفاعش را پر می‌کند
// تا محتوای زیرین نپرد (پرش عمودی حذف شود)
function createSpacerAfter(element) {
  if (!element || !element.parentNode) return null;
  const spacer = document.createElement("div");
  spacer.className = "header-spacer";
  element.parentNode.insertBefore(spacer, element.nextSibling);
  return spacer;
}

const headerSpacer = createSpacerAfter(headerBottom);
const searchSpacer = createSpacerAfter(searchWrapper);

window.addEventListener("resize", () => {
  // هنگام تغییر اندازه پنجره، آستانه را باطل می‌کنیم تا دوباره محاسبه شود
  stickyThreshold = 0;

  // اگر حالت نمایش عوض شد (موبایل ↔ دسکتاپ)، کلاس‌های چسبان را پاک کن
  // تا المان به جریان عادی برگردد و دوباره درست محاسبه شود
  if (searchWrapper) searchWrapper.classList.remove("fixed-nav", "nav-hidden");
  if (headerBottom) headerBottom.classList.remove("fixed-nav", "nav-hidden");
  if (searchSpacer) searchSpacer.style.height = "0";
  if (headerSpacer) headerSpacer.style.height = "0";
});

window.addEventListener("scroll", () => {
  // اگر هدر در این صفحه وجود ندارد، خارج شو (cart.html و checkout.html)
  if (!headerTop) return;

  // انتخاب المان چسبان و جای‌نگهدار متناسب با حالت نمایش
  const stickyEl = isMobileLayout() ? searchWrapper : headerBottom;
  const spacer = isMobileLayout() ? searchSpacer : headerSpacer;
  if (!stickyEl || !spacer) return;

  const currentScrollY = window.scrollY;

  // آستانه چسبیدن فقط وقتی که هنوز ثابت نیستیم محاسبه می‌شود.
  // در موبایل: زمانی که نوار جستجو به بالای ویوپورت می‌رسد (موقعیت مطلق آن)
  // در دسکتاپ: بعد از اینکه هدر بالایی کاملاً رد شد
  if (!stickyEl.classList.contains("fixed-nav")) {
    stickyThreshold = isMobileLayout()
      ? stickyEl.getBoundingClientRect().top + currentScrollY
      : headerTop.offsetHeight;
  }

  if (currentScrollY >= stickyThreshold) {
    // فقط بار اول که fixed می‌شود، ارتفاع اسپیس را ست کن (جلوگیری از پرش محتوا)
    if (!stickyEl.classList.contains("fixed-nav")) {
      // ارتفاع را قبل از fixed شدن می‌خوانیم (در حالت عادی جریان صفحه)
      spacer.style.height = stickyEl.offsetHeight + "px";
      stickyEl.classList.add("fixed-nav");
    }

    // مخفی شدن با اسکرول به پایین (فقط بعد از کمی اسکرول تا لرزش ایجاد نشود)
    if (currentScrollY > lastScrollY && currentScrollY - lastScrollY > 10) {
      stickyEl.classList.add("nav-hidden");
    }
    // و با اسکرول رو به بالا، سریع ظاهر شو
    else if (currentScrollY < lastScrollY) {
      stickyEl.classList.remove("nav-hidden");
    }
  } else {
    // فقط وقتی کلاس fixed-nav وجود دارد، پاکسازی کن (جلوگیری از کار اضافی)
    if (stickyEl.classList.contains("fixed-nav")) {
      spacer.style.height = "0";
      stickyEl.classList.remove("fixed-nav");
      stickyEl.classList.remove("nav-hidden");
    }
  }

  lastScrollY = currentScrollY;
});

// تابع ساخت خودکار سایدبار از روی دیتابیس
function renderSidebarMenu() {
  const menuContainer = document.getElementById("sidebarMenu");
  if (!menuContainer) return;

  let menuHTML = "";

  storeData.categories.forEach((cat) => {
    // ساخت لیست زیردسته‌ها
    let subItemsHTML = "";
    cat.subcategories.forEach((sub) => {
      subItemsHTML += `<li><a href="${escapeHtml(sub.link)}">${escapeHtml(sub.name)}</a></li>`;
    });

    // ساخت ساختار اصلی هر دسته‌بندی
    menuHTML += `
            <li class="has-submenu">
                <a href="#">
                    <i class="${escapeHtml(cat.icon)} menu-icon"></i>
                    <span class="menu-text">${escapeHtml(cat.name)}</span>
                    <i class="fas fa-chevron-left submenu-arrow"></i>
                </a>
                <ul class="submenu">
                    ${subItemsHTML}
                </ul>
            </li>
        `;
  });

  menuContainer.innerHTML = menuHTML;
}

// =================== مدیریت بارگذاری محصولات (Load More / Infinite Scroll) ===================

// تنظات صفحه‌بندی
const PRODUCTS_PER_PAGE = 8;
let currentPage = 1;
let allProductsCache = [];
let isLoading = false;
let hasMoreProducts = true;

// دریافت و صفحه‌بندی محصولات
function getProductsPaginated() {
  if (allProductsCache.length === 0) {
    if (typeof storeData !== "undefined") {
      storeData.categories.forEach((cat) => {
        allProductsCache = allProductsCache.concat(cat.subcategories);
      });
    }
  }

  const startIndex = 0;
  const endIndex = currentPage * PRODUCTS_PER_PAGE;
  const paginatedProducts = allProductsCache.slice(startIndex, endIndex);
  hasMoreProducts = endIndex < allProductsCache.length;

  return paginatedProducts;
}

// لود کردن محصولات بیشتر (با نمایش اسپینر)
function loadMoreProducts() {
  if (isLoading || !hasMoreProducts) return;

  isLoading = true;
  showLoadingIndicator();

  // شبیه‌سازی تاخیر شبکه (برای تجربه کاربری واقعی)
  setTimeout(() => {
    const prevPage = currentPage;
    currentPage++;

    // فقط محصولات جدید این صفحه لود میشن (نه تمام محتوا!)
    const startIndex = prevPage * PRODUCTS_PER_PAGE;
    const endIndex = currentPage * PRODUCTS_PER_PAGE;
    const productsToLoad = allProductsCache.slice(startIndex, endIndex);

    // استفاده از appendProducts برای اضافه کردن به محصولات قبلی
    appendProducts(productsToLoad);
    hideLoadingIndicator();

    // آپدیت وضعیت hasMoreProducts
    hasMoreProducts = endIndex < allProductsCache.length;

    // اگر محصولات تموم شد، پیام نمایش بده
    if (!hasMoreProducts) {
      showEndOfProducts();
    }

    isLoading = false;
  }, 500);
}

// نمایش اسپینر لودینگ (استفاده از class برای transition_smooth)
function showLoadingIndicator() {
  const loadingIndicator = document.getElementById("loadingIndicator");
  if (loadingIndicator) {
    loadingIndicator.classList.add("loading");
  }
}

// مخفی کردن اسپینر لودینگ (استفاده از class برای transition_smooth)
function hideLoadingIndicator() {
  const loadingIndicator = document.getElementById("loadingIndicator");
  if (loadingIndicator) {
    loadingIndicator.classList.remove("loading");
  }
}

// افزودن محصولات به انتهای گرید (برای infinite scroll)
function appendProducts(products) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  let html = "";
  products.forEach((prod) => {
    const primaryImg =
      prod.images && prod.images[0] ? prod.images[0] : "images/default.jpg";
    const secondaryImg =
      prod.images && prod.images[1] ? prod.images[1] : primaryImg;

    html += `
    <div class="product-card">
        <a href="product.html?id=${encodeURIComponent(prod.id)}" class="product-card-link">
            <div class="product-image-container">
                <img loading="lazy" src="${escapeHtml(primaryImg)}" alt="${escapeHtml(prod.name)}" class="primary-img">
                <img loading="lazy" src="${escapeHtml(secondaryImg)}" alt="${escapeHtml(prod.name)} نمای دیگر" class="secondary-img">
            </div>
        </a>
        <div class="product-info">
            <a href="product.html?id=${encodeURIComponent(prod.id)}" class="product-card-link">
                <h4 class="product-title">${escapeHtml(prod.name)}</h4>
            </a>
            <span class="product-price">${prod.price.toLocaleString()} تومان</span>
            <button class="add-to-cart-btn" data-id="${escapeHtml(prod.id)}">
                <span>افزودن به سبد</span>
                <i class="fas fa-shopping-cart"></i>
            </button>
        </div>
    </div>
`;
  });

  grid.insertAdjacentHTML("beforeend", html);
}

// ریست کردن صفحه‌بندی (وقتی فیلتر یا جستجو انجام شد)
function resetPagination() {
  currentPage = 1;
  allProductsCache = [];
  hasMoreProducts = true;
  isLoading = false;

  // حذف پیام پایان لیست اگر قبلاً نمایش داده شده
  const existingMsg = document.querySelector(".end-of-products-msg");
  if (existingMsg) {
    existingMsg.remove();
  }
}

// =================== اپن شدن لودینگ بیشتر (Infinite Scroll) ===================
function initInfiniteScroll() {
  const loadingIndicator = document.getElementById("loadingIndicator");
  if (!loadingIndicator) return;

  // استفاده از Intersection Observer برای تشخیص فرولود شدن اسکرول
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isLoading && hasMoreProducts) {
          loadMoreProducts();
        }
      });
    },
    {
      root: null, // استفاده از viewport
      rootMargin: "100px", // فعال شدن زودتر از ورود به ویوپورت
      threshold: 0, // وقتی حتی ۱ پیکسل هم دیده شد
    }
  );

  observer.observe(loadingIndicator);
  window.loadMoreObserver = observer; // ذخیره برای دسترسی در آینده
}

// نمایش پیام پایان لیست محصولات
function showEndOfProducts() {
  const productsGrid = document.getElementById("productsGrid");
  if (!productsGrid) return;

  const endMessage = document.createElement("p");
  endMessage.className = "end-of-products-msg";
  endMessage.style.cssText = "grid-column: 1 / -1; text-align: center; padding: 30px; color: #777; font-size: 14px;";
  endMessage.textContent = "🎉 تمام محصولات نمایش داده شد";
  productsGrid.appendChild(endMessage);
}

// =================== اول اولیه هنگام لود شدن صفحه ===================
document.addEventListener("DOMContentLoaded", () => {
  // ۰. مقداردهی اولیه صفحه‌بندی
  currentPage = 1;
  allProductsCache = [];
  hasMoreProducts = true;

  // ۱. مقداردهی اولیه سبد خرید
  cart = JSON.parse(localStorage.getItem("choobsab_decor_cart")) || [];

  // ۲. آپدیت رابط کاربری سبد خرید
  updateCartUI();

  // ۳. فعال‌سازی پنل کشویی سبد خرید
  initCartDrawer();

  // ۴. رندر کردن منوی سایدبار (اگر وجود داشته باشد)
  if (typeof renderSidebarMenu === "function") {
    renderSidebarMenu();
  }

  // ۵. رندر اولیه محصولات (۸ عدد اول)
  if (typeof renderProducts === "function") {
    // ابتدا تمام محصولات رو در کش بگذار (برای فیلتر/سورت)
    const initialProducts = getProductsPaginated();
    // ذخیره کل محصولات (نه فقط ۸ تا) برای استفاده در فیلتر/سورت
    window.currentFilteredProducts = allProductsCache.slice();
    renderProducts(initialProducts);

    // اگر محصولات بیشتری هم هست، فقط observer رو فعال کن
    // (اسپینر به طور خودکار وقتی لود می‌شه ظاهر میشه، نه قبل از اون)
    if (hasMoreProducts) {
      hideLoadingIndicator();
      initInfiniteScroll();
    } else {
      hideLoadingIndicator();
      showEndOfProducts();
    }
  }

  // ۶. فعال‌سازی جستجو
  if (typeof initSearch === "function") {
    initSearch();
  }

  // ۷. فعال‌سازی فیلترها
  if (typeof initFilters === "function") {
    initFilters();
  }

  // ۷.۵. فعال‌سازی کشوی فیلتر موبایل
  if (typeof initMobileFilterDrawer === "function") {
    initMobileFilterDrawer();
  }

  // ۸. فعال‌سازی مرتب‌سازی
  if (typeof initSorting === "function") {
    initSorting();
  }

  // ۹. گوش دادن به کلیک‌های گرید محصول (برای دکمه افزودن به سبد خرید)
  const productsGrid = document.getElementById("productsGrid");
  if (productsGrid) {
    productsGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".add-to-cart-btn");
      if (!btn) return;
      const productId = btn.dataset.id;
      handleAddToCartClick(btn, productId);
    });
  }

  // ۱۰. اتصال دکمه‌های سایدبار به تابع toggleSidebar
  const sidebarToggleBtn = document.getElementById("sidebarToggleBtn");
  if (sidebarToggleBtn) {
    sidebarToggleBtn.addEventListener("click", toggleSidebar);
  }

  const categoryBtn = document.getElementById("categoryBtn");
  if (categoryBtn) {
    categoryBtn.addEventListener("click", toggleSidebar);
  }

  // ۱۱. اتصال فیلترهای کشویی به تابع toggleFilterDropdown
  document.querySelectorAll(".filter-dropdown-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => toggleFilterDropdown(toggle));
  });

  // ۱۲. اتصال دکمه‌های پنل سبد خرید
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      window.location.href = "checkout.html";
    });
  }

  const viewFullCartBtn = document.getElementById("viewFullCartBtn");
  if (viewFullCartBtn) {
    viewFullCartBtn.addEventListener("click", () => {
      window.location.href = "cart.html";
    });
  }

  console.log("Hello World");
  // سلام عشقای من
});

// =================== مدیریت فیلترهای کشویی سایدبار ===================
function toggleFilterDropdown(element) {
  const list = element.nextElementSibling;
  list.classList.toggle("show");
  const icon = element.querySelector(".fa-chevron-down");
  icon.style.transform = list.classList.contains("show")
    ? "rotate(180deg)"
    : "rotate(0deg)";
}

// =================== رندر کارت محصولات در گرید ===================
function renderProducts(productsToRender = null) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  // اگر لیستی فرستاده نشود، کل محصولات را از دیتابیس می‌گیریم
  let products = productsToRender;
  if (!products) {
    products = [];
    if (typeof storeData !== "undefined") {
      storeData.categories.forEach((cat) => {
        products = products.concat(cat.subcategories);
      });
    }
  }

  // ذخیره لیست فعلی در متغیر سراسری (فقط وقتی کل محصولات رندر میشه، نه صفحه اول)
  if (!productsToRender) {
    window.currentFilteredProducts = products;
  }

  if (products.length === 0) {
    grid.innerHTML = `<p class="no-products-msg">محصولی با این مشخصات یافت نشد.</p>`;
    return;
  }

  let html = "";
  products.forEach((prod) => {
    const primaryImg =
      prod.images && prod.images[0] ? prod.images[0] : "images/default.jpg";
    const secondaryImg =
      prod.images && prod.images[1] ? prod.images[1] : primaryImg;

    html += `
        <div class="product-card" data-wood="${escapeHtml(prod.woodType)}" data-finish="${escapeHtml(prod.finishType)}" data-price="${prod.price}">
            <a href="product.html?id=${encodeURIComponent(prod.id)}" class="product-card-link">
                <div class="product-image-container">
                    <img loading="lazy" src="${escapeHtml(primaryImg)}" alt="${escapeHtml(prod.name)}" class="primary-img">
                    <img loading="lazy" src="${escapeHtml(secondaryImg)}" alt="${escapeHtml(prod.name)} نمای دیگر" class="secondary-img">
                </div>
            </a>
            <div class="product-info">
                <a href="product.html?id=${encodeURIComponent(prod.id)}" class="product-card-link">
                    <h4 class="product-title">${escapeHtml(prod.name)}</h4>
                </a>
                <span class="product-price">${prod.price.toLocaleString()} تومان</span>
                <button class="add-to-cart-btn" data-id="${escapeHtml(prod.id)}">
                    <span>افزودن به سبد خرید</span>
                    <i class="fas fa-shopping-cart"></i>
                </button>
            </div>
        </div>
    `;
  });

  grid.innerHTML = html;
}

// =================== منطق جستجوی زنده (Live Search) ===================
function initSearch() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  const resultsPanel = document.getElementById("searchResultsPanel");

  // بستن پنل نتایج جستجو
  function closeSearchResults() {
    if (resultsPanel) {
      resultsPanel.innerHTML = "";
      resultsPanel.classList.remove("show");
    }
  }

  // باز کردن پنل نتایج جستجو با محتوای داده‌شده
  function openSearchResults(html) {
    if (!resultsPanel) return;
    resultsPanel.innerHTML = html;
    resultsPanel.classList.add("show");
  }

  // رندر پنل پیشنهادی نتایج (برای صفحات غیر از فروشگاه)
  function renderDropdownResults(query, products) {
    if (!query) {
      closeSearchResults();
      return;
    }

    if (products.length === 0) {
      openSearchResults(
        '<div class="search-no-results">محصولی مطابق جستجوی شما یافت نشد.</div>',
      );
      return;
    }

    let itemsHTML = "";
    // فقط ۶ نتیجه نزدیک‌تر نمایش داده می‌شود
    products.slice(0, 6).forEach((prod) => {
      const primaryImg =
        prod.images && prod.images[0] ? prod.images[0] : "images/default.jpg";
      itemsHTML += `
        <a href="index.html?q=${encodeURIComponent(query)}" class="search-result-item">
          <img src="${escapeHtml(primaryImg)}" alt="${escapeHtml(prod.name)}" />
          <div class="search-result-info">
            <span class="search-result-name">${escapeHtml(prod.name)}</span>
            <span class="search-result-price">${prod.price.toLocaleString()} تومان</span>
          </div>
        </a>
      `;
    });

    openSearchResults(`
      ${itemsHTML}
      <a href="index.html?q=${encodeURIComponent(query)}" class="search-view-all">
        مشاهده همه نتایج در فروشگاه <i class="fas fa-arrow-left"></i>
      </a>
    `);
  }

  // تابع اصلی انجام جستجو
  const performSearch = (initialQuery = null) => {
    const rawQuery = initialQuery !== null ? initialQuery : searchInput.value.trim();
    const query = rawQuery.toLowerCase();
    searchInput.value = rawQuery;

    const grid = document.getElementById("productsGrid");
    const hasGrid = !!grid;

    // اگر صفحه فروشگاه است (گرید محصولات وجود دارد)، نتایج در گرید نمایش داده می‌شود
    if (hasGrid) {
      resetPagination();

      let allProducts = [];
      if (typeof storeData !== "undefined") {
        storeData.categories.forEach((cat) => {
          allProducts = allProducts.concat(cat.subcategories);
        });
      }

      const filteredProducts = allProducts.filter((prod) => {
        const nameMatch = prod.name.toLowerCase().includes(query);
        const woodMatch =
          prod.woodType && prod.woodType.toLowerCase().includes(query);
        return nameMatch || woodMatch;
      });

      allProductsCache = filteredProducts;
      window.currentFilteredProducts = filteredProducts;

      const productsToShow = filteredProducts.slice(0, PRODUCTS_PER_PAGE);
      currentPage = 1;
      hasMoreProducts = filteredProducts.length > PRODUCTS_PER_PAGE;

      if (productsToShow.length > 0) {
        renderFilteredProducts(productsToShow);

        if (hasMoreProducts) {
          showLoadingIndicator();
          if (!window.loadMoreObserver) {
            initInfiniteScroll();
          }
        } else {
          hideLoadingIndicator();
          showEndOfProducts();
        }
      } else {
        renderFilteredProducts([]);
      }
    } else {
      // در صفحات دیگر، نتایج در پنل کشویی زیر نوار جستجو نمایش داده می‌شود
      const allProducts = getAllProducts();
      const filteredProducts = allProducts.filter((prod) => {
        const nameMatch = prod.name.toLowerCase().includes(query);
        const woodMatch =
          prod.woodType && prod.woodType.toLowerCase().includes(query);
        return nameMatch || woodMatch;
      });

      renderDropdownResults(rawQuery, filteredProducts);
    }
  };


  // جستجوی زنده به محض تایپ کردن
  searchInput.addEventListener("input", () => performSearch());

  // پشتیبانی از کلیک روی دکمه سرچ
  const searchBtn = document.querySelector(".search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      performSearch();
    });
  }

  // بستن پنل با کلیک بیرون از نوار جستجو
  document.addEventListener("click", (e) => {
    if (!resultsPanel) return;
    if (e.target.closest(".search-wrapper, .search-box")) return;
    closeSearchResults();
  });

  // بستن پنل با دکمه Escape
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSearchResults();
  });

  // اگر از صفحه دیگری با پارامتر ?q= آمده باشیم، جستجو خودکار انجام شود
  const urlParams = new URLSearchParams(window.location.search);
  const urlQuery = urlParams.get("q");
  if (urlQuery) {
    performSearch(urlQuery);
  }
}

// تابع کمکی برای رندر کردن محصولات فیلتر شده در گرید
function renderFilteredProducts(products) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #777;">محصولی با این مشخصات یافت نشد.</p>`;
    return;
  }

  let html = "";
  products.forEach((prod) => {
    const primaryImg =
      prod.images && prod.images[0] ? prod.images[0] : "images/default.jpg";
    const secondaryImg =
      prod.images && prod.images[1] ? prod.images[1] : primaryImg;

    // در تابع renderFilteredProducts (و هر تابع رندر دیگری که داری):
    html += `
    <div class="product-card">
        <a href="product.html?id=${encodeURIComponent(prod.id)}" class="product-card-link">
            <div class="product-image-container">
                <img loading="lazy" src="${escapeHtml(primaryImg)}" alt="${escapeHtml(prod.name)}" class="primary-img">
                <img loading="lazy" src="${escapeHtml(secondaryImg)}" alt="${escapeHtml(prod.name)} نمای دیگر" class="secondary-img">
            </div>
        </a>
        <div class="product-info">
            <a href="product.html?id=${encodeURIComponent(prod.id)}" class="product-card-link">
                <h4 class="product-title">${escapeHtml(prod.name)}</h4>
            </a>
            <span class="product-price">${prod.price.toLocaleString()} تومان</span>
            <!-- دقت کن: اینجا دیگر onclick نداریم، فقط data-id داریم -->
            <button class="add-to-cart-btn" data-id="${escapeHtml(prod.id)}">
                <span>افزودن به سبد</span>
                <i class="fas fa-shopping-cart"></i>
            </button>
        </div>
    </div>
`;
  });

  grid.innerHTML = html;
}

// =================== منطق فیلترهای پیشرفته (شامل کف و سقف قیمت) ===================
function initFilters() {
  const minPriceRange = document.getElementById("minPriceRange");
  const maxPriceRange = document.getElementById("maxPriceRange");
  const minPriceValue = document.getElementById("minPriceValue");
  const maxPriceValue = document.getElementById("maxPriceValue");
  const woodCheckboxes = document.querySelectorAll(".wood-filter");
  const finishCheckboxes = document.querySelectorAll(".finish-filter");

  if (!minPriceRange || !maxPriceRange) return;

  const applyFilters = () => {
    let minPrice = parseInt(minPriceRange.value);
    let maxPrice = parseInt(maxPriceRange.value);

    // جلوگیری از تداخل کف و سقف (اگر حداقل از حداکثر بیشتر شد)
    if (minPrice > maxPrice) {
      let temp = minPrice;
      minPrice = maxPrice;
      maxPrice = temp;
    }

    // نمایش مقادیر عددی به کاربر
    if (minPriceValue) minPriceValue.textContent = minPrice.toLocaleString();
    if (maxPriceValue) maxPriceValue.textContent = maxPrice.toLocaleString();

    // استخراج تمام محصولات از دیتابیس
    let allProducts = [];
    if (typeof storeData !== "undefined") {
      storeData.categories.forEach((cat) => {
        allProducts = allProducts.concat(cat.subcategories);
      });
    }

    // استخراج تیک‌خورده‌های جنس چوب و پوشش
    const selectedWoods = Array.from(woodCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);
    const selectedFinishes = Array.from(finishCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    // فیلتر کردن محصولات بر اساس بازه قیمت + چوب + پوشش
    const filteredProducts = allProducts.filter((prod) => {
      // ۱. فیلتر بازه قیمت (بین کف و سقف)
      const matchesPrice = prod.price >= minPrice && prod.price <= maxPrice;

      // ۲. فیلتر جنس چوب
      const matchesWood =
        selectedWoods.length === 0 || selectedWoods.includes(prod.woodType);

      // ۳. فیلتر نوع پوشش
      const matchesFinish =
        selectedFinishes.length === 0 ||
        selectedFinishes.includes(prod.finishType);

      return matchesPrice && matchesWood && matchesFinish;
    });

    // ریست صفحه‌بندی برای لود محصول جدید
    resetPagination();

    // ذخیره نتایج فیلتر شده در کش
    allProductsCache = filteredProducts;
    window.currentFilteredProducts = filteredProducts;

    // رندر فقط اولین صفحه نتایج
    const productsToShow = filteredProducts.slice(0, PRODUCTS_PER_PAGE);
    currentPage = 1;
    hasMoreProducts = filteredProducts.length > PRODUCTS_PER_PAGE;

    if (productsToShow.length > 0) {
      renderFilteredProducts(productsToShow);

      if (hasMoreProducts) {
        showLoadingIndicator();
        if (!window.loadMoreObserver) {
          initInfiniteScroll();
        }
      } else {
        hideLoadingIndicator();
        showEndOfProducts();
      }
    } else {
      renderFilteredProducts([]);
    }
  };

  // گوش دادن به تغییرات اسلایدرها و چک‌باکس‌ها
  minPriceRange.addEventListener("input", applyFilters);
  maxPriceRange.addEventListener("input", applyFilters);

  woodCheckboxes.forEach((cb) => cb.addEventListener("change", applyFilters));
  finishCheckboxes.forEach((cb) => cb.addEventListener("change", applyFilters));
}

// =================== کشوی فیلتر موبایل ===================
function initMobileFilterDrawer() {
  const filterBtn = document.getElementById("mobileFilterBtn");
  const overlay = document.getElementById("filterDrawerOverlay");
  const closeBtn = document.getElementById("filterDrawerClose");
  const body = document.getElementById("filterDrawerBody");
  const applyBtn = document.getElementById("applyFilterBtn");
  const resetBtn = document.getElementById("resetFilterBtn");

  // فقط در موبایل (دکمه فیلتر وجود دارد)
  if (!filterBtn || !overlay || !body) return;

  // کلون کردن فیلترها از سایدبار به کشو
  // نکته: آی‌دی‌های تکراری حذف می‌شوند تا getElementById دچار تداخل نشود
  const filtersSidebar = document.querySelector(".filters-sidebar");
  if (filtersSidebar) {
    body.innerHTML = "";
    const filterGroups = filtersSidebar.querySelectorAll(".filter-group");
    filterGroups.forEach((group) => {
      const clone = group.cloneNode(true);
      clone.querySelectorAll("[id]").forEach((el) => {
        el.removeAttribute("id");
      });
      body.appendChild(clone);
    });
  }

  // باز کردن کشو
  function openDrawer() {
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  // بستن کشو
  function closeDrawer() {
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }

  // اتصال رویدادهای فیلترهای داخل کشو (اسکوپ‌شده به بدنه کشو — نه کل صفحه)
  function wireDrawerFilters() {
    const drawerRanges = body.querySelectorAll('input[type="range"]');
    const minPriceRange = drawerRanges[0] || null;
    const maxPriceRange = drawerRanges[1] || null;
    const labels = body.querySelectorAll(".price-labels span span");
    const minPriceValue = labels[0] || null;
    const maxPriceValue = labels[1] || null;

    // اسلایدر قیمت
    if (minPriceRange && maxPriceRange) {
      minPriceRange.addEventListener("input", () => {
        let minPrice = parseInt(minPriceRange.value);
        let maxPrice = parseInt(maxPriceRange.value);
        if (minPrice > maxPrice) {
          minPriceRange.value = maxPrice;
          minPrice = maxPrice;
        }
        if (minPriceValue) minPriceValue.textContent = minPrice.toLocaleString();
      });
      maxPriceRange.addEventListener("input", () => {
        let minPrice = parseInt(minPriceRange.value);
        let maxPrice = parseInt(maxPriceRange.value);
        if (maxPrice < minPrice) {
          maxPriceRange.value = minPrice;
          maxPrice = minPrice;
        }
        if (maxPriceValue) maxPriceValue.textContent = maxPrice.toLocaleString();
      });
    }

    // دراپ‌داون‌های فیلتر داخل کشو (هماهنگ با تابع toggleFilterDropdown سایدبار — کلاس show)
    const toggles = body.querySelectorAll(".filter-dropdown-toggle");
    toggles.forEach((toggle) => {
      toggle.addEventListener("click", function () {
        if (typeof toggleFilterDropdown === "function") {
          toggleFilterDropdown(this);
        } else {
          this.classList.toggle("open");
          const list = this.nextElementSibling;
          if (list) list.classList.toggle("open");
        }
      });
    });
  }

  // اعمال فیلترها (خواندن مقادیر از داخل کشو + همگام‌سازی با سایدبار دسکتاپ)
  function applyDrawerFilters() {
    const drawerRanges = body.querySelectorAll('input[type="range"]');
    const minPriceRange = drawerRanges[0] || null;
    const maxPriceRange = drawerRanges[1] || null;
    const woodCheckboxes = body.querySelectorAll(".wood-filter");
    const finishCheckboxes = body.querySelectorAll(".finish-filter");

    const minPrice = minPriceRange ? parseInt(minPriceRange.value) : 0;
    const maxPrice = maxPriceRange ? parseInt(maxPriceRange.value) : 50000000;

    const selectedWood = [];
    woodCheckboxes.forEach((cb) => {
      if (cb.checked) selectedWood.push(cb.value);
    });

    const selectedFinish = [];
    finishCheckboxes.forEach((cb) => {
      if (cb.checked) selectedFinish.push(cb.value);
    });

    // فیلتر محصولات
    let products = [];
    if (typeof storeData !== "undefined") {
      storeData.categories.forEach((cat) => {
        products = products.concat(cat.subcategories);
      });
    }

    let filtered = products.filter((prod) => {
      const price = prod.price || 0;
      const woodMatch = selectedWood.length === 0 || selectedWood.includes(prod.woodType);
      const finishMatch = selectedFinish.length === 0 || selectedFinish.includes(prod.finishType);
      const priceMatch = price >= minPrice && price <= maxPrice;
      return woodMatch && finishMatch && priceMatch;
    });

    // همگام‌سازی انتخاب‌ها با سایدبار دسکتاپ (تا بعد از بستن کشو هم حفظ شود)
    const sidebarRanges = document.querySelectorAll(
      ".filters-sidebar input[type='range']",
    );
    if (sidebarRanges[0] && minPriceRange)
      sidebarRanges[0].value = minPriceRange.value;
    if (sidebarRanges[1] && maxPriceRange)
      sidebarRanges[1].value = maxPriceRange.value;
    const sidebarWood = document.querySelectorAll(
      ".filters-sidebar .wood-filter",
    );
    woodCheckboxes.forEach((cb, i) => {
      if (sidebarWood[i]) sidebarWood[i].checked = cb.checked;
    });
    const sidebarFinish = document.querySelectorAll(
      ".filters-sidebar .finish-filter",
    );
    finishCheckboxes.forEach((cb, i) => {
      if (sidebarFinish[i]) sidebarFinish[i].checked = cb.checked;
    });

    // ریست صفحه‌بندی و رندر فقط صفحه اول نتایج (هماهنگ با فیلتر دسکتاپ)
    resetPagination();
    allProductsCache = filtered;
    window.currentFilteredProducts = filtered;
    currentPage = 1;
    hasMoreProducts = filtered.length > PRODUCTS_PER_PAGE;

    if (filtered.length > 0) {
      renderFilteredProducts(filtered.slice(0, PRODUCTS_PER_PAGE));
      if (hasMoreProducts) {
        showLoadingIndicator();
        if (!window.loadMoreObserver) initInfiniteScroll();
      } else {
        hideLoadingIndicator();
        showEndOfProducts();
      }
    } else {
      renderFilteredProducts([]);
    }
    closeDrawer();
  }

  // پاک کردن فیلترها
  function resetDrawerFilters() {
    const drawerRanges = body.querySelectorAll('input[type="range"]');
    const minPriceRange = drawerRanges[0] || null;
    const maxPriceRange = drawerRanges[1] || null;
    const woodCheckboxes = body.querySelectorAll(".wood-filter");
    const finishCheckboxes = body.querySelectorAll(".finish-filter");

    if (minPriceRange) minPriceRange.value = 100000;
    if (maxPriceRange) maxPriceRange.value = 5000000;
    woodCheckboxes.forEach((cb) => (cb.checked = false));
    finishCheckboxes.forEach((cb) => (cb.checked = false));

    // ریست کامل: بازگشت به کل محصولات، صفحه اول (هماهنگ با لود اولیه)
    resetPagination();
    allProductsCache = [];
    window.currentFilteredProducts = [];
    currentPage = 1;
    const initialProducts = getProductsPaginated();
    window.currentFilteredProducts = allProductsCache.slice();
    renderProducts(initialProducts);
    if (hasMoreProducts) {
      hideLoadingIndicator();
      initInfiniteScroll();
    } else {
      hideLoadingIndicator();
      showEndOfProducts();
    }
    closeDrawer();
  }

  // اتصال رویدادها
  filterBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeDrawer();
  });
  if (applyBtn) applyBtn.addEventListener("click", applyDrawerFilters);
  if (resetBtn) resetBtn.addEventListener("click", resetDrawerFilters);

  wireDrawerFilters();
}

// =================== منطق مرتب‌سازی محصولات (Sorting) ===================
function initSorting() {
  const sortSelect = document.querySelector(".sort-select");
  if (!sortSelect) return;

  sortSelect.addEventListener("change", () => {
    const sortValue = sortSelect.value;

    // گرفتن محصولات فعلی (لیست فیلترشده یا کل محصولات)
    let productsToSort = window.currentFilteredProducts
      ? [...window.currentFilteredProducts]
      : getAllProducts();

    // اعمال منطق مرتب‌سازی
    switch (sortValue) {
      case "popularity": // محبوبیت
        productsToSort.sort(
          (a, b) => (b.popularity || 0) - (a.popularity || 0),
        );
        break;
      case "rating": // میانگین رتبه
        productsToSort.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "newest": // جدیدترین
        productsToSort.sort((a, b) => (b.id || "").localeCompare(a.id || ""));
        break;
      case "price-low": // قیمت کم به زیاد
        productsToSort.sort((a, b) => a.price - b.price);
        break;
      case "price-high": // قیمت زیاد به کم
        productsToSort.sort((a, b) => b.price - a.price);
        break;
      case "default": // پیش‌فرض (ترتیب اولیه)
      default:
        // نیاز به سورت خاصی نیست، همون ترتیب اولیه محصولات حفظ میشه
        break;
    }

    // ریست صفحه‌بندی برای لود محصول جدید
    resetPagination();

    // ذخیره نتایج مرتب‌شده در کش
    allProductsCache = productsToSort;
    window.currentFilteredProducts = productsToSort;

    // رندر فقط اولین صفحه
    const productsToShow = productsToSort.slice(0, PRODUCTS_PER_PAGE);
    currentPage = 1;
    hasMoreProducts = productsToSort.length > PRODUCTS_PER_PAGE;

    if (productsToShow.length > 0) {
      renderFilteredProducts(productsToShow);

      if (hasMoreProducts) {
        showLoadingIndicator();
        if (!window.loadMoreObserver) {
          initInfiniteScroll();
        }
      } else {
        hideLoadingIndicator();
        showEndOfProducts();
      }
    } else {
      renderFilteredProducts([]);
    }
  });
}

// تابع کمکی برای استخراج کل محصولات
function getAllProducts() {
  let allProducts = [];
  if (typeof storeData !== "undefined") {
    storeData.categories.forEach((cat) => {
      allProducts = allProducts.concat(cat.subcategories);
    });
  }
  return allProducts;
}

function handleAddToCartClick(buttonElement, productId) {
  console.log("Button clicked! Product ID:", productId);
  addToCart(productId);

  const span = buttonElement.querySelector("span");
  const icon = buttonElement.querySelector("i");
  const originalText = span.textContent;

  // تغییرات موقع کلیک (بدون بازنویسی کل innerHTML)
  buttonElement.style.background = "#27ae60";
  buttonElement.classList.add("is-success");
  span.textContent = "اضافه شد ✓";
  if (icon) icon.style.display = "none"; // موقع پیام موفقیت آیکون مخفی شه

  setTimeout(() => {
    buttonElement.style.background = "";
    buttonElement.classList.remove("is-success");
    span.textContent = originalText;
    if (icon) icon.style.display = ""; // برگشت آیکون
  }, 1200);
}

// خواندن امن سبد خرید از localStorage
let cart = JSON.parse(localStorage.getItem("choobsab_decor_cart")) || [];

// مدیریت باز و بسته شدن پنل کشویی
function initCartDrawer() {
  const cartDrawer = document.getElementById("cartDrawer");
  const cartOverlay = document.getElementById("cartOverlay");
  const cartIconLink = document.getElementById("cartIconLink");
  const closeCartBtn = document.getElementById("closeCartBtn");

  if (cartIconLink && cartDrawer && cartOverlay) {
    cartIconLink.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (cartDrawer.classList.contains("active")) {
        closeCartDrawer();
      } else {
        openCartDrawer();
      }
    });
  }

  if (closeCartBtn) {
    closeCartBtn.addEventListener("click", closeCartDrawer);
  }
  if (cartOverlay) {
    cartOverlay.addEventListener("click", closeCartDrawer);
  }

  // Event delegation برای دکمه‌های داخل پنل کشویی
  // فقط وقتی اجرا شود که پنل کشویی (cartDrawer) در صفحه وجود دارد (index.html)
  const cartItemsContainer = document.getElementById("cartItemsContainer");
  if (cartItemsContainer && cartDrawer) {
    cartItemsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const card = btn.closest(".cart-item-card");
      if (!card) return;
      const productId = card.dataset.id;

      const action = btn.dataset.action;
      if (action === "increase") {
        changeQuantity(productId, 1);
      } else if (action === "decrease") {
        changeQuantity(productId, -1);
      } else if (action === "remove") {
        removeFromCart(productId);
      }
    });
  }
}

function openCartDrawer() {
  const cartDrawer = document.getElementById("cartDrawer");
  const cartOverlay = document.getElementById("cartOverlay");

  renderCartDrawerItems();

  if (cartDrawer) cartDrawer.classList.add("active");
  if (cartOverlay) cartOverlay.classList.add("active");
}

function closeCartDrawer() {
  const cartDrawer = document.getElementById("cartDrawer");
  const cartOverlay = document.getElementById("cartOverlay");

  if (cartDrawer) cartDrawer.classList.remove("active");
  if (cartOverlay) cartOverlay.classList.remove("active");
}

// رندر کردن محصولات داخل پنل کشویی
function renderCartDrawerItems() {
  // فقط وقتی اجرا شود که پنل کشویی در صفحه وجود دارد (index.html)
  // تا محتوای صفحه cart.html خراب نشود
  if (!document.getElementById("cartDrawer")) return;

  const container = document.getElementById("cartItemsContainer");
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#7f8c8d; margin:20px 0;">سبد خرید شما خالی است.</p>`;
    return;
  }

  let html = "";
  cart.forEach((item) => {
    html += `
            <div class="cart-item-card" data-id="${escapeHtml(item.id)}">
                <img src="${escapeHtml(item.image || "images/default.jpg")}" alt="${escapeHtml(item.name)}" class="cart-item-img">
                <div class="cart-item-details">
                    <div class="cart-item-title">${escapeHtml(item.name)}</div>
                    <div class="cart-item-price">${(item.price * item.quantity).toLocaleString()} تومان</div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" data-action="decrease">-</button>
                        <span class="qty-display">${item.quantity}</span>
                        <button class="qty-btn" data-action="increase">+</button>
                        <button class="trash-btn" data-action="remove" title="حذف">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
  });

  container.innerHTML = html;
}

// توابع مدیریت سبد خرید (addToCart, removeFromCart, changeQuantity, updateCartUI, refreshAllCartViews)
// از فایل cartManager.js استفاده می‌کنند
