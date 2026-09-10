// ===================================================
// منطق صفحه جزئیات محصول (product.html?id=...)
// اطلاعات هر محصول از products.js (storeData) خوانده می‌شود
// ===================================================

// لینک پیج اینستاگرام فروشگاه — در صورت نیاز این آدرس را عوض کنید
const INSTAGRAM_URL = "https://instagram.com/choobsab";

// ---------- ابزارهای کمکی ----------
function pdEsc(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[m]);
}

// هش ساده و قطعی (deterministic) برای تولید مشخصات ثابت هر محصول
function pdHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function faNum(n) {
  return n.toLocaleString("fa-IR");
}

// ---------- یافتن محصول و دسته‌بندی ----------
function findProductById(id) {
  // نکته: products.js با const تعریف شده و به window وصل نمی‌شود؛
  // پس باید مستقیم به storeData رجوع کنیم نه window.storeData
  if (typeof storeData === "undefined" || !storeData) return null;
  for (const cat of storeData.categories) {
    const prod = cat.subcategories.find((p) => p.id === id);
    if (prod) return { product: prod, category: cat };
  }
  return null;
}

// ---------- گالری: تصویری که روی آن هستیم بزرگ‌تر می‌شود ----------
function renderGallery(product) {
  const gallery = document.getElementById("productGallery");
  if (!gallery) return;

  const images =
    product.images && product.images.length
      ? product.images
      : ["images/default.jpg"];

  gallery.innerHTML = images
    .map(
      (src, i) => `
      <div class="gallery-item${i === 0 ? " active" : ""}" data-index="${i}">
        <img src="${pdEsc(src)}" alt="${pdEsc(product.name)} — تصویر ${faNum(i + 1)}" loading="lazy" />
      </div>
    `
    )
    .join("");

  // کلیک روی هر تصویر، آن را به حالت بزرگ (فعال) می‌برد
  gallery.querySelectorAll(".gallery-item").forEach((item) => {
    item.addEventListener("click", () => {
      gallery
        .querySelectorAll(".gallery-item")
        .forEach((el) => el.classList.remove("active"));
      item.classList.add("active");
    });
  });
}

// ---------- مشخصات قطعی محصول (ابعاد، وزن و ...) ----------
function buildSpecs(product, category) {
  const h = pdHash(product.id);

  const dimsByCat = {
    bowls: () => {
      const d = 18 + (h % 14); // قطر ۱۸ تا ۳۱ سانتی‌متر
      const depth = 5 + (h % 5);
      return { dims: `قطر ${faNum(d)} × ارتفاع ${faNum(depth)} سانتی‌متر`, key: "قطر" };
    },
    vases: () => {
      const hgt = 22 + (h % 18);
      const w = 10 + (h % 8);
      return { dims: `ارتفاع ${faNum(hgt)} × قطر دهانه ${faNum(w)} سانتی‌متر`, key: "ارتفاع" };
    },
    furniture: () => {
      const w = 60 + (h % 40);
      const d = 35 + (h % 20);
      return { dims: `${faNum(w)} × ${faNum(d)} × ارتفاع ${faNum(45 + (h % 25))} سانتی‌متر`, key: "طول" };
    },
    clocks: () => {
      const d = 30 + (h % 15);
      return { dims: `قطر ${faNum(d)} سانتی‌متر — ضخامت ${faNum(3 + (h % 3))} سانتی‌متر`, key: "قطر" };
    },
    accessories: () => {
      const w = 15 + (h % 15);
      return { dims: `${faNum(w)} × ${faNum(10 + (h % 8))} × ارتفاع ${faNum(6 + (h % 6))} سانتی‌متر`, key: "طول" };
    },
  };

  const dims = (dimsByCat[category.id] || dimsByCat.accessories)().dims;
  const weight = (0.4 + ((h % 40) / 10)).toFixed(1); // ۰٫۴ تا ۴٫۳ کیلوگرم

  return {
    dims,
    weight: `${faNum(weight)} کیلوگرم`,
    woodType: product.woodType || "چوب طبیعی",
    finishType: product.finishType || "مات",
    code: `CH-${String(pdHash(product.id) % 9000 + 1000)}`,
    madeIn: "ساخت کارگاه چوبساب دکور — کاملاً دست‌ساز",
  };
}

