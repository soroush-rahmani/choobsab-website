// ─────────────────────────────────────────────────────────────
//  ماژول امنیت پنل مدیریت — چوب‌ساب
//  فقط از ماژول‌های داخلی Node.js استفاده می‌کند (بدون پکیج خارجی)
// ─────────────────────────────────────────────────────────────
const crypto = require("crypto");

// ─── ۱. هش کردن رمز عبور با scrypt ───
// scrypt یکی از قوی‌ترین الگوریتم‌های هش رمز عبور است (برنده مسابقه رمزنگاری رمز عبور)
// پارامترها به‌طور عمدی سنگین انتخاب شده‌اند تا حمله Brute-Force خیلی کند شود
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex"); // نمک تصادفی ۱۲۸ بیتی
  const N = 16384, r = 8, p = 1; // پارامترهای استاندارد scrypt (پر هزینه برای مهاجم)
  const hash = crypto
    .scryptSync(password, salt, 64, { N, r, p })
    .toString("hex");
  // فرمت ذخیره: الگوریتم$N$r$p$salt$hash  → در آینده قابل ارتقا
  return `scrypt$${N}$${r}$${p}$${salt}$${hash}`;
}

// مقایسه رمز عبور با هش ذخیره‌شده — با زمان ثابت (ضد Timing Attack)
function verifyPassword(password, stored) {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const [, N, r, p, salt, hash] = parts;
    const candidate = crypto.scryptSync(password, salt, 64, {
      N: +N,
      r: +r,
      p: +p,
    });
    const expected = Buffer.from(hash, "hex");
    if (candidate.length !== expected.length) return false;
    return crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// آیا هش ذخیره‌شده با فرمت امن scrypt است؟ (برای مهاجرت هش‌های قدیمی)
function isScryptHash(stored) {
  const parts = String(stored || "").split("$");
  return parts.length === 6 && parts[0] === "scrypt";
}

// ─── ۲. توکن تصادفی امن (برای نشست‌ها) ───
function generateToken() {
  return crypto.randomBytes(32).toString("hex"); // ۲۵۶ بیت آنتروپی — غیرقابل حدس
}

// ─── ۳. محدودسازی تلاش ورود (Rate Limiting + قفل حساب) ───
// حداکثر ۵ تلاش ناموفق در هر ۱۵ دقیقه برای هر IP → قفل ۱۵ دقیقه‌ای
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // ۱۵ دقیقه
const LOCK_MS = 15 * 60 * 1000; // مدت قفل

const attempts = new Map(); // ip -> { count, firstAt, lockedUntil }

function isRateLimited(ip) {
  const rec = attempts.get(ip);
  if (!rec) return { limited: false };
  const now = Date.now();
  // پاکسازی رکورد قدیمی (پنجره تمام شده و قفلی هم وجود ندارد)
  if (!rec.lockedUntil && now - rec.firstAt > WINDOW_MS) {
    attempts.delete(ip);
    return { limited: false };
  }
  if (rec.lockedUntil && now < rec.lockedUntil) {
    return {
      limited: true,
      retryAfterSec: Math.ceil((rec.lockedUntil - now) / 1000),
    };
  }
  if (rec.lockedUntil && now >= rec.lockedUntil) {
    attempts.delete(ip); // قفل تمام شد — شروع تازه
    return { limited: false };
  }
  return { limited: false };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  let rec = attempts.get(ip);
  if (!rec || (!rec.lockedUntil && now - rec.firstAt > WINDOW_MS)) {
    rec = { count: 0, firstAt: now, lockedUntil: 0 };
  }
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOCK_MS;
  }
  attempts.set(ip, rec);
}

function clearAttempts(ip) {
  attempts.delete(ip);
}

// ─── ۴. تنظیمات نشست ───
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // اعتبار نشست: ۲ ساعت
const SESSION_COOKIE = "choobsab_admin_session";

// ─── ۵. الزام هدر CSRF ───
// مرورگرها نمی‌توانند در درخواست بین‌دامنه‌ای هدر سفارشی اضافه کنند
// مگر با preflight — که ما آن را اجازه نمی‌دهیم. پس این هدر سند است.
const CSRF_HEADER = "x-requested-with";
const CSRFHeaderValue = "XMLHttpRequest";

module.exports = {
  hashPassword,
  verifyPassword,
  isScryptHash,
  generateToken,
  isRateLimited,
  recordFailedAttempt,
  clearAttempts,
  SESSION_TTL_MS,
  SESSION_COOKIE,
  CSRF_HEADER,
  CSRFHeaderValue,
  MAX_ATTEMPTS,
};
