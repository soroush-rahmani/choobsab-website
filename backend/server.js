const path = require("path");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const db = require("./db");
const auth = require("./auth");

const app = express();
const PORT = process.env.PORT || 5000;

// پشت Nginx/CDN قرار می‌گیریم — تا req.protocol، https را از هدر X-Forwarded-Proto بفهمد
// (برای ساختن callback_url صحیح زرین‌پال لازم است)
app.set("trust proxy", 1);

// میدلورها (Middleware)
app.use(cors()); // اجازه ارتباط به فرانتاند
// پشتیبانی از دیتای JSON — سقف 10MB برای پشتیبانی از عکس base64 در سفارش سفارشی
app.use(express.json({ limit: "10mb" }));

// ─────────────────────────────────────────
//  ابزارهای امنیتی پنل مدیریت
// ─────────────────────────────────────────

// خواندن کوکی‌ها از هدر درخواست
function parseCookies(req) {
  const header = req.headers.cookie || "";
  const out = {};
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx > -1) {
      try {
        out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
      } catch {
        /* کوکی خراب — نادیده گرفته می‌شود */
      }
    }
  });
  return out;
}

// آدرس IP واقعی کلاینت
function clientIp(req) {
  return (
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    ""
  );
}

// میدل‌ور محافظت از تمام مسیرهای ادمین:
//  ۱) هدرهای امنیتی  ۲) دفاع CSRF  ۳) احراز هویت با نشست
function requireAdmin(req, res, next) {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate", // کش نشدن داده‌های حساس
    "X-Content-Type-Options": "nosniff",
  });
  // دفاع CSRF: هدر سفارشی — مرورگر در درخواست بین‌دامنه‌ای نمی‌تواند آن را جعل کند
  if ((req.headers[auth.CSRF_HEADER] || "") !== auth.CSRFHeaderValue) {
    return res.status(403).json({ success: false, message: "درخواست غیرمجاز است." });
  }
  const token = parseCookies(req)[auth.SESSION_COOKIE];
  const session = db.getValidSession(token);
  if (!session) {
    return res.status(401).json({ success: false, message: "ابتدا وارد حساب شوید." });
  }
  // تمدید خودکار نشست (Sliding Expiration) — تا وقتی فعال است، قطع نمی‌شود
  db.renewSession(token, auth.SESSION_TTL_MS);
  req.adminId = session.adminId;
  req.sessionToken = token;
  next();
}

