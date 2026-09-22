(function () {
  "use strict";

  var MENU = window.MENU;
  var CONFIG = window.CONFIG || {};
  var ITEMS = {};
  MENU.items.forEach(function (it) { ITEMS[it.id] = it; });
  var CATS = {};
  MENU.categories.forEach(function (c) { CATS[c.id] = c; });

  // ---------- state ----------
  var state = {
    step: 1,           // 1 menu, 2 review, 3 done
    cart: {},          // id -> qty
    submitting: false,
    lastOrder: null,
  };

  try {
    var saved = JSON.parse(localStorage.getItem("cart") || "{}");
    Object.keys(saved).forEach(function (id) { if (ITEMS[id] && saved[id] > 0) state.cart[id] = saved[id]; });
  } catch (e) { /* ignore */ }

  // ---------- helpers ----------
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var money = function (n) { return "$" + Number(n).toLocaleString("zh-TW"); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function cartLines() {
    return Object.keys(state.cart)
      .filter(function (id) { return state.cart[id] > 0; })
      .map(function (id) { return { item: ITEMS[id], qty: state.cart[id] }; });
  }
  function cartTotal() {
    return cartLines().reduce(function (s, l) { return s + l.item.price * l.qty; }, 0);
  }
  function cartCount() {
    return cartLines().reduce(function (s, l) { return s + l.qty; }, 0);
  }
  function setQty(id, qty) {
    qty = Math.max(0, Math.min(99, qty));
    if (qty === 0) delete state.cart[id]; else state.cart[id] = qty;
    try { localStorage.setItem("cart", JSON.stringify(state.cart)); } catch (e) { /* ignore */ }
    renderQty(id);
    renderBottomBar();
    if (state.step === 2) renderReview();
  }

  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove("is-show"); }, 2200);
  }

  // ---------- render: shared pieces ----------
  function imgHTML(item, cls) {
    if (item.img) return '<div class="item__img ' + (cls || "") + '"><img src="' + item.img + '" alt="' + esc(item.name) + '" loading="lazy" /></div>';
    return '<div class="item__img item__img--ph ' + (cls || "") + '" aria-hidden="true">' + CATS[item.cat].emoji + "</div>";
  }
  function qtyHTML(item) {
    var q = state.cart[item.id] || 0;
    if (q === 0) {
      return '<button class="qty__add" type="button" data-act="add" data-id="' + item.id + '" aria-label="加入' + esc(item.name) + '">+</button>';
    }
    return '<div class="qty__stepper">' +
      '<button class="qty__btn" type="button" data-act="dec" data-id="' + item.id + '" aria-label="減少">−</button>' +
      '<span class="qty__num" aria-live="polite">' + q + "</span>" +
      '<button class="qty__btn" type="button" data-act="inc" data-id="' + item.id + '" aria-label="增加">+</button>' +
      "</div>";
  }
  function itemHTML(item) {
    var q = state.cart[item.id] || 0;
    return '<article class="item' + (q > 0 ? " is-selected" : "") + '" data-item="' + item.id + '">' +
      imgHTML(item) +
      '<div class="item__body">' +
        '<div class="item__name">' + esc(item.name) + (item.tag ? '<span class="item__tag">' + esc(item.tag) + "</span>" : "") + "</div>" +
        (item.en ? '<div class="item__en">' + esc(item.en) + "</div>" : "") +
        (item.note ? '<div class="item__note">' + esc(item.note) + "</div>" : "") +
        '<div class="item__price">' + money(item.price) + "</div>" +
      "</div>" +
      '<div class="qty">' + qtyHTML(item) + "</div>" +
      "</article>";
  }
  function renderQty(id) {
    document.querySelectorAll('[data-item="' + id + '"]').forEach(function (el) {
      el.classList.toggle("is-selected", (state.cart[id] || 0) > 0);
      $(".qty", el).innerHTML = qtyHTML(ITEMS[id]);
    });
  }

  // ---------- render: menu ----------
  function renderMenu() {
    var html = MENU.categories.map(function (c) {
      var items = MENU.items.filter(function (it) { return it.cat === c.id; });
      return '<section class="cat" id="cat-' + c.id + '">' +
        '<div class="cat__head"><h2>' + esc(c.name) + "</h2><span>" + esc(c.en) + "</span></div>" +
        '<div class="items">' + items.map(itemHTML).join("") + "</div>" +
        "</section>";
    }).join("");
    $("#viewMenu").innerHTML = html;

    $("#catTabs").innerHTML = MENU.categories.map(function (c, i) {
      return '<a href="#cat-' + c.id + '" data-cat="' + c.id + '"' + (i === 0 ? ' class="is-active"' : "") + ">" + esc(c.name) + "</a>";
    }).join("");
  }

  // active tab on scroll
  function setupTabObserver() {
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          document.querySelectorAll("#catTabs a").forEach(function (a) {
            var on = a.dataset.cat === en.target.id.replace("cat-", "");
            a.classList.toggle("is-active", on);
            if (on) a.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
          });
        }
      });
    }, { rootMargin: "-80px 0px -70% 0px", threshold: 0 });
    document.querySelectorAll(".cat").forEach(function (s) { io.observe(s); });
  }

  // ---------- render: review ----------
  function renderReview() {
    var lines = cartLines();
    if (lines.length === 0 && state.step === 2) { goStep(1); toast("已清空餐點"); return; }
    $("#reviewList").innerHTML = lines.map(function (l) { return itemHTML(l.item); }).join("");
    $("#reviewTotal").textContent = money(cartTotal());
    $("#sheetHint").hidden = !!CONFIG.APPS_SCRIPT_URL;
  }

  // ---------- bottom bar ----------
  function renderBottomBar() {
    var bar = $("#bottomBar");
    var count = cartCount();
    if (state.step === 3 || count === 0) { bar.hidden = true; return; }
    bar.hidden = false;
    $("#primaryCount").textContent = count + " 項";
    $("#primaryTotal").textContent = money(cartTotal());
    $("#primaryLabel").textContent = state.step === 1 ? "下一步" : (state.submitting ? "送出中…" : "送出訂單");
    $("#primaryBtn").disabled = state.submitting;
  }

  // ---------- steps ----------
  function goStep(n) {
    state.step = n;
    document.body.dataset.step = n;
    $("#viewMenu").hidden = n !== 1;
    $("#viewReview").hidden = n !== 2;
    $("#viewDone").hidden = n !== 3;
    $("#catTabs").hidden = n !== 1;
    $("#backBtn").hidden = n !== 2;
    $("#pageTitle").textContent = n === 1 ? "夏天的尾巴我來了！" : n === 2 ? "確認餐點" : "訂餐完成";
    if (n === 2) renderReview();
    renderBottomBar();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  // ---------- submit ----------
  function submitOrder() {
    var input = $("#familyInput");
    var family = input.value.trim();
    if (!family) {
      input.classList.add("is-invalid");
      $("#familyError").hidden = false;
      input.focus();
      return;
    }
    input.classList.remove("is-invalid");
    $("#familyError").hidden = true;

    var lines = cartLines();
    var now = new Date();
    var order = {
      orderId: fmtDate(now, "id"),
      family: family,
      items: lines.map(function (l) { return { id: l.item.id, name: l.item.name, price: l.item.price, qty: l.qty }; }),
      total: cartTotal(),
      time: now.toISOString(),
    };
    state.lastOrder = order;
    state.submitting = true;
    renderBottomBar();

    var save = CONFIG.APPS_SCRIPT_URL ? postToSheet(order) : Promise.resolve({ ok: false, skipped: true });

    save.then(function (res) {
      finish(order, res);
    }).catch(function (err) {
      finish(order, { ok: false, error: String(err) });
    });
  }

  function postToSheet(order) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000); // Apps Script 冷啟動可能較慢
    return fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // 避免 CORS 預檢
      body: JSON.stringify(order),
      redirect: "follow",
      signal: ctrl ? ctrl.signal : undefined,
    }).then(function (r) { return r.json(); })
      .catch(function (e) { return { ok: false, error: e && e.name === "AbortError" ? "連線逾時" : String(e) }; })
      .finally(function () { clearTimeout(timer); });
  }

  function finish(order, res) {
    state.submitting = false;
    var warn = $("#doneWarn");
    if (res.ok) { warn.hidden = true; }
    else if (res.skipped) { warn.textContent = "⚠️ 尚未連接試算表，僅產生小卡"; warn.hidden = false; }
    else { warn.textContent = "⚠️ 寫入試算表失敗，請下載小卡保存並告知管理者（" + (res.error || "unknown") + "）"; warn.hidden = false; }

    // 本機備份
    try {
      var log = JSON.parse(localStorage.getItem("orders") || "[]");
      log.push(Object.assign({ saved: !!res.ok }, order));
      localStorage.setItem("orders", JSON.stringify(log.slice(-50)));
    } catch (e) { /* ignore */ }

    drawCard(order).then(function (blob) {
      var url = URL.createObjectURL(blob);
      $("#cardImg").src = url;
      var dl = $("#downloadBtn");
      dl.href = url;
      dl.download = order.family + "-訂餐-" + fmtDate(new Date(order.time), "file") + ".png";
    });

    state.cart = {};
    try { localStorage.removeItem("cart"); } catch (e) { /* ignore */ }
    goStep(3);
  }

  function fmtDate(d, mode) {
    var p = function (n) { return String(n).padStart(2, "0"); };
    if (mode === "id") return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
    if (mode === "file") return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
    return d.getFullYear() + "/" + p(d.getMonth() + 1) + "/" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  // ---------- card drawing ----------
  var oceanImg = null;
  function loadOcean() {
    return new Promise(function (resolve) {
      if (oceanImg) return resolve(oceanImg);
      var im = new Image();
      im.onload = function () { oceanImg = im; resolve(im); };
      im.onerror = function () { resolve(null); };
      im.src = "img/ocean.jpg";
    });
  }
  function drawCard(order) {
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return Promise.all([ready, loadOcean()]).then(function (res) {
      var ocean = res[1];
      var W = 1080, pad = 84;
      var lineH = 78;
      var heroH = 520;
      var listH = order.items.length * lineH;
      var H = heroH + 150 + listH + 230;
      var canvas = $("#cardCanvas");
      canvas.width = W; canvas.height = H;
      var ctx = canvas.getContext("2d");
      var sans = '"Jost", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
      var INK = "#151515", MUTED = "#8a8f94", LINE = "#ececec", SEA = "#1b6a99";

      // hero: ocean photo
      ctx.fillStyle = "#1b6a99"; ctx.fillRect(0, 0, W, heroH + 60);
      if (ocean) {
        var sc = Math.max(W / ocean.width, (heroH + 60) / ocean.height);
        var sw = W / sc, sh = (heroH + 60) / sc;
        ctx.drawImage(ocean, (ocean.width - sw) / 2, (ocean.height - sh) * 0.35, sw, sh, 0, 0, W, heroH + 60);
      }
      var shade = ctx.createLinearGradient(0, 0, 0, heroH);
      shade.addColorStop(0, "rgba(0,20,40,0.35)"); shade.addColorStop(0.6, "rgba(0,20,40,0)");
      ctx.fillStyle = shade; ctx.fillRect(0, 0, W, heroH);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "400 26px " + sans; ctx.letterSpacing = "6px";
      ctx.fillText("淺水灣小聚 · 訂餐小卡", pad, 120);
      ctx.letterSpacing = "0px";
      ctx.fillStyle = "#ffffff"; ctx.font = "300 " + fitFont(ctx, order.family, W - pad * 2, 110, 56, sans, "300") + "px " + sans;
      ctx.fillText(order.family, pad - 4, 300);

      // white sheet with rounded top corners
      var top = heroH;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.moveTo(0, top + 44); ctx.arcTo(0, top, 44, top, 44); ctx.lineTo(W - 44, top); ctx.arcTo(W, top, W, top + 44, 44); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

      ctx.fillStyle = INK; ctx.font = "400 30px " + sans; ctx.letterSpacing = "2px";
      ctx.fillText("餐點明細", pad, top + 96);
      ctx.letterSpacing = "0px";
      // wavy underline
      drawWave(ctx, pad, top + 112, 120, SEA);

      ctx.textBaseline = "middle";
      var yy = top + 150 + lineH / 2;
      order.items.forEach(function (it, i) {
        if (i > 0) { ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pad, yy - lineH / 2); ctx.lineTo(W - pad, yy - lineH / 2); ctx.stroke(); }
        ctx.textAlign = "left"; ctx.fillStyle = INK; ctx.font = "400 34px " + sans;
        ctx.fillText(truncate(ctx, it.name, W - pad * 2 - 300), pad, yy);
        ctx.textAlign = "center"; ctx.fillStyle = INK; ctx.font = "300 34px " + sans;
        ctx.fillText("×" + it.qty, W - pad - 190, yy);
        ctx.textAlign = "right"; ctx.fillStyle = MUTED; ctx.font = "300 30px " + sans;
        ctx.fillText(money(it.price * it.qty), W - pad, yy);
        yy += lineH;
      });

      // total
      var ty = top + 150 + listH + 70;
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pad, ty - 50); ctx.lineTo(W - pad, ty - 50); ctx.stroke();
      ctx.textAlign = "left"; ctx.fillStyle = MUTED; ctx.font = "300 28px " + sans;
      ctx.fillText("共 " + order.items.reduce(function (s, i) { return s + i.qty; }, 0) + " 項", pad, ty + 8);
      ctx.textAlign = "right"; ctx.fillStyle = INK; ctx.font = "300 60px " + sans; ctx.fillText(money(order.total), W - pad, ty + 8);

      // footer
      ctx.textAlign = "center"; ctx.fillStyle = MUTED; ctx.font = "300 22px " + sans; ctx.letterSpacing = "4px";
      ctx.fillText(CONFIG.CARD_FOOTER || MENU.store, W / 2, H - 56);
      ctx.letterSpacing = "0px";

      return new Promise(function (resolve) { canvas.toBlob(resolve, "image/png"); });
    });
  }
  function drawWave(ctx, x, y, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x, y);
    for (var i = 0; i <= w; i += 2) ctx.lineTo(x + i, y + Math.sin(i / 6) * 4);
    ctx.stroke();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fitFont(ctx, text, maxW, start, min, family, weight) {
    weight = weight || "900";
    for (var s = start; s > min; s -= 4) { ctx.font = weight + " " + s + "px " + family; if (ctx.measureText(text).width <= maxW) return s; }
    return min;
  }
  function truncate(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    while (text.length > 1 && ctx.measureText(text + "…").width > maxW) text = text.slice(0, -1);
    return text + "…";
  }

  // ---------- events ----------
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var id = btn.dataset.id, q = state.cart[id] || 0;
    if (btn.dataset.act === "add" || btn.dataset.act === "inc") setQty(id, q + 1);
    if (btn.dataset.act === "dec") setQty(id, q - 1);
  });
  $("#catTabs").addEventListener("click", function (e) {
    var a = e.target.closest("a"); if (!a) return;
    e.preventDefault();
    var sec = document.getElementById(a.getAttribute("href").slice(1));
    if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("#primaryBtn").addEventListener("click", function () {
    if (state.step === 1) goStep(2);
    else if (state.step === 2) submitOrder();
  });
  $("#backBtn").addEventListener("click", function () { goStep(1); });
  $("#orderForm").addEventListener("submit", function (e) { e.preventDefault(); submitOrder(); });
  $("#familyInput").addEventListener("input", function () {
    this.classList.remove("is-invalid"); $("#familyError").hidden = true;
  });

  // ---------- init ----------
  renderMenu();
  setupTabObserver();
  goStep(1);
})();
