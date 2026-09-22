/**
 * 淺水灣訂餐 — Google Apps Script 後端
 * 把此檔貼到「Google 試算表 > 擴充功能 > Apps Script」，
 * 部署為網頁應用程式（執行身分：我；存取權：所有人），
 * 再把網址貼到網頁的 js/config.js → APPS_SCRIPT_URL。
 *
 * 會自動建立兩個工作表：
 *  - 訂單總表：每筆訂單一列（時間、訂單編號、點餐家庭、品項摘要、總數量、總金額）
 *  - 訂單明細：每個品項一列（時間、訂單編號、點餐家庭、品名、單價、數量、小計）
 */

var SUMMARY_SHEET = "訂單總表";
var DETAIL_SHEET = "訂單明細";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    if (!data || !data.family || !Array.isArray(data.items) || data.items.length === 0) {
      return json_({ ok: false, error: "invalid payload" });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var summary = getSheet_(ss, SUMMARY_SHEET, ["時間", "訂單編號", "點餐家庭", "品項摘要", "總數量", "總金額"]);
    var detail = getSheet_(ss, DETAIL_SHEET, ["時間", "訂單編號", "點餐家庭", "品名", "單價", "數量", "小計"]);

    var now = new Date();
    var orderId = data.orderId || Utilities.formatDate(now, "Asia/Taipei", "yyyyMMdd-HHmmss");
    var totalQty = 0, totalAmt = 0, parts = [];

    data.items.forEach(function (it) {
      var qty = Number(it.qty) || 0, price = Number(it.price) || 0;
      if (qty <= 0) return;
      totalQty += qty;
      totalAmt += qty * price;
      parts.push(it.name + "×" + qty);
      detail.appendRow([now, orderId, data.family, it.name, price, qty, qty * price]);
    });

    summary.appendRow([now, orderId, data.family, parts.join("、"), totalQty, totalAmt]);
    return json_({ ok: true, orderId: orderId, total: totalAmt });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: "淺水灣訂餐", time: new Date() });
}

function getSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e4efe7");
    sh.setFrozenRows(1);
    sh.getRange("A:A").setNumberFormat("yyyy/mm/dd hh:mm:ss");
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
