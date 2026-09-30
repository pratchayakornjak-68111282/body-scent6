/* ==========================================================
   Body Scent — script.js
   ไฟล์เดียวใช้ร่วมทุกหน้า: ตรวจจาก element ที่มีในหน้านั้น
   แล้วรันเฉพาะฟังก์ชันที่เกี่ยวข้อง
   ========================================================== */

(function () {
  "use strict";

  var STORAGE_KEY = "bodyScentOrders";
  var MOODS = ["fresh", "sweet", "confident", "romance"];
  var MOOD_LABELS = {
    fresh: "Fresh",
    sweet: "Sweet",
    confident: "Confident",
    romance: "Romance"
  };
  var TYPE_LABELS = { spray: "สเปรย์ฉีดตัว", rollon: "โรลออน" };

  /* ---------- Helpers ---------- */

  function $(selector) {
    return document.querySelector(selector);
  }

  function formatPrice(value) {
    var n = Number(value);
    return isNaN(n) ? String(value) : n.toLocaleString("th-TH");
  }

  // เติมค่าลง element ได้ทั้ง input/textarea (value) และ element ทั่วไป (textContent)
  function setFieldValue(el, value) {
    if (!el) return;
    if ("value" in el) {
      el.value = value;
    } else {
      el.textContent = value;
    }
  }

  function getFieldValue(el) {
    if (!el) return "";
    return ("value" in el ? el.value : el.textContent || "").trim();
  }

  // อ่านค่าจาก form ด้วย name ก่อน ถ้าไม่มีค่อยลองหา id
  function readField(form, name) {
    var el = form.elements[name] || document.getElementById(name);
    return getFieldValue(el);
  }

  function readOrders() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error("อ่านข้อมูลคำสั่งซื้อไม่สำเร็จ:", err);
      return [];
    }
  }

  /* ==========================================================
     product.html
     ========================================================== */

  function initProductPage(listEl) {
    var filterBar = $("#filter-bar");
    var products = [];
    var currentMood = "all";

    // mood จาก URL เช่น ?mood=fresh (ถ้าไม่ถูกต้องให้ใช้ "all")
    var moodParam = (new URLSearchParams(window.location.search).get("mood") || "")
      .toLowerCase();
    if (MOODS.indexOf(moodParam) !== -1) currentMood = moodParam;

    function buildFilterBar() {
      if (!filterBar) return;

      // ถ้า HTML ยังไม่มีปุ่ม ให้สร้างให้อัตโนมัติ
      if (!filterBar.querySelector("[data-mood]")) {
        var options = ["all"].concat(MOODS);
        options.forEach(function (mood) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "chip";
          btn.setAttribute("data-mood", mood);
          if (mood !== "all") {
            var dot = document.createElement("span");
            dot.className = "mood-dot mood-" + mood;
            btn.appendChild(dot);
          }
          btn.appendChild(
            document.createTextNode(mood === "all" ? "ทั้งหมด" : MOOD_LABELS[mood])
          );
          filterBar.appendChild(btn);
        });
      }

      filterBar.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-mood]");
        if (!btn || !filterBar.contains(btn)) return;
        currentMood = btn.getAttribute("data-mood");
        updateUrl();
        render();
      });
    }

    function updateUrl() {
      if (!window.history || !window.history.replaceState) return;
      var url = new URL(window.location.href);
      if (currentMood === "all") {
        url.searchParams.delete("mood");
      } else {
        url.searchParams.set("mood", currentMood);
      }
      window.history.replaceState(null, "", url);
    }

    function updateActiveButton() {
      if (!filterBar) return;
      var buttons = filterBar.querySelectorAll("[data-mood]");
      Array.prototype.forEach.call(buttons, function (btn) {
        var active = btn.getAttribute("data-mood") === currentMood;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    function createCard(p) {
      var sizeText = p.size ? " " + p.size : "";
      var itemLabel = p.name + sizeText;
      var orderUrl =
        "order.html?item=" +
        encodeURIComponent(itemLabel) +
        "&price=" +
        encodeURIComponent(p.price);

      var card = document.createElement("article");
      card.className = "product-card mood-" + p.mood;

      // รูป
      var media = document.createElement("div");
      media.className = "product-card__media";
      var img = document.createElement("img");
      img.src = p.image;
      img.alt = p.name;
      img.loading = "lazy";
      media.appendChild(img);

      // เนื้อหา
      var body = document.createElement("div");
      body.className = "product-card__body";

      var moodRow = document.createElement("div");
      moodRow.className = "product-card__mood";
      var dot = document.createElement("span");
      dot.className = "mood-dot";
      var moodText = document.createElement("span");
      moodText.textContent = MOOD_LABELS[p.mood] || p.mood;
      moodRow.appendChild(dot);
      moodRow.appendChild(moodText);

      var name = document.createElement("h3");
      name.className = "product-card__name";
      name.textContent = p.name;

      var meta = document.createElement("p");
      meta.className = "product-card__meta";
      meta.textContent = (TYPE_LABELS[p.type] || p.type) + (p.size ? " · " + p.size : "");

      var desc = document.createElement("p");
      desc.className = "product-card__desc";
      desc.textContent = p.description || "";

      // ราคา + ปุ่ม
      var footer = document.createElement("div");
      footer.className = "product-card__footer";

      var price = document.createElement("span");
      price.className = "price";
      price.textContent = formatPrice(p.price);
      var unit = document.createElement("small");
      unit.textContent = "บาท";
      price.appendChild(unit);

      var btn = document.createElement("a");
      btn.className = "btn btn--small";
      btn.href = orderUrl;
      btn.textContent = "สั่งซื้อ";

      footer.appendChild(price);
      footer.appendChild(btn);

      body.appendChild(moodRow);
      body.appendChild(name);
      body.appendChild(meta);
      body.appendChild(desc);
      body.appendChild(footer);

      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function showMessage(text) {
      listEl.innerHTML = "";
      var msg = document.createElement("p");
      msg.className = "muted text-center";
      msg.textContent = text;
      listEl.appendChild(msg);
    }

    function render() {
      updateActiveButton();
      var visible = products.filter(function (p) {
        return currentMood === "all" || p.mood === currentMood;
      });

      if (!visible.length) {
        showMessage("ไม่พบสินค้า");
        return;
      }

      listEl.innerHTML = "";
      var fragment = document.createDocumentFragment();
      visible.forEach(function (p) {
        fragment.appendChild(createCard(p));
      });
      listEl.appendChild(fragment);
    }

    buildFilterBar();
    updateActiveButton();

    fetch("products.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = Array.isArray(data) ? data : [];
        render();
      })
      .catch(function (err) {
        console.error("โหลด products.json ไม่สำเร็จ:", err);
        showMessage(
          "โหลดข้อมูลสินค้าไม่สำเร็จ (หากเปิดไฟล์โดยตรง ให้รันผ่าน local server เช่น Live Server)"
        );
      });
  }

  /* ==========================================================
     order.html
     ========================================================== */

  function initOrderPage(form) {
    var params = new URLSearchParams(window.location.search);
    var itemsEl = $("#items");
    var totalEl = $("#total");

    // เติมทั้ง #items และ #total เสมอ (ถ้าไม่มี param ให้เป็นค่าว่าง)
    setFieldValue(itemsEl, params.get("item") || "");
    setFieldValue(totalEl, params.get("price") || "");

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        return;
      }

      var payload = {
        customerName: readField(form, "customerName"),
        contact: readField(form, "contact"),
        items: getFieldValue(itemsEl),
        total: getFieldValue(totalEl),
        note: readField(form, "note"),
        timestamp: new Date().toISOString()
      };

      try {
        var orders = readOrders();
        orders.push(payload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      } catch (err) {
        console.error("บันทึกคำสั่งซื้อไม่สำเร็จ:", err);
        alert("บันทึกคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      window.location.href = "thankyou.html";
    });
  }

  /* ==========================================================
     admin.html
     ========================================================== */

  function initAdminPage(table) {
    var tbody = table.querySelector("tbody");
    if (!tbody) return;

    var orders = readOrders().slice().sort(function (a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    tbody.innerHTML = "";

    if (!orders.length) {
      var headCells = table.querySelectorAll("thead th").length || 6;
      var emptyRow = document.createElement("tr");
      var emptyCell = document.createElement("td");
      emptyCell.colSpan = headCells;
      emptyCell.className = "text-center muted";
      emptyCell.textContent = "ยังไม่มีคำสั่งซื้อ";
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
      return;
    }

    function formatDate(ts) {
      var d = new Date(ts);
      return isNaN(d.getTime()) ? "-" : d.toLocaleString("th-TH");
    }

    function formatTotal(total) {
      if (total === "" || total === null || total === undefined) return "-";
      var n = Number(total);
      return isNaN(n) ? String(total) : formatPrice(n) + " บาท";
    }

    // ลำดับคอลัมน์: วันที่ | ชื่อลูกค้า | ช่องทางติดต่อ | รายการ | ยอดรวม | หมายเหตุ
    var fragment = document.createDocumentFragment();
    orders.forEach(function (o) {
      var tr = document.createElement("tr");
      [
        formatDate(o.timestamp),
        o.customerName || "-",
        o.contact || "-",
        o.items || "-",
        formatTotal(o.total),
        o.note || "-"
      ].forEach(function (text) {
        var td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
      });
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
  }

  /* ==========================================================
     Init — เลือกรันตาม element ที่มีในหน้า
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    var productList = $("#product-list");
    var orderForm = $("#orderForm");
    var ordersTable = $("#ordersTable");

    if (productList) initProductPage(productList);
    if (orderForm) initOrderPage(orderForm);
    if (ordersTable) initAdminPage(ordersTable);
  });
})();
