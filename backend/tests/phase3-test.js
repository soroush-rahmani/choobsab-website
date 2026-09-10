// تست کامل فاز ۳ — جریان احراز هویت و امنیت پنل
const BASE = "http://localhost:5000";
let cookie = "";
const HDR = { "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/json" };

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
  // ۱) دسترسی بدون لاگین → 401
  let r = await req("GET", "/api/admin/stats", null, true, false);
  check("دسترسی بدون لاگین رد میشود (401)", r.status === 401, r.status);

  // ۲) بدون هدر CSRF → 403 (حتی با کوکی)
  r = await req("GET", "/api/admin/stats", null, false, false);
  check("بدون هدر CSRF رد میشود (403)", r.status === 403, r.status);

  // ۳) GET /api/orders عمومی دیگر نیست → حذف شده (404) یا محافظت‌شده (401)
  r = await req("GET", "/api/orders", null, true, false);
  check("GET /api/orders عمومی نیست (401/404)", r.status === 401 || r.status === 404, r.status);

  // ۴) لاگین با رمز غلط → 401
  r = await req("POST", "/api/admin/login", { username: "admin", password: "wrongpass" });
  check("لاگین با رمز غلط (401)", r.status === 401, r.status);

  // ۵) لاگین موفق → 200 + کوکی
  r = await req("POST", "/api/admin/login", { username: "admin", password: "admin123" });
  check("لاگین موفق (200)", r.status === 200 && r.json.success === true, r.status);
  check("کوکی HttpOnly تنظیم شد", cookie.includes("choobsab_admin_session"), cookie);

  // ۶) بررسی نشست
  r = await req("GET", "/api/admin/me");
  check("بررسی نشست (me)", r.status === 200 && r.json.username === "admin", r.json);

  // ۷) آمار داشبورد
  r = await req("GET", "/api/admin/stats");
  check("آمار داشبورد", r.status === 200 && r.json.success && typeof r.json.stats.totalOrders === "number", r.json);

  // ۸) لیست سفارشات فروشگاه
  r = await req("GET", "/api/admin/orders");
  check("لیست سفارشات فروشگاه", r.status === 200 && r.json.success && Array.isArray(r.json.orders), r.json ? r.json.count : null);

  // ۹) لیست سفارشات سفارشی
  r = await req("GET", "/api/admin/custom-orders");
  check("لیست سفارشات سفارشی", r.status === 200 && r.json.success && Array.isArray(r.json.customOrders), r.json ? r.json.count : null);

  // ۱۰) تغییر وضعیت نامعتبر → 400
  r = await req("PATCH", "/api/admin/orders/1/status", { status: "hacked" });
  check("وضعیت نامعتبر رد میشود (400)", r.status === 400, r.status);

  // ۱۱) اگر سفارشی وجود دارد، تغییر وضعیت معتبر
  r = await req("GET", "/api/admin/orders");
  if (r.json.orders && r.json.orders.length > 0) {
    const id = r.json.orders[0].id;
    const old = r.json.orders[0].status;
    const next = old === "confirmed" ? "pending" : "confirmed";
    let rr = await req("PATCH", "/api/admin/orders/" + id + "/status", { status: next });
    check("تغییر وضعیت معتبر سفارش", rr.status === 200 && rr.json.success, rr.json);
    // برگرداندن به حالت قبل
    await req("PATCH", "/api/admin/orders/" + id + "/status", { status: old });
  } else {
    console.log("SKIP | تغییر وضعیت (سفارشی وجود ندارد)");
  }

  // ۱۲) تغییر رمز: رمز فعلی غلط → 401
  r = await req("POST", "/api/admin/change-password", { currentPassword: "bad", newPassword: "newpass1234" });
  check("تغییر رمز با رمز فعلی غلط (401)", r.status === 401, r.status);

  // ۱۳) خروج
  r = await req("POST", "/api/admin/logout");
  check("خروج (logout)", r.status === 200 && r.json.success, r.json);

  // ۱۴) بعد از خروج، نشست باطل است → 401
  r = await req("GET", "/api/admin/me");
  check("نشست بعد از خروج باطل است (401)", r.status === 401, r.status);

  // ۱۵) صفحات پنل (HTML استاتیک) لود میشوند
  const loginPage = await fetch(BASE + "/admin/login.html");
  const panelPage = await fetch(BASE + "/admin/panel.html");
  const panelCss = await fetch(BASE + "/admin/panel.css");
  const panelJs = await fetch(BASE + "/admin/panel.js");
  check("صفحه ورود لود میشود", loginPage.status === 200, loginPage.status);
  check("صفحه پنل لود میشود", panelPage.status === 200, panelPage.status);
  check("استایل پنل لود میشود", panelCss.status === 200, panelCss.status);
  check("اسکریپت پنل لود میشود", panelJs.status === 200, panelJs.status);

  // ۱۶) Rate Limiting — ۵ تلاش ناموفق → قفل (429)
  cookie = "";
  let locked = false;
  for (let i = 0; i < 6; i++) {
    const rr = await req("POST", "/api/admin/login", { username: "admin", password: "wrong-wrong" });
    if (rr.status === 429) { locked = true; break; }
  }
  check("Rate Limiting بعد از ۵ تلاش ناموفق (429)", locked);

  console.log("\n===== نتیجه: " + pass + " موفق, " + fail + " ناموفق =====");
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error("TEST ERROR:", e.message); process.exit(1); });