// تنظیم کوکی نشست: HttpOnly (ضد XSS) + SameSite=Strict (ضد CSRF)
function setSessionCookie(res, token, maxAgeMs) {
  res.setHeader(
    "Set-Cookie",
    `${auth.SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${auth.SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
  );
}

// ─────────────────────────────────────────
//  داده‌ی محصولات فروشگاه (فاز ۴ — از دیتابیس)
// ─────────────────────────────────────────

// ساخت ساختار storeData با همان شکل قبلی products.js (سازگار با کل فروشگاه)
function getStoreData() {
  const cats = db.prepare("SELECT * FROM categories ORDER BY id ASC").all();
  const catsData = cats.map((c) => {
    const prods = db
      .prepare("SELECT * FROM products WHERE category_id = ? AND active = 1 ORDER BY id ASC")
      .all(c.id);
    return {
      id: c.slug,
      name: c.name,
      icon: c.icon || "",
      subcategories: prods.map((p) => {
        let images = [];
        try { images = JSON.parse(p.images || "[]"); } catch (e) { images = []; }
        return {
          id: p.slug,
          name: p.name,
          link: "#",
          price: p.price,
          woodType: p.wood_type || "",
          finishType: p.finish_type || "",
          images,
          popularity: p.popularity || 0,
          rating: p.rating || 0,
        };
      }),
    };
  });
  return { categories: catsData };
}

// فایل products.js اکنون به صورت پویا از دیتابیس تولید می‌شود؛
// یعنی فروشگاه بدون تغییر، محصولات واقعی دیتابیس را نمایش می‌دهد.
// این مسیر باید قبل از express.static ثبت شود تا اولویت داشته باشد.
app.get("/products.js", (req, res) => {
  res.set("Content-Type", "application/javascript; charset=utf-8");
  res.set("Cache-Control", "no-store");
  const data = getStoreData();
  res.send(
    "// داده‌ی محصولات چوب‌ساب — تولید پویا از دیتابیس (فاز ۴)\n" +
      "const storeData = " +
      JSON.stringify(data) +
      ";\n"
  );
});

// سرو فایلهای استاتیک فرانتاند از ریشه پروه (یک پوشه بالاتر از backend/)
app.use(express.static(path.join(__dirname, "..")));

// صفحه اصلی — index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// سفارشات در دیتابیس SQLite ذخیره میشوند (فایل choobsab.db)
// در فاز ۳ میتوانیم pagination و فیلتر به API اضافه کنیم

// API ۱: تست سلامت سرور
app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "سرور چوبساب روشن و فعال است 🚀" });
});

// API عمومی: دریافت محصولات و دسته‌بندی‌ها (مشتریان / فرانتاند)
app.get("/api/products", (req, res) => {
  res.json({ success: true, data: getStoreData() });
});

// ─────────────────────────────────────────
//  حساب کاربری مشتریان (ورود با کد یک‌بارمصرف)
// ─────────────────────────────────────────
const USER_SESSION_COOKIE = "choobsab_user_session";
const USER_SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // اعتبار نشست کاربر: ۱۴ روز
const OTP_TTL_MS = 2 * 60 * 1000; // اعتبار کد یک‌بارمصرف: ۲ دقیقه
const OTP_MAX_ATTEMPTS = 5; // حداکثر تلاش نامعتبر برای هر کد

// تبدیل ارقام فارسی/عربی به انگلیسی
function toEnglishDigits(str) {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return String(str || "").replace(/[۰-۹٠-٩]/g, (ch) => {
    const i = fa.indexOf(ch);
    if (i > -1) return String(i);
    return String(ar.indexOf(ch));
  });
}

// نرمال‌سازی شماره موبایل ایران به فرمت 09xxxxxxxxx
function normalizePhone(input) {
  let s = toEnglishDigits(input).replace(/\D/g, "");
  if (s.length === 11 && s.startsWith("09")) return s;
  if (s.length === 10 && s.startsWith("9")) return "0" + s;
  if (s.length === 12 && s.startsWith("989")) return "0" + s.slice(2);
  if (s.length === 13 && s.startsWith("0989")) return "0" + s.slice(3);
  if (s.length === 14 && s.startsWith("00989")) return "0" + s.slice(4);
  return "";
}

// ارسال پیامک کد یک‌بارمصرف
// ⚠️ تا زمان اتصال سرویس پیامک (کاوه‌نگار / ملی‌پیامک و ...) کد در کنسول سرور چاپ می‌شود
//    و در حالت توسعه در پاسخ API هم برگردانده می‌شود تا بتوان تست کرد.
function sendOtpSms(phone, code) {
  console.log(`📱 [SMS] کد یک‌بارمصرف ورود برای ${phone}: ${code}`);
}

// تنظیم کوکی نشست کاربر: HttpOnly (ضد XSS) + SameSite=Strict (ضد CSRF)
function setUserSessionCookie(res, token, maxAgeMs) {
  res.setHeader(
    "Set-Cookie",
    `${USER_SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}`
  );
}

function clearUserSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${USER_SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
  );
}

// دریافت کاربر جاری از روی کوکی نشست (در صورت وجود)
function getCurrentUser(req) {
  const token = parseCookies(req)[USER_SESSION_COOKIE];
  const session = db.getValidUserSession(token);
  if (!session) return null;
  db.renewUserSession(token, USER_SESSION_TTL_MS);
  const user = db
    .prepare("SELECT id, phone, firstName, lastName, createdAt FROM users WHERE id = ?")
    .get(session.userId);
  return user || null;
}

// میدل‌ور الزام ورود کاربر (برای مسیرهای حساس مثل ثبت سفارش)
function requireUser(req, res, next) {
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "برای ادامه، ابتدا وارد حساب کاربری خود شوید.",
      requireLogin: true,
    });
  }
  req.user = user;
  next();
}

// API: درخواست کد یک‌بارمصرف (ثبت‌نام / ورود)
app.post("/api/auth/request-otp", (req, res) => {
  try {
    const b = req.body || {};
    const firstName = String(b.firstName || "").trim();
    const lastName = String(b.lastName || "").trim();
    const phone = normalizePhone(b.phone);

    if (firstName.length < 2 || lastName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "لطفاً نام و نام خانوادگی را کامل وارد کنید.",
      });
    }
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "شماره موبایل معتبر نیست. (مثال: 09123456789)",
      });
    }

    // محدودیت ارسال: حداکثر ۳ کد در هر ۱۰ دقیقه برای هر شماره
    const recentCount = db
      .prepare(
        "SELECT COUNT(*) AS c FROM otp_codes WHERE phone = ? AND createdAt > ?"
      )
      .get(phone, new Date(Date.now() - 10 * 60 * 1000).toISOString()).c;
    if (recentCount >= 3) {
      return res.status(429).json({
        success: false,
        message: "تعداد درخواست‌های کد بیش از حد مجاز است. چند دقیقه بعد دوباره تلاش کنید.",
      });
    }

    // کد ۵ رقمی تصادفی
    const code = String(Math.floor(10000 + Math.random() * 90000));
    const now = new Date();
    db.prepare(
      "INSERT INTO otp_codes (phone, code, attempts, consumed, createdAt, expiresAt) VALUES (?, ?, 0, 0, ?, ?)"
    ).run(phone, code, now.toISOString(), new Date(now.getTime() + OTP_TTL_MS).toISOString());

    sendOtpSms(phone, code);

    res.json({
      success: true,
      message: "کد تأیید به شماره شما ارسال شد.",
      // ⚠️ فقط برای تست (تا وقتی سرویس پیامک وصل نشده):
      devCode: code,
    });
  } catch (e) {
    console.error("خطا در درخواست کد یک‌بارمصرف:", e);
    res.status(500).json({ success: false, message: "خطایی در سمت سرور رخ داد." });
  }
});

// API: بررسی کد یک‌بارمصرف و ورود / ثبت‌نام
app.post("/api/auth/verify-otp", (req, res) => {
  try {
    const b = req.body || {};
    const phone = normalizePhone(b.phone);
    const code = toEnglishDigits(String(b.code || "")).replace(/\D/g, "");
    const firstName = String(b.firstName || "").trim();
    const lastName = String(b.lastName || "").trim();

    if (!phone) {
      return res.status(400).json({ success: false, message: "شماره موبایل معتبر نیست." });
    }

    // آخرین کد مصرف‌نشده‌ی این شماره
    const otp = db
      .prepare(
        "SELECT * FROM otp_codes WHERE phone = ? AND consumed = 0 ORDER BY id DESC LIMIT 1"
      )
      .get(phone);
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "کد فعالی برای این شماره پیدا نشد. دوباره درخواست کد بدهید.",
      });
    }

    // منقضی شده؟
    if (new Date(otp.expiresAt).getTime() < Date.now()) {
      db.prepare("UPDATE otp_codes SET consumed = 1 WHERE id = ?").run(otp.id);
      return res.status(400).json({
        success: false,
        message: "کد تأیید منقضی شده است. دوباره درخواست کد بدهید.",
      });
    }

    // محدودیت تلاش نامعتبر
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      db.prepare("UPDATE otp_codes SET consumed = 1 WHERE id = ?").run(otp.id);
      return res.status(400).json({
        success: false,
        message: "تعداد تلاش‌های نامعتبر زیاد است. دوباره درخواست کد بدهید.",
      });
    }

    // کد اشتباه؟
    if (!code || code !== otp.code) {
      db.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?").run(otp.id);
      return res.status(400).json({
        success: false,
        message: "کد وارد شده اشتباه است. دوباره تلاش کنید.",
      });
    }

    // کد صحیح است — یک‌بارمصرف می‌شود
    db.prepare("UPDATE otp_codes SET consumed = 1 WHERE id = ?").run(otp.id);

    // ساخت یا به‌روزرسانی کاربر
    let user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
    const ts = new Date().toISOString();
    if (!user) {
      const info = db
        .prepare(
          "INSERT INTO users (phone, firstName, lastName, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)"
        )
        .run(phone, firstName, lastName, ts, ts);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      console.log("👤 کاربر جدید ثبت‌نام شد:", phone, "|", firstName, lastName);
    } else if (firstName && lastName) {
      // کاربر قبلاً ثبت‌نام کرده — نام جدید (که با تأیید شماره وارد کرده) ذخیره می‌شود
      db.prepare("UPDATE users SET firstName = ?, lastName = ?, updatedAt = ? WHERE id = ?")
        .run(firstName, lastName, ts, user.id);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
    }

    // ساخت نشست و تنظیم کوکی
    const token = auth.generateToken();
    db.createUserSession(token, user.id, clientIp(req), USER_SESSION_TTL_MS);
    setUserSessionCookie(res, token, USER_SESSION_TTL_MS);

    res.json({
      success: true,
      message: `خوش آمدید ${user.firstName}!`,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (e) {
    console.error("خطا در بررسی کد یک‌بارمصرف:", e);
    res.status(500).json({ success: false, message: "خطایی در سمت سرور رخ داد." });
  }
});

// API: اطلاعات کاربر جاری (برای تشخیص وضعیت ورود در فرانتاند)
app.get("/api/auth/me", (req, res) => {
  const user = getCurrentUser(req);
  res.json({ success: true, user: user || null });
});

// ─────────────────────────────────────────
//  آدرس‌های ذخیره‌شده کاربر (پروفایل → چک‌اوت)
//  کاربر می‌تواند آدرس را یک بار در پروفایل ذخیره کند و بعداً
//  در فرم checkout بدون تایپ مجدد، همان را انتخاب کند.
// ─────────────────────────────────────────

// لیست آدرس‌های کاربر جاری
app.get("/api/user/addresses", requireUser, (req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT id, fullName, phone, postalCode, address, note, createdAt FROM user_addresses WHERE userId = ? ORDER BY id DESC"
      )
      .all(req.user.id);
    res.json({ success: true, addresses: rows });
  } catch (e) {
    console.error("خطا در خواندن آدرس‌ها:", e);
    res.status(500).json({ success: false, message: "خطا در خواندن آدرس‌ها." });
  }
});

// افزودن آدرس جدید
app.post("/api/user/addresses", requireUser, (req, res) => {
  try {
    const b = req.body || {};
    const address = String(b.address || "").trim();
    if (!address) {
      return res.status(400).json({ success: false, message: "آدرس الزامی است." });
    }
    const info = db
      .prepare(
        "INSERT INTO user_addresses (userId, fullName, phone, postalCode, address, note, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        req.user.id,
        String(b.fullName || "").trim().slice(0, 200),
        String(b.phone || "").trim().slice(0, 20),
        String(b.postalCode || "").trim().slice(0, 20),
        address.slice(0, 800),
        String(b.note || "").trim().slice(0, 500),
        new Date().toISOString()
      );
    const row = db
      .prepare(
        "SELECT id, fullName, phone, postalCode, address, note, createdAt FROM user_addresses WHERE id = ?"
      )
      .get(info.lastInsertRowid);
    res.status(201).json({ success: true, message: "آدرس ذخیره شد.", address: row });
  } catch (e) {
    console.error("خطا در ذخیره‌سازی آدرس:", e);
    res.status(500).json({ success: false, message: "خطا در ذخیره‌سازی آدرس." });
  }
});

// حذف آدرس
app.delete("/api/user/addresses/:id", requireUser, (req, res) => {
  try {
    db.prepare("DELETE FROM user_addresses WHERE id = ? AND userId = ?").run(
      req.params.id,
      req.user.id
    );
    res.json({ success: true, message: "آدرس حذف شد." });
  } catch (e) {
    console.error("خطا در حذف آدرس:", e);
    res.status(500).json({ success: false, message: "خطا در حذف آدرس." });
  }
});

// API: خروج از حساب کاربری
app.post("/api/auth/logout", (req, res) => {
  const token = parseCookies(req)[USER_SESSION_COOKIE];
  if (token) db.deleteUserSession(token);
  clearUserSessionCookie(res);
  res.json({ success: true, message: "از حساب خود خارج شدید." });
});

// API: سفارش‌های کاربر جاری — فقط سفارش‌های خودِ کاربر واردشده
app.get("/api/user/orders", requireUser, (req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT id, orderId, customerInfo, items, totalPrice, status, postTrackingCode, createdAt FROM orders WHERE userId = ? ORDER BY id DESC"
      )
      .all(req.user.id);

    const orders = rows.map((row) => {
      let customerInfo = {};
      let items = [];
      try { customerInfo = JSON.parse(row.customerInfo || "{}"); } catch (e) { customerInfo = {}; }
      try { items = JSON.parse(row.items || "[]"); } catch (e) { items = []; }
      return {
        orderId: row.orderId,
        status: row.status,
        totalPrice: row.totalPrice,
        postTrackingCode: row.postTrackingCode || "",
        createdAt: row.createdAt,
        customerInfo,
        itemCount: items.reduce((sum, it) => sum + (Number(it.quantity) || 1), 0),
        items: items.map((it) => ({
          id: it.id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          image: it.image || "",
        })),
      };
    });

    res.json({ success: true, orders });
  } catch (e) {
    console.error("خطا در دریافت سفارش‌های کاربر:", e);
    res.status(500).json({ success: false, message: "خطا در دریافت سفارش‌ها." });
  }
});

// API ۲: ثبت سفارش جدید (از checkout.html فراخوانی میشود)
// ⚠️ ثبت سفارش فقط برای کاربران واردشده مجاز است (حساب کاربری با کد یک‌بارمصرف)
app.post("/api/orders", requireUser, (req, res) => {
  try {
    const { customerInfo, items, totalPrice } = req.body;

    // اعتبار سنجی اولیه دادههای ورودی
    if (
      !customerInfo ||
      !customerInfo.fullName ||
      !customerInfo.phone ||
      !customerInfo.address
    ) {
      return res.status(400).json({
        success: false,
        message:
          "لطفا تمامی اطلاعات ضروری (نام شماره تماس و آدرس) را وارد کنید.",
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "سبد خرید شما خالی است.",
      });
    }

    // ساخت شیء سفارش جدید
    const newOrder = {
      orderId: "CS-" + Date.now().toString().slice(-6), // تولید کد پیگیری نمونه
      customerInfo,
      items,
      totalPrice,
      status: "pending", // وضعیت سفارش: در انتظار پرداخت / بررسی
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // ذخیره سفارش در دیتابیس SQLite
    const insertStmt = db.prepare(`
      INSERT INTO orders (orderId, customerInfo, items, totalPrice, status, userId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(
      newOrder.orderId,
      JSON.stringify(newOrder.customerInfo),
      JSON.stringify(newOrder.items),
      newOrder.totalPrice,
      newOrder.status,
      req.user.id,
      newOrder.createdAt,
      newOrder.updatedAt,
    );

    console.log("📌 سفارش جدید ثبت شد:", newOrder);

    // پاسخ به فرانتاند
    return res.status(201).json({
      success: true,
      message: "سفارش شما با موفقیت ثبت شد.",
      orderId: newOrder.orderId,
      order: newOrder,
    });
  } catch (error) {
    console.error("خطا در ثبت سفارش:", error);
    return res.status(500).json({
      success: false,
      message: "خطایی در سمت سرور رخ داده است.",
    });
  }
});

