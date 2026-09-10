const Database = require("better-sqlite3");
const path = require("path");
const { hashPassword, isScryptHash } = require("./auth");

// فایل دیتابیس SQLite در پوشه‌ی backend
const db = new Database(path.join(__dirname, "choobsab.db"));

// ساختار جدول‌ها
db.exec(`
  -- جدول سفارشات (از سبد خرید / checkout)
  CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    orderId       TEXT UNIQUE,
    customerInfo  TEXT,
    items         TEXT,
    totalPrice    REAL,
    status        TEXT DEFAULT 'pending',
    postTrackingCode TEXT,
    createdAt     TEXT,
    updatedAt     TEXT
  );

  -- جدول سفارشات سفارشی (از فرم custom.html)
  CREATE TABLE IF NOT EXISTS custom_orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    requestId     TEXT UNIQUE,
    fullName      TEXT,
    phoneNumber   TEXT,
    email         TEXT,
    website       TEXT,
    subject       TEXT,
    woodType      TEXT,
    budget        TEXT,
    description   TEXT,
    imagePath     TEXT,
    status        TEXT DEFAULT 'new',
    createdAt     TEXT,
    updatedAt     TEXT
  );

  -- جدول ادمین‌ها (برای پنل مدیریت)
  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE,
    passwordHash  TEXT,
    createdAt     TEXT
  );

  -- جدول نشست‌های فعال ادمین (توکن‌های لاگین)
  -- توکن در دیتابیس ذخیره می‌شود تا خروج (logout) فوراً آن را باطل کند
  CREATE TABLE IF NOT EXISTS sessions (
    token       TEXT PRIMARY KEY,
    adminId     INTEGER NOT NULL,
    createdAt   TEXT,
    expiresAt   TEXT,
    ip          TEXT
  );

  -- جدول دسته‌بندی‌های محصولات (فاز ۴)
  CREATE TABLE IF NOT EXISTS categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    slug          TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    icon          TEXT DEFAULT '',
    createdAt     TEXT
  );

  -- جدول محصولات (فاز ۴)
  CREATE TABLE IF NOT EXISTS products (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    slug          TEXT UNIQUE NOT NULL,
    name          TEXT NOT NULL,
    category_id   INTEGER NOT NULL,
    price         REAL NOT NULL DEFAULT 0,
    wood_type     TEXT DEFAULT '',
    finish_type   TEXT DEFAULT '',
    images        TEXT DEFAULT '[]',
    description   TEXT DEFAULT '',
    stock         INTEGER DEFAULT 0,
    active        INTEGER DEFAULT 1,
    popularity    INTEGER DEFAULT 0,
    rating        REAL DEFAULT 0,
    createdAt     TEXT,
    updatedAt     TEXT
  );

  -- جدول کاربران سایت (ثبت‌نام با شماره موبایل + کد یک‌بارمصرف)
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    phone         TEXT UNIQUE NOT NULL,
    firstName     TEXT DEFAULT '',
    lastName      TEXT DEFAULT '',
    createdAt     TEXT,
    updatedAt     TEXT
  );

  -- جدول کدهای یک‌بارمصرف ورود (OTP)
  CREATE TABLE IF NOT EXISTS otp_codes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    phone         TEXT NOT NULL,
    code          TEXT NOT NULL,
    attempts      INTEGER DEFAULT 0,
    consumed      INTEGER DEFAULT 0,
    createdAt     TEXT,
    expiresAt     TEXT
  );

  -- جدول نشست‌های کاربران سایت (مستقل از نشست‌های ادمین)
  CREATE TABLE IF NOT EXISTS user_sessions (
    token       TEXT PRIMARY KEY,
    userId      INTEGER NOT NULL,
    createdAt   TEXT,
    expiresAt   TEXT,
    ip          TEXT
  );

  -- جدول آدرس‌های ذخیره‌شده کاربران (برای پر شدن خودکار فرم checkout)
  CREATE TABLE IF NOT EXISTS user_addresses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    userId        INTEGER NOT NULL,
    fullName      TEXT DEFAULT '',
    phone         TEXT DEFAULT '',
    postalCode    TEXT DEFAULT '',
    address       TEXT NOT NULL,
    note          TEXT DEFAULT '',
    createdAt     TEXT
  );

  -- شاخص‌گذاری برای سرعت جستجو
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_custom_status ON custom_orders(status);
  CREATE INDEX IF NOT EXISTS idx_custom_email ON custom_orders(email);
  CREATE INDEX IF NOT EXISTS idx_sessions_adminId ON sessions(adminId);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expiresAt);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
  CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
  CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
  CREATE INDEX IF NOT EXISTS idx_user_sessions_userId ON user_sessions(userId);
  CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expiresAt);
  CREATE INDEX IF NOT EXISTS idx_user_addresses_userId ON user_addresses(userId);
`);

