# راهنمای دیپلوی چوب‌ساب روی سرور ابری

> این راهنما برای وقتی است که سرور ابری (VPS) با Node.js آماده شد.
> کل پروژه (فرانت + بک‌اند) روی همان سرور و همان دامنه بالا می‌آید.

## معماری پروژه

- سرور Express (فایل `backend/server.js`) همه‌چیز را سرو می‌کند:
  - فرانت‌اند (HTML/CSS/JS/عکس‌ها) از ریشه پروژه
  - APIها (`/api/...`)
  - `products.js` به‌صورت **پویا از دیتابیس** تولید می‌شود → تغییرات پنل ادمین مستقیم در فروشگاه دیده می‌شود
- دیتابیس: SQLite → فایل `backend/choobsab.db`
- همه فراخوان‌ها آدرس نسبی (`/api/...`) هستند → خودکار به همان سرور وصل می‌شوند

---

## ۱) پیش‌نیازها روی سرور

```bash
# سیستم‌عامل: Ubuntu 22.04+ (پیشنهادی)
sudo apt update && sudo apt upgrade -y

# نصب Node.js نسخه ۲۲ به بالا
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx

node -v   # باید مثل v22.x باشد
```

## ۲) دریافت پروژه

```bash
git clone https://github.com/soroush-rahmani/choobsab-website.git
cd choobsab-website/backend
npm install
```

## ۳) انتقال دیتای محلی به سرور

دیتایت (محصولات، سفارش‌ها، تصاویر) روی کامپیوتر خودت است. روی سیستم خودت اجرا کن:

```bash
node deploy/preflight.js    # ساخت پشتیبان تمیز در backups/
```

سپس این‌ها را با SFTP/FileZilla به سرور آپلود کن:

| از سیستم خودت | به سرور |
|---|---|
| `backups/choobsab-YYYYMMDD.db` | `backend/choobsab.db` |
| `assets/uploads/products/` (کل پوشه) | `assets/uploads/products/` |

## ۴) فایل تنظیمات (backend/.env)

روی سرور این فایل را بساز:

```ini
PORT=5000
ZARINPAL_SANDBOX=true
ZARINPAL_MERCHANT=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> بعداً وقتی زرین‌پال واقعی می‌خواهی: `ZARINPAL_SANDBOX=false` + مرچنت‌کد واقعی.

## ۵) راه‌اندازی دائمی با PM2

```bash
npm install -g pm2
cd ..   # برگشت به ریشه پروژه
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup    # این دستور را اجرا کن و خروجی‌اش را کپی/اجرا کن
```

## ۶) اتصال دامنه + HTTPS

1. در پنل DNS دامنه، رکورد `A` بساز: `@` و `www` → آدرس IP سرور.
2. تنظیمات Nginx:

```bash
sudo cp deploy/nginx-choobsab.conf /etc/nginx/sites-available/choobsab
sudo nano /etc/nginx/sites-available/choobsab   # دامنه واقعی را جایگزین YOUR-DOMAIN.com کن
sudo ln -s /etc/nginx/sites-available/choobsab /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

3. گواهینامه رایگان SSL:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d YOUR-DOMAIN.com -d www.YOUR-DOMAIN.com
```

4. اگر فایروال داری: `sudo ufw allow 'Nginx Full'` (پورت 5000 را بیرونی باز نکن؛ فقط از طریق Nginx).

## ۷) تست نهایی

| صفحه | آدرس |
|---|---|
| فروشگاه | `https://دامنه.ت` |
| ورود ادمین | `https://دامنه.ت/admin/login.html` |

- ورود با کاربر پیش‌فرض: `admin` / `admin123`
- ✅ یک تغییر در محصول ذخیره کن → فروشگاه را رفرش کن → تغییر باید دیده شود.

## ۸) امنیت (مهم)

- **رمز پیش‌فرض ادمین (admin123) را همین اول عوض کن.** می‌توانی در دیتابیس یا کد `backend/db.js` (Seed ادمین) تغییرش بدهی.
- لاگ‌ها: `pm2 logs choobsab`

## ۹) اتصال ملی پیامک (اس‌ام‌اس ورود + اطلاع‌رسانی سفارش)

پروژه از «وب‌سرویس خدماتی/الگو» ملی پیامک پشتیبانی می‌کند (اندپوینت رسمی REST: `https://rest.payamak-panel.com/api/SendSMS`).

**در پنل ملی‌پیامک (panels.melipayamak.com):**
1. منوی **«وب سرویس خدماتی» / «الگوها»** → **الگوی جدید بساز**:
   - برای کد ورود: مثلاً `کد ورود شما به چوب‌ساب: {1}` — دقیقاً **۱ متغیر**
   - برای سفارش: مثلاً `{1} گرامی، سفارش شما با شناسه {2} ثبت شد. مبلغ: {3} تومان` — دقیقاً **۳ متغیر به همین ترتیب** (نام، شناسه سفارش، مبلغ)
   - صبر کن تأیید شود (معمولاً سریع است) و **bodyId الگو** (عدد ۶ رقمی) را بردار.
2. **کلید وب سرویس (API Key)** و **شماره خط** را از پنل ببین.

**در `backend/.env` این متغیرها را تنظیم کن:**
```ini
MELIPAYAMAK_USERNAME=نام کاربری پنل
MELIPAYAMAK_PASSWORD=کلید وب سرویس (API Key)
MELIPAYAMAK_FROM=شماره خط ارسال   # فقط برای حالت «ارسال ساده»
MELIPAYAMAK_BODY_ID_OTP=کد ۶ رقمی الگوی کد ورود
MELIPAYAMAK_BODY_ID_ORDER=کد ۶ رقمی الگوی سفارش
```

> - اگر `BODY_ID_OTP` / `BODY_ID_ORDER` تنظیم شوند، از `BaseServiceNumber` استفاده می‌شود؛ مقادیر متغیرهای الگو (`{1} {2} {3}`) با جداکننده `,` به‌ترتیب در `text` ارسال می‌شوند:
>   - الگوی **کد ورود**: یک مقدار (کد)
>   - الگوی **سفارش**: سه مقدار به ترتیب _[نام، شناسه سفارش، مبلغ]_
>   - اگر پنل جداکننده دیگری خواست: `MELIPAYAMAK_TEMPLATE_SEPARATOR=;`
> - اگر bodyId نباشد، حالت «ارسال ساده» (`SendSMS`) با متن‌های پیش‌فرض استفاده می‌شود (نیازمند `MELIPAYAMAK_FROM`).
> - بدون معتبرسازی API هم پروژه کار می‌کند اما فقط در کنسول لاگ می‌زند؛ اس‌ام‌اس واقعی فرستاده نمی‌شود.

## رفع اشکال رایج

| مشکل | راه‌حل |
|---|---|
| `better-sqlite3` نصب نشد (باید Node>=22) | ورژن Node را بررسی کن (`node -v`) |
| صفحه لود می‌شود ولی API خطا می‌دهد | `pm2 logs choobsab` را ببین |
| تصاویر محصول دیده نمی‌شوند | پوشه `assets/uploads/products/` را آپلود کرده‌ای؟ |
| پنل ادمین ۴۰۳/۴۰۱ می‌دهد | با دامنه و HTTPS (نه IP مستقیم) وارد شو؛ کوکی SameSite=Strict است |