// ─────────────────────────────────────────
//  درگاه پرداخت زرین‌پال
//  تنظیمات از فایل backend/.env خوانده می‌شود (نمونه: .env.example)
//  تا وقتی .env نباشد یا مقادیر را نداشته باشد، سندباکس فعال است
// ─────────────────────────────────────────

// لودر ساده فایل .env — بدون نیاز به پکیج اضافه
(function loadEnv() {
  try {
    const lines = fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* فایل .env وجود ندارد — از مقادیر پیش‌فرض (سندباکس) استفاده می‌شود */
  }
})();

const ZARINPAL_PLACEHOLDER_MERCHANT = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const ZARINPAL = {
  // حالت سندباکس پیش‌فرض — برای حالت واقعی در backend/.env:  ZARINPAL_SANDBOX=false
  sandbox: (process.env.ZARINPAL_SANDBOX || "true") !== "false",
  // سندباکس: هر UUID دلخواه — حالت واقعی: کد مرچنت از پنل زرین‌پال در .env
  merchant: process.env.ZARINPAL_MERCHANT || ZARINPAL_PLACEHOLDER_MERCHANT,
  testMode: false, // ✅ سندباکس واقعی زرین‌پال فعال است (Authority با حرف S شروع می‌شود)
  get apiUrl() {
    return this.sandbox
      ? "https://sandbox.zarinpal.com/pg/v4/payment"
      : "https://api.zarinpal.com/pg/v4/payment";
  },
  get payBase() {
    return this.sandbox
      ? "https://sandbox.zarinpal.com/pg/StartPay/"
      : "https://www.zarinpal.com/pg/StartPay/";
  },
};

