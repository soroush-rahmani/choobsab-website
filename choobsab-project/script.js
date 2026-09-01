// تابع باز و بسته کردن سایدبار با کلیک روی دکمه هدر
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  // کلاس open را اضافه یا حذف می‌کند
  sidebar.classList.toggle("open");
}

// =================== عملکرد دکمه بازگشت به بالا ===================
const scrollToTopBtn = document.getElementById("scrollToTopBtn");

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

// =================== بستن سایدبار با کلیک خارج از آن ===================
document.addEventListener("click", function (event) {
  const sidebar = document.getElementById("sidebar");
  const headerCategoryBtn = document.querySelector(".category-btn"); // دکمه داخل هدر

  // بررسی می‌کنیم که آیا سایدبار با کلیک باز شده است؟ (کلاس open دارد؟)
  if (sidebar.classList.contains("open")) {
    // اگر کلیکِ کاربر نه روی خود سایدبار بود و نه روی دکمه‌ای که آن را باز می‌کند
    if (
      !sidebar.contains(event.target) &&
      !headerCategoryBtn.contains(event.target)
    ) {
      // کلاس open را بردار تا سایدبار بسته شود
      sidebar.classList.remove("open");
    }
  }
});

// =================== افکت ظاهر شدن هدر با اسکرول به بالا در کل سایت ===================
const headerBottom = document.querySelector(".header-bottom");
const headerTop = document.querySelector(".header-top");
let lastScrollY = window.scrollY;

window.addEventListener("scroll", () => {
  const currentScrollY = window.scrollY;
  // ارتفاع بخش بالایی هدر رو میگیریم تا بدونیم کِی باید هدر پایینی رو فیکس کنیم
  const headerTopHeight = headerTop.offsetHeight;

  // ۱. اگر به اندازه‌ای اسکرول کردیم که بخش بالای هدر رد شد
  if (currentScrollY > headerTopHeight) {
    headerBottom.classList.add("fixed-nav"); // هدر پایینی رو به صفحه سنجاق کن

    // ۲. آیا داریم به سمت پایین میریم؟
    if (currentScrollY > lastScrollY) {
      headerBottom.classList.add("nav-hidden"); // هدر رو بکش بالا (مخفی کن)
    } else {
      // ۳. اگر حتی یکم به سمت بالا اسکرول کردیم
      headerBottom.classList.remove("nav-hidden"); // هدر رو نشون بده
    }
  } else {
    // ۴. اگر برگشتیم به بالاترین نقطه سایت (جایگاه اصلی هدر)
    headerBottom.classList.remove("fixed-nav");
    headerBottom.classList.remove("nav-hidden");
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
      subItemsHTML += `<li><a href="${sub.link}">${sub.name}</a></li>`;
    });

    // ساخت ساختار اصلی هر دسته‌بندی
    menuHTML += `
            <li class="has-submenu">
                <a href="#">
                    <i class="${cat.icon} menu-icon"></i>
                    <span class="menu-text">${cat.name}</span>
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

// اجرای تابع به محض لود شدن صفحه
document.addEventListener("DOMContentLoaded", () => {
  renderSidebarMenu();
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
function renderProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  let allProducts = [];
  if (typeof storeData !== "undefined") {
    storeData.categories.forEach((cat) => {
      allProducts = allProducts.concat(cat.subcategories);
    });
  }

  let html = "";
  allProducts.forEach((prod) => {
    // مدیریت هوشمند عکس‌ها (آرایه عکس‌ها)
    const primaryImg =
      prod.images && prod.images[0] ? prod.images[0] : "images/default.jpg";
    const secondaryImg =
      prod.images && prod.images[1] ? prod.images[1] : primaryImg;

    html += `
            <div class="product-card" data-wood="${prod.woodType}" data-finish="${prod.finishType}" data-price="${prod.price}">
                <div class="product-image-container">
                    <img src="${primaryImg}" alt="${prod.name}" class="primary-img">
                    <img src="${secondaryImg}" alt="${prod.name} نمای دیگر" class="secondary-img">
                </div>
                <div class="product-info">
                    <h4 class="product-title">${prod.name}</h4>
                    <span class="product-price">${prod.price.toLocaleString()} تومان</span>
                    <button class="add-to-cart-btn" onclick="addToCart('${prod.id}')">
                        <span> افزودن به سبد خرید</span>
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
        `;
  });

  grid.innerHTML = html;
}

// اجرای رندر محصولات هنگام بارگذاری صفحه
document.addEventListener("DOMContentLoaded", () => {
  renderProducts();
});
