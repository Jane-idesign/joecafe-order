(function () {
  "use strict";

  var MENU = window.MENU;
  var CONFIG = window.CONFIG || {};
  var ITEMS = {};
  MENU.items.forEach(function (it) { ITEMS[it.id] = it; });
  var CATS = {};
  MENU.categories.forEach(function (c) { CATS[c.id] = c; });

  // ---------- state ----------
  // cart: key -> { id, qty, opts: [{ group, label, extra }] }
  //   key = id           (no options)
  //   key = id|label|label…  (with options, in group order)
  var state = {
    step: 1,
    cart: {},
    submitting: false,
    lastOrder: null,
    sheet: null, // { item, qty, picks: { groupName: choiceIndex } }
  };

  try {
    var saved = JSON.parse(localStorage.getItem("cart2") || "{}");
    Object.keys(saved).forEach(function (k) {
      var l = saved[k];
      if (l && ITEMS[l.id] && l.qty > 0) state.cart[k] = { id: l.id, qty: l.qty, opts: l.opts || [] };
    });
  } catch (e) { /* ignore */ }
  function persist() { try { localStorage.setItem("cart2", JSON.stringify(state.cart)); } catch (e) { /* ignore */ } }

  // ---------- helpers ----------
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var money = function (n) { return "$" + Number(n).toLocaleString("zh-TW"); };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function hasOptions(item) { return (Array.isArray(item.options) && item.options.length > 0) || !!item.addon; }
  function setDrinks() {
    var cfg = MENU.setDrink || { cats: [], discount: 0, exclude: [] };
    return MENU.items.filter(function (it) { return cfg.cats.indexOf(it.cat) >= 0 && cfg.exclude.indexOf(it.id) < 0; })
      .map(function (it) { return { item: it, addon: it.price - cfg.discount }; });
  }
  function setDrinkAddon(id) { var d = setDrinks().filter(function (x) { return x.item.id === id; })[0]; return d ? d.addon : 0; }
  function lineExtra(line) { return (line.opts || []).reduce(function (s, o) { return s + (o.extra || 0); }, 0); }
  function lineUnit(line) { return ITEMS[line.id].price + lineExtra(line); }
  function optsText(opts, withExtra) {
    return (opts || []).map(function (o) { return o.label + (withExtra && o.extra ? " +$" + o.extra : ""); }).join(" · ");
  }
  function lineKey(id, opts) { return opts && opts.length ? id + "|" + opts.map(function (o) { return o.label; }).join("|") : id; }
  function cartLines() {
    return Object.keys(state.cart).map(function (k) { return Object.assign({ key: k }, state.cart[k]); }).filter(function (l) { return l.qty > 0; });
  }
  function cartTotal() { return cartLines().reduce(function (s, l) { return s + lineUnit(l) * l.qty; }, 0); }
  function cartCount() { return cartLines().reduce(function (s, l) { return s + l.qty; }, 0); }
  function itemCount(id) { return cartLines().filter(function (l) { return l.id === id; }).reduce(function (s, l) { return s + l.qty; }, 0); }

  function setLineQty(key, qty) {
    var line = state.cart[key];
    if (!line) return;
    qty = Math.max(0, Math.min(99, qty));
    if (qty === 0) delete state.cart[key]; else line.qty = qty;
    persist();
    renderQty(line.id);
    renderBottomBar();
    if (state.step === 2) renderReview();
  }
  function addLine(id, qty, opts) {
    var key = lineKey(id, opts);
    if (state.cart[key]) state.cart[key].qty = Math.min(99, state.cart[key].qty + qty);
    else state.cart[key] = { id: id, qty: qty, opts: opts || [] };
    persist();
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
  // menu row control
  function qtyHTML(item) {
    if (hasOptions(item)) {
      var n = itemCount(item.id);
      return (n > 0 ? '<span class="item__count" aria-label="已選 ' + n + '">' + n + "</span>" : "") +
        '<button class="qty__add" type="button" data-act="open" data-id="' + item.id + '" aria-label="選擇' + esc(item.name) + '規格">+</button>';
    }
    var line = state.cart[item.id];
    var q = line ? line.qty : 0;
    if (q === 0) {
      return '<button class="qty__add" type="button" data-act="add" data-id="' + item.id + '" aria-label="加入' + esc(item.name) + '">+</button>';
    }
    return stepperHTML(item.id, q);
  }
  function stepperHTML(key, q) {
    return '<div class="qty__stepper">' +
      '<button class="qty__btn" type="button" data-act="dec" data-key="' + esc(key) + '" aria-label="減少">−</button>' +
      '<span class="qty__num" aria-live="polite">' + q + "</span>" +
      '<button class="qty__btn" type="button" data-act="inc" data-key="' + esc(key) + '" aria-label="增加">+</button>' +
      "</div>";
  }
  function itemHTML(item) {
    var selected = itemCount(item.id) > 0;
    return '<article class="item' + (selected ? " is-selected" : "") + '" data-item="' + item.id + '">' +
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
  // review row (one cart line)
  function lineHTML(line) {
    var item = ITEMS[line.id];
    return '<article class="item is-selected" data-line="' + esc(line.key) + '">' +
      imgHTML(item) +
      '<div class="item__body">' +
        '<div class="item__name">' + esc(item.name) + "</div>" +
        (line.opts.length ? '<div class="item__opts">' + esc(optsText(line.opts, true)) + "</div>" : "") +
        '<div class="item__price">' + money(lineUnit(line)) + "</div>" +
      "</div>" +
      '<div class="qty">' + stepperHTML(line.key, line.qty) + "</div>" +
      "</article>";
  }
  function renderQty(id) {
    document.querySelectorAll('#viewMenu [data-item="' + id + '"]').forEach(function (el) {
      el.classList.toggle("is-selected", itemCount(id) > 0);
      $(".qty", el).innerHTML = qtyHTML(ITEMS[id]);
    });
  }

  // ---------- render: menu ----------
  function renderMenu() {
    $("#viewMenu").innerHTML = MENU.categories.map(function (c) {
      var items = MENU.items.filter(function (it) { return it.cat === c.id; });
      return '<section class="cat" id="cat-' + c.id + '">' +
        '<div class="cat__head"><h2>' + esc(c.name) + "</h2><span>" + esc(c.en) + "</span></div>" +
        '<div class="items">' + items.map(itemHTML).join("") + "</div>" +
        "</section>";
    }).join("");
    $("#catTabs").innerHTML = MENU.categories.map(function (c, i) {
      return '<a href="#cat-' + c.id + '" data-cat="' + c.id + '"' + (i === 0 ? ' class="is-active"' : "") + ">" + esc(c.name) + "</a>";
    }).join("");
  }
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
    $("#reviewList").innerHTML = lines.map(lineHTML).join("");
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

  // ---------- option sheet (supports one nested level: set meal → drink) ----------
  function newSheet(item, parent) {
    var picks = {};
    (item.options || []).forEach(function (g) { if (g.required && g.choices.length === 1) picks[g.name] = 0; });
    return { item: item, qty: 1, picks: picks, parent: parent || null, drinkMode: "none", drink: null };
  }
  function openSheet(item, parent) {
    state.sheet = newSheet(item, parent);
    renderSheet();
    $("#optSheet").hidden = false;
    document.body.classList.add("no-scroll");
  }
  function closeSheet() {
    state.sheet = null;
    $("#optSheet").hidden = true;
    document.body.classList.remove("no-scroll");
  }
  function backToParent() {
    if (state.sheet && state.sheet.parent) { state.sheet = state.sheet.parent; renderSheet(); $(".osheet__body").scrollTop = 0; }
    else closeSheet();
  }
  function optsExtra(sh) {
    var extra = 0;
    (sh.item.options || []).forEach(function (g) {
      var i = sh.picks[g.name];
      if (i !== undefined && g.choices[i] && g.choices[i].extra) extra += g.choices[i].extra;
    });
    return extra;
  }
  function sheetUnit() {
    var sh = state.sheet;
    var base = sh.parent ? setDrinkAddon(sh.item.id) : sh.item.price; // nested drink: add-on price
    return base + optsExtra(sh) + (sh.drink ? sh.drink.extra : 0);
  }
  function pickedOpts(sh) {
    var opts = [];
    (sh.item.options || []).forEach(function (g) {
      var i = sh.picks[g.name];
      if (i !== undefined) opts.push({ group: g.name, label: g.choices[i].label, extra: g.choices[i].extra || 0 });
    });
    return opts;
  }
  function renderSheet() {
    var sh = state.sheet, item = sh.item, nested = !!sh.parent;
    $("#optBack").hidden = !nested;
    $("#optName").textContent = item.name;
    $("#optPrice").innerHTML = nested
      ? '<del>' + money(item.price) + "</del> 加購 +" + money(setDrinkAddon(item.id))
      : money(item.price);
    $("#optImg").innerHTML = item.img ? '<img src="' + item.img + '" alt="" />' : "";
    var html = (item.options || []).map(function (g, gi) {
      return '<div class="ogroup" data-gi="' + gi + '">' +
        '<div class="ogroup__name">' + esc(g.name) + (g.required ? '<span class="req">必選</span>' : '<span class="opt">選填</span>') + "</div>" +
        '<div class="chips">' + g.choices.map(function (c, ci) {
          var on = sh.picks[g.name] === ci;
          return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-gi="' + gi + '" data-ci="' + ci + '">' +
            esc(c.label) + (c.extra ? "<small>+$" + c.extra + "</small>" : "") + "</button>";
        }).join("") + "</div></div>";
    }).join("");
    if (item.addon === "drink") {
      html += '<div class="ogroup ogroup--drink" data-gi="drink">' +
        '<div class="addon-head">' +
          '<div class="ogroup__name">飲品<span class="opt">選填</span></div>' +
          '<div class="chips">' +
            '<button type="button" class="chip' + (sh.drinkMode === "none" ? " is-on" : "") + '" data-dm="none">不加購</button>' +
            '<button type="button" class="chip' + (sh.drinkMode === "add" ? " is-on" : "") + '" data-dm="add">加購飲品</button>' +
          "</div>" +
          (sh.drinkMode === "add" ? '<p class="addon-hint">最多可加購一杯飲品</p>' : "") +
        "</div>";
      if (sh.drinkMode === "add") {
        html += '<div class="addon-list">' + setDrinks().map(function (d) {
            var on = sh.drink && sh.drink.id === d.item.id;
            return '<button type="button" class="addon-row' + (on ? " is-on" : "") + '" data-drink="' + d.item.id + '">' +
              '<div class="addon-row__img">' + (d.item.img ? '<img src="' + d.item.img + '" alt="" loading="lazy" />' : CATS[d.item.cat].emoji) + "</div>" +
              '<div class="addon-row__body"><div class="addon-row__name">' + esc(d.item.name) + "</div>" +
                (on && sh.drink.opts.length ? '<div class="addon-row__opts">' + esc(optsText(sh.drink.opts, true)) + " · 點擊可修改</div>" : "") + "</div>" +
              '<div class="addon-row__price"><del>' + money(d.item.price) + "</del>+" + money(d.addon + (on ? sh.drink.extra - d.addon : 0)) + "</div>" +
            "</button>";
          }).join("") + "</div>";
      }
      html += "</div>";
    }
    $("#optGroups").innerHTML = html;
    $("#optQty").textContent = sh.qty;
    $(".osheet__qty").hidden = nested;
    $("#optAdd").innerHTML = (nested ? "選好了 " : "加入 ") + "<span>" + money(sheetUnit() * sh.qty) + "</span>";
  }
  function confirmSheet() {
    var sh = state.sheet, missing = [];
    (sh.item.options || []).forEach(function (g, gi) {
      var el = $('#optGroups .ogroup[data-gi="' + gi + '"]');
      var miss = g.required && sh.picks[g.name] === undefined;
      el.classList.toggle("is-missing", miss);
      if (miss) missing.push(el);
    });
    if (missing.length) { missing[0].scrollIntoView({ behavior: "smooth", block: "center" }); toast("請先完成必選項目"); return; }
    if (sh.item.addon === "drink" && sh.drinkMode === "add" && !sh.drink) {
      toast("還沒選飲品喔，挑一杯或改選「不加購」");
      return;
    }

    var opts = pickedOpts(sh);
    if (sh.parent) {
      // nested drink chosen for a set meal → hand back to parent sheet
      var parent = sh.parent;
      parent.drink = { id: sh.item.id, opts: opts, extra: setDrinkAddon(sh.item.id) + optsExtra(sh) };
      state.sheet = parent;
      renderSheet();
      return;
    }
    if (sh.drink) {
      var d = ITEMS[sh.drink.id];
      opts.push({ group: "飲品", label: "加購 " + d.name + (sh.drink.opts.length ? "（" + optsText(sh.drink.opts, false).replace(/ · /g, "／") + "）" : ""), extra: sh.drink.extra });
    }
    addLine(sh.item.id, sh.qty, opts);
    toast("已加入 " + sh.item.name + " × " + sh.qty);
    closeSheet();
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

    var now = new Date();
    var order = {
      orderId: fmtDate(now, "id"),
      family: family,
      items: cartLines().map(function (l) {
        var it = ITEMS[l.id];
        return {
          id: l.id,
          name: it.name + (l.opts.length ? "（" + optsText(l.opts, false).replace(/ · /g, "／") + "）" : ""),
          baseName: it.name,
          options: optsText(l.opts, true),
          price: lineUnit(l),
          qty: l.qty,
        };
      }),
      total: cartTotal(),
      time: now.toISOString(),
    };
    state.lastOrder = order;
    state.submitting = true;
    renderBottomBar();

    var save = CONFIG.APPS_SCRIPT_URL ? postToSheet(order) : Promise.resolve({ ok: false, skipped: true });
    save.then(function (res) { finish(order, res); }).catch(function (err) { finish(order, { ok: false, error: String(err) }); });
  }

  function postToSheet(order) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);
    return fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
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
    persist();
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
      var heroH = 520;
      var canvas = $("#cardCanvas");
      var ctx = canvas.getContext("2d");
      var sans = '"Jost", "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
      var INK = "#151515", MUTED = "#8a8f94", LINE = "#ececec", SEA = "#17a6cc";
      // measure option lines first (needs ctx + font), then size the canvas
      ctx.font = "300 24px " + sans;
      var rows = order.items.map(function (it) {
        var lines = it.options ? wrapText(ctx, it.options, W - pad * 2 - 300) : [];
        return { lines: lines, h: lines.length ? 62 + 32 * lines.length + 14 : 78 };
      });
      var listH = rows.reduce(function (s, r) { return s + r.h; }, 0);
      var H = heroH + 150 + listH + 230;
      canvas.width = W; canvas.height = H;

      ctx.fillStyle = "#17a6cc"; ctx.fillRect(0, 0, W, heroH + 60);
      if (ocean) {
        var sc = Math.max(W / ocean.width, (heroH + 60) / ocean.height);
        var sw = W / sc, sh = (heroH + 60) / sc;
        ctx.drawImage(ocean, (ocean.width - sw) / 2, (ocean.height - sh) * 0.35, sw, sh, 0, 0, W, heroH + 60);
      }
      var shade = ctx.createLinearGradient(0, 0, 0, heroH);
      shade.addColorStop(0, "rgba(0,60,90,0.30)"); shade.addColorStop(0.6, "rgba(0,20,40,0)");
      ctx.fillStyle = shade; ctx.fillRect(0, 0, W, heroH);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.font = "400 26px " + sans; ctx.letterSpacing = "6px";
      ctx.fillText("淺水灣小聚 · 訂餐小卡", pad, 120);
      ctx.letterSpacing = "0px";
      ctx.fillStyle = "#ffffff"; ctx.font = "300 " + fitFont(ctx, order.family, W - pad * 2, 110, 56, sans, "300") + "px " + sans;
      ctx.fillText(order.family, pad - 4, 300);

      var top = heroH;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.moveTo(0, top + 44); ctx.arcTo(0, top, 44, top, 44); ctx.lineTo(W - 44, top); ctx.arcTo(W, top, W, top + 44, 44); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();

      ctx.fillStyle = INK; ctx.font = "400 30px " + sans; ctx.letterSpacing = "2px";
      ctx.fillText("餐點明細", pad, top + 96);
      ctx.letterSpacing = "0px";
      drawWave(ctx, pad, top + 112, 120, SEA);

      ctx.textBaseline = "middle";
      var y = top + 150;
      order.items.forEach(function (it, i) {
        var row = rows[i], h = row.h;
        if (i > 0) { ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke(); }
        var cy = y + (row.lines.length ? 40 : h / 2);
        ctx.textAlign = "left"; ctx.fillStyle = INK; ctx.font = "400 34px " + sans;
        ctx.fillText(truncate(ctx, it.baseName || it.name, W - pad * 2 - 300), pad, cy);
        if (row.lines.length) {
          ctx.fillStyle = SEA; ctx.font = "300 24px " + sans;
          row.lines.forEach(function (ln, k) { ctx.fillText(ln, pad, cy + 40 + k * 32); });
        }
        ctx.textAlign = "center"; ctx.fillStyle = INK; ctx.font = "300 34px " + sans;
        ctx.fillText("×" + it.qty, W - pad - 190, cy);
        ctx.textAlign = "right"; ctx.fillStyle = MUTED; ctx.font = "300 30px " + sans;
        ctx.fillText(money(it.price * it.qty), W - pad, cy);
        y += h;
      });

      var ty = top + 150 + listH + 70;
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pad, ty - 50); ctx.lineTo(W - pad, ty - 50); ctx.stroke();
      ctx.textAlign = "left"; ctx.fillStyle = MUTED; ctx.font = "300 28px " + sans;
      ctx.fillText("共 " + order.items.reduce(function (s, i) { return s + i.qty; }, 0) + " 項", pad, ty + 8);
      ctx.textAlign = "right"; ctx.fillStyle = INK; ctx.font = "300 60px " + sans; ctx.fillText(money(order.total), W - pad, ty + 8);

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
  function fitFont(ctx, text, maxW, start, min, family, weight) {
    weight = weight || "900";
    for (var s = start; s > min; s -= 4) { ctx.font = weight + " " + s + "px " + family; if (ctx.measureText(text).width <= maxW) return s; }
    return min;
  }
  function wrapText(ctx, text, maxW) {
    var lines = [], cur = "";
    Array.from(String(text)).forEach(function (ch) {
      if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch;
    });
    if (cur) lines.push(cur);
    return lines;
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
    var act = btn.dataset.act;
    if (act === "open") { openSheet(ITEMS[btn.dataset.id]); return; }
    if (act === "add") { addLine(btn.dataset.id, 1, []); return; }
    var key = btn.dataset.key, line = state.cart[key];
    if (!line) return;
    if (act === "inc") setLineQty(key, line.qty + 1);
    if (act === "dec") setLineQty(key, line.qty - 1);
  });
  $("#optSheet").addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) { closeSheet(); return; }
    if (e.target.closest("#optBack")) { backToParent(); return; }
    var sh = state.sheet; if (!sh) return;
    var dm = e.target.closest("[data-dm]");
    if (dm) { sh.drinkMode = dm.dataset.dm; if (sh.drinkMode === "none") sh.drink = null; renderSheet(); return; }
    var row = e.target.closest("[data-drink]");
    if (row) { openSheet(ITEMS[row.dataset.drink], sh); $(".osheet__body").scrollTop = 0; return; }
    var chip = e.target.closest(".chip");
    if (chip && chip.dataset.gi !== undefined) {
      var g = sh.item.options[+chip.dataset.gi], ci = +chip.dataset.ci;
      var cur = sh.picks[g.name];
      if (cur === ci && !g.required) delete sh.picks[g.name];
      else sh.picks[g.name] = ci;
      renderSheet();
      return;
    }
    var oq = e.target.closest("[data-oq]");
    if (oq) { sh.qty = Math.max(1, Math.min(99, sh.qty + (+oq.dataset.oq))); renderSheet(); return; }
    if (e.target.closest("#optAdd")) confirmSheet();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && state.sheet) backToParent(); });
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