// API ۳: درخواست پرداخت از زرین‌پال
app.post("/api/payment/request", async (req, res) => {
  try {
    const { orderId, customerInfo } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "شناسه سفارش الزامی است." });
    }

    // پیدا کردن سفارش در دیتابیس
    const order = db.prepare("SELECT * FROM orders WHERE orderId = ?").get(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "سفارش پیدا نشد." });
    }

    // ⚠️ مبلغ در دیتابیس/چک‌اوت به «تومان» است ولی زرین‌پال «ریال» می‌خواهد
    // بنابراین یک صفر اضافه می‌شود (×۱۰) — در verify هم باید دقیقاً همین مبلغ ارسال شود
    const amount = Math.round(order.totalPrice) * 10;
    const callbackUrl = `${req.protocol}://${req.get("host")}/payment-callback.html?orderId=${orderId}`;

    // ─── حالت تست محلی (بدون زرین‌پال) ───
    if (ZARINPAL.testMode) {
      const testAuthority = "TEST-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
      db.prepare("UPDATE orders SET paymentAuthority = ? WHERE orderId = ?").run(testAuthority, orderId);
      console.log("🧪 حالت تست: پرداخت شبیه‌سازی شد برای سفارش", orderId);
      return res.json({
        success: true,
        authority: testAuthority,
        url: callbackUrl + "&Authority=" + testAuthority + "&Status=OK",
      });
    }

    // ─── حالت واقعی زرین‌پال (API نسخه ۴) ───
    const paymentRequest = await fetch(ZARINPAL.apiUrl + "/request.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: ZARINPAL.merchant,
        amount: amount,
        description: `سفارش ${orderId} — چوب‌ساب`,
        callback_url: callbackUrl,
        email: customerInfo?.email || "",
        mobile: customerInfo?.phone || "",
      }),
    });

    const paymentText = await paymentRequest.text();
    let paymentData;
    try {
      paymentData = JSON.parse(paymentText);
    } catch (e) {
      console.error("پاسخ غیر JSON از زرین‌پال:", paymentText.slice(0, 300));
      return res.status(500).json({ success: false, message: "پاسخ نامعتبر از درگاه پرداخت." });
    }

    const data = paymentData.data;
    const hasError = paymentData.errors && Object.keys(paymentData.errors).length > 0;

    if (data && data.code === 100 && data.authority && !hasError) {
      // ذخیره Authority در دیتابیس
      db.prepare("UPDATE orders SET paymentAuthority = ? WHERE orderId = ?").run(data.authority, orderId);
      res.json({
        success: true,
        authority: data.authority,
        url: ZARINPAL.payBase + data.authority,
      });
    } else {
      console.error("خطای زرین‌پال:", JSON.stringify(paymentData));
      const errCode = hasError ? JSON.stringify(paymentData.errors) : (data ? data.code : "?");
      res.status(400).json({
        success: false,
        message: `خطا در ایجاد درخواست پرداخت (کد: ${errCode})`,
      });
    }
  } catch (error) {
    console.error("خطا در درخواست پرداخت:", error);
    res.status(500).json({ success: false, message: "خطا در ارتباط با درگاه پرداخت." });
  }
});

