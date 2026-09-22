// 菜單資料：以紙本菜單照片為準；圖片取自 order.didieats.com.tw/store/joecafe（無圖者顯示分類底圖）
// 飲品細項規格（取自 didieats 線上菜單）。皆為單選；required 為必選。
var ICE = function (list) { return { name: "冰量", required: true, choices: list.map(function (l) { return { label: l }; }) }; };
var SUGAR = function (list) { return { name: "甜度", required: true, choices: list.map(function (l) { return { label: l }; }) }; };
var TOPPING = function (list) { return { name: "飲料加料", required: false, choices: list }; };
var CUSTOM = function (list) { return { name: "飲料客製", required: false, choices: list }; };
var LATER = { name: "要後上才勾", required: false, choices: [{ label: "通知後才上" }] };
var ICECREAM3 = [{ label: "巧克力冰淇淋", extra: 100 }, { label: "草莓冰淇淋", extra: 100 }, { label: "香草冰淇淋", extra: 100 }];
var PEARL = { label: "加珍珠", extra: 30 };
var TOP4 = TOPPING(ICECREAM3.concat([PEARL]));
var TOP3 = TOPPING(ICECREAM3);
var TOP_PEARL = TOPPING([PEARL]);
var STRONG = { label: "特濃（多加一份濃縮）", extra: 20 };
var FOAM = { label: "換鮮奶泡" };
var BIGCUP = { label: "加大杯", extra: 30 };
var ICE_ALL = ["去冰", "少冰", "正常冰", "熱"];