// ---------- توضیحات محصول (حدود ۱۰ خط) ----------
function renderDescription(product, category, specs) {
  const desc = document.getElementById("productDescription");
  if (!desc) return;

  const paragraphs = [
    `${product.name} یکی از محصولات دست‌ساز کارگاه چوبساب دکور است که با دقت و ظرافت تمام توسط استادکاران ما ساخته می‌شود. در تولید این محصول از چوب طبیعی و مرغوب ${specs.woodType} استفاده شده که پس از طی مراحل خشک‌کردن استاندارد، آماده‌ی ساخت شده است.`,
    `پرداخت نهایی این محصول از نوع ${specs.finishType} است؛ سطحی صیقلی و دلنشین که زیبایی طبیعی رگه‌های چوب را حفظ می‌کند و در عین حال در برابر رطوبت و لکه‌های روزمره مقاوم است.`,
    `هر قطعه از این محصول منحصربه‌فرد است؛ چون رنگ و نقش رگه‌های چوب طبیعی در هیچ دو قطعه‌ای یکسان نیست و همین ویژگی، محصول شما را به یک اثر یکتا تبدیل می‌کند. اختلاف جزئی در رنگ و بافت چوب، نشانه‌ی اصالت کالای دست‌ساز است.`,
    `این محصول برای استفاده‌ی روزمره و همچنین هدیه‌دادن در مناسبت‌های ویژه انتخابی عالی و ماندگار محسوب می‌شود و با دکورهای چوبی و کلاسیک به‌خوبی هماهنگ است.`,
    `برای نگهداری از این محصول چوبی، از قرار دادن آن در معرض مستقیم نور آفتاب یا نزدیک منابع حرارتی خودداری کنید. برای تمیزکردن کافی است سطح آن را با دستمال نم‌زده و کمی خشک پاک کنید.`,
    `استفاده از ماشین ظرفشویی و قرار دادن محصول در آب به مدت طولانی توصیه نمی‌شود؛ در صورت نیاز می‌توانید هر چند ماه یک‌بار با روغن مخصوص چوب، درخشندگی و عمر محصول را افزایش دهید.`,
    `ارسال این محصول توسط پست پیشتاز یا تیپاکس انجام می‌شود و پیش از ارسال، با بسته‌بندی ضدضربه و استاندارد، به‌صورت فوری تحویل شرکت حمل‌ونقل گردیده و کد رهگیری برای شما پیامک خواهد شد.`,
    `تمامی محصولات چوبساب دکور دارای تضمین کیفیت هستند و در صورت مشاهده‌ی هرگونه ایراد در ساخت یا آسیب حین حمل، پشتیبانی ما تا رضایت کامل شما کنارتان خواهد بود.`,
    `برای مشاهده‌ی تصاویر بیشتر و ویدیوی این محصول، به صفحه‌ی اینستاگرام ما سر بزنید یا با شماره‌ی پشتیبانی تماس بگیرید؛ کارشناسان ما پاسخگوی سوالات شما درباره‌ی سفارشی‌سازی این محصول نیز هستند.`,
  ];

  desc.innerHTML = paragraphs.map((p) => `<p>${pdEsc(p)}</p>`).join("");
}

// ---------- جدول مشخصات ----------
function renderSpecsTable(product, category, specs) {
  const table = document.getElementById("specsTable");
  if (!table) return;

  const rows = [
    ["کد محصول", specs.code],
    ["دسته‌بندی", category.name],
    ["جنس چوب", specs.woodType],
    ["نوع پرداخت", specs.finishType],
    ["ابعاد محصول", specs.dims],
    ["وزن محصول", specs.weight],
    ["تولیدکننده", specs.madeIn],
    ["بسته‌بندی", "جعبه ضدضربه مخصوص چوب‌آلات"],
    ["ارسال", "پست پیشتاز / تیپاکس — ارسال فوری"],
    ["گارانتی", "تضمین کیفیت و پشتیبانی از خرید"],
  ];

  table.innerHTML = rows
    .map(([k, v]) => `<tr><th>${pdEsc(k)}</th><td>${pdEsc(v)}</td></tr>`)
    .join("");
}

// ---------- وضعیت محصول یافت نشد ----------
function renderNotFound() {
  const main = document.querySelector(".product-page-main");
  if (!main) return;
  main.innerHTML = `
    <div class="product-not-found">
      <i class="fas fa-box-open"></i>
      <h2>محصول مورد نظر یافت نشد!</h2>
      <p>ممکن است این محصول حذف شده یا آدرس صفحه اشتباه باشد.</p>
      <a href="index.html">بازگشت به فروشگاه</a>
    </div>
  `;
}

// ---------- راه‌اندازی صفحه ----------
document.addEventListener("DOMContentLoaded", function () {
  // دکمه اینستاگرام
  const igBtn = document.getElementById("instagramBuyBtn");
  if (igBtn) {
    igBtn.href = INSTAGRAM_URL;
    igBtn.target = "_blank";
    igBtn.rel = "noopener";
  }

  const productId = new URLSearchParams(window.location.search).get("id");
  const found = productId ? findProductById(productId) : null;

  if (!found) {
    renderNotFound();
    return;
  }

  const { product, category } = found;
  const specs = buildSpecs(product, category);

  // عنوان صفحه و مسیر راهنما
  document.title = `${product.name} | فروشگاه محصولات چوبی چوبساب دکور`;
  const bcCat = document.getElementById("breadcrumbCategory");
  const bcProd = document.getElementById("breadcrumbProduct");
  if (bcCat) bcCat.textContent = category.name;
  if (bcProd) bcProd.textContent = product.name;

  // اطلاعات اصلی
  const titleEl = document.getElementById("productTitle");
  if (titleEl) titleEl.textContent = product.name;

  const codeEl = document.getElementById("productCodeValue");
  if (codeEl) codeEl.textContent = specs.code;

  const priceEl = document.getElementById("productPrice");
  if (priceEl) priceEl.textContent = product.price.toLocaleString("fa-IR");

  // گالری، توضیحات و جدول مشخصات
  renderGallery(product);
  renderDescription(product, category, specs);
  renderSpecsTable(product, category, specs);

  // دکمه افزودن به سبد خرید
  const addBtn = document.getElementById("addToCartBtn");
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      addToCart(product.id);
      // بازخورد بصری روی دکمه
      this.classList.add("is-added");
      const originalHTML = this.innerHTML;
      this.innerHTML = '<i class="fas fa-check"></i><span>به سبد اضافه شد</span>';
      setTimeout(() => {
        this.classList.remove("is-added");
        this.innerHTML = originalHTML;
      }, 1600);
      // باز کردن کشوی سبد خرید برای تأیید بهتر
      if (typeof openCartDrawer === "function") openCartDrawer();
    });
  }
});