// API ۴: تأیید پرداخت از زرین‌پال (بعد از بازگشت مشتری)
app.get("/api/payment/verify", async (req, res) => {
  try {
    const { Authority, Status, OrderId } = req.query;
    if (!Authority) {
      return res.status(400).json({ success: false, message: "پارامترهای ناقص." });
    }

    if (Status !== "OK") {
      return res.json({ success: false, message: "پرداخت توسط کاربر لغو شد." });
    }

    // پیدا کردن سفارش — اول با orderId، اگر نبود با Authority (بازگشت واقعی زرین‌پال فقط Authority می‌فرستد)
    let order = OrderId ? db.prepare("SELECT * FROM orders WHERE orderId = ?").get(OrderId) : null;
    if (!order) {
      order = db.prepare("SELECT * FROM orders WHERE paymentAuthority = ?").get(Authority);
    }
    if (!order) {
      return res.status(404).json({ success: false, message: "سفارش پیدا نشد." });
    }
    const oid = order.orderId;

    // ─── حالت تست محلی ───
    if (ZARINPAL.testMode && String(Authority).startsWith("TEST-")) {
      const testRefId = "REF-" + Date.now().toString().slice(-8);
      db.prepare("UPDATE orders SET status = 'paid', paymentRefId = ?, updatedAt = ? WHERE orderId = ?").run(
        testRefId,
        new Date().toISOString(),
        oid
      );
      console.log("🧪 حالت تست: پرداخت تأیید شد برای سفارش", oid);
      return res.json({
        success: true,
        message: "پرداخت با موفقیت انجام شد.",
        refId: testRefId,
        orderId: oid,
      });
    }

    // ─── حالت واقعی زرین‌پال (API نسخه ۴) ───
    const verifyRequest = await fetch(ZARINPAL.apiUrl + "/verify.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: ZARINPAL.merchant,
        // همان مبلغ request (تومان × ۱۰ = ریال) — باید با مبلغ درخواست پرداخت یکی باشد
        amount: Math.round(order.totalPrice) * 10,
        authority: Authority,
      }),
    });

    const verifyText = await verifyRequest.text();
    let verifyData;
    try {
      verifyData = JSON.parse(verifyText);
    } catch (e) {
      console.error("پاسخ غیر JSON از زرین‌پال در تأیید:", verifyText.slice(0, 300));
      return res.status(500).json({ success: false, message: "پاسخ نامعتبر از درگاه پرداخت." });
    }

    const vdata = verifyData.data;
    const vhasError = verifyData.errors && Object.keys(verifyData.errors).length > 0;

    if (vdata && (vdata.code === 100 || vdata.code === 101) && !vhasError) {
      // پرداخت موفق (۱۰۰) یا قبلاً تأیید شده (۱۰۱) — به‌روزرسانی وضعیت سفارش
      db.prepare("UPDATE orders SET status = 'paid', paymentRefId = ?, updatedAt = ? WHERE orderId = ?").run(
        String(vdata.ref_id || ""),
        new Date().toISOString(),
        oid
      );
      res.json({
        success: true,
        message: vdata.code === 100 ? "پرداخت با موفقیت انجام شد." : "این پرداخت قبلاً تأیید شده است.",
        refId: vdata.ref_id,
        orderId: oid,
      });
    } else {
      console.error("خطای تأیید زرین‌پال:", JSON.stringify(verifyData));
      const errCode = vhasError ? JSON.stringify(verifyData.errors) : (vdata ? vdata.code : "?");
      res.status(400).json({
        success: false,
        message: `تأیید پرداخت ناموفق (کد: ${errCode})`,
      });
    }
  } catch (error) {
    console.error("خطا در تأیید پرداخت:", error);
    res.status(500).json({ success: false, message: "خطا در تأیید پرداخت." });
  }
});

// ⚠️ امنیت: لیست سفارشات عمومی نیست — اطلاعات شخصی مشتری‌ها را شامل می‌شود.
// این داده فقط از طریق /api/admin/orders (نیازمند ورود ادمین) در دیتابیس است.