// ─── سید اولیه محصولات و دسته‌بندی‌ها (فاز ۴) ───
// اگر جدول محصولات خالی بود، داده‌ها از فایل products.js قدیمی (Mock) خوانده می‌شوند
// تا فروشگاه همان محصولات قبلی را نمایش دهد و پنل ادمین از همان‌جا ادامه دهد.
function seedProductsFromStaticFile() {
  const fs = require("fs");
  const count = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
  if (count > 0) return; // فقط بار اول که جدول خالی است

  const srcPath = path.join(__dirname, "..", "products.js");
  if (!fs.existsSync(srcPath)) {
    console.log("⚠️ فایل products.js پیدا نشد — سید محصولات انجام نشد.");
    return;
  }

  let text = fs.readFileSync(srcPath, "utf8");
  // اجرای خودِ فایل JS در یک sandbox (چون فایل با سینتکس JS نوشته شده، نه JSON خالص)
  let data;
  try {
    const vm = require("vm");
    const sandbox = {};
    vm.createContext(sandbox);
    data = vm.runInContext(text + "\nstoreData;", sandbox);
  } catch (e) {
    console.log("⚠️ خطا در خواندن products.js — سید محصولات انجام نشد:", e.message);
    return;
  }
  if (!data || !Array.isArray(data.categories)) {
    console.log("⚠️ ساختار products.js نادرست است — سید محصولات انجام نشد.");
    return;
  }

  const ts = new Date().toISOString();
  const catInsert = db.prepare(
    "INSERT INTO categories (slug, name, icon, createdAt) VALUES (?, ?, ?, ?)"
  );
  const prodInsert = db.prepare(
    `INSERT INTO products (slug, name, category_id, price, wood_type, finish_type, images,
       description, stock, active, popularity, rating, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, '', 0, 1, 0, 0, ?, ?)`
  );

  const insertCat = db.transaction((categories) => {
    (categories || []).forEach((cat) => {
      const info = catInsert.run(
        String(cat.id || "").trim() || "cat-" + Date.now(),
        String(cat.name || "").trim(),
        String(cat.icon || "").trim(),
        ts
      );
      (cat.subcategories || []).forEach((p) => {
        prodInsert.run(
          String(p.id || "").trim() ||
            "p-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          String(p.name || "").trim(),
          info.lastInsertRowid,
          Number(p.price) || 0,
          String(p.woodType || "").trim(),
          String(p.finishType || "").trim(),
          JSON.stringify(Array.isArray(p.images) ? p.images : []),
          ts,
          ts
        );
      });
    });
  });

  insertCat(data.categories);
  console.log(
    `🌱 سید اولیه محصولات انجام شد: ${data.categories.length} دسته و ` +
      db.prepare("SELECT COUNT(*) AS c FROM products").get().c +
      " محصول."
  );
}
seedProductsFromStaticFile();

// ─── میگریشن: اضافه کردن ستون‌های جدید به دیتابیس‌های قبلی ───
// این تابع همیشه در هر بار شروع سرور اجرا می‌شود (مستقل از سید محصولات)
function runMigrations() {
  try {
    const cols = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
    if (!cols.includes("postTrackingCode")) {
      db.exec("ALTER TABLE orders ADD COLUMN postTrackingCode TEXT");
      console.log("✅ ستون postTrackingCode به جدول orders اضافه شد.");
    }
    if (!cols.includes("paymentAuthority")) {
      db.exec("ALTER TABLE orders ADD COLUMN paymentAuthority TEXT");
      console.log("✅ ستون paymentAuthority به جدول orders اضافه شد.");
    }
    if (!cols.includes("paymentRefId")) {
      db.exec("ALTER TABLE orders ADD COLUMN paymentRefId TEXT");
      console.log("✅ ستون paymentRefId به جدول orders اضافه شد.");
    }
    if (!cols.includes("userId")) {
      db.exec("ALTER TABLE orders ADD COLUMN userId INTEGER");
      console.log("✅ ستون userId به جدول orders اضافه شد.");
    }
    // ایندکس ستون userId — بعد از اطمینان از وجود ستون ساخته می‌شود
    db.exec("CREATE INDEX IF NOT EXISTS idx_orders_userId ON orders(userId);");
  } catch (e) {
    console.error("خطا در میگریشن:", e.message);
  }
}
runMigrations();

