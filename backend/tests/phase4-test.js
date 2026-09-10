// تست کامل فاز ۴ — مدیریت محصولات و دسته‌بندی‌ها از پنل ادمین
const BASE = "http://localhost:5000";
let cookie = "";

async function req(method, path, body, withCsrf = true, withCookie = true) {
  const headers = {};
  if (withCsrf) headers["X-Requested-With"] = "XMLHttpRequest";
  if (body) headers["Content-Type"] = "application/json";
  if (withCookie && cookie) headers["Cookie"] = cookie;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  let json = null;
  try { json = await res.json(); } catch (e) {}
  return { status: res.status, json };
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("PASS |", name); }
  else { fail++; console.log("FAIL |", name, extra !== undefined ? JSON.stringify(extra) : ""); }
}

(async () => {
  // ۱) سلامت سرور
  let r = await req("GET", "/api/health", null, false, false);
  check("سرور روشن است (200)", r.status === 200, r.status);

  // ۲) API عمومی محصولات از دیتابیس سرو میشود
  r = await req("GET", "/api/products", null, false, false);
  const hasCats = r.json && r.json.data && Array.isArray(r.json.data.categories);
  check("GET /api/products از دیتابیس (200 + categories)", r.status === 200 && hasCats, r.status);
  const catCount = hasCats ? r.json.data.categories.length : 0;
  check("حداقل یک دسته‌بندی سید شده", catCount > 0, catCount);

  // ۳) فایل products.js به صورت پویا تولید میشود
  const pj = await fetch(BASE + "/products.js");
  const pjText = await pj.text();
  check(
    "products.js پویا (storeData از دیتابیس)",
    pj.status === 200 && pjText.includes("storeData") && pjText.includes("تولید پویا"),
    pj.status
  );

  // ۴) لیست محصولات ادمین بدون لاگین → 401
  r = await req("GET", "/api/admin/products", null, true, false);
  check("بدون لاگین، لیست محصولات ادمین رد میشود (401)", r.status === 401, r.status);

  // ۵) لاگین ادمین
  r = await req("POST", "/api/admin/login", { username: "admin", password: "admin123" });
  check("لاگین ادمین (200)", r.status === 200 && r.json.success === true, r.status);

  // ۶) لیست محصولات ادمین با لاگین
  r = await req("GET", "/api/admin/products");
  const adminProducts = r.json && r.json.products ? r.json.products : [];
  check("لیست محصولات ادمین (200 + آرایه)", r.status === 200 && Array.isArray(adminProducts), r.status);
  check("محصولات سید شده در پنل دیده میشوند", adminProducts.length > 0, adminProducts.length);

  // ۷) لیست دسته‌بندی‌های ادمین
  r = await req("GET", "/api/admin/categories");
  const cats = r.json && r.json.categories ? r.json.categories : [];
  check("لیست دسته‌بندی‌های ادمین (200)", r.status === 200 && Array.isArray(cats) && cats.length > 0, r.status);
  const anyCatId = cats.length ? cats[cats.length - 1].id : null;

  // ۸) ایجاد محصول جدید
  r = await req("POST", "/api/admin/products", {
    name: "کاسه تستی فاز ۴",
    categoryId: anyCatId,
    price: 123456,
    woodType: "گردو",
    finishType: "روغن کنجد",
    description: "محصول تستی برای فاز ۴",
    stock: 7,
    active: true,
  });
  check("ایجاد محصول جدید (201)", r.status === 201 && r.json.success === true && r.json.id, r.status);
  const newId = r.json && r.json.id;
  check("slug تولید شد", r.json && typeof r.json.slug === "string" && r.json.slug.length > 0, r.json && r.json.slug);


  // ۹) اعتبارسنجی: نام خالی → 400
  r = await req("POST", "/api/admin/products", { name: "", categoryId: anyCatId });
  check("محصول بدون نام رد میشود (400)", r.status === 400, r.status);

  // ۱۰) اعتبارسنجی: دسته‌بندی نامعتبر → 400
  r = await req("POST", "/api/admin/products", { name: "تست", categoryId: 999999 });
  check("دسته‌بندی نامعتبر رد میشود (400)", r.status === 400, r.status);

  // ۱۱) ایجاد محصول دوم برای تست slug تکراری
  r = await req("POST", "/api/admin/products", {
    name: "کاسه تستی فاز ۴",
    categoryId: anyCatId,
    slug: "duplicate-slug-test",
    price: 1,
  });
  const dupId = r.json && r.json.id;
  check("ایجاد محصول دوم (برای تست slug)", r.status === 201, r.status);

  // ۱۲) ویرایش محصول
  r = await req("PUT", "/api/admin/products/" + newId, {
    name: "کاسه تستی فاز ۴ (ویرایش‌شده)",
    price: 999999,
    stock: 3,
  });
  check("ویرایش محصول (200)", r.status === 200 && r.json.success === true, r.status);

  // ۱۳) تأیید تغییرات از API ادمین
  r = await req("GET", "/api/admin/products");
  const edited = r.json.products.find((p) => p.id === newId);
  check(
    "تغییرات ویرایش در دیتابیس اعمال شد",
    edited && edited.name === "کاسه تستی فاز ۴ (ویرایش‌شده)" && edited.price === 999999 && edited.stock === 3,
    edited && { name: edited.name, price: edited.price, stock: edited.stock }
  );

  // ۱۴) غیرفعال کردن محصول → از فروشگاه عمومی حذف میشود
  await req("PUT", "/api/admin/products/" + newId, { active: false });
  r = await req("GET", "/api/products", null, false, false);
  const allNames = JSON.stringify(r.json.data);
  check("محصول غیرفعال در فروشگاه عمومی نمایش داده نمیشود", !allNames.includes("ویرایش‌شده"));

  // ۱۵) حذف محصول
  r = await req("DELETE", "/api/admin/products/" + newId);
  check("حذف محصول (200)", r.status === 200 && r.json.success === true, r.status);

  // ۱۶) حذف دوباره همان محصول → 404
  r = await req("DELETE", "/api/admin/products/" + newId);
  check("حذف محصول ناموجود (404)", r.status === 404, r.status);

  // ۱۷) دسته‌بندی: ایجاد
  r = await req("POST", "/api/admin/categories", { name: "دسته تستی فاز ۴", icon: "🧪" });
  check("ایجاد دسته‌بندی (201)", r.status === 201 && r.json.success === true, r.status);
  r = await req("GET", "/api/admin/categories");
  const testCat = (r.json.categories || []).find((c) => c.name === "دسته تستی فاز ۴");
  check("دسته‌بندی تستی ایجاد شد", !!testCat);

  // ۱۸) دسته‌بندی دارای محصول حذف نمیشود (400)
  r = await req("POST", "/api/admin/products", {
    name: "محصول داخل دسته تستی",
    categoryId: testCat.id,
    price: 10,
  });
  const innerId = r.json && r.json.id;
  r = await req("DELETE", "/api/admin/categories/" + testCat.id);
  check("حذف دسته‌بندی دارای محصول رد میشود (400)", r.status === 400, r.status);

  // ۱۹) پس از حذف محصول، دسته‌بندی خالی حذف میشود
  await req("DELETE", "/api/admin/products/" + innerId);
  r = await req("DELETE", "/api/admin/categories/" + testCat.id);
  check("حذف دسته‌بندی خالی (200)", r.status === 200 && r.json.success === true, r.status);

  // ۲۰) پاکسازی محصول دوم تست slug
  if (dupId) {
    r = await req("DELETE", "/api/admin/products/" + dupId);
    check("پاکسازی محصول دوم تست (200)", r.status === 200, r.status);
  }

  // ۲۱) آپلود تصویر
  const TINY_PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  r = await req("POST", "/api/admin/upload", { dataUrl: TINY_PNG });
  check("آپلود تصویر (200 + مسیر)", r.status === 200 && r.json.success === true && !!r.json.path, r.json);
  if (r.json && r.json.path) {
    const img = await fetch(BASE + "/" + r.json.path);
    check("تصویر آپلودشده قابل دسترسی است", img.status === 200, img.status);
  }

  // ۲۲) آپلود فایل غیرتصویری رد میشود
  r = await req("POST", "/api/admin/upload", { dataUrl: "data:text/plain;base64,SGVsbG8=" });
  check("آپلود فایل غیرتصویری رد میشود (400)", r.status === 400, r.status);

  console.log("\n——— نتیجه فاز ۴ ———");
  console.log(`PASS: ${pass} | FAIL: ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
})();