// API ۵: ثبت سفارش محصول سفارشی (از custom.html)
app.post("/api/custom-order", (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      email,
      website,
      subject,
      woodType,
      budget,
      description,
      imageData, // عکس به صورت base64 Data URL (اختیاری)
    } = req.body;

    // اعتبار سنجی فیلدهای ضروری
    if (!fullName || !phoneNumber || !email || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: "لطفا تمامی فیلدهای ضروری را پر کنید.",
      });
    }

    const requestId = "CUS-" + Date.now().toString().slice(-6);
    // مسیر دسترسی به عکس اگر آپلود شده باشد (base64 Data URL)
    const imagePath = imageData ? imageData : null;
    const ts = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO custom_orders
        (requestId, fullName, phoneNumber, email, website, subject,
         woodType, budget, description, imagePath, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)
    `);
    stmt.run(
      requestId,
      fullName,
      phoneNumber,
      email,
      website || "",
      subject,
      woodType || "فرقی ندارد",
      budget || "",
      description,
      imagePath,
      ts,
      ts,
    );

    console.log(
      "📌 سفارش سفارشی جدید:",
      requestId,
      "|",
      fullName,
      "|",
      phoneNumber,
    );

    return res.status(201).json({
      success: true,
      message: "سفارش شما با موفقیت ثبت شد!",
      requestId,
    });
  } catch (error) {
    console.error("خطا در ثبت سفارش سفارشی:", error);
    return res.status(500).json({
      success: false,
      message: "خطایی در سرور رخ داد. لطفا دوباره تلاش کنید.",
    });
  }
});

// ─────────────────────────────────────────
//  API های پنل مدیریت (فاز ۳)
// ─────────────────────────────────────────

// ورود ادمین — با Rate Limiting و پیام خطای عمومی (ضد User Enumeration)
app.post("/api/admin/login", (req, res) => {
  const ip = clientIp(req);

  // محدودیت تلاش: ۵ بار در ۱۵ دقیقه برای هر IP
  const rl = auth.isRateLimited(ip);
  if (rl.limited) {
    return res.status(429).json({
      success: false,
      message: `تلاش‌های ناموفق بیش از حد مجاز است. لطفا ${Math.ceil(rl.retryAfterSec / 60)} دقیقه دیگر دوباره امتحان کنید.`,
    });
  }

  const { username, password } = req.body || {};
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !username.trim() ||
    !password
  ) {
    return res
      .status(400)
      .json({ success: false, message: "نام کاربری و رمز عبور الزامی است." });
  }

  const admin = db
    .prepare("SELECT * FROM admins WHERE username = ?")
    .get(username.trim().slice(0, 50));

  // پیام خطای یکسان — مهاجم نمی‌فهمد یوزر وجود دارد یا رمز غلط بوده
  if (!admin || !auth.verifyPassword(password, admin.passwordHash)) {
    auth.recordFailedAttempt(ip);
    console.log(
      "⚠️ تلاش ورود ناموفق — IP:",
      ip,
      "| یوزرنیم:",
      username ? username.slice(0, 30) : "(خالی)"
    );
    return res
      .status(401)
      .json({ success: false, message: "نام کاربری یا رمز عبور اشتباه است." });
  }

  // موفق — ساخت نشست امن
  auth.clearAttempts(ip);
  const token = auth.generateToken();
  db.createSession(token, admin.id, ip, auth.SESSION_TTL_MS);
  setSessionCookie(res, token, auth.SESSION_TTL_MS);
  console.log("✅ ورود موفق ادمین:", admin.username, "— IP:", ip);
  return res.json({
    success: true,
    message: "خوش آمدید!",
    username: admin.username,
  });
});

// بررسی نشست فعلی (پنل با این مطمئن می‌شود کاربر لاگین است)
app.get("/api/admin/me", requireAdmin, (req, res) => {
  const admin = db
    .prepare("SELECT username FROM admins WHERE id = ?")
    .get(req.adminId);
  if (!admin) {
    db.deleteSession(req.sessionToken);
    return res.status(401).json({ success: false, message: "نشست نامعتبر است." });
  }
  return res.json({ success: true, username: admin.username });
});

// خروج — توکن فوراً از دیتابیس حذف و باطل می‌شود
app.post("/api/admin/logout", (req, res) => {
  const token = parseCookies(req)[auth.SESSION_COOKIE];
  if (token) db.deleteSession(token);
  clearSessionCookie(res);
  res.json({ success: true, message: "با موفقیت خارج شدید." });
});

// تغییر رمز عبور — با تایید رمز فعلی + ابطال سایر نشست‌ها
app.post("/api/admin/change-password", requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const admin = db
    .prepare("SELECT * FROM admins WHERE id = ?")
    .get(req.adminId);
  if (
    !admin ||
    !auth.verifyPassword(String(currentPassword || ""), admin.passwordHash)
  ) {
    return res
      .status(401)
      .json({ success: false, message: "رمز عبور فعلی اشتباه است." });
  }
  const np = String(newPassword || "");
  if (np.length < 8) {
    return res.status(400).json({
      success: false,
      message: "رمز جدید باید حداقل ۸ کاراکتر باشد.",
    });
  }
  db.prepare("UPDATE admins SET passwordHash = ? WHERE id = ?").run(
    auth.hashPassword(np),
    admin.id
  );
  // امنیت: تمام نشست‌های دیگر این ادمین باطل می‌شوند (نشست فعلی می‌ماند)
  const others = db
    .prepare("SELECT token FROM sessions WHERE adminId = ? AND token != ?")
    .all(admin.id, req.sessionToken);
  others.forEach((r) => db.deleteSession(r.token));
  console.log("🔐 رمز عبور ادمین تغییر یافت.");
  return res.json({ success: true, message: "رمز عبور با موفقیت تغییر کرد." });
});

// آمار داشبورد
app.get("/api/admin/stats", requireAdmin, (req, res) => {
  const stats = {
    totalOrders: db.prepare("SELECT COUNT(*) AS c FROM orders").get().c,
    pendingOrders: db
      .prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'")
      .get().c,
    paidOrders: db
      .prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'paid'")
      .get().c,
        totalCustom: db.prepare("SELECT COUNT(*) AS c FROM custom_orders").get().c,
    newCustom: db
      .prepare("SELECT COUNT(*) AS c FROM custom_orders WHERE status = 'new'")
      .get().c,
    totalUsers: db.prepare("SELECT COUNT(*) AS c FROM users").get().c,
    revenue: db
      .prepare(
        "SELECT COALESCE(SUM(totalPrice), 0) AS s FROM orders WHERE status IN ('paid','confirmed','shipped','delivered')"
      )
      .get().s,
  };
    res.json({ success: true, stats });
});

// لیست کاربران ثبت‌نامی — شامل تعداد و مجموع سفارشات هر کاربر — فقط ادمین
app.get("/api/admin/users", requireAdmin, (req, res) => {
  const rows = db.prepare(
    `SELECT u.id, u.phone, u.firstName, u.lastName, u.createdAt,
            COUNT(o.id) AS orderCount,
            COALESCE(SUM(o.totalPrice), 0) AS totalSpent
     FROM users u
     LEFT JOIN orders o ON o.userId = u.id
     GROUP BY u.id
     ORDER BY u.createdAt DESC`
  ).all();
  const users = rows.map((r) => ({
    id: r.id,
    phone: r.phone,
    firstName: r.firstName,
    lastName: r.lastName,
    createdAt: r.createdAt,
    orderCount: r.orderCount,
    totalSpent: r.totalSpent,
  }));
  res.json({ success: true, count: users.length, users });
});

// لیست سفارشات فروشگاه (فیلتر وضعیت اختیاری) — فقط ادمین
app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const rows = status
    ? db
        .prepare("SELECT * FROM orders WHERE status = ? ORDER BY createdAt DESC")
        .all(status)
    : db.prepare("SELECT * FROM orders ORDER BY createdAt DESC").all();
  const orders = rows.map((row) => ({
    ...row,
    customerInfo: JSON.parse(row.customerInfo || "{}"),
    items: JSON.parse(row.items || "[]"),
  }));
  res.json({ success: true, count: orders.length, orders });
});

// لیست سفارشات سفارشی — فقط ادمین
app.get("/api/admin/custom-orders", requireAdmin, (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const rows = status
    ? db
        .prepare(
          "SELECT * FROM custom_orders WHERE status = ? ORDER BY createdAt DESC"
        )
        .all(status)
    : db
        .prepare("SELECT * FROM custom_orders ORDER BY createdAt DESC")
        .all();
  res.json({ success: true, count: rows.length, customOrders: rows });
});

// تغییر وضعیت سفارش فروشگاه — فقط مقادیر مجاز پذیرفته می‌شوند
app.patch("/api/admin/orders/:id/status", requireAdmin, (req, res) => {
  const allowed = ["pending", "paid", "confirmed", "shipped", "delivered", "cancelled"];
  const newStatus = String((req.body || {}).status || "");
  if (!allowed.includes(newStatus)) {
    return res
      .status(400)
      .json({ success: false, message: "وضعیت نامعتبر است." });
  }
  const result = db
    .prepare("UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?")
    .run(newStatus, new Date().toISOString(), req.params.id);
  if (result.changes === 0) {
    return res
      .status(404)
      .json({ success: false, message: "سفارش پیدا نشد." });
  }
  res.json({ success: true, message: "وضعیت سفارش به‌روزرسانی شد." });
});

// ثبت کد رهگیری اداره پست برای سفارش
app.patch("/api/admin/orders/:id/post-tracking", requireAdmin, (req, res) => {
  const code = String((req.body || {}).postTrackingCode || "").trim();
  if (!code) {
    return res.status(400).json({ success: false, message: "کد رهگیری پست الزامی است." });
  }
  const result = db
    .prepare("UPDATE orders SET postTrackingCode = ?, updatedAt = ? WHERE id = ?")
    .run(code, new Date().toISOString(), req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ success: false, message: "سفارش پیدا نشد." });
  }
  // ─── جای‌گذاری برای ارسال پیامک به مشتری ───
  // هنگامی که کد رهگیری پست ثبت شد، می‌توان پیامک اطلاع‌رسانی فرستاد.
  // نیاز به یک سامانه پیامکی (مثل کاوه‌نگار، ملی پیامک، و...) دارید:
  //
  // const order = db.prepare("SELECT customerInfo FROM orders WHERE id = ?").get(req.params.id);
  // const customer = JSON.parse(order.customerInfo || "{}");
  // const phone = customer.phone;
  // if (phone) {
  //   sendSMS(phone, `سفارش شما ارسال شد. کد رهگیری پست: ${code}`);
  // }
  //
  // تابع sendSMS باید با API سامانه پیامکی انتخابی پیاده‌سازی شود.
  console.log("📮 کد رهگیری پست ثبت شد:", code, "| سفارش:", req.params.id);
  res.json({ success: true, message: "کد رهگیری پست ثبت شد.", postTrackingCode: code });
});

// تغییر وضعیت سفارش سفارشی — فقط مقادیر مجاز
app.patch("/api/admin/custom-orders/:id/status", requireAdmin, (req, res) => {
  const allowed = ["new", "in-progress", "done", "cancelled"];
  const newStatus = String((req.body || {}).status || "");
  if (!allowed.includes(newStatus)) {
    return res
      .status(400)
      .json({ success: false, message: "وضعیت نامعتبر است." });
  }
  const result = db
    .prepare("UPDATE custom_orders SET status = ?, updatedAt = ? WHERE id = ?")
    .run(newStatus, new Date().toISOString(), req.params.id);
  if (result.changes === 0) {
    return res
      .status(404)
      .json({ success: false, message: "سفارش سفارشی پیدا نشد." });
  }
  res.json({ success: true, message: "وضعیت سفارش سفارشی به‌روزرسانی شد." });
});

// ─────────────────────────────────────────
//  API های مدیریت محصولات و دسته‌بندی‌ها (فاز ۴)
// ─────────────────────────────────────────

// کمکی: تولید slug فارسی/لاتین یکتا از نام محصول
function makeSlug(str, fallback) {
  const s = String(str || "")
    .trim()
    .toLowerCase()
    // فاصله‌ها → خط تیره و حذف کاراکترهای ناایمن (فارسی/انگلیسی مجاز)
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "");
  return s || fallback || "p-" + Date.now().toString(36);
}

// لیست تمام محصولات (برای پنل مدیریت) — همراه اطلاعات دسته‌بندی
app.get("/api/admin/products", requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, c.name AS categoryName, c.slug AS categorySlug
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       ORDER BY p.id DESC`
    )
    .all();
  const products = rows.map((r) => ({
    ...r,
    images: (() => {
      try { return JSON.parse(r.images || "[]"); } catch (e) { return []; }
    })(),
  }));
  res.json({ success: true, count: products.length, products });
});

