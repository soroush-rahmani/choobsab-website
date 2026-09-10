// =================== اسکریپت صفحه سفارش محصول سفارشی ===================
// مدیریت: پیش‌نمایش عکس، دراگ‌اند‌دراپ، اعتبارسنجی فرم، ارسال

(function () {
  const form = document.getElementById("customOrderForm");
  const dropzone = document.getElementById("uploadDropzone");
  const fileInput = document.getElementById("orderImage");
  const imagePreview = document.getElementById("imagePreview");
  const previewImg = document.getElementById("previewImg");
  const removeImageBtn = document.getElementById("removeImageBtn");
  const successMessage = document.getElementById("successMessage");

  if (!form) return;

  // =================== مدیریت آپلود عکس ===================

  // کلیک روی دراپ‌زون → باز کردن دیالوگ انتخاب فایل
  if (dropzone && fileInput) {
    dropzone.addEventListener("click", function (e) {
      // اگه روی دکمه حذف کلیک شد، دیالوگ باز نشه
      if (e.target.closest("#removeImageBtn")) return;
      fileInput.click();
    });
  }

  // تغییر فایل انتخاب‌شده
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      handleFile(this.files[0]);
    });
  }

  // رویدادهای دراگ‌اند‌دراپ
  if (dropzone) {
    ["dragenter", "dragover"].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("drag-over");
      });
    });

    dropzone.addEventListener("drop", function (e) {
      var files = e.dataTransfer.files;
      if (files.length > 0) {
        // انتخاب فایل در input هم برای ارسال با فرم
        fileInput.files = files;
        handleFile(files[0]);
      }
    });
  }

  // پردازش و پیش‌نمایش فایل عکس
  function handleFile(file) {
    if (!file) return;

    // بررسی نوع فایل
    if (!file.type.startsWith("image/")) {
      alert("لطفاً فقط فایس تصویری (JPG یا PNG) انتخاب کنید.");
      clearImage();
      return;
    }

    // بررسی سایز (حداکثر ۵ مگابایت)
    if (file.size > 5 * 1024 * 1024) {
      alert("حجم عکس نباید بیشتر از ۵ مگابایت باشد.");
      clearImage();
      return;
    }

    // نمایش پیش‌نمایش با URL.createObjectURL (استاندارد در همه مرورگرها)
    var previewUrl = URL.createObjectURL(file);
    previewImg.src = previewUrl;
    imagePreview.classList.remove("hidden");
  }

  // حذف عکس انتخاب‌شده
  if (removeImageBtn) {
    removeImageBtn.addEventListener("click", function (e) {
      e.stopPropagation(); // جلوگیری از باز شدن دیالوگ فایل
      clearImage();
    });
  }

  function clearImage() {
    if (fileInput) fileInput.value = "";
    if (previewImg) previewImg.src = "";
    if (imagePreview) imagePreview.classList.add("hidden");
  }

  // =================== اعتبارسنجی فرم ===================

  function showError(input) {
    input.closest(".form-group").classList.add("has-error");
  }

  function clearError(input) {
    input.closest(".form-group").classList.remove("has-error");
  }

  // پاک کردن خطا هنگام تایپ مجدد
  form.querySelectorAll(".form-control").forEach(function (input) {
    input.addEventListener("input", function () {
      clearError(input);
    });
  });

  function validateForm() {
    var isValid = true;
    var requiredFields = form.querySelectorAll("[required]");

    requiredFields.forEach(function (field) {
      var value = field.value.trim();

      if (!value) {
        showError(field);
        isValid = false;
        return;
      }

      // اعتبارسنجی ایمیل
      if (field.type === "email") {
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
          showError(field);
          isValid = false;
          return;
        }
      }

      // اعتبارسنجی موبایل
      if (field.id === "phoneNumber") {
        var phonePattern = /^09[0-9]{9}$/;
        if (!phonePattern.test(value)) {
          showError(field);
          isValid = false;
          return;
        }
      }

      // اعتبارسنجی وبسایت (اگر پر شده باشد)
      if (field.type === "url" && value) {
        try {
          new URL(value);
        } catch (_) {
          showError(field);
          isValid = false;
          return;
        }
      }
    });

    return isValid;
  }

  // =================== ارسال فرم ===================

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!validateForm()) {
      // اسکرول به اولین فیلد خطا
      var firstError = form.querySelector(".has-error .form-control");
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        firstError.focus();
      }
      return;
    }

    // جمع‌آوری اطلاعات فرم
    var formData = new FormData(form);

    // نمایش حالت لودینگ روی دکمه
    var submitBtn = form.querySelector(".btn-submit-custom");
    var originalBtnContent = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i><span>در حال ارسال...</span>';

    // ارسال درخواست به سرور (جایگزین شبیه‌سازی)
    // جمع‌آوری اطلاعات فرم بدون فایل
    var fields = {};
    for (var i = 0; i < form.elements.length; i++) {
      var el = form.elements[i];
      if (el.name && el.name !== "orderImage") {
        if (el.type === "checkbox" || el.type === "radio") {
          if (el.checked) fields[el.name] = el.value;
        } else {
          fields[el.name] = el.value;
        }
      }
    }

    // اگر عکسی انتخاب شده، آن را به base64 تبدیل و به payload اضافه کن
    function submitOrder(payload) {
      fetch("/api/custom-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          if (!res.ok) {
            return res.json().then(function (errData) {
              throw new Error(
                errData.message || "خطا در ارسال سفارش سفارشی."
              );
            });
          }
          return res.json();
        })
        .then(function (result) {
          form.classList.add("hidden");
          successMessage.classList.remove("hidden");
          successMessage.scrollIntoView({ behavior: "smooth", block: "center" });
        })
        .catch(function (err) {
          alert("متأسفانه در ارسال مشکلی پیش آمد: " + err.message);
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnContent;
        });
    }

    var selectedFile = fileInput && fileInput.files.length > 0
      ? fileInput.files[0]
      : null;

    if (selectedFile) {
      // تبدیل عکس به base64 با استفاده از API استاندارد مرورگر (file.arrayBuffer)
      selectedFile
        .arrayBuffer()
        .then(function (buffer) {
          var bytes = new Uint8Array(buffer);
          var binary = "";
          for (var j = 0; j < bytes.length; j++) {
            binary += String.fromCharCode(bytes[j]);
          }
          fields.imageData =
            "data:" + selectedFile.type + ";base64," + btoa(binary);
          submitOrder(fields);
        })
        .catch(function () {
          // اگر خواندن عکس ممکن نبود، بدون عکس ارسال کن
          submitOrder(fields);
        });
    } else {
      submitOrder(fields);
    }
  });
})();