window.MENU = {
  store: "喬咖館",
  categories: [
    { id: "set", name: "精緻套餐", en: "SET MEALS", emoji: "🍽️" },
    { id: "pizza", name: "披薩", en: "PIZZA", emoji: "🍕" },
    { id: "light", name: "輕食 / 點心", en: "LIGHT MEALS / SNACKS", emoji: "🥨" },
    { id: "coffee", name: "咖啡", en: "COFFEE", emoji: "☕" },
    { id: "tea", name: "茶", en: "TEA", emoji: "🍵" },
    { id: "other", name: "其他飲品", en: "OTHER DRINKS", emoji: "🥤" },
  ],
  items: [
    // 精緻套餐
    { id: "set-chicken", cat: "set", name: "香草脆皮烤雞腿餐", en: "Herb Crispy Roasted Chicken Leg Set", price: 380, img: "img/chicken-leg-set.jpg" },
    { id: "set-salmon", cat: "set", name: "檸檬鹽烤鮭魚排餐", en: "Lemon Salt-Grilled Salmon Steak Set", price: 460, img: "img/salmon-set.jpg" },
    { id: "set-fish", cat: "set", name: "鹽烤菲力魚排餐", en: "Salt-Grilled Fillet Fish Steak Set", price: 360 },
    { id: "set-ribs", cat: "set", name: "煙烤豬肋排套餐", en: "Smoked BBQ Pork Ribs Set", price: 560, img: "img/pork-ribs-set.jpg" },
    { id: "set-knuckle", cat: "set", name: "脆烤德國豬腳套餐", en: "Crispy Roast German Pork Knuckle Set", price: 880, img: "img/pork-knuckle-set.jpg" },

    // 披薩
    { id: "pz-veg", cat: "pizza", name: "什錦蔬菜披薩", en: "Mixed Vegetable Pizza", price: 360, tag: "奶素" },
    { id: "pz-sausage", cat: "pizza", name: "德式香腸肉醬披薩", en: "German Sausage & Meat Sauce Pizza", price: 360 },
    { id: "pz-hawaii", cat: "pizza", name: "夏威夷披薩", en: "Hawaiian Pizza", price: 360 },
    { id: "pz-smoked", cat: "pizza", name: "煙燻雞披薩", en: "Smoked Chicken Pizza", price: 360 },
    { id: "pz-combo", cat: "pizza", name: "夏威夷＋煙燻雞披薩", en: "Hawaiian + Smoked Chicken Pizza", price: 380 },

    // 輕食 / 點心
    { id: "lt-mushroom", cat: "light", name: "菇菇焗烤飯", en: "Mushroom Baked Rice", price: 300, tag: "奶素", img: "img/mushroom-rice.jpg" },
    { id: "lt-pumpkin", cat: "light", name: "南瓜蔬食焗烤飯", en: "Pumpkin Vegetable Baked Rice", price: 300, tag: "奶素", img: "img/pumpkin-rice.jpg" },
    { id: "lt-sausage", cat: "light", name: "德式香腸焗烤飯", en: "German Sausage Baked Rice", price: 300, img: "img/sausage-rice.jpg" },
    { id: "lt-shrimp", cat: "light", name: "焗烤鮮蝦千層麵", en: "Baked Shrimp Lasagna", price: 300, img: "img/fish-lasagna.jpg" },
    { id: "lt-chicken", cat: "light", name: "焗烤雞肉千層麵", en: "Baked Chicken Lasagna", price: 300, img: "img/chicken-lasagna.jpg" },
    { id: "lt-spinach", cat: "light", name: "焗烤蔬菜千層麵", en: "Baked Spinach Lasagna", price: 280, img: "img/spinach-lasagna.jpg" },
    { id: "lt-platter", cat: "light", name: "綜合點心拼盤", en: "Mixed Snack Platter", price: 680, note: "薯條、雞塊、洋蔥圈", img: "img/snack-platter.jpg" },
    { id: "lt-wings", cat: "light", name: "煙燻烤雞翅", en: "Smoked Roasted Chicken Wings", price: 320 },
    { id: "lt-cheese", cat: "light", name: "香酥起司條", en: "Crispy Cheese Sticks", price: 280 },
    { id: "lt-strips", cat: "light", name: "檸香雞柳條", en: "Lemon Chicken Strips", price: 280 },
    { id: "lt-fries", cat: "light", name: "酥炸脆薯條", en: "Crispy French Fries", price: 200 },
    { id: "lt-knuckle", cat: "light", name: "德國豬腳拼盤", en: "German Pork Knuckle Platter", price: 1380, note: "德國豬腳、豬肋、薯條" },
    { id: "lt-waffle-honey", cat: "light", name: "蜂蜜鬆餅", en: "Honey Waffle", price: 200 },
    { id: "lt-waffle-tuna", cat: "light", name: "鮪魚鬆餅", en: "Tuna Waffle", price: 260 },
    { id: "lt-waffle-ice", cat: "light", name: "冰淇淋鬆餅", en: "Ice Cream Waffle", price: 280 },

    // 咖啡
    { id: "cf-espresso", cat: "coffee", name: "義式雙倍濃縮咖啡", en: "Espresso (Double)", price: 180, options: [ICE(["熱"]), TOP4, LATER] },
    { id: "cf-americano", cat: "coffee", name: "美式咖啡", en: "Americano", price: 180, options: [ICE(ICE_ALL), TOP4, CUSTOM([STRONG]), LATER] },
    { id: "cf-latte", cat: "coffee", name: "拿鐵咖啡", en: "Latte", price: 200, img: "img/latte.jpg", options: [ICE(ICE_ALL), TOP4, CUSTOM([STRONG]), LATER] },
    { id: "cf-cappuccino", cat: "coffee", name: "卡布其諾咖啡", en: "Cappuccino", price: 200, options: [ICE(ICE_ALL), TOP4, CUSTOM([STRONG]), LATER] },
    { id: "cf-macchiato", cat: "coffee", name: "焦糖瑪奇朵咖啡", en: "Caramel Macchiato", price: 220, options: [ICE(ICE_ALL), SUGAR(["正常糖", "半糖"]), TOP4, CUSTOM([STRONG]), LATER] },
    { id: "cf-mocha", cat: "coffee", name: "摩卡巧克力咖啡", en: "Mocha", price: 220, options: [ICE(ICE_ALL), SUGAR(["正常糖", "半糖"]), TOP4, CUSTOM([FOAM, STRONG]), LATER] },
    { id: "cf-vienna", cat: "coffee", name: "維也納咖啡", en: "Vienna Coffee", price: 200, img: "img/vienna.jpg", options: [ICE(["少冰", "正常冰", "熱"]), TOP4, CUSTOM([STRONG]), LATER] },
    { id: "cf-baileys", cat: "coffee", name: "招牌奶酒咖啡", en: "Bailey's Coffee", price: 250, options: [ICE(["正常冰", "熱"]), TOP4, LATER] },

    // 茶
    { id: "tea-fruit", cat: "tea", name: "夏日鮮果茶", en: "Summer Fruit Tea", price: 240, img: "img/fruit-tea.jpg", options: [ICE(["去冰", "正常冰", "熱"]), LATER] },
    { id: "tea-longan", cat: "tea", name: "桂圓枸杞紅棗茶", en: "Longan, Goji & Red Date Tea", price: 250, tag: "熱壺", img: "img/longan-tea.jpg", options: [TOP_PEARL, LATER] },
    { id: "tea-ginger", cat: "tea", name: "枸杞薑絲紅棗茶", en: "Goji, Ginger & Red Date Tea", price: 250, tag: "熱壺", img: "img/goji-ginger-tea.jpg", options: [TOP_PEARL, LATER] },
    { id: "tea-oolong", cat: "tea", name: "高山烏龍茶", en: "High Mountain Oolong Tea", price: 220, tag: "熱壺", options: [TOP_PEARL, LATER] },
    { id: "tea-flower", cat: "tea", name: "雲間子花茶", en: "Mystery Flower Tea", price: 200, tag: "熱壺", options: [TOP_PEARL, LATER] },
    { id: "tea-black", cat: "tea", name: "招牌紅茶", en: "Signature Black Tea", price: 200, img: "img/black-tea.jpg", options: [ICE(ICE_ALL), SUGAR(["正常糖", "微糖", "無糖"]), TOP4, LATER] },
    { id: "tea-bubble", cat: "tea", name: "黑糖珍珠鮮奶茶", en: "Brown Sugar Bubble Milk Tea", price: 250, options: [ICE(ICE_ALL), SUGAR(["正常糖", "半糖"]), TOP3, CUSTOM([BIGCUP]), LATER] },
    { id: "tea-matcha", cat: "tea", name: "抹茶珍珠鮮奶茶", en: "Matcha Bubble Milk Tea", price: 250, options: [ICE(ICE_ALL), SUGAR(["正常糖", "半糖", "無糖"]), TOP3, CUSTOM([BIGCUP]), LATER] },
    { id: "tea-earlgrey", cat: "tea", name: "伯爵鮮奶茶", en: "Earl Grey Milk Tea", price: 200, options: [ICE(ICE_ALL), SUGAR(["正常糖", "微糖"]), TOP4, LATER] },
    { id: "tea-gingermilk", cat: "tea", name: "暖薑鮮奶茶", en: "Ginger Milk Tea", price: 200, options: [SUGAR(["正常糖", "半糖"]), TOP_PEARL, LATER] },
    { id: "tea-cocoa", cat: "tea", name: "鮮奶可可", en: "Milk Cocoa", price: 220, img: "img/cocoa.jpg", options: [ICE(["去冰", "正常冰", "熱"]), SUGAR(["正常糖", "半糖"]), TOP4, CUSTOM([FOAM]), LATER] },

    // 其他飲品
    { id: "ot-juice", cat: "other", name: "季節現打高纖蔬果汁", en: "Seasonal Fresh Juice", price: 250, options: [SUGAR(["微糖", "無糖"]), TOPPING([{ label: "巧克力冰淇淋", extra: 100 }, { label: "草莓冰淇淋", extra: 100 }]), LATER] },
    { id: "ot-sparkling", cat: "other", name: "綜合水果氣泡飲", en: "Fruit Sparkling Drink", price: 220, options: [ICE(["去冰", "少冰", "正常冰"]), SUGAR(["正常糖", "半糖"]), LATER] },
    { id: "ot-beer", cat: "other", name: "季節水果啤酒", en: "Seasonal Fruit Beer", price: 250, options: [SUGAR(["正常糖", "半糖"]), LATER] },
    { id: "ot-mango", cat: "other", name: "新鮮芒果冰", en: "Fresh Mango Ice", price: 220, tag: "季節限定", img: "img/mango-ice.jpg", options: [TOPPING([{ label: "草莓冰淇淋", extra: 100 }, { label: "香草冰淇淋", extra: 100 }, PEARL]), LATER] },
    { id: "ot-fruit-smoothie", cat: "other", name: "冰淇淋水果冰沙", en: "Fruit Smoothie with Ice Cream", price: 260, options: [SUGAR(["正常糖", "半糖"]), TOP_PEARL, LATER] },
    { id: "ot-choco-smoothie", cat: "other", name: "冰淇淋巧克力冰沙", en: "Chocolate Smoothie with Ice Cream", price: 260, img: "img/choco-smoothie.jpg", options: [SUGAR(["正常糖", "半糖"]), TOP_PEARL, LATER] },
  ],
};