// ایجاد محصول جدید
app.post("/api/admin/products", requireAdmin, (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "نام محصول الزامی است." });
    }
    const categoryId = Number(b.categoryId);
    const cat = db.prepare("SELECT id FROM categories WHERE id = ?").get(categoryId);
    if (!cat) {
      return res.status(400).json({ success: false, message: "دسته‌بندی معتبر نیست." });
    }
    let slug = makeSlug(b.slug, makeSlug(name));
    // اطمینان از یکتا بودن slug
    if (db.prepare("SELECT id FROM products WHERE slug = ?").get(slug)) {
      slug = slug + "-" + Date.now().toString().slice(-5);
    }
    const ts = new Date().toISOString();
    const images = Array.isArray(b.images)
      ? b.images.map(String).filter(Boolean).slice(0, 10)
      : [];
    const info = db
      .prepare(
        `INSERT INTO products
          (slug, name, category_id, price, wood_type, finish_type, images, description,
           stock, active, popularity, rating, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        slug,
        name,
        categoryId,
        Number(b.price) || 0,
        String(b.woodType || "").trim(),
        String(b.finishType || "").trim(),
        JSON.stringify(images),
        String(b.description || "").trim(),
        Number(b.stock) || 0,
        b.active === false || b.active === "0" ? 0 : 1,
        Number(b.popularity) || 0,
        Number(b.rating) || 0,
        ts,
        ts
      );
    console.log("📦 محصول جدید:", slug, "|", name);
    res.status(201).json({
      success: true,
      message: "محصول با موفقیت افزوده شد.",
      id: info.lastInsertRowid,
      slug,
    });
  } catch (e) {
    console.error("خطا در ایجاد محصول:", e);
    res.status(500).json({ success: false, message: "خطایی در سمت سرور رخ داد." });
  }
});
// ویرایش محصول
app.put("/api/admin/products/:id", requireAdmin, (req, res) => {
  try {
    const b = req.body || {};
    const existing = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "محصول پیدا نشد." });
    }
    const name = String(b.name !== undefined ? b.name : existing.name).trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "نام محصول الزامی است." });
    }
    const categoryId = Number(b.categoryId !== undefined ? b.categoryId : existing.category_id);
    const cat = db.prepare("SELECT id FROM categories WHERE id = ?").get(categoryId);
    if (!cat) {
      return res.status(400).json({ success: false, message: "دسته‌بندی معتبر نیست." });
    }
    let slug = makeSlug(b.slug !== undefined ? b.slug : existing.slug);
    // اگر slug با رکورد دیگری تداخل داشت، خودکار یکتا کنیم
    const clash = db
      .prepare("SELECT id FROM products WHERE slug = ? AND id != ?")
      .get(slug, existing.id);
    if (clash) slug = slug + "-" + Date.now().toString().slice(-5);

    const images = Array.isArray(b.images)
      ? b.images.map(String).filter(Boolean).slice(0, 10)
      : (() => { try { return JSON.parse(existing.images || "[]"); } catch (e) { return []; } })();

    db.prepare(
      `UPDATE products SET slug=?, name=?, category_id=?, price=?, wood_type=?,
        finish_type=?, images=?, description=?, stock=?, active=?, popularity=?,
        rating=?, updatedAt=? WHERE id=?`
    ).run(
      slug,
      name,
      categoryId,
      Number(b.price !== undefined ? b.price : existing.price) || 0,
      String(b.woodType !== undefined ? b.woodType : existing.wood_type).trim(),
      String(b.finishType !== undefined ? b.finishType : existing.finish_type).trim(),
      JSON.stringify(images),
      String(b.description !== undefined ? b.description : existing.description).trim(),
      Number(b.stock !== undefined ? b.stock : existing.stock) || 0,
      b.active === undefined
        ? existing.active
        : (b.active === false || b.active === "0" ? 0 : 1),
      Number(b.popularity !== undefined ? b.popularity : existing.popularity) || 0,
      Number(b.rating !== undefined ? b.rating : existing.rating) || 0,
      new Date().toISOString(),
      existing.id
    );
    console.log("✏️ محصول ویرایش شد:", existing.id, "|", name);
    res.json({ success: true, message: "محصول با موفقیت ویرایش شد.", id: existing.id, slug });
  } catch (e) {
    console.error("خطا در ویرایش محصول:", e);
    res.status(500).json({ success: false, message: "خطایی در سمت سرور رخ داد." });
  }
});

// حذف محصول
app.delete("/api/admin/products/:id", requireAdmin, (req, res) => {
  const info = db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  if (info.changes === 0) {
    return res.status(404).json({ success: false, message: "محصول پیدا نشد." });
  }
  console.log("🗑 محصول حذف شد:", req.params.id);
  res.json({ success: true, message: "محصول حذف شد." });
});

// ─── دسته‌بندی‌ها ───

// لیست دسته‌بندی‌ها با تعداد محصولات هر کدام
app.get("/api/admin/categories", requireAdmin, (req, res) => {
  const categories = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS productCount
       FROM categories c ORDER BY c.id ASC`
    )
    .all();
  res.json({ success: true, categories });
});