// ─── ادمین پیش‌فرض (admin / admin123) با هش امن scrypt ───
// اگر هش قدیمی/ناامن وجود داشته باشد، خودکار به scrypt ارتقا می‌یابد
function ensureDefaultAdmin() {
  const admin = db.prepare("SELECT * FROM admins WHERE username = ?").get("admin");
  if (!admin) {
    db.prepare("INSERT INTO admins (username, passwordHash, createdAt) VALUES (?, ?, ?)")
      .run("admin", hashPassword("admin123"), new Date().toISOString());
    console.log("👤 ادمین پیش‌فرض ساخته شد: admin / admin123 (هش scrypt)");
  } else if (!isScryptHash(admin.passwordHash)) {
    // مهاجرت امنیتی: هش ساده قدیمی → scrypt
    db.prepare("UPDATE admins SET passwordHash = ? WHERE id = ?")
      .run(hashPassword("admin123"), admin.id);
    console.log("🔐 هش رمز ادمین به scrypt ارتقا یافت (مهاجرت امنیتی).");
  }
}
ensureDefaultAdmin();

// ─── توابع مدیریت نشست‌ها (Sessions) ───
function createSession(token, adminId, ip, ttlMs) {
  const now = new Date();
  const expires = new Date(now.getTime() + ttlMs);
  db.prepare(
    "INSERT INTO sessions (token, adminId, createdAt, expiresAt, ip) VALUES (?, ?, ?, ?, ?)"
  ).run(token, adminId, now.toISOString(), expires.toISOString(), ip || "");
}

// دریافت نشست معتبر — در صورت منقضی شدن حذفش می‌کند و null برمی‌گرداند
function getValidSession(token) {
  if (!token || typeof token !== "string" || token.length < 32) return null;
  const row = db.prepare("SELECT * FROM sessions WHERE token = ?").get(token);
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  return row;
}

// تمدید نشست (Sliding Expiration) — هر درخواست معتبر، انقضا را تازه می‌کند
function renewSession(token, ttlMs) {
  db.prepare("UPDATE sessions SET expiresAt = ? WHERE token = ?")
    .run(new Date(Date.now() + ttlMs).toISOString(), token);
}

function deleteSession(token) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// پاکسازی نشست‌های منقضی — در هر بار شروع سرور و هر ۱۵ دقیقه
function deleteExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expiresAt < ?").run(new Date().toISOString());
}
deleteExpiredSessions();
setInterval(deleteExpiredSessions, 15 * 60 * 1000).unref();

// ─── توابع مدیریت نشست‌های کاربران سایت (مستقل از ادمین) ───
function createUserSession(token, userId, ip, ttlMs) {
  const now = new Date();
  const expires = new Date(now.getTime() + ttlMs);
  db.prepare(
    "INSERT INTO user_sessions (token, userId, createdAt, expiresAt, ip) VALUES (?, ?, ?, ?, ?)"
  ).run(token, userId, now.toISOString(), expires.toISOString(), ip || "");
}

// دریافت نشست معتبر کاربر — در صورت منقضی شدن حذفش می‌کند و null برمی‌گرداند
function getValidUserSession(token) {
  if (!token || typeof token !== "string" || token.length < 32) return null;
  const row = db.prepare("SELECT * FROM user_sessions WHERE token = ?").get(token);
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    db.prepare("DELETE FROM user_sessions WHERE token = ?").run(token);
    return null;
  }
  return row;
}

// تمدید نشست کاربر (Sliding Expiration)
function renewUserSession(token, ttlMs) {
  db.prepare("UPDATE user_sessions SET expiresAt = ? WHERE token = ?")
    .run(new Date(Date.now() + ttlMs).toISOString(), token);
}

function deleteUserSession(token) {
  db.prepare("DELETE FROM user_sessions WHERE token = ?").run(token);
}

// پاکسازی نشست‌های منقضی کاربران
function deleteExpiredUserSessions() {
  db.prepare("DELETE FROM user_sessions WHERE expiresAt < ?").run(new Date().toISOString());
}
deleteExpiredUserSessions();
setInterval(deleteExpiredUserSessions, 15 * 60 * 1000).unref();

// پاکسازی کدهای یک‌بارمصرف قدیمی (بیشتر از یک ساعت گذشته)
function deleteExpiredOtpCodes() {
  db.prepare("DELETE FROM otp_codes WHERE expiresAt < ?").run(
    new Date(Date.now() - 60 * 60 * 1000).toISOString()
  );
}
deleteExpiredOtpCodes();
setInterval(deleteExpiredOtpCodes, 30 * 60 * 1000).unref();

module.exports = db;
module.exports.createSession = createSession;
module.exports.getValidSession = getValidSession;
module.exports.renewSession = renewSession;
module.exports.deleteSession = deleteSession;
module.exports.createUserSession = createUserSession;
module.exports.getValidUserSession = getValidUserSession;
module.exports.renewUserSession = renewUserSession;
module.exports.deleteUserSession = deleteUserSession;

console.log("📦 دیتابیس SQLite آماده است (choobsab.db).");
