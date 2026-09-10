// =================== حساب کاربری چوب‌ساب (UserAuth) ===================
// ورود / ثبت‌نام با شماره موبایل و کد یک‌بارمصرف + پروفایل کاربری و سفارش‌ها
// این فایل در تمام صفحات سایت لود می‌شود و:
//   ۱) آیکون آدمک را کنار آیکون سبد خرید (هدر دسکتاپ) تزریق می‌کند
//   ۲) دکمه «پروفایل» را به نوار ناوبری پایینی موبایل اضافه می‌کند
//   ۳) مودال ورود دو مرحله‌ای و مودال پروفایل را مدیریت می‌کند
//   ۴) خرید بدون ورود را مسدود می‌کند (کلیک روی دکمه‌های ثبت سفارش → مودال ورود)

window.UserAuth = (function () {
  // ─── وضعیت ───
  let currentUser = null;
  let loaded = false; // آیا وضعیت ورود از سرور خوانده شده؟
  let pendingCheckout = false; // آیا کاربر قصد خرید داشت؟ (بعد از ورود، به checkout برو)
  let otpPhone = ""; // شماره‌ای که کد برایش ارسال شده
  let listeners = [];

  // ─── ابزارها ───
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function toEnglishDigits(str) {
    const fa = "۰۱۲۳۴۵۶۷۸۹";
    const ar = "٠١٢٣٤٥٦٧٨٩";
    return String(str || "").replace(/[۰-۹٠-٩]/g, function (ch) {
      const i = fa.indexOf(ch);
      if (i > -1) return String(i);
      return String(ar.indexOf(ch));
    });
  }

  function formatPrice(num) {
    return (Number(num) || 0).toLocaleString("fa-IR") + " تومان";
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return "";
    }
  }

  function statusLabel(status) {
    const map = {
      pending: "در انتظار پرداخت",
      paid: "پرداخت شده",
      processing: "در حال پردازش",
      shipped: "ارسال شده",
      delivered: "تحویل شده",
      canceled: "لغو شده",
    };
    return map[status] || "در حال بررسی";
  }

  function showError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.hidden = !message;
  }

  // ─── وضعیت ورود از سرور ───
  async function fetchMe() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      currentUser = (data && data.user) || null;
    } catch (e) {
      currentUser = null;
    }
    loaded = true;
    notify();
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function notify() {
    // به‌روزرسانی ظاهر آیکون آدمک هدر (حالت واردشده)
    const headerIcon = document.getElementById("profileIconLink");
    if (headerIcon) headerIcon.classList.toggle("is-logged-in", !!currentUser);
    listeners.forEach(function (fn) {
      try { fn(currentUser); } catch (e) { /* خطای شنونده — نادیده گرفته می‌شود */ }
    });
    document.dispatchEvent(
      new CustomEvent("choobsab:user-changed", { detail: { user: currentUser } })
    );
  }

  function getUser() {
    return currentUser;
  }

  // ─── ساخت مودال (یک بار در هر صفحه) ───
  function ensureModal() {
    if (document.getElementById("uaOverlay")) return;
    const wrap = document.createElement("div");
    wrap.id = "uaOverlay";
    wrap.className = "ua-overlay";
    wrap.innerHTML = `
      <div class="ua-modal" role="dialog" aria-modal="true" aria-label="حساب کاربری">
        <button type="button" class="ua-close" id="uaCloseBtn" aria-label="بستن">&times;</button>

        <!-- مرحله ۱: ورود / ثبت‌نام -->
        <div class="ua-step" id="uaStepLogin">
          <div class="ua-modal-icon"><i class="fas fa-user"></i></div>
          <h3 class="ua-title">ورود | ثبت‌نام</h3>
          <p class="ua-subtitle">برای ثبت سفارش، وارد حساب کاربری خود شوید.</p>
          <form id="uaLoginForm" novalidate>
            <div class="ua-field">
              <label for="uaFirstName">نام</label>
              <input type="text" id="uaFirstName" placeholder="مثلاً علی" autocomplete="given-name" />
            </div>
            <div class="ua-field">
              <label for="uaLastName">نام خانوادگی</label>
              <input type="text" id="uaLastName" placeholder="مثلاً محمدی" autocomplete="family-name" />
            </div>
            <div class="ua-field">
              <label for="uaPhone">شماره موبایل</label>
              <input type="tel" id="uaPhone" placeholder="09xxxxxxxxx" inputmode="tel" dir="ltr" />
            </div>
            <p class="ua-error" id="uaLoginError" hidden></p>
            <button type="submit" class="ua-btn-primary" id="uaSendOtpBtn">دریافت کد تأیید</button>
          </form>
        </div>

        <!-- مرحله ۲: کد یک‌بارمصرف -->
        <div class="ua-step" id="uaStepOtp" hidden>
          <div class="ua-modal-icon"><i class="fas fa-mobile-screen"></i></div>
          <h3 class="ua-title">کد تأیید</h3>
          <p class="ua-subtitle">کد ۵ رقمی ارسال‌شده به <span class="ua-phone-inline" id="uaOtpPhone" dir="ltr"></span> را وارد کنید.</p>
          <form id="uaOtpForm" novalidate>
                        <input type="text" id="uaOtpCode" class="ua-otp-input" maxlength="5" inputmode="numeric" placeholder="_____" dir="ltr" autocomplete="one-time-code" />
            <p class="ua-dev-code" id="uaDevCode" hidden></p>
            <p class="ua-error" id="uaOtpError" hidden></p>
            <button type="submit" class="ua-btn-primary" id="uaVerifyBtn">تأیید و ورود</button>
          </form>
          <div class="ua-otp-actions">
            <button type="button" class="ua-link-btn" id="uaEditPhoneBtn">ویرایش شماره</button>
            <button type="button" class="ua-link-btn" id="uaResendBtn">ارسال مجدد کد</button>
          </div>
        </div>

        <!-- مرحله ۳: خوش‌آمدگویی -->
        <div class="ua-step" id="uaStepWelcome" hidden>
          <div class="ua-welcome-icon"><i class="fas fa-check"></i></div>
          <h3 class="ua-title">خوش آمدید، <span id="uaWelcomeName"></span>!</h3>
          <p class="ua-subtitle">ورود شما با موفقیت انجام شد.</p>
        </div>

        <!-- نمای پروفایل و سفارش‌ها -->
        <div class="ua-step" id="uaStepProfile" hidden>
          <div class="ua-profile-head">
            <div class="ua-avatar" id="uaProfileAvatar"></div>
            <div class="ua-profile-meta">
              <h3 class="ua-profile-name" id="uaProfileName"></h3>
              <span class="ua-profile-phone" id="uaProfilePhone" dir="ltr"></span>
            </div>
          </div>
          <h4 class="ua-orders-title">سفارش‌های من</h4>
                    <div class="ua-orders-list" id="uaOrdersList"></div>
          <a href="profile.html" class="ua-view-full-profile">📄 مشاهدهٔ صفحهٔ پروفایل</a>
          <button type="button" class="ua-btn-outline" id="uaLogoutBtn">
            <i class="fas fa-right-from-bracket"></i> خروج از حساب
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    wireModalEvents();
    wireDigitConverters();
  }

  // تبدیل ارقام فارسی/عربی به انگلیسی هنگام تایپ در فیلدهای عددی
  function wireDigitConverters() {
    const fa = "۰۱۲۳۴۵۶۷۸۹";
    const ar = "٠١٢٣٤٥٦٧٨٩";
    function convert(el) {
      if (!el) return;
      const val = el.value;
      const converted = val.replace(/[۰-۹٠-٩]/g, function (ch) {
        const i = fa.indexOf(ch);
        if (i > -1) return String(i);
        const j = ar.indexOf(ch);
        return j > -1 ? String(j) : ch;
      });
      if (converted !== val) el.value = converted;
    }
    // شماره موبایل (مودال ورود)
    const phoneEl = document.getElementById("uaPhone");
    if (phoneEl) phoneEl.addEventListener("input", function () { convert(phoneEl); });
    // کد یک‌بارمصرف (مودال ورود)
    const otpEl = document.getElementById("uaOtpCode");
    if (otpEl) otpEl.addEventListener("input", function () { convert(otpEl); });
    // شماره موبایل و کد پستی (فرم آدرس پروفایل)
    const addrPhone = document.getElementById("addrPhone");
    if (addrPhone) addrPhone.addEventListener("input", function () { convert(addrPhone); });
    const addrPostal = document.getElementById("addrPostalCode");
    if (addrPostal) addrPostal.addEventListener("input", function () { convert(addrPostal); });
    // شماره موبایل و کد پستی (فرم تسویه‌حساب)
    const chkPhone = document.getElementById("phoneNumber");
    if (chkPhone) chkPhone.addEventListener("input", function () { convert(chkPhone); });
    const chkPostal = document.getElementById("postalCode");
    if (chkPostal) chkPostal.addEventListener("input", function () { convert(chkPostal); });
  }

  function showStep(name) {
    ["uaStepLogin", "uaStepOtp", "uaStepWelcome", "uaStepProfile"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.hidden = id !== name;
    });
  }

  function openModal() {
    ensureModal();
    const overlay = document.getElementById("uaOverlay");
    overlay.classList.add("open");
    document.body.classList.add("ua-lock-scroll");
  }

  function closeModal() {
    const overlay = document.getElementById("uaOverlay");
    if (overlay) overlay.classList.remove("open");
    document.body.classList.remove("ua-lock-scroll");
  }

  function openLogin() {
    openModal();
    showError("uaLoginError", "");
    showError("uaOtpError", "");
    showStep("uaStepLogin");
    setTimeout(function () {
      const first = document.getElementById("uaFirstName");
      if (first) first.focus();
    }, 150);
  }

  function openProfile() {
    if (!currentUser) {
      openLogin();
      return;
    }
    openModal();
    fillProfileHead();
    showStep("uaStepProfile");
    loadOrders("uaOrdersList");
  }

  function fillProfileHead() {
    if (!currentUser) return;
    const avatar = document.getElementById("uaProfileAvatar");
    const nameEl = document.getElementById("uaProfileName");
    const phoneEl = document.getElementById("uaProfilePhone");
    if (avatar) avatar.textContent = (currentUser.firstName || "؟").charAt(0);
    if (nameEl)
      nameEl.textContent =
        (currentUser.firstName || "") + " " + (currentUser.lastName || "");
    if (phoneEl) phoneEl.textContent = currentUser.phone || "";
  }

  // ─── اتصال رویدادهای مودال ───
  function wireModalEvents() {
    const overlay = document.getElementById("uaOverlay");
    const closeBtn = document.getElementById("uaCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeModal();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });

    // فرم مرحله ۱: دریافت کد
    const loginForm = document.getElementById("uaLoginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const firstName = document.getElementById("uaFirstName").value.trim();
        const lastName = document.getElementById("uaLastName").value.trim();
        const phone = toEnglishDigits(
          document.getElementById("uaPhone").value
        ).replace(/\D/g, "");
        showError("uaLoginError", "");

        if (firstName.length < 2 || lastName.length < 2) {
          showError("uaLoginError", "لطفاً نام و نام خانوادگی را کامل وارد کنید.");
          return;
        }
        if (!/^09\d{9}$/.test(phone)) {
          showError("uaLoginError", "شماره موبایل معتبر نیست. (مثال: 09123456789)");
          return;
        }

        const btn = document.getElementById("uaSendOtpBtn");
        btn.disabled = true;
        btn.textContent = "در حال ارسال...";
        try {
          const res = await fetch("/api/auth/request-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ firstName, lastName, phone }),
          });
          const data = await res.json();
          if (data.success) {
            otpPhone = phone;
            const phoneEl = document.getElementById("uaOtpPhone");
            if (phoneEl) phoneEl.textContent = phone;
                        showError("uaOtpError", "");
            showStep("uaStepOtp");
            const codeInput = document.getElementById("uaOtpCode");
            const devCodeEl = document.getElementById("uaDevCode");
            // در حالت dev، کد یک‌بارمصرف در devCode برگردانده می‌شود؛ آن را نمایش
            // و در فیلد کد می‌گذاریم تا کاربر مستقیماً ببیند چه کدی وارد کند.
            if (devCodeEl) {
              devCodeEl.textContent = data.devCode
                ? "🔐 کد تستی: " + data.devCode
                : "";
              devCodeEl.hidden = !data.devCode;
            }
            if (codeInput) {
              codeInput.value = data.devCode ? data.devCode : "";
              codeInput.focus();
            }
          } else {
            showError("uaLoginError", data.message || "خطا در ارسال کد.");
          }
        } catch (err) {
          showError(
            "uaLoginError",
            "ارتباط با سرور برقرار نشد. مطمئن شوید سرور روی پورت 5000 روشن است."
          );
        } finally {
          btn.disabled = false;
          btn.textContent = "دریافت کد تأیید";
        }
      });
    }

    // فرم مرحله ۲: تأیید کد
    const otpForm = document.getElementById("uaOtpForm");
    if (otpForm) {
      otpForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const code = toEnglishDigits(
          document.getElementById("uaOtpCode").value
        ).replace(/\D/g, "");
        showError("uaOtpError", "");

        if (code.length !== 5) {
          showError("uaOtpError", "کد ۵ رقمی را کامل وارد کنید.");
          return;
        }

        const btn = document.getElementById("uaVerifyBtn");
        btn.disabled = true;
        btn.textContent = "در حال بررسی...";
        try {
          const res = await fetch("/api/auth/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone: otpPhone,
              code: code,
              firstName: document.getElementById("uaFirstName").value.trim(),
              lastName: document.getElementById("uaLastName").value.trim(),
            }),
          });
          const data = await res.json();
          if (data.success && data.user) {
            currentUser = data.user;
            loaded = true;
            const nameEl = document.getElementById("uaWelcomeName");
            if (nameEl) nameEl.textContent = currentUser.firstName || "";
            showStep("uaStepWelcome");
            notify();
            // بعد از چند لحظه مودال بسته می‌شود؛ اگر کاربر قصد خرید داشت، به صفحه پرداخت می‌رود
            setTimeout(function () {
              closeModal();
              if (pendingCheckout) {
                pendingCheckout = false;
                window.location.href = "checkout.html";
              }
            }, 1800);
          } else {
            showError("uaOtpError", data.message || "کد وارد شده صحیح نیست.");
          }
        } catch (err) {
          showError("uaOtpError", "ارتباط با سرور برقرار نشد.");
        } finally {
          btn.disabled = false;
          btn.textContent = "تأیید و ورود";
        }
      });
    }

    wireSecondaryEvents();
  }

  // رویدادهای فرعی مودال (ویرایش شماره، ارسال مجدد، خروج)
  function wireSecondaryEvents() {
    // ویرایش شماره → بازگشت به مرحله ۱
    const editBtn = document.getElementById("uaEditPhoneBtn");
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        showStep("uaStepLogin");
      });
    }

    // ارسال مجدد کد
    const resendBtn = document.getElementById("uaResendBtn");
    if (resendBtn) {
      resendBtn.addEventListener("click", async function () {
        resendBtn.disabled = true;
        try {
          const res = await fetch("/api/auth/request-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName: document.getElementById("uaFirstName").value.trim(),
              lastName: document.getElementById("uaLastName").value.trim(),
              phone: otpPhone,
            }),
          });
          const data = await res.json();
          if (!data.success) {
            showError("uaOtpError", data.message || "خطا در ارسال مجدد کد.");
          } else {
            showError("uaOtpError", "کد جدید ارسال شد.");
          }
        } catch (err) {
          showError("uaOtpError", "ارتباط با سرور برقرار نشد.");
        } finally {
          setTimeout(function () {
            resendBtn.disabled = false;
          }, 5000);
        }
      });
    }

    // خروج از حساب (داخل مودال پروفایل)
    const logoutBtn = document.getElementById("uaLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", doLogout);
    }
  }

  // ─── خروج از حساب ───
  async function doLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) { /* حتی اگر سرور در دسترس نبود، سمت کاربر خارج می‌شویم */ }
    currentUser = null;
    closeModal();
    notify();
  }

  // ─── دریافت و رندر سفارش‌های کاربر ───
  async function loadOrders(containerId, limit) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML =
      '<div class="ua-orders-loading"><span class="ua-spinner"></span> در حال بارگذاری سفارش‌ها...</div>';
    try {
      const res = await fetch("/api/user/orders");
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 401) {
          currentUser = null;
          notify();
          openLogin();
          return;
        }
        container.innerHTML =
          '<p class="ua-empty-msg">خطا در دریافت سفارش‌ها. دوباره تلاش کنید.</p>';
        return;
      }

      const orders = data.orders || [];
      if (orders.length === 0) {
        container.innerHTML =
          '<div class="ua-empty-msg"><i class="fas fa-box-open"></i><p>هنوز سفارشی ثبت نکرده‌اید.</p></div>';
        return;
      }

      const list = typeof limit === "number" ? orders.slice(0, limit) : orders;
      container.innerHTML = list
        .map(function (order) {
          const itemsPreview = (order.items || [])
            .slice(0, 3)
            .map(function (it) {
              return escapeHtml(it.name || "محصول");
            })
            .join("، ");
          const more =
            (order.items || []).length > 3
              ? ' <span class="ua-order-more">و ' +
                (order.items.length - 3) +
                " مورد دیگر</span>"
              : "";
          return `
            <div class="ua-order-card">
                        <div class="ua-order-head">
                <span class="ua-order-code" dir="ltr">${escapeHtml(order.orderId || "")}</span>
                <span class="ua-order-status st-${escapeHtml(order.status || "pending")}">${statusLabel(order.status)}</span>
              </div>
              ${order.postTrackingCode ? '<div class="ua-order-tracking"><i class="fas fa-truck"></i> <span class="ua-tracking-code" dir="ltr">' + escapeHtml(order.postTrackingCode) + '</span></div>' : ''}
              <p class="ua-order-items">${itemsPreview}${more}</p>
              <div class="ua-order-foot">
                <span class="ua-order-date"><i class="fas fa-calendar"></i> ${formatDate(order.createdAt)}</span>
                <span class="ua-order-total">${formatPrice(order.totalPrice)}</span>
              </div>
            </div>
          `;
        })
        .join("");
    } catch (e) {
      container.innerHTML =
        '<p class="ua-empty-msg">ارتباط با سرور برقرار نشد.</p>';
    }
  }

  // ─── تزریق آیکون آدمک کنار سبد خرید (هدر دسکتاپ) ───
  function injectHeaderIcon() {
    const userActions = document.querySelector(".user-actions");
    if (!userActions) return false;
    if (document.getElementById("profileIconLink")) return true;

    const icon = document.createElement("a");
    icon.href = "#";
    icon.className = "action-icon profile-icon";
    icon.id = "profileIconLink";
    icon.title = "حساب کاربری";
    icon.setAttribute("aria-label", "حساب کاربری");
    icon.innerHTML = '<i class="fas fa-user"></i>';
         icon.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (currentUser) window.location.href = "profile.html";
      else openLogin();
    });

    // درست قبل از آیکون سبد خرید قرار می‌گیرد
    const cartIcon = userActions.querySelector(".cart-icon");
    if (cartIcon) userActions.insertBefore(icon, cartIcon);
    else userActions.appendChild(icon);
    return true;
  }

  // ─── تزریق دکمه پروفایل به نوار ناوبری پایینی موبایل ───
  function injectMobileProfileBtn(attempt) {
    attempt = attempt || 0;
    const nav = document.querySelector(".mobile-bottom-nav");
    if (!nav) {
      // نوار ناوبری توسط mobile-nav.js ساخته می‌شود — کمی صبر می‌کنیم
      if (attempt < 20) {
        setTimeout(function () {
          injectMobileProfileBtn(attempt + 1);
        }, 300);
      }
      return;
    }
    if (document.getElementById("mobileNavProfileBtn")) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mobile-nav-item mobile-nav-profile";
    btn.id = "mobileNavProfileBtn";
    btn.setAttribute("aria-label", "پروفایل کاربری");
    btn.innerHTML =
      '<i class="fas fa-user"></i><span class="mobile-nav-label">پروفایل</span>';
         btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (currentUser) window.location.href = "profile.html";
      else openLogin();
    });

    // قبل از دکمه سبد خرید قرار می‌گیرد
    const cartBtn = document.getElementById("mobileNavCartBtn");
    if (cartBtn) nav.insertBefore(btn, cartBtn);
    else nav.appendChild(btn);
  }

  // ─── مسدودسازی خرید بدون ورود ───
  // با فاز Capture اجرا می‌شود تا قبل از هندلرهای دیگر (script.js و لینک‌ها) بگیرد
  function initCheckoutGate() {
    document.addEventListener(
      "click",
      function (e) {
        if (!loaded || currentUser) return; // وضعیت نامشخص یا کاربر وارد شده — اجازه
        const el = e.target.closest(
          "#checkoutBtn, #btnGoToCheckout, a[href='checkout.html'], a[href='./checkout.html'], a[href$='/checkout.html']"
        );
        if (!el) return;
        e.preventDefault();
        e.stopPropagation();
        pendingCheckout = true;
        openLogin();
      },
      true
    );
  }

  // ─── بخش «پروفایل کاربری» در صفحه اصلی ───
  function updateIndexProfileSection() {
    const section = document.getElementById("userProfileSection");
    if (!section) return;
    if (!currentUser) {
      section.hidden = true;
      section.innerHTML = "";
      return;
    }

    const avatarInitial = (currentUser.firstName || "؟").charAt(0);
    section.innerHTML = `
      <div class="ups-inner">
        <div class="ups-head">
          <div class="ups-avatar">${escapeHtml(avatarInitial)}</div>
          <div class="ups-head-text">
            <h3 class="ups-title"><i class="fas fa-user"></i> پروفایل کاربری</h3>
            <p class="ups-subtitle">خوش آمدید، ${escapeHtml(currentUser.firstName || "")}! سفارش‌های اخیر شما:</p>
          </div>
          <button type="button" class="ups-logout" id="upsLogoutBtn" title="خروج از حساب">
            <i class="fas fa-right-from-bracket"></i> خروج
          </button>
        </div>
        <div class="ups-orders" id="upsOrders"></div>
      </div>
    `;
    section.hidden = false;

    const logoutBtn = document.getElementById("upsLogoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", doLogout);

        // سه سفارش آخر در صفحه اصلی نمایش داده می‌شود
    loadOrders("upsOrders", 3);
  }

  // ─── صفحهٔ پروفایل کاربری مستقل (profile.html) ───
  // اطلاعات کاربر، لیست کامل سفارش‌ها و آدرس‌های ذخیره‌شده را رندر می‌کند.
  // اگر کاربر لاگین نباشد، صرفاً بدون تغییر می‌ماند (هیچ پیامی نمایش نمی‌یابد).
  // پس از ورود موفق، از طریق onChange دوباره فراخوانی می‌شود و محتوا نمایش داده می‌شود.
  function renderProfilePage() {
    const head = document.getElementById("profileHead");
    if (!head) return; // فقط روی صفحهٔ پروفایل اجرا می‌شود
    const wrap = document.getElementById("profilePageWrap");

    if (!loaded) return; // تا وقتی وضعیت لاگین از سرور خوانده نشود، صبر می‌کنیم

    if (!currentUser) {
      return;
    }
    // نمایش اطلاعات کاربر
    const avatarInitial = (currentUser.firstName || "؟").charAt(0);
    head.innerHTML =
      '<div class="profile-avatar">' +
      escapeHtml(avatarInitial) +
      '</div>' +
      '<div class="profile-meta">' +
      '<h2 class="profile-name">' +
      escapeHtml(currentUser.firstName || "") +
      " " +
      escapeHtml(currentUser.lastName || "") +
      "</h2>" +
      '<span class="profile-phone" dir="ltr">' +
      escapeHtml(currentUser.phone || "") +
      "</span>" +
      '<span class="profile-joined"><i class="fas fa-calendar-check"></i> عضویت از ' +
      formatDate(currentUser.createdAt) +
      "</span>" +
      "</div>" +
      '<button type="button" class="profile-logout-btn" id="profileLogoutBtn" title="خروج از حساب">' +
      '<i class="fas fa-right-from-bracket"></i>' +
      "</button>";

    if (wrap) wrap.hidden = false;

    // خروج از حساب روی صفحهٔ پروفایل
    const logoutBtn = document.getElementById("profileLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        doLogout();
        window.location.href = "index.html";
      });
    }

    // بارگذاری تمام سوارش‌های کاربر
    loadOrders("profileOrders", null);
    // بارگذاری آدرس‌های ذخیره‌شده‌ی کاربر
    loadAddresses();
  }

  // ─── آدرس‌های ذخیره‌شده کاربر (پروفایل → چک‌اوت) ───
  let addresses = [];

  async function loadAddresses() {
    const listEl = document.getElementById("profileAddresses");
    if (!listEl) return;
    try {
      const res = await fetch("/api/user/addresses");
      const data = await res.json();
      addresses = (data && data.addresses) || [];
    } catch (e) {
      addresses = [];
    }
    renderAddresses();
  }

  function renderAddresses() {
    const listEl = document.getElementById("profileAddresses");
    if (!listEl) return;
    if (!addresses.length) {
      listEl.innerHTML =
        '<div class="empty"><i class="fas fa-map-marker-alt"></i>' +
        "هنوز آدرسی ذخیره نکرده‌اید. با دکمه «افزودن آدرس جدید» اولین آدرس را ذخیره کنید.</div>";
      return;
    }
    listEl.innerHTML = addresses
      .map(function (a) {
        const title = [a.fullName, a.phone].filter(Boolean).join(" — ");
        return (
          '<div class="address-card">' +
          '<div class="address-card-body">' +
          '<h4 class="address-card-title">' +
          (title ? escapeHtml(title) : "آدرس شماره " + a.id) +
          "</h4>" +
          '<p class="address-card-text">' +
          escapeHtml(a.address) +
          "</p>" +
          '<div class="address-card-meta">' +
          (a.postalCode
            ? '<span><i class="fas fa-mailbox"></i>' + escapeHtml(a.postalCode) + "</span>"
            : "") +
          (a.note
            ? '<span><i class="fas fa-sticky-note"></i>' + escapeHtml(a.note) + "</span>"
            : "") +
          "</div>" +
          "</div>" +
          '<button type="button" class="address-delete-btn" data-address-id="' +
          a.id +
          '"><i class="fas fa-trash-alt"></i> حذف</button>' +
          "</div>"
        );
      })
      .join("");

    // حذف آدرس
    listEl.querySelectorAll(".address-delete-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        const id = btn.getAttribute("data-address-id");
        if (!confirm("این آدرس حذف شود؟")) return;
        try {
          await fetch("/api/user/addresses/" + id, { method: "DELETE" });
        } catch (e) {
          /* خطای شبکه — نادیده گرفته می‌شود */
        }
        loadAddresses();
      });
    });
  }

  function openAddressModal() {
    const overlay = document.getElementById("addressOverlay");
    if (!overlay) return;
    overlay.classList.add("open");
    document.body.classList.add("ua-lock-scroll");
    const err = document.getElementById("addressError");
    if (err) err.hidden = true;
    const nameInput = document.getElementById("addrFullName");
    if (nameInput) nameInput.focus();
  }

  function closeAddressModal() {
    const overlay = document.getElementById("addressOverlay");
    if (overlay) overlay.classList.remove("open");
    document.body.classList.remove("ua-lock-scroll");
  }

  // اتصال رویدادهای مودال آدرس + دکمه‌ی ورود پیام پروفایل
  function wireAddressFeatures() {
    const addBtn = document.getElementById("addressAddBtn");
    if (addBtn) {
      addBtn.addEventListener("click", function (e) {
        e.preventDefault();
        openAddressModal();
      });
    }

    const closeBtn = document.getElementById("addressCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", closeAddressModal);
    const overlay = document.getElementById("addressOverlay");
    if (overlay) {
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeAddressModal();
      });
    }

    const form = document.getElementById("addressForm");
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const errEl = document.getElementById("addressError");
      const address = document.getElementById("addrText").value.trim();
      if (!address) {
        errEl.textContent = "لطفاً آدرس را وارد کنید.";
        errEl.hidden = false;
        return;
      }
      const payload = {
        fullName: document.getElementById("addrFullName").value.trim(),
        phone: document.getElementById("addrPhone").value.trim(),
        postalCode: document.getElementById("addrPostalCode").value.trim(),
        address: address,
        note: document.getElementById("addrNote").value.trim(),
      };
      try {
        const res = await fetch("/api/user/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          closeAddressModal();
          form.reset();
          loadAddresses();
        } else {
          errEl.textContent = data.message || "خطا در ذخیره آدرس.";
          errEl.hidden = false;
        }
      } catch (err) {
        errEl.textContent = "ارتباط با سرور برقرار نشد.";
        errEl.hidden = false;
      }
    });
  }

  // ─── راه‌اندازی ───
  function init() {
    injectHeaderIcon();
    injectMobileProfileBtn();
    initCheckoutGate();
    wireAddressFeatures();
    fetchMe();
    onChange(renderProfilePage);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ─── API عمومی ───
  return {
    getUser: getUser,
    isLoaded: function () {
      return loaded;
    },
    openLogin: openLogin,
    openProfile: openProfile,
    closeModal: closeModal,
    logout: doLogout,
    onChange: onChange,
    // بررسی ورود (برای صفحاتی مثل checkout)
    requireLogin: async function () {
      if (!loaded) await fetchMe();
      return !!currentUser;
    },
  };
})();
