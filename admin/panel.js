// ─── پنل مدیریت چوب‌ساب — منطق (موبایل) ───
(function () {
  "use strict";

  // ─── ترجمه وضعیت‌ها به فارسی ───
  var ORDER_STATUS = {
    pending: "در انتظار بررسی",
    paid: "پرداخت شده",
    confirmed: "تایید شده",
    shipped: "ارسال شده",
    delivered: "تحویل شده",
    cancelled: "لغو شده",
  };
  var CUSTOM_STATUS = {
    "new": "جدید",
    "in-progress": "در حال ساخت",
    done: "تکمیل شده",
    cancelled: "لغو شده",
  };

  // ─── ابزار ارتباط با API — همه درخواست‌ها هدر CSRF دارند ───
  function api(url, options) {
    options = options || {};
    options.headers = Object.assign(
      { "X-Requested-With": "XMLHttpRequest" },
      options.headers || {}
    );
    if (options.body && typeof options.body !== "string") {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    return fetch(url, options).then(function (res) {
      if (res.status === 401) {
        window.location.href = "login.html";
        throw new Error("unauthorized");
      }
      return res.json();
    });
  }

  function $(id) { return document.getElementById(id); }

  function toast(msg, isError) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast show" + (isError ? " error" : "");
    setTimeout(function () { t.className = "toast" + (isError ? " error" : ""); }, 2600);
  }

  function faDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("fa-IR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      });
    } catch (e) { return iso || "—"; }
  }

    function faMoney(n) { return Number(n || 0).toLocaleString("fa-IR"); }

  // نمایش نام کاربر (هر دو فیلد اجباری‌اند؛ در صورت خالی بودن، عارضه نمایش داده می‌شود)
  function faName(s) {
    var v = String(s || "").trim();
    return v ? v : "—";
  }


  // مسیر عکس‌ها را مطلق می‌کند — چون پنل در /admin/ است، مسیرهای نسبی
  // مثل "assets/images/x.jpg" به /admin/assets/... ترجمه می‌شوند و 404 می‌خورند
  function imgUrl(src) {
    var s = String(src || "").trim();
    if (!s) return "";
    if (s.indexOf("/") === 0 || s.indexOf("http://") === 0 || s.indexOf("https://") === 0 || s.indexOf("data:") === 0) return s;
    return "/" + s;
  }

  function badge(status, map) {
    return '<span class="status-badge st-' + status + '">' + (map[status] || status) + "</span>";
  }

  // ─── مدیریت تب‌ها ───
  var tabs = document.querySelectorAll(".tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.classList.remove("active"); });
      document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
      tab.classList.add("active");
      $("tab-" + tab.dataset.tab).classList.add("active");
    });
  });

  // ─── کش داده‌ها برای مودال جزئیات ───
  var ordersCache = {}, customCache = {};

  // ─── حالت افزودن/ویرایش محصول ───
  var productsCache = [], categoriesCache = [];
  var productFormMode = "create"; // create | edit
  var productEditId = null;
  var uploadedImagePaths = []; // آدرس عکس‌های انتخاب‌شده در فرم محصول

  // ─── داشبورد ───
  function loadStats() {
    api("/api/admin/stats").then(function (data) {
      if (!data.success) return;
      $("statTotalOrders").textContent = faMoney(data.stats.totalOrders);
      $("statPendingOrders").textContent = faMoney(data.stats.pendingOrders);
      $("statPaidOrders").textContent = faMoney(data.stats.paidOrders);
      $("statTotalCustom").textContent = faMoney(data.stats.totalCustom);
      $("statNewCustom").textContent = faMoney(data.stats.newCustom);
            $("statRevenue").textContent = faMoney(data.stats.revenue);
      $("statTotalUsers").textContent = faMoney(data.stats.totalUsers);
    });
  }

  // ─── سفارشات فروشگاه — نمایش کارتی برای موبایل ───
  function loadOrders() {
    var filter = $("ordersFilter").value;
    var url = "/api/admin/orders" + (filter ? "?status=" + encodeURIComponent(filter) : "");
    api(url).then(function (data) {
      var box = $("ordersBody");
      if (!data.success || data.orders.length === 0) {
        box.innerHTML = '<div class="empty">هنوز سفارشی ثبت نشده است.</div>';
        return;
      }
      ordersCache = {};
      box.innerHTML = data.orders.map(function (o) {
        ordersCache[o.id] = o;
        var c = o.customerInfo || {};
        return (
          '<div class="card">' +
          '<div class="card-head">' +
          '<span class="card-code">' + o.orderId + "</span>" + badge(o.status, ORDER_STATUS) +
          "</div>" +
          '<div class="card-row"><span>👤 ' + c.fullName + "</span><span>📞 " + c.phone + "</span></div>" +
          '<div class="card-row"><span>💰 ' + faMoney(o.totalPrice) + " تومان</span><span>🕒 " + faDate(o.createdAt) + "</span></div>" +
          '<div class="card-actions">' +
          '<select data-id="' + o.id + '" class="order-status">' +
          Object.keys(ORDER_STATUS).map(function (s) {
            return '<option value="' + s + '"' + (s === o.status ? " selected" : "") + ">" + ORDER_STATUS[s] + "</option>";
          }).join("") +
          "</select>" +
          '<button class="detail-btn" data-type="order" data-id="' + o.id + '">جزئیات کامل</button>' +
          "</div></div>"
        );
      }).join("");
    });
  }

  // ─── سفارشات سفارشی — نمایش کارتی برای موبایل ───
  function loadCustom() {
    var filter = $("customFilter").value;
    var url = "/api/admin/custom-orders" + (filter ? "?status=" + encodeURIComponent(filter) : "");
    api(url).then(function (data) {
      var box = $("customBody");
      if (!data.success || data.customOrders.length === 0) {
        box.innerHTML = '<div class="empty">هنوز سفارش سفارشی ثبت نشده است.</div>';
        return;
      }
      customCache = {};
      box.innerHTML = data.customOrders.map(function (o) {
        customCache[o.id] = o;
        return (
          '<div class="card">' +
          '<div class="card-head">' +
          '<span class="card-code">' + o.requestId + "</span>" + badge(o.status, CUSTOM_STATUS) +
          "</div>" +
          '<div class="card-row"><span>👤 ' + o.fullName + "</span><span>🎨 " + o.subject + "</span></div>" +
          '<div class="card-row"><span>💵 بودجه: ' + (o.budget || "—") + "</span><span>🕒 " + faDate(o.createdAt) + "</span></div>" +
          '<div class="card-actions">' +
          '<select data-id="' + o.id + '" class="custom-status">' +
          Object.keys(CUSTOM_STATUS).map(function (s) {
            return '<option value="' + s + '"' + (s === o.status ? " selected" : "") + ">" + CUSTOM_STATUS[s] + "</option>";
          }).join("") +
          "</select>" +
          '<button class="detail-btn" data-type="custom" data-id="' + o.id + '">جزئیات کامل</button>' +
          "</div></div>"
        );
            }).join("");
    });
  }

  // ─── کاربران ثبت‌نامی ───
  function loadUsers() {
    var search = $("usersSearch");
    var q = search ? search.value.trim() : "";
    var url = "/api/admin/users";
    api(url).then(function (data) {
      var box = $("usersBody");
      if (!data.success || data.users.length === 0) {
        box.innerHTML = '<div class="empty">هنوز کاربری ثبت‌نام نکرده است.</div>';
        return;
      }
      var users = data.users;
      if (q) {
        var ql = q.toLowerCase();
        users = users.filter(function (u) {
          return (
            (u.phone && u.phone.indexOf(q) > -1) ||
            (u.firstName && u.firstName.toLowerCase().indexOf(ql) > -1) ||
            (u.lastName && u.lastName.toLowerCase().indexOf(ql) > -1)
          );
        });
      }
      if (users.length === 0) {
        box.innerHTML = '<div class="empty">کاربری یافت نشد.</div>';
        return;
      }
      box.innerHTML = users.map(function (u) {
        var ordersLabel = u.orderCount > 0 ? u.orderCount + " سفارش" : "بدون سفارش";
        return (
          '<div class="card">' +
          '<div class="card-head">' +
          '<span class="profile-name-display">' +
          faName(u.firstName) + " " + faName(u.lastName) +
          "</span>" +
          '<span class="profile-phone-display" dir="ltr">' + (u.phone || "") + "</span>" +
          "</div>" +
          '<div class="card-row"><span>🛒 ' + ordersLabel + "</span>" +
          '<span>💰 ' + faMoney(u.totalSpent) + " تومان</span></div>" +
          '<div class="card-row"><span>📅 ' + faDate(u.createdAt) + "</span></div>" +
          "</div>"
        );
      }).join("");
    });
  }

  // ─── دسته‌بندی‌ها ───
  function loadCategoriesList() {
    api("/api/admin/categories").then(function (data) {
      if (!data.success) return;
      categoriesCache = data.categories || [];
      renderCategoryOptions();

      // رندر لیست در مودال مدیریت دسته‌بندی
      var list = $("catList");
      if (list) {
        list.innerHTML = categoriesCache
          .map(function (c) {
            return (
              '<div class="cat-row">' +
              "<span>" +
              (c.icon ? '<i class="' + c.icon + '"></i> ' : "") +
              "<strong>" + c.name + "</strong>" +
              ' <em>(' + c.productCount + " محصول)</em></span>" +
              '<button class="btn-del-cat" data-id="' + c.id + '" title="حذف">🗑</button>' +
              "</div>"
            );
          })
          .join("");
      }
      // اگر لیست خالی بود
      if (categoriesCache.length === 0 && list) {
        list.innerHTML = '<div class="empty">هنوز دسته‌بندی‌ای ساخته نشده است.</div>';
      }
    });
  }

  // پر کردن کشوی دسته‌ها در فرم محصول و فیلتر
  function renderCategoryOptions() {
    var sel = $("pfCategory");
    var filter = $("productsFilter");
    if (!sel && !filter) return;

    var opts = categoriesCache
      .map(function (c) {
        return '<option value="' + c.id + '">' + c.name + "</option>";
      })
      .join("");

    if (sel) {
      var prev = sel.value;
      sel.innerHTML = opts;
      if (prev) sel.value = prev;
    }
    if (filter) {
      var prevF = filter.value;
      filter.innerHTML = '<option value="">همه دسته‌ها</option>' + opts;
      if (prevF) filter.value = prevF;
    }
  }

  // ─── محصولات ───
  function loadProducts() {
    var catFilter = $("productsFilter").value;
    api("/api/admin/products").then(function (data) {
      var box = $("productsBody");
      if (!data.success) return;
      productsCache = data.products || [];

      var list = catFilter
        ? productsCache.filter(function (p) { return String(p.category_id) === catFilter; })
        : productsCache;

      if (list.length === 0) {
        box.innerHTML =
          '<div class="empty">' +
          (catFilter
            ? "در این دسته محصولی نیست."
            : "هنوز محصولی ثبت نشده است. دکمه «➕ محصول جدید» را بزنید.") +
          "</div>";
        return;
      }

      box.innerHTML = list
        .map(function (p) {
          var img = imgUrl(p.images && p.images[0] ? p.images[0] : "");
          var thumb = img
            ? '<img class="p-thumb" src="' + img + '" alt="" />'
            : '<div class="p-thumb p-thumb-empty">🪵</div>';
          var isActive = p.active ? "st-confirmed" : "st-cancelled";
          return (
            '<div class="card product-card" data-id="' + p.id + '">' +
            '<div class="card-head">' +
            '<span class="card-code">' + p.name + "</span>" +
            '<span class="status-badge ' + isActive + '">' + (p.active ? "فعال" : "غیرفعال") + "</span>" +
            "</div>" +
            '<div class="p-row">' +
            thumb +
            '<div class="p-info">' +
            '<div><span class="k">قیمت:</span> ' + faMoney(p.price) + " تومان</div>" +
            '<div><span class="k">دسته:</span> ' + (p.categoryName || "—") + "</div>" +
            '<div><span class="k">چوب:</span> ' + (p.wood_type || "—") +
            ' | <span class="k">موجودی:</span> ' + faMoney(p.stock) + "</div>" +
            '<div class="p-slug">' + p.slug + "</div>" +
            "</div>" +
            "</div>" +
            '<div class="card-actions">' +
            '<button class="detail-btn edit-product" data-id="' + p.id + '">✏️ ویرایش</button>' +
            '<button class="detail-btn delete-product" data-id="' + p.id + '">🗑 حذف</button>' +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    });
  }

  // ─── فرم محصول — باز کردن (برای افزودن/ویرایش) ───
  function openProductForm(id) {
    productFormMode = id ? "edit" : "create";
    productEditId = id || null;
    var p = id
      ? productsCache.find(function (x) { return String(x.id) === String(id); })
      : null;

    $("pfTitle").textContent = p ? "✏️ ویرایش محصول" : "➕ افزودن محصول جدید";
    $("pfName").value = p ? p.name : "";
    $("pfSlug").value = p ? p.slug : "";
    $("pfPrice").value = p ? p.price : "";
    $("pfStock").value = p ? p.stock : 0;
    $("pfWood").value = p ? p.wood_type : "";
    $("pfFinish").value = p ? p.finish_type : "";
    $("pfDesc").value = p ? p.description : "";
    $("pfActive").checked = p ? !!p.active : true;
    $("pfError").textContent = "";

    if (p) {
      var catSel = $("pfCategory");
      if (catSel && categoriesCache.length) {
        catSel.value = String(p.category_id);
      }
    } else if (categoriesCache.length && !$("pfCategory").value) {
      $("pfCategory").value = String(categoriesCache[0].id);
    }

    uploadedImagePaths = p && Array.isArray(p.images) ? p.images.slice() : [];
    renderUploadedThumbs();
    $("productOverlay").classList.add("show");
  }

  function renderUploadedThumbs() {
    var box = $("pfThumbs");
    if (!box) return;
    box.innerHTML = uploadedImagePaths
      .map(function (src, i) {
        return (
          '<div class="thumb-item">' +
          '<img src="' + imgUrl(src) + '" alt="" />' +
          '<button type="button" class="thumb-remove" data-index="' + i + '">✕</button>' +
          "</div>"
        );
      })
      .join("");
  }

  // آپلود عکس‌ها به سرور → افزودن آدرس به لیست تصاویر
  function handleImageUpload(files) {
    var fileList = Array.prototype.slice.call(files || []);
    fileList.forEach(function (file) {
      if (!file.type || !file.type.startsWith("image/")) {
        toast("فقط فایل تصویری مجاز است.", true);
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        api("/api/admin/upload", { method: "POST", body: { dataUrl: reader.result } })
          .then(function (d) {
            if (d.success) {
              uploadedImagePaths.push(d.path);
              renderUploadedThumbs();
            } else {
              toast(d.message || "خطا در آپلود تصویر.", true);
            }
          })
          .catch(function () { toast("خطا در آپلود تصویر.", true); });
      };
      reader.onerror = function () { toast("خطا در خواندن فایل.", true); };
      reader.readAsDataURL(file);
    });
    if (fileList.length) $("pfImages").value = "";
  }

  // ارسال فرم محصول (افزودن یا ویرایش)
  function submitProduct() {
    var name = $("pfName").value.trim();
    if (!name) {
      $("pfError").textContent = "نام محصول را وارد کنید.";
      return;
    }
    if (!categoriesCache.length) {
      $("pfError").textContent = "ابتدا یک دسته‌بندی بسازید.";
      return;
    }
    var body = {
      name: name,
      slug: $("pfSlug").value.trim(),
      categoryId: $("pfCategory").value,
      price: Number($("pfPrice").value) || 0,
      stock: Number($("pfStock").value) || 0,
      woodType: $("pfWood").value.trim(),
      finishType: $("pfFinish").value.trim(),
      description: $("pfDesc").value.trim(),
      active: $("pfActive").checked,
      images: uploadedImagePaths,
    };

    var url = productFormMode === "edit"
      ? "/api/admin/products/" + productEditId
      : "/api/admin/products";
    var method = productFormMode === "edit" ? "PUT" : "POST";

    api(url, { method: method, body: body })
      .then(function (d) {
        if (d.success) {
          $("productOverlay").classList.remove("show");
          toast(d.message || "ذخیره شد ✅");
          loadProducts();
        } else {
          $("pfError").textContent = d.message || "خطا در ذخیره.";
        }
      })
      .catch(function () { $("pfError").textContent = "ارتباط با سرور برقرار نشد."; });
  }

  // ─── مودال جزئیات ───
  function openModal(title, html) {
    $("modalTitle").textContent = title;
    $("modalBody").innerHTML = html;
    $("modalOverlay").classList.add("show");
  }
  function closeModals() {
    $("modalOverlay").classList.remove("show");
    $("passOverlay").classList.remove("show");
    $("productOverlay").classList.remove("show");
    $("catOverlay").classList.remove("show");
  }
  function rows(pairs) {
    return pairs.map(function (p) {
      return '<div class="detail-row"><span class="k">' + p[0] + '</span><span class="v">' + (p[1] || "—") + "</span></div>";
    }).join("");
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".detail-btn");
    if (!btn) return;
    if (btn.dataset.type === "order") {
      var o = ordersCache[btn.dataset.id];
      if (!o) return;
      var c = o.customerInfo || {};
      var itemsHtml = (o.items || []).map(function (it) {
        return '<div class="detail-row"><span class="k">' + it.name + '</span><span class="v">تعداد: ' + (it.quantity || 1) + " — " + faMoney(it.price) + " تومان</span></div>";
      }).join("");
      var trackingHtml =
        '<div class="post-tracking-box">' +
        '<label class="post-tracking-label">کد رهگیری اداره پست</label>' +
        '<div class="post-tracking-row">' +
        '<input type="text" class="post-tracking-input" id="postTrackingInput" placeholder="مثال: 123456789012" value="' + (o.postTrackingCode || "") + '" />' +
        '<button class="btn-save-tracking" data-id="' + o.id + '">💾 ثبت و ارسال پیامک</button>' +
        '</div>' +
        (o.postTrackingCode ? '<span class="tracking-saved">✅ ثبت شده: ' + o.postTrackingCode + '</span>' : "") +
        '</div>';
      var paymentInfo = "";
      if (o.status === "paid") {
        paymentInfo = '<div class="payment-badge paid">✅ پرداخت آنلاین (موفق)</div>' +
          (o.paymentRefId ? '<div class="payment-ref">شماره پیگیری بانکی: ' + o.paymentRefId + '</div>' : "");
      } else {
        paymentInfo = '<div class="payment-badge pending">⏳ در انتظار پرداخت</div>';
      }
      openModal("سفارش " + o.orderId,
        rows([["نام مشتری", c.fullName], ["تلفن", c.phone], ["آدرس", c.address], ["تاریخ ثبت", faDate(o.createdAt)], ["مبلغ کل", faMoney(o.totalPrice) + " تومان"], ["وضعیت", ORDER_STATUS[o.status]]]) +
        paymentInfo +
        (itemsHtml ? '<h4 class="section-title">اقلام سفارش</h4>' + itemsHtml : "") +
        trackingHtml +
        '<button class="btn-print-receipt" data-id="' + o.id + '"><i class="fas fa-receipt"></i> چاپ فاکتور</button>');
    } else {
      var co = customCache[btn.dataset.id];
      if (!co) return;
      var img = co.imagePath ? '<img class="preview" src="' + imgUrl(co.imagePath) + '" alt="تصویر سفارش" />' : "";
      openModal("سفارش سفارشی " + co.requestId,
        rows([["نام", co.fullName], ["تلفن", co.phoneNumber], ["ایمیل", co.email], ["وبسایت", co.website], ["موضوع", co.subject], ["نوع چوب", co.woodType], ["بودجه", co.budget], ["تاریخ", faDate(co.createdAt)], ["وضعیت", CUSTOM_STATUS[co.status]], ["توضیحات", co.description]]) + img);
    }
  });

  // ─── تغییر وضعیت از طریق منوی کشویی ───
  document.addEventListener("change", function (e) {
    var sel = e.target;
    if (sel.classList.contains("order-status") || sel.classList.contains("custom-status")) {
      var url = sel.classList.contains("order-status")
        ? "/api/admin/orders/" + sel.dataset.id + "/status"
        : "/api/admin/custom-orders/" + sel.dataset.id + "/status";
      api(url, { method: "PATCH", body: { status: sel.value } })
        .then(function (data) {
          toast(data.message || "ثبت شد.", !data.success);
          loadStats();
        })
        .catch(function () { toast("خطا در ثبت وضعیت", true); });
    }
  });

  // ─── کلیک روی ویرایش/حذف محصول و حذف دسته‌بندی و حذف تصویر ───
  document.addEventListener("click", function (e) {
    var editBtn = e.target.closest(".edit-product");
    if (editBtn) {
      openProductForm(editBtn.dataset.id);
      return;
    }

    var delBtn = e.target.closest(".delete-product");
    if (delBtn) {
      var delProd = productsCache.find(function (x) { return String(x.id) === String(delBtn.dataset.id); });
      var delName = delProd ? delProd.name : "این محصول";
      if (!window.confirm('محصول «' + delName + "» حذف شود؟")) return;
      api("/api/admin/products/" + delBtn.dataset.id, { method: "DELETE" })
        .then(function (d) {
          toast(d.message || "محصول حذف شد.", !d.success);
          loadProducts();
        })
        .catch(function () { toast("خطا در حذف محصول.", true); });
      return;
    }

    var delCatBtn = e.target.closest(".btn-del-cat");
    if (delCatBtn) {
      if (!window.confirm("این دسته‌بندی حذف شود؟")) return;
      api("/api/admin/categories/" + delCatBtn.dataset.id, { method: "DELETE" })
        .then(function (d) {
          toast(d.message || "دسته‌بندی حذف شد.", !d.success);
          loadCategoriesList();
          loadProducts();
        })
        .catch(function () { toast("خطا در حذف دسته‌بندی.", true); });
      return;
    }

    var removeThumb = e.target.closest(".thumb-remove");
    if (removeThumb) {
      var idx = Number(removeThumb.dataset.index);
      uploadedImagePaths.splice(idx, 1);
      renderUploadedThumbs();
    }

    // ─── ثبت کد رهگیری پست ───
    var saveTracking = e.target.closest(".btn-save-tracking");
    if (saveTracking) {
      var orderId = saveTracking.dataset.id;
      var input = document.getElementById("postTrackingInput");
      var code = (input ? input.value : "").trim();
      if (!code) { toast("کد رهگیری پست را وارد کنید.", true); return; }
      api("/api/admin/orders/" + orderId + "/post-tracking", {
        method: "PATCH",
        body: { postTrackingCode: code },
      })
        .then(function (d) {
          if (d.success) {
            toast("کد رهگیری پست ثبت شد ✅");
            // به‌روزرسانی کش و رنر مجدد
            var ord = ordersCache[orderId];
            if (ord) ord.postTrackingCode = code;
            loadOrders();
          } else {
            toast(d.message || "خطا در ثبت کد.", true);
          }
        })
        .catch(function () { toast("ارتباط با سرور برقرار نشد.", true); });
      return;
    }

    // ─── چاپ فاکتور ───
    var printReceipt = e.target.closest(".btn-print-receipt");
    if (printReceipt) {
      var ordData = ordersCache[printReceipt.dataset.id];
      if (!ordData) return;
      var c2 = ordData.customerInfo || {};
      var itemsText = (ordData.items || []).map(function (it) {
        return (it.name || "محصول") + " × " + (it.quantity || 1) + " = " + faMoney(Number(it.price) * (it.quantity || 1)) + " تومان";
      }).join("\n");
      var receiptHtml =
        '<html dir="rtl"><head><title>فاکتور ' + ordData.orderId + '</title>' +
        '<style>body{font-family:Vazirmatn,sans-serif;direction:rtl;padding:30px;max-width:600px;margin:0 auto;}' +
        'h2{color:#af6c54;border-bottom:2px solid #af6c54;padding-bottom:10px;}' +
        '.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;}' +
        '.total{font-size:18px;font-weight:700;color:#27ae60;border-top:2px solid #af6c54;padding-top:10px;margin-top:10px;}' +
        '.tracking{font-size:20px;font-weight:700;text-align:center;margin:20px 0;padding:15px;border:2px dashed #af6c54;}' +
        'pre{white-space:pre-wrap;font-family:inherit;margin:0;}</style></head><body>' +
        '<h2>🪵 چوب‌ساب — فاکتور خرید</h2>' +
        '<div class="row"><span>کد پیگیری</span><strong>' + ordData.orderId + '</strong></div>' +
        '<div class="row"><span>نام خریدار</span><strong>' + (c2.fullName || "—") + '</strong></div>' +
        '<div class="row"><span>تلفن</span><strong>' + (c2.phone || "—") + '</strong></div>' +
        '<div class="row"><span>آدرس</span><strong>' + (c2.address || "—") + '</strong></div>' +
        '<div class="row"><span>تاریخ</span><strong>' + faDate(ordData.createdAt) + '</strong></div>' +
        '<hr><pre>' + itemsText + '</pre>' +
        '<div class="row total"><span>مبلغ کل</span><span>' + faMoney(ordData.totalPrice) + ' تومان</span></div>' +
        (ordData.postTrackingCode ? '<div class="tracking">📮 کد رهگیری پست: ' + ordData.postTrackingCode + '</div>' : '') +
        '<p style="text-align:center;color:#999;margin-top:30px;font-size:12px;">با تشکر از خرید شما — چوب‌ساب</p>' +
        '</body></html>';
      var printWin = window.open("", "_blank");
      if (printWin) {
        printWin.document.write(receiptHtml);
        printWin.document.close();
        printWin.focus();
        setTimeout(function () { printWin.print(); }, 400);
      } else {
        toast("لطفاً اجازه پاپ‌آپ را بدهید.", true);
      }
      return;
    }
  });

  // ─── تغییر رمز عبور ───
  $("changePassBtn").addEventListener("click", function () {
    $("passOverlay").classList.add("show");
    $("passError").textContent = "";
  });
  $("passSaveBtn").addEventListener("click", function () {
    var cur = $("currentPass").value, np = $("newPass").value, np2 = $("newPass2").value;
    if (!cur || !np) { $("passError").textContent = "همه فیلدها را پر کنید."; return; }
    if (np.length < 8) { $("passError").textContent = "رمز جدید باید حداقل ۸ کاراکتر باشد."; return; }
    if (np !== np2) { $("passError").textContent = "تکرار رمز جدید مطابقت ندارد."; return; }
    api("/api/admin/change-password", { method: "POST", body: { currentPassword: cur, newPassword: np } })
      .then(function (data) {
        if (data.success) {
          $("passOverlay").classList.remove("show");
          $("currentPass").value = $("newPass").value = $("newPass2").value = "";
          toast("رمز عبور با موفقیت تغییر کرد ✅");
        } else {
          $("passError").textContent = data.message || "خطا در تغییر رمز.";
        }
      })
      .catch(function () { $("passError").textContent = "ارتباط با سرور برقرار نشد."; });
  });

  // ─── خروج ───
  $("logoutBtn").addEventListener("click", function () {
    api("/api/admin/logout", { method: "POST" }).then(function () {
      window.location.href = "login.html";
    });
  });

  // ─── بستن مودال‌ها ───
  $("modalClose").addEventListener("click", closeModals);
  $("passClose").addEventListener("click", closeModals);
  $("pfClose").addEventListener("click", closeModals);
  $("catClose").addEventListener("click", closeModals);
  document.querySelectorAll(".modal-overlay").forEach(function (ov) {
    ov.addEventListener("click", function (e) { if (e.target === ov) closeModals(); });
  });

  // ─── محصولات و دسته‌بندی‌ها ───
  $("addProductBtn").addEventListener("click", function () { openProductForm(null); });
  $("manageCatBtn").addEventListener("click", function () {
    $("catOverlay").classList.add("show");
    loadCategoriesList();
  });
  $("productsRefresh").addEventListener("click", loadProducts);
  $("productsFilter").addEventListener("change", loadProducts);
  $("pfSaveBtn").addEventListener("click", submitProduct);
  $("pfImages").addEventListener("change", function (e) { handleImageUpload(e.target.files); });
  $("catAddBtn").addEventListener("click", function () {
    var name = $("catName").value.trim();
    if (!name) { toast("نام دسته‌بندی را وارد کنید.", true); return; }
    api("/api/admin/categories", {
      method: "POST",
      body: { name: name, icon: $("catIcon").value.trim() },
    })
      .then(function (d) {
        if (d.success) {
          $("catName").value = "";
          $("catIcon").value = "";
          toast(d.message || "دسته‌بندی افزوده شد ✅");
          loadCategoriesList();
          loadProducts();
        } else {
          toast(d.message || "خطا در افزودن دسته‌بندی.", true);
        }
      })
      .catch(function () { toast("خطا در ارتباط با سرور.", true); });
  });

  // ─── فیلتر و بروزرسانی ───
  $("ordersFilter").addEventListener("change", loadOrders);
  $("customFilter").addEventListener("change", loadCustom);
  $("ordersRefresh").addEventListener("click", loadOrders);
  $("customRefresh").addEventListener("click", loadCustom);

  // ─── شروع: بررسی نشست + بارگذاری داده‌ها ───
  api("/api/admin/me")
    .then(function (data) {
      $("adminName").textContent = "👤 " + (data.username || "admin");
      loadStats();
      loadOrders();
      loadCustom();
      loadProducts();
      loadCategoriesList();
      loadUsers();
    })
    .catch(function () { /* ریدایرکت به login انجام شده */ });

  // ─── رویدادهای تب‌ها ───
  $("#usersRefresh").addEventListener("click", loadUsers);
  $("#usersSearch").addEventListener("input", loadUsers);
})();