// ایجاد دسته‌بندی جدید
app.post("/api/admin/categories", requireAdmin, (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "نام دسته‌بندی الزامی است." });
    }
    let slug = makeSlug(b.slug, makeSlug(name));
    if (db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug)) {
      slug = slug + "-" + Date.now().toString().slice(-5);
    }
    const info = db
      .prepare("INSERT INTO categories (slug, name, icon, createdAt) VALUES (?, ?, ?, ?)")
      .run(slug, name, String(b.icon || "").trim(), new Date().toISOString());
    console.log("🗂 دسته‌بندی جدید:", slug, "|", name);
    res.status(201).json({ success: true, message: "دسته‌بندی افزوده شد.", id: info.lastInsertRowid });
  } catch (e) {
    console.error("خطا در ایجاد دسته‌بندی:", e);
    res.status(500).json({ success: false, message: "خطایی در سمت سرور رخ داد." });
  }
});

// ویرایش دسته‌بندی
app.put("/api/admin/categories/:id", requireAdmin, (req, res) => {
  try {
    const b = req.body || {};
    const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "دسته‌بندی پیدا نشد." });
    }
    const name = String(b.name !== undefined ? b.name : existing.name).trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "نام دسته‌بندی الزامی است." });
    }
    let slug = makeSlug(b.slug !== undefined ? b.slug : existing.slug);
    const clash = db
      .prepare("SELECT id FROM categories WHERE slug = ? AND id != ?")
      .get(slug, existing.id);
    if (clash) slug = slug + "-" + Date.now().toString().slice(-5);
    db.prepare("UPDATE categories SET slug=?, name=?, icon=? WHERE id=?").run(
      slug,
      name,
      String(b.icon !== undefined ? b.icon : existing.icon).trim(),
      existing.id
    );
    res.json({ success: true, message: "دسته‌بندی ویرایش شد." });
  } catch (e) {
    console.error("خطا در ویرایش دسته‌بندی:", e);
    res.status(500).json({ success: false, message: "خطایی در سمت سرور رخ داد." });
  }
});

// حذف دسته‌بندی — فقط وقتی محصولی نداشته باشد
app.delete("/api/admin/categories/:id", requireAdmin, (req, res) => {
  const cat = db.prepare("SELECT * FROM categories WHERE id = ?").get(req.params.id);
  if (!cat) {
    return res.status(404).json({ success: false, message: "دسته‌بندی پیدا نشد." });
  }
  const count = db.prepare("SELECT COUNT(*) AS c FROM products WHERE category_id = ?").get(cat.id).c;
  if (count > 0) {
    return res.status(400).json({
      success: false,
      message: "این دسته‌بندی محصول دارد و قابل حذف نیست. ابتدا محصولات آن را جابه‌جا یا حذف کنید.",
    });
  }
  db.prepare("DELETE FROM categories WHERE id = ?").run(cat.id);
  res.json({ success: true, message: "دسته‌بندی حذف شد." });
});

// ─── آپلود تصویر محصول ───
// عکس با فرمت base64 Data URL ارسال می‌شود و سرور آن را به‌صورت فایل ذخیره می‌کند
app.post("/api/admin/upload", requireAdmin, (req, res) => {
  try {
    const dataUrl = String((req.body || {}).dataUrl || "");
    if (!dataUrl.startsWith("data:image/")) {
      return res.status(400).json({ success: false, message: "تصویر نامعتبر است." });
    }
    if (dataUrl.length > 9 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "حجم تصویر بیش از حد مجاز است (حداکثر حدود ۹ مگابایت).",
      });
    }
    const m = dataUrl.match(/^data:image\/(png|jpe?g|webp|gif);base64,(.+)$/i);
    if (!m) {
      return res.status(400).json({ success: false, message: "فرمت تصویر پشتیبانی نمی‌شود." });
    }
    const ext = m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
    const buffer = Buffer.from(m[2], "base64");
    if (buffer.length === 0) {
      return res.status(400).json({ success: false, message: "فایل خالی است." });
    }
    const dir = path.join(__dirname, "..", "assets", "uploads", "products");
    fs.mkdirSync(dir, { recursive: true });
    const fileName =
      "p-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    fs.writeFileSync(path.join(dir, fileName), buffer);
    res.json({ success: true, path: "assets/uploads/products/" + fileName });
  } catch (e) {
    console.error("خطا در آپلود تصویر:", e);
    res.status(500).json({ success: false, message: "خطایی در ذخیره تصویر رخ داد." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ سرور چوبساب روی پورت ${PORT} با موفقیت اجرا شد.`);
  console.log(`💳 درگاه پرداخت: ${ZARINPAL.sandbox ? "🧪 سندباکس (تستی)" : "💰 واقعی (زرین‌پال)"}`);
  if (!ZARINPAL.sandbox && ZARINPAL.merchant === ZARINPAL_PLACEHOLDER_MERCHANT) {
    console.error("⚠️ هشدار: حالت واقعی فعال است ولی ZARINPAL_MERCHANT در فایل .env تنظیم نشده!");
  }
  console.log(`🔐 پنل مدیریت: http://localhost:${PORT}/admin/login.html`);
});