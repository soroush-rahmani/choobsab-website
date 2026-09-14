// =================== فوتر مشترک سایت (Shared Footer Component) ===================
// این فایل فوتر را در تمام صفحاتی که دارای <div id="siteFooterContainer"></div>
// هستند تزریق می‌کند.
//
// ⚠️ نکته مهم: برای تغییر محتوای فوتر (متن، لینک‌ها، شماره‌ها و...) فقط
// همین فایل را ویرایش کنید — تغییرات به صورت خودکار در تمام صفحات
// (index, cart, checkout و...) اعمال می‌شود.

(function () {
  // قالب HTML فوتر (منبع واحد حقیقت برای فوتر کل سایت)
  const FOOTER_HTML = `
    <footer class="site-footer" id="site-footer">
      <!-- بخش اول: ویژگی‌های بالا (۵ باکس) -->
      <div class="footer-top">
        <div class="feature-box">
          <i class="fas fa-shipping-fast feature-icon"></i>
          <span class="feature-text">ارسال سریع و ایمن</span>
        </div>
        <div class="feature-box">
          <i class="fas fa-credit-card feature-icon"></i>
          <span class="feature-text">روش‌های مختلف پرداخت</span>
        </div>
        <div class="feature-box">
          <i class="fas fa-headset feature-icon"></i>
          <span class="feature-text">پشتیبانی آنلاین</span>
        </div>
        <div class="feature-box">
          <i class="fas fa-check-circle feature-icon"></i>
          <span class="feature-text">تضمین کیفیت و اصالت</span>
        </div>
        <div class="feature-box">
          <i class="fas fa-box-open feature-icon"></i>
          <span class="feature-text">بسته‌بندی اختصاصی</span>
        </div>
      </div>

      <!-- بخش دوم: ستون‌های محتوا (۵ قسمت) -->
      <div class="footer-middle">
        <!-- قسمت ۱: درباره و تماس -->
        <div class="footer-col brand-col">
          <div class="footer-logo">
            <img
              loading="lazy"
              src="./assets/images/choobsab_logo_final.png"
              alt="لوگو چوبساب دکور"
              class="logo-image"
            />
          </div>
          <p class="brand-desc">
            چوبساب دکور تلفیقی از طراحی مدرن و طبیعت اصیل در قالب اکسسوری‌های چوبی
            زیبا.
          </p>
          <div class="contact-info">
            <div class="contact-item">
              <i class="fas fa-phone-alt"></i>
              <span>ثبت سفارش: ۰۹۰۱۰۴۶۱۷۵۷</span>
            </div>
            <div class="contact-item">
              <i class="fas fa-envelope"></i>
              <span>پشتیبانی سایت: ۰۹۰۱۰۴۶۱۷۵۸</span>
            </div>
          </div>
        </div>

        <!-- قسمت ۲: دسترسی سریع -->
        <div class="footer-col links-col">
          <h4 class="col-title">دسترسی سریع</h4>
          <ul>
            <li><a href="index.html">فروشگاه</a></li>
<li><a href="custom.html">محصولات سفارشی</a></li>
            <li><a href="contact.html">تماس با ما</a></li>
            <li><a href="about.html">درباره ما</a></li>
          </ul>
        </div>

        <!-- قسمت ۳: برای شما -->
        <div class="footer-col links-col">
          <h4 class="col-title">برای شما</h4>
          <ul>
            <li><a href="#">حریم خصوصی</a></li>
            <li><a href="#">مرجوعی و عودت</a></li>
            <li><a href="#">شرایط و ضوابط</a></li>
            <li><a href="#">عضویت</a></li>
          </ul>
        </div>

        <!-- قسمت ۴: اینستاگرام -->
        <div class="footer-col social-col">
          <div class="insta-header">
            <i class="fab fa-instagram"></i>
            <span>follow us on instagram</span>
          </div>
          <p class="social-desc">
            برای دیدن جدیدترین محصولات، پشت صحنه تولید و تخفیف‌های ویژه ما را در
            <a
              href="https://instagram.com"
              target="_blank"
              class="insta-link-text">اینستاگرام</a
            >
            دنبال کنید.
          </p>
          <a
            href="https://instagram.com/choobsab.decor"
            target="_blank"
            class="btn-follow">Follow Us</a
          >
        </div>

        <!-- قسمت ۵: مجوزها -->
        <div class="footer-col cert-col">
          <div class="cert-box">
            <div class="cert-item">
              <a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=7725359&Code=MrMCXxTCb31iK88jl2JR5YauxuwA2XUD'><img referrerpolicy='origin' src='./assets/images/enamad-seal.jpg' alt='نماد اعتماد الکترونیک' style='cursor:pointer'></a>
            </div>
          </div>
        </div>
      </div>

      <!-- بخش سوم: کپی‌رایت پایین فوتر -->
      <div class="footer-bottom">
        <p>تمامی حقوق برای چوبساب دکور محفوظ است ©.</p>
        <p>
          توسعه یافته توسط
          <a
            href="https://t.me/sushikhan83"
            target="_blank"
            class="developer-link">سروش رحمانی</a
          >
        </p>
      </div>
    </footer>
  `;

  // تزریق فوتر داخل کانتینر (اگر در صفحه وجود داشته باشد)
  function injectFooter() {
    const container = document.getElementById("siteFooterContainer");
    if (!container) return; // این صفحه فوتر ندارد
    container.innerHTML = FOOTER_HTML;
  }

  // اجرا بعد از آماده شدن DOM (یا فوراً اگر DOM آماده است)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectFooter);
  } else {
    injectFooter();
  }
})();