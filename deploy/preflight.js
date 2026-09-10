// ─────────────────────────────────────────
//  پیش‌بررسی و تهیه پشتیبان قبل از دیپلوی
//  اجرا:  node deploy/preflight.js
//  خروجی: یک فایل پشتیبان تمیز از دیتابیس در backups/
// ─────────────────────────────────────────
const path = require("path");
const fs = require("fs");

const BACKEND = path.join(__dirname, "..", "backend");
const PROJECT = path.join(__dirname, "..");
const dbPath = path.join(BACKEND, "choobsab.db");

// better-sqlite3 از node_modules هسته بک‌اند لود می‌شود (بدون فرض به cwd)
const Database = require(path.join(BACKEND, "node_modules", "better-sqlite3"));

let problems = [];

if (!fs.existsSync(dbPath)) {
  problems.push("فایل دیتابیس backend/choobsab.db پیدا نشد");
} else {
  const db = new Database(dbPath, { readonly: true });

  // ─── محصولات و بررسی سلامت عکس‌ها ───
  const rows = db.prepare("SELECT id, name, images FROM products").all();
  let checked = 0, missing = [];
  for (const r of rows) {
    let imgs = [];
    try { imgs = JSON.parse(r.images || "[]"); } catch (e) {}
    for (const img of imgs) {
      checked++;
      const p = path.join(PROJECT, img);
      if (!fs.existsSync(p)) missing.push(img);
    }
  }
  console.log(`📦 محصولات: ${rows.length}`);
  if (missing.length) {
    console.log(`🖼  تصاویر مفقود (${missing.length}): ${missing.join(", ")}`);
    problems.push("تصاویر مفقود: " + missing.join(", "));
  } else {
    console.log(`🖼  ارجاع‌های تصویر چک شده: ${checked} — همگی موجود ✅`);
  }

  // ─── تعداد رکوردها ───
  const orders = db.prepare("SELECT COUNT(*) c FROM orders").get().c;
  const custom = db.prepare("SELECT COUNT(*) c FROM custom_orders").get().c;
  const admins = db.prepare("SELECT COUNT(*) c FROM admins").get().c;
  const cats = db.prepare("SELECT COUNT(*) c FROM categories").get().c;
  console.log(`🧾 سفارش‌ها: ${orders} | سفارش‌های سفارشی: ${custom}`);
  console.log(`🗂  دسته‌بندی‌ها: ${cats} | مدیران: ${admins}`);
  db.close();
}

// ─── ساخت پشتیبان تمیز (Backup) برای انتقال به سرور ───
if (fs.existsSync(dbPath)) {
  const backupsDir = path.join(PROJECT, "backups");
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const out = path.join(backupsDir, `choobsab-${stamp}.db`);
  const db = new Database(dbPath);
  db.backup(out)
    .then(() => {
      console.log(`💾 پشتیبان ساخته شد: ${out} (${fs.statSync(out).size} بایت)`);
      console.log("⚠️  بعداً این فایل را روی سرور در backend/choobsab.db بریزید.");
      if (problems.length) {
        console.log("❌ مشکلات:"); problems.forEach((p) => console.log("   - " + p));
        process.exitCode = 1;
      } else {
        console.log("✅ هم‌چیز آماده دیپلوی است!");
      }
    })
    .catch((e) => { console.error("❌ ساخت پشتیبان ناموفق:", e.message); process.exit(1); });
} else if (problems.length) {
  problems.forEach((p) => console.log("   - " + p));
  process.exit(1);
}