/* =====================================================
   My Sari-Sari POS - app.js (phone-friendly version)
   HTML = the structure, CSS = the look, JavaScript = what happens when you tap or scan.
   ===================================================== */


/* ---------- 1. DATA ----------
   An "array" is a list. Each product is an "object": a bundle of labeled values.
   These are SAMPLE products. Replace them with your own using the Products tab. */
const DEFAULT_PRODUCTS = [
  { barcode: "0000000000011", name: "Pancit Canton Kalamansi 60g", price: 12, stock: 47, reorder: 10 },
  { barcode: "0000000000028", name: "Coffee 3-in-1 Sachet",       price: 8,  stock: 95, reorder: 20 },
  { barcode: "0000000000035", name: "Softdrink Mismo 200ml",       price: 15, stock: 22, reorder: 6  },
  { barcode: "0000000000042", name: "Bar Soap",                    price: 25, stock: 4,  reorder: 5  }
];

// The browser remembers data using "localStorage". We save under these names.
const PRODUCTS_KEY = "pos_products";
const SALES_KEY = "pos_sales";
const LAST_BACKUP_KEY = "pos_last_backup";
try { localStorage.removeItem("pos_ewallet"); localStorage.removeItem("pos_ewallet_tx"); } catch (error) {}

const LEDGER_KEY = "pos_utang";           // utang: charges and payments
const OWN_KEY = "pos_own";                // items taken "para samen" (for ourselves)
const SETTINGS_KEY = "pos_settings";      // on/off switches

// On/off switches. bestOnly = the Sell page shows only the 10 best sellers.
const DEFAULT_SETTINGS = { bestOnly: true, voice: true, voiceRate: 1.25, storeName: "", closings: [] };
const BEST_COUNT = 10;
const APP_VERSION = "v19 - Nov 14";   // shown in the Paninda tab, so you can check which version a phone is running

// ----- Icons: simple line icons (instead of emojis). icon("trash") gives the picture as HTML. -----
const ICONS = {
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h4"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5z"/><path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19v-3M9 8h6"/>',
  box: '<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M8 9v6M12 9v6M16 9v6"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
  speaker: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4zM15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  share: '<path d="M12 15V3M8 7l4-4 4 4M5 12v8h14v-8"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  camera: '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  save: '<path d="M12 4v11M7.5 11L12 15.5 16.5 11M5 19.5h14"/>',
  cash: '<rect x="3" y="6.5" width="18" height="11" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sheet: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  bell: '<path d="M6 17v-6a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4"/>'
};

function icon(name, extraClass) {
  return '<svg class="ico' + (extraClass ? " " + extraClass : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
}

// Turns every <i data-icon="trash"></i> in the page into the picture
function drawIcons() {
  document.querySelectorAll("i[data-icon]").forEach(function (el) {
    if (!el.firstChild) {
      el.innerHTML = icon(el.getAttribute("data-icon"));
    }
  });
}

// Variables that hold the data while the page is open.
let products = loadData(PRODUCTS_KEY, DEFAULT_PRODUCTS);
let sales = loadData(SALES_KEY, []);   // finished sales
let cart = [];                          // items in the sale happening right now
let ledger = loadData(LEDGER_KEY, []);
let ownUse = loadData(OWN_KEY, []);      // "para samen": stock goes down, but it is not a sale and has no profit
let settings = Object.assign({}, DEFAULT_SETTINGS, loadData(SETTINGS_KEY, DEFAULT_SETTINGS));
let lastSale = null;                     // the newest finished sale (for the receipt button)
let ownMode = false;                     // true while the Para samen switch is ON (not saved)



/* ---------- 2. SAVING AND LOADING ---------- */

// Read saved data. If nothing is saved (or something goes wrong), use a COPY of the fallback.
function loadData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);          // turn saved text back into a list/object
    }
  } catch (error) {
    console.log("Could not load", key, error);
  }
  return JSON.parse(JSON.stringify(fallback));
}

// Save data. JSON.stringify turns a list/object into text so it can be stored.
function saveData() {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
    localStorage.setItem(OWN_KEY, JSON.stringify(ownUse));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.log("Could not save", error);
  }
}


/* ---------- 3. HELPER FUNCTIONS ---------- */
function byId(id) { return document.getElementById(id); }
function round2(n) { return Math.round(n * 100) / 100; }

// Turn 12 into "\u20B112.00"
function peso(amount) {
  // 1234.5 becomes "\u20B11,234.50"
  return "\u20B1" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Like peso(), but a whole amount drops the ".00": 1500 becomes "\u20B11,500"
function pesoShort(amount) {
  return Number.isInteger(amount) ? "\u20B1" + amount.toLocaleString("en-US") : peso(amount);
}

// Make text safe before putting it into the page
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// A date in YOUR local time, like "2026-11-09" (used for the daily totals)
function dateText(d) {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + month + "-" + day;
}
function todayText() {
  return dateText(new Date());
}
// "2026-11-09" back into a date
function parseDate(text) {
  const part = text.split("-");
  return new Date(Number(part[0]), Number(part[1]) - 1, Number(part[2]));
}
// "Mon, Nov 9"
function dayLabel(text) {
  return parseDate(text).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
// "Monday, November 9"
function dayLabelLong(text) {
  return parseDate(text).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}
// Small money for tiny boxes: 850 -> "850", 1200 -> "1.2k", 12500 -> "13k"
function pesoCompact(n) {
  if (n >= 10000) { return Math.round(n / 1000) + "k"; }
  if (n >= 1000) { return (n / 1000).toFixed(1).replace(".0", "") + "k"; }
  return String(Math.round(n));
}

// Camera apps sometimes read the same barcode with or without leading zeros
// (12 digits vs 13 digits). Removing leading zeros makes both match.
function normalizeBarcode(code) {
  return String(code).trim().replace(/^0+/, "");
}

// Find a product by its barcode. Returns the product, or undefined if not found.
function findProduct(barcode) {
  const key = normalizeBarcode(barcode);
  if (key === "") {
    return undefined;
  }
  return products.find(function (p) {
    return normalizeBarcode(p.barcode) === key;
  });
}

// Show a short message on the Sell tab. type is "ok" or "error".
let messageTimer = null;
function showMessage(text, type) {
  const box = document.getElementById("message");
  box.textContent = text;
  box.className = "message " + type;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(function () {
    box.textContent = "";
    box.className = "message";
  }, 5000);
}

// How many of each product have been sold so far (used to show bestsellers first)
function soldCounts() {
  const counts = {};
  sales.forEach(function (sale) {
    sale.items.forEach(function (item) {
      counts[item.barcode] = (counts[item.barcode] || 0) + item.qty;
    });
  });
  return counts;
}

// A phone has a touch screen; a laptop has a mouse. We only auto-open the keyboard on laptops.
function hasMouse() {
  return window.matchMedia && window.matchMedia("(pointer: fine)").matches;
}
function focusBarcodeBox() {
  if (hasMouse()) {
    document.getElementById("barcode-input").focus();
  }
}


/* ---------- 4. THE CART ---------- */

// Add one of a product to the sale. Returns { ok: true/false, text: "message" }.
function addToCart(barcode) {
  const product = findProduct(barcode);

  if (!product) {
    const text = "Wala sa listahan: " + barcode;
    showMessage(text, "error");
    return { ok: false, text: text };
  }

  const inCart = cart.find(function (item) {
    return item.barcode === product.barcode;
  });
  const alreadyInCart = inCart ? inCart.qty : 0;

  // Don't sell more than we have in stock.
  if (alreadyInCart + 1 > product.stock) {
    const text = "Kulang ang stock ng " + product.name + " (" + product.stock + " na lang).";
    showMessage(text, "error");
    return { ok: false, text: text };
  }

  if (inCart) {
    inCart.qty = inCart.qty + 1;
  } else {
    cart.push({ barcode: product.barcode, name: product.name, price: product.price, qty: 1, bundle: product.bundle || null });
  }

  const text = product.name + " - " + peso(product.price);
  showMessage(text, "ok");
  renderSell();
  return { ok: true, text: text };
}

// Change the quantity of a cart line by +1 or -1
function changeQty(barcode, change) {
  const item = cart.find(function (i) { return i.barcode === barcode; });
  const product = findProduct(barcode);
  if (!item || !product) {
    return;
  }

  const newQty = item.qty + change;

  if (newQty <= 0) {
    cart = cart.filter(function (i) { return i.barcode !== barcode; });
  } else if (newQty > product.stock) {
    showMessage(product.name + ": " + product.stock + " na lang ang stock.", "error");
    return;
  } else {
    item.qty = newQty;
  }
  renderSell();
}

// The price of one line. With a bundle price (for example 3 for 10 pesos) every full set
// costs the bundle price and the pieces left over cost the normal price.
function lineTotal(item) {
  const b = item.bundle;
  if (b && b.qty >= 2 && b.price >= 0 && item.qty >= b.qty) {
    const sets = Math.floor(item.qty / b.qty);
    return round2(sets * b.price + (item.qty - sets * b.qty) * item.price);
  }
  return round2(item.price * item.qty);
}

function bundleText(b) {
  return b.qty + " for " + peso(b.price);
}

// Reads the two bundle boxes of the Add form ("new") or the Edit sheet ("edit").
function readBundle(prefix) {
  const q = byId(prefix + "-bundle-qty").value.trim();
  const p = byId(prefix + "-bundle-price").value.trim();
  if (q === "" && p === "") {
    return { bundle: null };
  }
  const qty = parseInt(q, 10);
  const price = parseFloat(p);
  if (!(qty >= 2) || !(price >= 0)) {
    return { error: "Bundle: ilagay ang bilang (2 pataas) at ang presyo." };
  }
  return { bundle: { qty: qty, price: price } };
}

function cartTotal() {
  let total = 0;
  cart.forEach(function (item) {
    total = total + lineTotal(item);
  });
  return round2(total);
}

function cartItemCount() {
  let count = 0;
  cart.forEach(function (item) {
    count = count + item.qty;
  });
  return count;
}


/* ---------- 5. CHARGING ---------- */

// The lines of the current cart, with the puhunan (cost) remembered at this moment.
// Later price changes then don't change old records.
function cartLines() {
  return cart.map(function (item) {
    const line = { barcode: item.barcode, name: item.name, qty: item.qty, price: item.price };
    if (item.bundle) {
      line.bundle = item.bundle;
    }
    const product = findProduct(item.barcode);
    if (product && typeof product.cost === "number") {
      line.cost = product.cost;
    }
    return line;
  });
}

// cash can be NaN (not typed). That's fine; we just don't record change then.
// utang is { name, takenBy } when the sale is charged to utang instead of paid in cash.
function chargeSale(cash, utang) {
  if (cart.length === 0) {
    return;
  }

  const total = cartTotal();

  // Subtract the sold quantities from stock.
  cart.forEach(function (item) {
    const product = findProduct(item.barcode);
    product.stock = product.stock - item.qty;
  });

  const sale = {
    ts: Date.now(),
    date: todayText(),
    time: new Date().toLocaleTimeString(),
    total: total,
    items: cartLines()
  };
  if (utang) {
    // Not paid yet: remember who owes it, and add a charge to the utang ledger.
    sale.utang = { name: utang.name, takenBy: utang.takenBy };
    ledger.push({
      ts: sale.ts, date: sale.date, time: sale.time,
      name: utang.name, takenBy: utang.takenBy,
      type: "charge", amount: total,
      items: sale.items.map(function (i) { return Object.assign({}, i); })
    });
  } else if (!isNaN(cash)) {
    sale.cash = cash;
    sale.change = cash - total;
  }
  sales.push(sale);
  lastSale = sale;

  saveData();

  if (utang) {
    showMessage("Nasa utang na si " + utang.name + ": " + peso(total) + ".", "ok");
  } else {
    const changeText = isNaN(cash) ? "" : " Sukli: " + peso(cash - total);
    showMessage("Tapos na: " + peso(total) + "." + changeText, "ok");
  }

  cart = [];
  renderAll();
  showLastReceiptButton();
}

// PARA SAMEN: we take the items ourselves.
// Stock goes down, but it is NOT a sale, so it is not in the total and not in the profit.
function takeForUs() {
  if (cart.length === 0) {
    return;
  }
  const count = cartItemCount();
  const words = count + " item" + (count === 1 ? "" : "s");
  if (!confirm("Kunin ang " + words + " para samen?\n\nMababawas sa stock. Hindi kasama sa benta at kita.")) {
    return;
  }

  const items = cartLines();
  cart.forEach(function (item) {
    const product = findProduct(item.barcode);
    product.stock = product.stock - item.qty;
  });
  ownUse.push({ ts: Date.now(), date: todayText(), time: new Date().toLocaleTimeString(), items: items });
  cart = [];
  saveData();
  setOwnMode(false);                       // back to normal selling
  renderAll();
  showMessage("Para samen: " + words + " ang nabawas sa stock.", "ok");
}

// The Para samen switch
function setOwnMode(on) {
  ownMode = on;
  document.getElementById("own-toggle").checked = on;
  document.getElementById("own-state").textContent = on ? "ON" : "OFF";
  document.body.classList.toggle("own-mode", on);
  document.getElementById("cart-title").textContent = on ? "Para samen (kukunin)" : "Benta ngayon";
  renderCheckoutBar();
}

// The Top 10 switch text
function renderSwitches() {
  document.getElementById("best-toggle").checked = settings.bestOnly;
  document.getElementById("best-state").textContent = settings.bestOnly ? "ON" : "OFF";
}


/* ---------- 6. DRAWING THE SCREEN ----------
   "render" functions rebuild part of the page from the current data. */

// The tap-to-add grid. Bestsellers come first.
function renderTiles() {
  const query = document.getElementById("search-input").value.trim().toLowerCase();
  const sold = soldCounts();

  let list = products
    .filter(function (p) {
      return query === "" || p.name.toLowerCase().includes(query) || p.barcode.includes(query) || (p.category || "").toLowerCase().includes(query);
    })
    .sort(function (a, b) {
      return (sold[b.barcode] || 0) - (sold[a.barcode] || 0) || a.name.localeCompare(b.name);
    });

  // Top 10 switch ON: show only the best sellers. Searching always looks through everything.
  const note = document.getElementById("best-note");
  if (settings.bestOnly && query === "") {
    // Products with the "front page" switch ON always show. Best sellers fill the rest up to 10.
    const pinned = list.filter(function (p) { return p.front; });
    const others = list.filter(function (p) { return !p.front; });
    list = pinned.concat(others.slice(0, Math.max(0, BEST_COUNT - pinned.length)));
    note.textContent = products.length > list.length
      ? "Ipinapakita ang " + list.length + " sa " + products.length + " na paninda. Gamitin ang search para sa iba."
      : "Lahat ng " + products.length + " paninda ay nakikita.";
  } else if (settings.bestOnly) {
    note.textContent = "Search: lahat ng paninda ay hinahanap.";
  } else {
    note.textContent = "Lahat ng " + products.length + " paninda ang nakikita.";
  }

  let html = "";
  const groups = {};
  list.forEach(function (p) { const category = String(p.category || "Iba pa").trim() || "Iba pa"; (groups[category] = groups[category] || []).push(p); });
  Object.keys(groups).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (category) {
    html += '<h3 class="category-heading">' + escapeHtml(category) + '</h3>';
    groups[category].forEach(function (p) {
    const inCart = cart.find(function (i) { return i.barcode === p.barcode; });
    const qty = inCart ? inCart.qty : 0;
    const soldOut = p.stock - qty <= 0;
    const stockText = p.stock <= 0 ? "Ubos na" : (p.stock - qty) + " pa";

    const low = p.stock - qty <= p.reorder;            // running low: shown in red
    html += '<button class="tile' + (qty > 0 ? " in-cart" : "") + '" data-barcode="' + escapeHtml(p.barcode) + '"' + (soldOut ? " disabled" : "") + ">" +
      thumbHtml(p) +
      '<span class="tile-text">' +
        '<span class="tile-name">' + escapeHtml(p.name) + "</span>" +
        '<span class="tile-price">' + peso(p.price) + "</span>" +
        (p.bundle ? '<span class="tile-bundle">' + bundleText(p.bundle) + "</span>" : "") +
        '<span class="tile-stock' + (low ? " low" : "") + '">' + stockText + "</span>" +
      "</span>" +
      (qty > 0 ? '<span class="tile-badge">' + qty + "</span>" : "") +
      "</button>";
    });
  });

  if (list.length === 0) {
    html = '<p class="empty">Walang nahanap na paninda.</p>';
  }
  document.getElementById("tile-grid").innerHTML = html;
}

function renderCart() {
  let html = "";

  cart.forEach(function (item) {
    const cartProduct = findProduct(item.barcode);
    html += "<li>" +
      thumbHtml(cartProduct || { name: item.name }, "small") +
      '<div class="cart-info"><div class="cart-name">' + escapeHtml(item.name) + "</div>" +
      '<div class="cart-sub">' + peso(item.price) + " bawat isa" + (item.bundle ? " &middot; " + bundleText(item.bundle) : "") + "</div></div>" +
      '<div class="stepper">' +
        '<button class="step" data-barcode="' + escapeHtml(item.barcode) + '" data-change="-1" aria-label="One less">&minus;</button>' +
        '<span class="qty">' + item.qty + "</span>" +
        '<button class="step" data-barcode="' + escapeHtml(item.barcode) + '" data-change="1" aria-label="One more">+</button>' +
      "</div>" +
      '<div class="cart-line-total">' + peso(lineTotal(item)) + "</div>" +
      "</li>";
  });

  if (cart.length === 0) {
    html = '<li class="empty">Wala pa. Tap ang paninda o i-scan ang barcode.</li>';
  }
  document.getElementById("cart-list").innerHTML = html;
}

function renderCheckoutBar() {
  document.getElementById("cart-total").textContent = ownMode ? "Para samen" : peso(cartTotal());
  document.getElementById("item-count").textContent = cartItemCount();
  const button = document.getElementById("charge-btn");
  button.innerHTML = icon(ownMode ? "check" : "cash") + (ownMode ? "Kunin" : "Bayad");
  button.disabled = cart.length === 0;
}

// Redraw everything on the Sell tab
function renderSell() {
  renderTiles();
  renderCart();
  renderCheckoutBar();
}

function renderProducts() {
  const query = document.getElementById("product-search").value.trim().toLowerCase();
  let html = "";
  let shown = 0;

  products.forEach(function (p) {
    if (query !== "" && !p.name.toLowerCase().includes(query) && !p.barcode.includes(query)) {
      return;
    }
    shown++;
    const needsRestock = p.stock <= p.reorder;
    const status = needsRestock
      ? '<span class="pill restock">RESTOCK</span>'
      : '<span class="pill ok-status">OK</span>';

    let profitLine = '<div class="product-profit none">walang puhunan</div>';
    if (typeof p.cost === "number") {
      const diff = round2(p.price - p.cost);
      profitLine = diff >= 0
        ? '<div class="product-profit">Kita ' + peso(diff) + "</div>"
        : '<div class="product-profit loss">Lugi ' + peso(-diff) + "</div>";
    }

    html += '<div class="product-row" data-barcode="' + escapeHtml(p.barcode) + '">' +
      thumbHtml(p, "small") +
      '<div class="product-main"><div class="product-name">' + (p.front ? icon("star", "ico-star") : "") + escapeHtml(p.name) + "</div>" +
      '<div class="product-code">' + escapeHtml(p.barcode) + "</div></div>" +
      '<div class="product-nums"><div>' + peso(p.price) + "</div>" +
      '<div class="product-stock">Stock: ' + p.stock + "</div>" + profitLine + "</div>" +
      status +
      "</div>";
  });

  if (shown === 0) {
    html = '<p class="empty">' + (products.length === 0 ? "Wala pang paninda. Magdagdag sa baba." : "Walang nahanap na paninda.") + "</p>";
  }
  document.getElementById("product-list").innerHTML = html;
}

// Today's total and number of transactions shown at the top of the page
function renderSummary() {
  const stats = todayStats();
  document.getElementById("today-total").textContent = peso(stats.total);
  document.getElementById("today-count").textContent = stats.count;
}

// Everything that happened on one day (like "2026-11-09"), newest first:
// product sales, utang payments received, and Para samen.
function dayEvents(dateString) {
  const events = [];

  sales.forEach(function (sale, index) {
    if (sale.date === dateString) {
      events.push({ kind: "sale", ts: sale.ts || 0, order: index, data: sale });
    }
  });
  ledger.forEach(function (entry, index) {
    if (entry.type === "payment" && entry.date === dateString) {
      events.push({ kind: "payment", ts: entry.ts || 0, order: index, data: entry });
    }
  });
  ownUse.forEach(function (entry, index) {
    if (entry.date === dateString) {
      events.push({ kind: "own", ts: entry.ts || 0, order: index, data: entry });
    }
  });

  // newest first (older records without a timestamp go last, in the order they were saved)
  events.sort(function (a, b) {
    return (b.ts - a.ts) || (b.order - a.order);
  });
  return events;
}

function todayEvents() {
  return dayEvents(todayText());
}

// The puhunan (cost) of one sold line. Old sales did not remember it,
// so we use the product's puhunan today. null = we don't know it.
function itemCost(item) {
  if (typeof item.cost === "number") {
    return item.cost;
  }
  const product = findProduct(item.barcode);
  return product && typeof product.cost === "number" ? product.cost : null;
}

// Kita (profit) of one sale = (price - puhunan) x quantity.
// "unknown" counts the items that have no puhunan, so they are not in the profit.
function saleProfit(sale) {
  let profit = 0;
  let known = 0;
  let unknown = 0;
  sale.items.forEach(function (item) {
    const cost = itemCost(item);
    if (cost === null) {
      unknown += item.qty;
    } else {
      profit += lineTotal(item) - cost * item.qty;
      known += item.qty;
    }
  });
  return { profit: round2(profit), known: known, unknown: unknown };
}

// The numbers of one day.
// Total = sales paid in cash + utang payments received.
// Sales charged to utang are NOT in the total until the person pays.
// Kita (profit) = profit on the products. Para samen is not in it.
function dayStats(dateString) {
  const stats = {
    total: 0, count: 0, items: 0, utangCharged: 0,
    profitItems: 0, profitUtang: 0, noCost: 0, ownItems: 0, ownCost: 0, profit: 0
  };
  dayEvents(dateString).forEach(function (event) {
    const d = event.data;
    if (event.kind === "sale") {
      stats.count++;
      d.items.forEach(function (item) { stats.items += item.qty; });
      const sp = saleProfit(d);
      stats.profitItems += sp.profit;
      stats.noCost += sp.unknown;
      if (d.utang) {
        stats.utangCharged += d.total;
        stats.profitUtang += sp.profit;
      } else {
        stats.total += d.total;
      }
    } else if (event.kind === "payment") {
      stats.count++;
      stats.total += d.amount;
    } else if (event.kind === "own") {
      d.items.forEach(function (item) {
        stats.ownItems += item.qty;
        const cost = itemCost(item);
        if (cost !== null) { stats.ownCost += cost * item.qty; }
      });
    }
  });
  stats.profit = stats.profitItems;
  Object.keys(stats).forEach(function (key) { stats[key] = round2(stats[key]); });
  return stats;
}
function todayStats() {
  return dayStats(todayText());
}

// Notes under the profit boxes (the same words for Today and for the 7 Days page)
function profitNotes(stats) {
  let text = "Kita = benta \u2212 puhunan.";
  if (stats.profitUtang > 0) {
    text += " Kasama ang kita sa utang na hindi pa bayad (" + peso(stats.profitUtang) + ").";
  }
  if (stats.noCost > 0) {
    text += " May " + stats.noCost + " item na walang puhunan, kaya wala sa kita. Ilagay ang puhunan sa Paninda tab.";
  }
  return text;
}

function ownNotes(stats) {
  if (stats.ownItems === 0) {
    return "";
  }
  return "Para samen: " + stats.ownItems + " item" + (stats.ownItems === 1 ? "" : "s") +
    (stats.ownCost > 0 ? " (puhunan " + peso(stats.ownCost) + ")" : "") +
    ". Hindi kasama sa benta at kita.";
}

// Turn a list of events into the colored transaction cards.
// showDay = also write the day, like "Mon, Nov 9".
function txnHtml(events, showDay, emptyText) {
  let html = "";
  events.forEach(function (event) {
    const before = html.length;
    const d = event.data;
    const when = (showDay ? escapeHtml(dayLabel(d.date)) + " &middot; " : "") + escapeHtml(d.time);
    if (event.kind === "sale") {
      let lines = "";
      d.items.forEach(function (item) {
        lines += "<li><span>" + item.qty + " &times; " + escapeHtml(item.name) + "</span>" + '<span class="line-amount">' + peso(lineTotal(item)) + "</span></li>";
      });
      const parts = [];
      let tag = '<span class="tag sale">SALE</span>';
      if (d.utang) {
        tag = '<span class="tag utang">UTANG &middot; ' + escapeHtml(d.utang.name) + "</span>";
        parts.push("Nasa utang" + (d.utang.takenBy ? " &middot; kumuha: " + escapeHtml(d.utang.takenBy) : ""));
      } else if (typeof d.cash === "number") {
        parts.push("Cash " + peso(d.cash) + " &middot; Sukli " + peso(d.change));
      }
      const sp = saleProfit(d);
      if (sp.known > 0) { parts.push("Kita " + peso(sp.profit)); }
      const pay = parts.length ? '<div class="txn-pay">' + parts.join(" &middot; ") + "</div>" : "";
      html += '<div class="txn ' + (d.utang ? "k-utang" : "k-sale") + '">' + '<div class="txn-head"><span class="txn-time">' + when + tag + "</span>" + '<span class="txn-total">' + peso(d.total) + "</span></div>" + '<ul class="txn-items">' + lines + "</ul>" + pay + "</div>";
    } else if (event.kind === "payment") {
      html += '<div class="txn k-utang">' + '<div class="txn-head"><span class="txn-time">' + when + '<span class="tag utang">BAYAD SA UTANG</span></span>' + '<span class="txn-total">' + peso(d.amount) + "</span></div>" + '<div class="txn-pay">Galing kay ' + escapeHtml(d.name) + "</div></div>";
    } else if (event.kind === "own") {
      let lines = "";
      let costTotal = 0;
      d.items.forEach(function (item) {
        lines += "<li><span>" + item.qty + " &times; " + escapeHtml(item.name) + "</span></li>";
        const cost = itemCost(item);
        if (cost !== null) { costTotal += cost * item.qty; }
      });
      const note = costTotal > 0 ? "Puhunan " + peso(round2(costTotal)) + " &middot; hindi kasama sa kita" : "Hindi kasama sa benta at kita";
      html += '<div class="txn k-own">' + '<div class="txn-head"><span class="txn-time">' + when + '<span class="tag own">PARA SAMEN</span></span><span class="txn-total"></span></div>' + '<ul class="txn-items">' + lines + "</ul>" + '<div class="txn-pay">' + note + "</div></div>";
    }
    if (["sale", "payment", "own"].indexOf(event.kind) >= 0) {
      const block = html.slice(before);
      const attrs = ' data-kind="' + event.kind + '" data-order="' + event.order + '"';
      const buttons = '<div class="txn-actions">' + (event.kind === "sale" ? '<button type="button" class="txn-btn" data-act="receipt"' + attrs + ">"+icon("receipt")+"Resibo</button>" : "") + '<button type="button" class="txn-btn undo" data-act="undo"' + attrs + ">"+icon("trash")+"Burahin</button></div>";
      html = html.slice(0, before) + block.slice(0, -6) + buttons + "</div>";
    }
  });
  return html || '<p class="empty">' + emptyText + "</p>";
}
// The Today tab
function renderToday() {
  const stats = todayStats();
  document.getElementById("stat-total").textContent = peso(stats.total);
  document.getElementById("stat-count").textContent = stats.count;
  document.getElementById("stat-items").textContent = stats.items;
  // whole pesos are shown without ".00" so the small boxes stay readable
  document.getElementById("stat-hint").textContent =
    "Total = cash sales + bayad sa utang." +
    (stats.utangCharged > 0 ? " Nasa utang ngayon (" + peso(stats.utangCharged) + ") ay wala pa sa total." : "");

  document.getElementById("stat-profit").textContent = peso(stats.profit);
  document.getElementById("stat-profit-items").textContent = peso(stats.profitItems);
  document.getElementById("profit-hint").textContent = profitNotes(stats);
  document.getElementById("own-hint").textContent = ownNotes(stats);

  document.getElementById("today-list").innerHTML = txnHtml(todayEvents(), false, "Wala pa ngayon.");
}

// ----- the 7 Days tab: pick a day, see that day's transactions -----
let weekDate = todayText();

// the last 7 days, oldest first, today last
function lastSevenDates() {
  const now = new Date();
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    dates.push(dateText(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)));
  }
  return dates;
}

function renderWeek() {
  const dates = lastSevenDates();
  const today = todayText();
  if (dates.indexOf(weekDate) < 0) {
    weekDate = today;                 // the page was left open overnight
  }

  let chips = "";
  let sevenTotal = 0;
  let sevenProfit = 0;
  dates.forEach(function (date) {
    const stats = dayStats(date);
    sevenTotal += stats.total;
    sevenProfit += stats.profit;
    const weekday = parseDate(date).toLocaleDateString("en-US", { weekday: "short" });
    chips += '<button type="button" class="day-chip' + (date === weekDate ? " active" : "") + (date === today ? " is-today" : "") +
      '" data-date="' + date + '" aria-label="' + escapeHtml(dayLabelLong(date)) + '">' +
      '<span class="day-name">' + weekday + "</span>" +
      '<span class="day-num">' + parseDate(date).getDate() + "</span>" +
      '<span class="day-sum">' + (stats.total > 0 ? pesoCompact(stats.total) : "&ndash;") + "</span></button>";
  });
  document.getElementById("day-strip").innerHTML = chips;
  document.getElementById("wk7-total").textContent = peso(round2(sevenTotal));
  document.getElementById("wk7-profit").textContent = peso(round2(sevenProfit));

  const stats = dayStats(weekDate);
  document.getElementById("wk-title").textContent = dayLabelLong(weekDate) + (weekDate === today ? " (Ngayon)" : "");
  document.getElementById("wk-total").textContent = peso(stats.total);
  document.getElementById("wk-count").textContent = stats.count;
  document.getElementById("wk-items").textContent = stats.items;
  document.getElementById("wk-profit").textContent = peso(stats.profit);  document.getElementById("wk-hint").textContent = (profitNotes(stats) + " " + ownNotes(stats)).trim();
  document.getElementById("week-list").innerHTML = txnHtml(dayEvents(weekDate), true, "Walang transactions sa araw na ito.");
  renderWeekExtras(dates);
}

document.getElementById("day-strip").addEventListener("click", function (event) {
  const chip = event.target.closest(".day-chip");
  if (chip) {
    weekDate = chip.getAttribute("data-date");
    renderWeek();
  }
});

function renderAll() {
  renderSell();
  renderProducts();
  renderUtang();
  renderSummary();
  renderToday();
  renderWeek();
}


/* ---------- 7. TABS ---------- */

function showView(name) {
  const views = ["sell", "today", "week", "utang", "products"];
  views.forEach(function (v) {
    document.getElementById("view-" + v).hidden = name !== v;
    document.getElementById("tab-" + v).classList.toggle("active", name === v);
  });
  document.getElementById("checkout-bar").hidden = name !== "sell";

  // Refresh so the date and totals are right even if the page was left open overnight
  if (name === "today") {
    renderToday();
    renderSummary();
  }
  if (name === "week") {
    renderWeek();
  }
  if (name === "utang") {
    renderUtang();
  }
  if (name === "products") {
  }
  window.scrollTo(0, 0);
}

document.querySelectorAll(".tab").forEach(function (button) {
  button.addEventListener("click", function () {
    showView(button.getAttribute("data-view"));
  });
});


/* ---------- 8. PAYMENT SHEET ---------- */

const QUICK_CASH = [20, 50, 100, 200, 500, 1000];

function buildQuickCash() {
  // each button has the color of the real peso bill, so it can be found by color
  let html = '<button type="button" class="bill exact" data-cash="exact">Exact</button>';
  QUICK_CASH.forEach(function (amount) {
    html += '<button type="button" class="bill ' + BILL_CLASS[amount] + '" data-cash="' + amount + '">\u20B1' + amount + "</button>";
  });
  document.getElementById("quick-cash").innerHTML = html;
}

function openPay() {
  if (cart.length === 0) {
    return;
  }
  document.getElementById("pay-total").textContent = peso(cartTotal());
  document.getElementById("cash-input").value = "";
  updateChange();
  document.getElementById("pay-overlay").hidden = false;
  speakAmount("Total", cartTotal());
}

function closePay() {
  document.getElementById("pay-overlay").hidden = true;
}

// Show the change while the cash amount is typed
function updateChange() {
  const cash = parseFloat(document.getElementById("cash-input").value);
  const total = cartTotal();
  const label = document.getElementById("change-label");
  const amount = document.getElementById("change");
  const confirmButton = document.getElementById("pay-confirm");

  if (isNaN(cash)) {
    label.textContent = "Sukli";
    amount.textContent = peso(0);
    confirmButton.disabled = false;       // allowed: sale without typing the cash
  } else if (cash < total) {
    label.textContent = "Kulang pa";
    amount.textContent = peso(total - cash);
    confirmButton.disabled = true;
  } else {
    label.textContent = "Sukli";
    amount.textContent = peso(cash - total);
    confirmButton.disabled = false;
  }
}

// The big button: Bayad normally, or Kunin when the Para samen switch is ON
document.getElementById("charge-btn").addEventListener("click", function () {
  if (ownMode) {
    takeForUs();
  } else {
    openPay();
  }
});
document.getElementById("own-toggle").addEventListener("change", function () {
  setOwnMode(this.checked);
});
document.getElementById("best-toggle").addEventListener("change", function () {
  settings.bestOnly = this.checked;
  saveData();
  renderSwitches();
  renderTiles();
});
document.getElementById("product-search").addEventListener("input", renderProducts);
document.getElementById("pay-cancel").addEventListener("click", closePay);
document.getElementById("cash-input").addEventListener("input", updateChange);

document.getElementById("quick-cash").addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (!button) { return; }
  const value = button.getAttribute("data-cash");
  const cash = value === "exact" ? cartTotal() : parseFloat(value);
  document.getElementById("cash-input").value = cash;
  updateChange();
});

document.getElementById("pay-confirm").addEventListener("click", function () {
  const cash = parseFloat(document.getElementById("cash-input").value);
  chargeSale(cash);
  closePay();
});


/* ---------- 9. TAPS ON THE SELL TAB ---------- */

// Typing a barcode (or a laptop scanner that presses Enter)
document.getElementById("scan-form").addEventListener("submit", function (event) {
  event.preventDefault();                       // stop the page from reloading
  const input = document.getElementById("barcode-input");
  const barcode = input.value.trim();
  if (barcode !== "") {
    addToCart(barcode);
  }
  input.value = "";
  focusBarcodeBox();
});

// Tapping a product tile
document.getElementById("tile-grid").addEventListener("click", function (event) {
  const tile = event.target.closest(".tile");
  if (tile) {
    addToCart(tile.getAttribute("data-barcode"));
  }
});

// Tapping + or - in the cart
document.getElementById("cart-list").addEventListener("click", function (event) {
  const button = event.target.closest("button[data-change]");
  if (button) {
    changeQty(button.getAttribute("data-barcode"), parseInt(button.getAttribute("data-change"), 10));
  }
});

document.getElementById("search-input").addEventListener("input", renderTiles);


/* ---------- 10. CAMERA SCANNER ----------
   iPhone Safari cannot read barcodes by itself, so we load a free helper library
   (html5-qrcode) the first time you tap Scan. After that it is saved for offline use. */

let scanner = null;          // the scanner object, while the camera is open
let scannerMode = "sell";    // "sell" = keep adding to the cart, "fill" = fill the barcode box once
let lastScanCode = "";
let lastScanTime = 0;
let scanResultPending = false;
let scannerCloseTimer = null;

// Load a script file from the internet. Returns a Promise (a "promise to finish later").
function loadScript(url) {
  return new Promise(function (resolve, reject) {
    const tag = document.createElement("script");
    tag.src = url;
    tag.onload = resolve;
    tag.onerror = reject;
    document.head.appendChild(tag);
  });
}

// Try the first address, and if that fails, try the second.
function loadScannerLibrary() {
  if (window.Html5Qrcode) {
    return Promise.resolve();
  }
  const urls = [
    "https://unpkg.com/html5-qrcode@2.3.8",
    "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js"
  ];
  let attempt = Promise.reject();
  urls.forEach(function (url) {
    attempt = attempt.catch(function () { return loadScript(url); });
  });
  return attempt.then(function () {
    if (!window.Html5Qrcode) {
      throw new Error("scanner library missing");
    }
  });
}

// A short beep so you know a scan worked (high = good, low = problem)
let audioContext = null;
function unlockAudio() {
  try {
    const AudioClass = window.AudioContext || window.webkitAudioContext;
    if (AudioClass && !audioContext) {
      audioContext = new AudioClass();
    }
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    }
  } catch (error) {}
}
function beep(good) {
  try {
    if (!audioContext) { return; }
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    oscillator.frequency.value = good ? 880 : 220;
    volume.gain.value = 0.08;
    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + (good ? 0.12 : 0.3));
  } catch (error) {}
}

function setScannerStatus(text) {
  document.getElementById("scanner-status").textContent = text;
  const box = document.getElementById("scanner-product");
  if (box && !text) { box.hidden = true; box.innerHTML = ""; }
}

function showScannedProduct(product) {
  const box = document.getElementById("scanner-product");
  if (!box) { return; }
  box.hidden = !product;
  box.innerHTML = product ? "<strong>" + escapeHtml(product.name) + "</strong><span>" + peso(product.price) + "</span>" : "";
}
// The barcode kinds found on store products
const SCAN_FORMAT_NAMES = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"];

function scanFormats() {
  return [
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39
  ];
}

async function openScanner(mode) {
  if (scannerCloseTimer) { clearTimeout(scannerCloseTimer); scannerCloseTimer = null; }
  scanResultPending = false;
  scannerMode = mode;
  lastScanCode = "";
  unlockAudio();
  document.getElementById("scanner-overlay").hidden = false;
  showScannedProduct(null);
  setScannerStatus("Binubuksan ang camera...");

  try {
    await loadScannerLibrary();
  } catch (error) {
    setScannerStatus("Hindi ma-load ang scanner. Check ang internet, o i-type ang barcode.");
    return;
  }
  await startLive();
}

// Start the live camera. Safe to call twice.
// If this browser has the built-in BarcodeDetector, the library uses it (faster and better).
async function startLive() {
  if (scanner || document.getElementById("scanner-overlay").hidden || !window.Html5Qrcode) {
    return;
  }
  try {
    scanner = new Html5Qrcode("reader", {
      verbose: false,
      formatsToSupport: scanFormats(),
      useBarCodeDetectorIfSupported: true,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true }
    });
    const scanBox = function (width, height) {
      // read almost the whole picture, not just a small box in the middle
      return { width: Math.floor(width * 0.94), height: Math.floor(Math.min(height * 0.75, 300)) };
    };
    try {
      // HD video (the default is a blurry 640x480, so the barcode had to be huge)
      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: scanBox,
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        },
        onScanSuccess,
        function () {}
      );
    } catch (hdError) {
      // some phones refuse the HD settings: try the plain way
      try { await scanner.stop(); } catch (e) {}
      scanner = new Html5Qrcode("reader", {
        verbose: false,
        formatsToSupport: scanFormats(),
        useBarCodeDetectorIfSupported: true
      });
      await scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: scanBox }, onScanSuccess, function () {});
    }
    // ask for continuous auto-focus (ignored by phones that can't)
    try { scanner.applyVideoConstraints({ advanced: [{ focusMode: "continuous" }] }); } catch (e) {}
    setupZoom();
    setScannerStatus(scannerMode === "sell" ? "Itutok sa barcode. Lalabas ang pangalan at presyo, saka kusang magsasara ang camera." : scannerMode === "receive" ? "Itutok sa mga barcode. Tuloy-tuloy ang scan hanggang pindutin ang Done." : "Itutok sa barcode.");
  } catch (error) {
    scanner = null;
    setScannerStatus("Hindi mabuksan ang camera. Payagan ang camera para sa page na ito (iPhone: Settings > Safari > Camera).");
  }
}

// Zoom slider. Only some phones allow camera zoom from a web page (many Androids do, iPhone Safari does not).
function setupZoom() {
  const row = document.getElementById("zoom-row");
  const slider = document.getElementById("zoom-slider");
  row.hidden = true;
  try {
    const caps = scanner.getRunningTrackCapabilities();
    if (!caps || !caps.zoom || !(caps.zoom.max > caps.zoom.min)) {
      return;
    }
    slider.min = caps.zoom.min;
    slider.max = Math.min(caps.zoom.max, 5);
    slider.step = caps.zoom.step || 0.1;
    const start = Math.min(Math.max(1.5, caps.zoom.min), slider.max);   // a little zoom helps with small barcodes
    slider.value = start;
    applyZoom(start);
    row.hidden = false;
  } catch (error) {}
}

function applyZoom(value) {
  document.getElementById("zoom-value").textContent = (Math.round(value * 10) / 10) + "x";
  try {
    scanner.applyVideoConstraints({ advanced: [{ zoom: parseFloat(value) }] });
  } catch (error) {}
}

document.getElementById("zoom-slider").addEventListener("input", function () {
  if (scanner) { applyZoom(this.value); }
});

async function stopLive() {
  const active = scanner;
  scanner = null;
  if (active) {
    try { await active.stop(); } catch (error) {}
    try { active.clear(); } catch (error) {}
  }
}

async function closeScanner() {
  if (scannerCloseTimer) { clearTimeout(scannerCloseTimer); scannerCloseTimer = null; }
  scanResultPending = false;
  await stopLive();
  document.getElementById("scanner-overlay").hidden = true;
  showScannedProduct(null);
}

// Called by the library each time it reads a barcode. force = skip the "same barcode again" check.
function onScanSuccess(code, force) {
  if (scanResultPending) { return; }
  // The camera sees the same barcode many times a second. Ignore repeats within 2 seconds.
  const now = Date.now();
  if (force !== true && code === lastScanCode && now - lastScanTime < 2000) {
    return;
  }
  lastScanCode = code;
  lastScanTime = now;

  if (scannerMode === "fill" || scannerMode === "edit") {
    // fill the barcode box of the Add form, or of the Edit sheet, then close the camera
    const boxId = scannerMode === "fill" ? "new-barcode" : "edit-barcode";
    document.getElementById(boxId).value = code;
    beep(true);
    closeScanner();
    return;
  }

  if (scannerMode === "receive") {
    const got = receiveAdd(code);
    beep(got.ok);
    setScannerStatus(got.text);
    return;
  }

  const result = addToCart(code);
  beep(result.ok);
  setScannerStatus(result.text);
    const scannedProduct = findProduct(code);
  showScannedProduct(result.ok ? scannedProduct : null);
  if (result.ok) {
    // Show the product and price briefly, then stop the camera and return to Sell.
    scanResultPending = true;
    scannerCloseTimer = window.setTimeout(function () { closeScanner(); }, 800);
  }
}

document.getElementById("camera-btn").addEventListener("click", function () { openScanner("sell"); });
document.getElementById("fill-camera-btn").addEventListener("click", function () { openScanner("fill"); });
document.getElementById("scanner-close").addEventListener("click", closeScanner);


/* ---------- 11. ADD A PRODUCT ---------- */

document.getElementById("add-form").addEventListener("submit", function (event) {
  event.preventDefault();

  const message = document.getElementById("form-message");
  const barcode = document.getElementById("new-barcode").value.trim();
  const name = document.getElementById("new-name").value.trim();

  if (findProduct(barcode)) {
    message.textContent = "Nasa listahan na ang barcode na iyan.";
    return;
  }

  // If the "Restock at" box was left empty, use 5
  let reorder = parseInt(document.getElementById("new-reorder").value, 10);
  if (isNaN(reorder)) {
    reorder = 5;
  }

  const bundleInfo = readBundle("new");
  if (bundleInfo.error) {
    message.textContent = bundleInfo.error;
    return;
  }

  const newProduct = {
    barcode: barcode,
    name: name,
    price: parseFloat(document.getElementById("new-price").value),
    stock: parseInt(document.getElementById("new-stock").value, 10),
    reorder: reorder
  };
  const category = document.getElementById("new-category").value.trim();
  if (category) newProduct.category = category;
  const cost = parseFloat(document.getElementById("new-cost").value);
  if (!isNaN(cost) && cost >= 0) {
    newProduct.cost = cost;               // puhunan: what we paid for it
  }
  if (bundleInfo.bundle) {
    newProduct.bundle = bundleInfo.bundle;   // for example 3 for 10 pesos
  }
  if (newPhoto) {
    newProduct.photo = newPhoto;          // small photo of the product
  }
  if (document.getElementById("new-front").checked) {
    newProduct.front = true;              // always on the front page
  }
  products.push(newProduct);

  saveData();
  renderAll();
  this.reset();
  newPhoto = "";
  showPhotoField("new", "", "");
  showProfitLine("new-cost", "new-price", "new-profit");
  showFrontState("new-front");
  message.textContent = "Naidagdag: " + name;
});


// The ON / OFF word next to a "front page" switch
function showFrontState(id) {
  const box = document.getElementById(id);
  box.parentNode.querySelector(".switch-state").textContent = box.checked ? "ON" : "OFF";
}
["new-front", "edit-front"].forEach(function (id) {
  document.getElementById(id).addEventListener("change", function () { showFrontState(id); });
});

// The green "Kita \u20B13.00 bawat isa" line under the Puhunan and Presyo boxes
function showProfitLine(costId, priceId, lineId) {
  const cost = parseFloat(document.getElementById(costId).value);
  const price = parseFloat(document.getElementById(priceId).value);
  const line = document.getElementById(lineId);
  line.className = "profit-line";
  if (isNaN(cost) || isNaN(price)) {
    line.textContent = "";
    return;
  }
  const diff = round2(price - cost);
  if (diff < 0) {
    line.classList.add("loss");
    line.textContent = "Lugi: " + peso(-diff) + " bawat isa";
  } else {
    line.textContent = "Kita: " + peso(diff) + " bawat isa";
  }
}
["new-cost", "new-price"].forEach(function (id) {
  document.getElementById(id).addEventListener("input", function () {
    showProfitLine("new-cost", "new-price", "new-profit");
  });
});
["edit-cost", "edit-price"].forEach(function (id) {
  document.getElementById(id).addEventListener("input", function () {
    showProfitLine("edit-cost", "edit-price", "edit-profit");
  });
});


/* ---------- 11b. EDIT AND DELETE A PRODUCT ----------
   Tap a product in the Products tab to open the Edit sheet. */

let editingBarcode = null;   // which product is being edited right now

function openEdit(barcode) {
  const product = products.find(function (p) { return p.barcode === barcode; });
  if (!product) {
    return;
  }
  editingBarcode = product.barcode;
  editPhoto = product.photo || "";
  showPhotoField("edit", editPhoto, product.name);
  document.getElementById("edit-name").value = product.name;
  document.getElementById("edit-category").value = product.category || "";
  document.getElementById("edit-barcode").value = product.barcode;
  document.getElementById("edit-price").value = product.price;
  document.getElementById("edit-cost").value = typeof product.cost === "number" ? product.cost : "";
  showProfitLine("edit-cost", "edit-price", "edit-profit");
  document.getElementById("edit-stock").value = product.stock;
  document.getElementById("edit-reorder").value = product.reorder;
  byId("edit-bundle-qty").value = product.bundle ? product.bundle.qty : "";
  byId("edit-bundle-price").value = product.bundle ? product.bundle.price : "";
  document.getElementById("edit-front").checked = !!product.front;
  showFrontState("edit-front");
  document.getElementById("edit-message").textContent = "";
  document.getElementById("edit-overlay").hidden = false;
}

function closeEdit() {
  editingBarcode = null;
  document.getElementById("edit-overlay").hidden = true;
}

function saveEdit() {
  const product = products.find(function (p) { return p.barcode === editingBarcode; });
  if (!product) {
    closeEdit();
    return;
  }

  const message = document.getElementById("edit-message");
  const newBarcode = document.getElementById("edit-barcode").value.trim();

  // The new barcode must not belong to a different product.
  const other = findProduct(newBarcode);
  if (other && other !== product) {
    message.textContent = "Gamit na ng ibang paninda ang barcode na iyan: " + other.name;
    return;
  }

  // puhunan: empty = not known yet
  const costText = document.getElementById("edit-cost").value.trim();
  const newCost = parseFloat(costText);
  if (costText !== "" && (isNaN(newCost) || newCost < 0)) {
    message.textContent = "Mali ang puhunan. Mag-type ng 0 o higit pa.";
    return;
  }

  const bundleInfo = readBundle("edit");
  if (bundleInfo.error) {
    message.textContent = bundleInfo.error;
    return;
  }

  const oldBarcode = product.barcode;
  if (bundleInfo.bundle) {
    product.bundle = bundleInfo.bundle;
  } else {
    delete product.bundle;
  }
  product.name = document.getElementById("edit-name").value.trim();
  const category = document.getElementById("edit-category").value.trim();
  if (category) { product.category = category; } else { delete product.category; }
  product.barcode = newBarcode;
  product.price = parseFloat(document.getElementById("edit-price").value);
  if (costText === "") {
    delete product.cost;
  } else {
    product.cost = newCost;
  }
  product.stock = parseInt(document.getElementById("edit-stock").value, 10);
  product.reorder = parseInt(document.getElementById("edit-reorder").value, 10);
  if (document.getElementById("edit-front").checked) {
    product.front = true;
  } else {
    delete product.front;
  }
  if (editPhoto) {
    product.photo = editPhoto;
  } else {
    delete product.photo;              // no photo: a colored letter is shown
  }
  delete product.icon;                 // old emoji pictures are not used anymore

  // If this product is in the current sale, update that line too.
  const line = cart.find(function (item) { return item.barcode === oldBarcode; });
  if (line) {
    line.barcode = product.barcode;
    line.name = product.name;
    line.price = product.price;
    line.bundle = product.bundle || null;
    if (line.qty > product.stock) {
      line.qty = product.stock;                      // can't sell more than we now have
    }
    cart = cart.filter(function (item) { return item.qty > 0; });
  }

  saveData();
  renderAll();
  closeEdit();
}

function deleteProduct() {
  const product = products.find(function (p) { return p.barcode === editingBarcode; });
  if (!product) {
    closeEdit();
    return;
  }
  if (!confirm("Burahin ang " + product.name + "?\n\nMananatili ang mga lumang benta.")) {
    return;
  }
  products = products.filter(function (p) { return p !== product; });
  cart = cart.filter(function (item) { return item.barcode !== product.barcode; });
  saveData();
  renderAll();
  closeEdit();
}

document.getElementById("product-list").addEventListener("click", function (event) {
  const row = event.target.closest(".product-row");
  if (row) {
    openEdit(row.getAttribute("data-barcode"));
  }
});

document.getElementById("edit-form").addEventListener("submit", function (event) {
  event.preventDefault();
  saveEdit();
});
document.getElementById("edit-cancel").addEventListener("click", closeEdit);
document.getElementById("edit-delete").addEventListener("click", deleteProduct);
document.getElementById("edit-scan-btn").addEventListener("click", function () { openScanner("edit"); });

// Delete everything (the sample products too) and start with an empty list
document.getElementById("empty-btn").addEventListener("click", function () {
  if (confirm("Burahin LAHAT ng paninda at benta at magsimula sa walang laman?\n\nMananatili ang utang.\nMag-save muna ng backup kung kailangan.")) {
    products = [];
    sales = [];
    ownUse = [];
    cart = [];
    saveData();
    renderAll();
  }
});


/* ---------- 11d. UTANG ----------
   The utang "ledger" is a list of entries:
   a "charge" (items taken, amount) or a "payment" (money received).
   What a person owes = all their charges minus all their payments. */

// "Juan  Cruz" and "juan cruz" count as the same person
function debtKey(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, " ");
}

// Group the ledger by person. Returns a list of { key, name, balance, last, entries }.
function debtBook() {
  const people = {};
  ledger.forEach(function (entry) {
    const key = debtKey(entry.name);
    if (!people[key]) {
      people[key] = { key: key, name: entry.name, balance: 0, last: 0, entries: [] };
    }
    const person = people[key];
    person.balance = round2(person.balance + (entry.type === "charge" ? entry.amount : -entry.amount));
    person.last = Math.max(person.last, entry.ts || 0);
    person.entries.push(entry);
  });
  return Object.keys(people).map(function (key) { return people[key]; });
}

function renderUtang() {
  const people = debtBook();

  let owed = 0;
  let owing = 0;
  people.forEach(function (p) {
    if (p.balance > 0) {
      owed += p.balance;
      owing++;
    }
  });
  byId("debt-total").textContent = peso(round2(owed));
  byId("debt-people").textContent = owing + (owing === 1 ? " person" : " people");

  const stale = people.filter(function (p) { return debtStaleDays(p) >= STALE_DAYS; });
  let staleSum = 0;
  stale.forEach(function (p) { staleSum += p.balance; });
  byId("debt-stale").textContent = stale.length
    ? stale.length + (stale.length === 1 ? " tao" : " katao") + " ang " + STALE_DAYS + "+ araw nang hindi nagbabayad (" + peso(round2(staleSum)) + ")."
    : "";
  byId("debt-stale-btn").hidden = stale.length === 0 && !staleOnly;
  byId("debt-stale-btn").textContent = staleOnly ? "Ipakita lahat" : "Ipakita ang matagal nang hindi bayad";

  // suggestions while typing a name in the "Charge to utang" sheet
  byId("utang-names").innerHTML = people.map(function (p) {
    return '<option value="' + escapeHtml(p.name) + '"></option>';
  }).join("");

  const query = byId("debt-search").value.trim().toLowerCase();
  const shown = people
    .filter(function (p) { return (query === "" || p.name.toLowerCase().includes(query)) && (!staleOnly || debtStaleDays(p) >= STALE_DAYS); })
    .sort(function (a, b) {
      // people who still owe come first, biggest amount first
      return ((b.balance > 0) - (a.balance > 0)) || (b.balance - a.balance) || (b.last - a.last);
    });

  let html = "";
  shown.forEach(function (p) {
    const lastEntry = p.entries[p.entries.length - 1];
    const status = p.balance > 0
      ? '<div class="product-nums"><div>' + peso(p.balance) + "</div>" +
          (debtStaleDays(p) >= STALE_DAYS ? '<div class="stale-days">' + debtStaleDays(p) + " araw na</div>" : "") + "</div>"
      : '<span class="pill ok-status">PAID</span>';
    html += '<div class="product-row debt-row" data-key="' + escapeHtml(p.key) + '">' +
      avatarHtml(p.name) +
      '<div class="product-main"><div class="product-name">' + escapeHtml(p.name) + "</div>" +
      '<div class="product-code">Last: ' + escapeHtml(lastEntry.date) + "</div></div>" +
      status + "</div>";
  });

  if (shown.length === 0) {
    html = '<p class="empty">' + (people.length === 0 ? "No utang yet." : "No one matches that name.") + "</p>";
  }
  byId("debt-list").innerHTML = html;
}

// ----- the detail sheet for one person -----
let currentDebtKey = null;

function openDebt(key) {
  currentDebtKey = key;
  byId("debt-pay-amount").value = "";
  byId("debt-pay-message").textContent = "";
  renderDebtDetail();
  byId("debt-overlay").hidden = false;
}

function closeDebt() {
  currentDebtKey = null;
  byId("debt-overlay").hidden = true;
}

function findDebtPerson() {
  return debtBook().find(function (p) { return p.key === currentDebtKey; });
}

function renderDebtDetail() {
  const person = findDebtPerson();
  if (!person) {
    closeDebt();
    return;
  }
  byId("debt-name").textContent = person.name;
  byId("debt-balance").textContent = peso(Math.max(person.balance, 0));
  byId("debt-pay-form").hidden = person.balance <= 0;

  let html = "";
  person.entries.slice().reverse().forEach(function (entry) {
    const when = escapeHtml(entry.date + " " + entry.time);
    if (entry.type === "charge") {
      let lines = "";
      (entry.items || []).forEach(function (item) {
        lines += "<li><span>" + item.qty + " &times; " + escapeHtml(item.name) + "</span>" +
          '<span class="line-amount">' + peso(lineTotal(item)) + "</span></li>";
      });
      html += '<div class="txn"><div class="txn-head"><span class="txn-time">' + when + "</span>" +
        '<span class="txn-total">+' + peso(entry.amount) + "</span></div>" +
        '<ul class="txn-items">' + lines + "</ul>" +
        '<div class="txn-pay">Taken by: ' + (entry.takenBy ? escapeHtml(entry.takenBy) : "not noted") + "</div></div>";
    } else {
      html += '<div class="txn"><div class="txn-head"><span class="txn-time">' + when +
        '<span class="tag dark">PAYMENT</span></span>' +
        '<span class="txn-total">&minus;' + peso(entry.amount) + "</span></div></div>";
    }
  });
  byId("debt-entries").innerHTML = html;
}

byId("debt-list").addEventListener("click", function (event) {
  const row = event.target.closest(".debt-row");
  if (row) {
    openDebt(row.getAttribute("data-key"));
  }
});
byId("debt-search").addEventListener("input", renderUtang);
byId("debt-close").addEventListener("click", closeDebt);

byId("debt-pay-full").addEventListener("click", function () {
  const person = findDebtPerson();
  if (person && person.balance > 0) {
    byId("debt-pay-amount").value = person.balance;
  }
});

byId("debt-pay-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const person = findDebtPerson();
  const message = byId("debt-pay-message");
  if (!person) {
    return;
  }
  const amount = parseFloat(byId("debt-pay-amount").value);
  if (!(amount > 0)) {
    message.textContent = "Type the amount that was paid.";
    return;
  }
  if (amount > person.balance + 0.001) {
    message.textContent = "That is more than the balance (" + peso(person.balance) + ").";
    return;
  }

  ledger.push({
    ts: Date.now(),
    date: todayText(),
    time: new Date().toLocaleTimeString(),
    name: person.name,
    type: "payment",
    amount: round2(amount)
  });
  saveData();
  renderAll();
  byId("debt-pay-amount").value = "";
  message.textContent = "Payment recorded.";
  renderDebtDetail();
});

// ----- charging the current sale to utang -----
function openUtangCharge() {
  if (cart.length === 0) {
    return;
  }
  closePay();
  byId("utang-total").textContent = peso(cartTotal());
  byId("utang-name").value = "";
  byId("utang-by").value = "";
  byId("utang-balance-hint").textContent = "";
  byId("utang-overlay").hidden = false;
}

function closeUtangCharge() {
  byId("utang-overlay").hidden = true;
}

// show what this person already owes while the name is being typed
byId("utang-name").addEventListener("input", function () {
  const key = debtKey(this.value);
  const person = key === "" ? null : debtBook().find(function (p) { return p.key === key; });
  byId("utang-balance-hint").textContent = person
    ? "Already owes " + peso(Math.max(person.balance, 0)) + "."
    : (key === "" ? "" : "New name.");
});

byId("utang-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const name = byId("utang-name").value.trim();
  if (name === "" || cart.length === 0) {
    return;
  }
  // If this person already exists, keep the same spelling
  const existing = debtBook().find(function (p) { return p.key === debtKey(name); });
  chargeSale(NaN, { name: existing ? existing.name : name, takenBy: byId("utang-by").value.trim() });
  closeUtangCharge();
});

byId("pay-utang").addEventListener("click", openUtangCharge);
byId("utang-cancel").addEventListener("click", closeUtangCharge);


/* ---------- 11e. PICTURES ----------
   A product shows its photo. No photo yet? It shows a colored tile with the first letter,
   so people who can't read well can still tell items apart by the photo or the color. */

// muted background + letter color pairs (the same name always gets the same pair)
const LETTER_COLORS = [
  ["#e6ecfb", "#2d4a9a"],
  ["#fbe7df", "#a3441c"],
  ["#e1f2e9", "#1f6b45"],
  ["#f1e6fa", "#6b3a99"],
  ["#fbf0d3", "#8a6200"],
  ["#dff1f3", "#176875"],
  ["#fae3ec", "#a02857"],
  ["#ebebe8", "#4b4b46"]
];

function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// The picture for a product: <img> if it has a photo, otherwise the colored letter
function thumbHtml(p, size) {
  const cls = "thumb" + (size ? " " + size : "");
  if (p.photo) {
    return '<img class="' + cls + '" src="' + p.photo + '" alt="">';
  }
  const name = String(p.name || "?");
  const pair = LETTER_COLORS[hashText(name.toLowerCase()) % LETTER_COLORS.length];
  const letter = name.trim().charAt(0).toUpperCase() || "?";
  return '<span class="' + cls + ' letter" style="background:' + pair[0] + ";color:" + pair[1] + '">' + escapeHtml(letter) + "</span>";
}

// The round colored letter next to a person's name in Utang
const AVATAR_COLORS = ["#e55a0e", "#1769e8", "#0a8f57", "#6d3fd1", "#d6336c", "#0b7285", "#a15c07", "#5f3dc4"];

function avatarHtml(name) {
  const key = debtKey(name);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const letter = String(name).trim().charAt(0).toUpperCase() || "?";
  return '<span class="avatar" style="background:' + AVATAR_COLORS[hash % AVATAR_COLORS.length] + '">' + escapeHtml(letter) + "</span>";
}

// Money buttons use the color of the real peso bills
const BILL_CLASS = { 20: "b20", 50: "b50", 100: "b100", 200: "b200", 500: "b500", 1000: "b1000" };

// ----- Photo of the product (Add product and Edit product) -----
let newPhoto = "";
let editPhoto = "";

// Shrinks the picked photo to a small square so it takes little space on the phone
function readPhoto(file, done) {
  const reader = new FileReader();
  reader.onload = function () {
    const img = new Image();
    img.onload = function () {
      const size = 120;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const side = Math.min(img.width, img.height);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      done(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = function () { done(""); };
    img.src = reader.result;
  };
  reader.onerror = function () { done(""); };
  reader.readAsDataURL(file);
}

function showPhotoField(prefix, photo, name) {
  byId(prefix + "-photo-preview").innerHTML = thumbHtml({ photo: photo, name: name || "?" }, "big");
  byId(prefix + "-photo-clear").hidden = !photo;
  byId(prefix + "-photo-btn").lastChild.textContent = photo ? "Palitan ang litrato" : "Kumuha ng litrato";
}

function setupPhotoField(prefix, getName, setPhoto) {
  byId(prefix + "-photo-btn").addEventListener("click", function () {
    byId(prefix + "-photo-file").click();
  });
  byId(prefix + "-photo-file").addEventListener("change", function () {
    const file = this.files && this.files[0];
    const input = this;
    if (!file) { return; }
    readPhoto(file, function (data) {
      if (data) {
        setPhoto(data);
        showPhotoField(prefix, data, getName());
      }
      input.value = "";
    });
  });
  byId(prefix + "-photo-clear").addEventListener("click", function () {
    setPhoto("");
    showPhotoField(prefix, "", getName());
  });
  // the colored letter follows the name while typing
  byId(prefix + "-name").addEventListener("input", function () {
    if (!byId(prefix + "-photo-clear").hidden) { return; }
    showPhotoField(prefix, "", getName());
  });
}
setupPhotoField("new", function () { return byId("new-name").value; }, function (data) { newPhoto = data; });
setupPhotoField("edit", function () { return byId("edit-name").value; }, function (data) { editPhoto = data; });
showPhotoField("new", "", "");

/* ---------- 12. BACKUP AND RESTORE ----------
   A backup is a text file (.json) holding your products and sales. */

function makeBackup() {
  return {
    app: "sari-sari-pos",
    version: 2,
    savedAt: new Date().toISOString(),
    products: products,
    sales: sales,
    ledger: ledger,
    ownUse: ownUse,
    settings: settings
  };
}

// Check that a loaded file really looks like one of our backups.
// Returns a message describing the problem, or "" if the file is fine.
function checkBackup(data) {
  if (!data || data.app !== "sari-sari-pos") {
    return "This doesn't look like a backup from this POS.";
  }
  if (!Array.isArray(data.products) || !Array.isArray(data.sales)) {
    return "The backup file is missing its products or sales list.";
  }
  const productsOk = data.products.every(function (p) {
    return typeof p.barcode === "string" && typeof p.name === "string" &&
           typeof p.price === "number" && typeof p.stock === "number" &&
           typeof p.reorder === "number" &&
           (p.cost === undefined || typeof p.cost === "number");
  });
  if (!productsOk) {
    return "Some products in the backup file are damaged.";
  }
  // These three only exist in newer backups, so they are optional.
  if (data.ledger !== undefined && !Array.isArray(data.ledger)) {
    return "The utang records in the backup file are damaged.";
  }
  if (data.ownUse !== undefined && !Array.isArray(data.ownUse)) {
    return "The Para samen records in the backup file are damaged.";
  }
  return "";
}

function showBackupStatus() {
  const box = document.getElementById("backup-status");
  let last = "";
  try { last = localStorage.getItem(LAST_BACKUP_KEY) || ""; } catch (error) {}
  box.textContent = last
    ? "Last backup saved: " + new Date(last).toLocaleString()
    : "You haven't saved a backup yet.";
}

function markBackupDone() {
  try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch (error) {}
  showBackupStatus();
}

async function saveBackup() {
  const text = JSON.stringify(makeBackup(), null, 2);
  const fileName = "pos-backup-" + todayText() + ".json";

  // On an iPhone the best way is the Share sheet: choose "Save to Files" or Google Drive.
  try {
    const file = new File([text], fileName, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "POS backup" });
      markBackupDone();
      return;
    }
  } catch (error) {
    if (error && error.name === "AbortError") {
      return;                                  // you closed the share sheet: no backup was saved
    }
    // any other problem: fall through to the normal download below
  }

  // On a laptop: a normal file download.
  const blob = new Blob([text], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
  markBackupDone();
}

function restoreBackup(text) {
  let data;
  try { data = JSON.parse(text); }
  catch (error) { alert("That file couldn't be read. Is it a backup file from this POS?"); return; }
  const problem = checkBackup(data);
  if (problem) { alert(problem); return; }
  const question = "Restore this backup?\n\n" + data.products.length + " products and " + data.sales.length + " sales" +
    (data.savedAt ? " (saved " + new Date(data.savedAt).toLocaleString() + ")" : "") +
    ".\n\nThis REPLACES the data currently on this page.";
  if (!confirm(question)) { return; }
  products = data.products;
  sales = data.sales;
  if (data.ledger !== undefined) { ledger = data.ledger; }
  if (data.ownUse !== undefined) { ownUse = data.ownUse; }
  if (data.settings && typeof data.settings === "object") { settings = Object.assign({}, DEFAULT_SETTINGS, data.settings); }
  cart = [];
  lastSale = null;
  setOwnMode(false);
  renderSwitches();
  saveData();
  renderAll();
  showMessage("Backup restored.", "ok");
}

document.getElementById("backup-btn").addEventListener("click", saveBackup);
document.getElementById("restore-btn").addEventListener("click", function () { document.getElementById("restore-file").click(); });
document.getElementById("restore-file").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) { return; }
  const reader = new FileReader();
  reader.onload = function () { restoreBackup(reader.result); };
  reader.readAsText(file);
  this.value = "";
});
/* ---------- 10b. BURAHIN (UNDO), RESIBO (RECEIPT) AND BOSES (VOICE) ---------- */

// ----- Burahin: take back a wrong entry -----
function undoEntry(kind, order) {
  if (kind === "sale") {
    const sale = sales[order];
    if (!sale) { return; }
    const extra = sale.utang ? "\n\nTatanggalin din sa utang ni " + sale.utang.name + "." : "";
    if (!confirm("Burahin ang benta na " + peso(sale.total) + "?\n\nBabalik sa stock ang mga paninda." + extra)) { return; }
    sale.items.forEach(function (item) {
      const product = findProduct(item.barcode);
      if (product) { product.stock += item.qty; }
    });
    if (sale.utang) {
      const at = ledger.findIndex(function (e) {
        return e.type === "charge" && e.ts === sale.ts && e.name === sale.utang.name;
      });
      if (at >= 0) { ledger.splice(at, 1); }
    }
    sales.splice(order, 1);
    if (lastSale === sale) { lastSale = null; }
    showMessage("Nabura ang benta. Bumalik ang stock.", "ok");

  } else if (kind === "own") {
    const entry = ownUse[order];
    if (!entry) { return; }
    if (!confirm("Burahin ang Para samen na ito?\n\nBabalik sa stock ang mga paninda.")) { return; }
    entry.items.forEach(function (item) {
      const product = findProduct(item.barcode);
      if (product) { product.stock += item.qty; }
    });
    ownUse.splice(order, 1);
    showMessage("Nabura ang Para samen. Bumalik ang stock.", "ok");
  } else if (kind === "payment") {
    const entry = ledger[order];
    if (!entry || entry.type !== "payment") { return; }
    if (!confirm("Burahin ang bayad na " + peso(entry.amount) + " ni " + entry.name + "?\n\nBabalik ang utang niya.")) { return; }
    ledger.splice(order, 1);
    showMessage("Nabura ang bayad. Bumalik ang utang.", "ok");
  } else {
    return;
  }
  saveData();
  renderAll();
}

// One click handler for the buttons in both transaction lists
function txnButtonClick(event) {
  const button = event.target.closest(".txn-btn");
  if (!button) { return; }
  const kind = button.getAttribute("data-kind");
  const order = parseInt(button.getAttribute("data-order"), 10);
  if (button.getAttribute("data-act") === "receipt") {
    openReceipt(sales[order]);
  } else {
    undoEntry(kind, order);
  }
}
document.getElementById("today-list").addEventListener("click", txnButtonClick);
document.getElementById("week-list").addEventListener("click", txnButtonClick);

// ----- Resibo -----
let receiptText = "";

function receiptLines(sale) {
  const name = (settings.storeName || "").trim() || "Sari-Sari Store";
  const lines = [name, dayLabelLong(sale.date) + " " + sale.time, "--------------------------------"];
  sale.items.forEach(function (item) {
    lines.push(item.qty + " x " + item.name);
    lines.push("     " + (item.bundle && item.qty >= item.bundle.qty ? bundleText(item.bundle) : peso(item.price)) + " = " + peso(lineTotal(item)));
  });
  lines.push("--------------------------------");
  lines.push("TOTAL: " + peso(sale.total));
  if (sale.utang) {
    lines.push("UTANG: " + sale.utang.name);
  } else if (typeof sale.cash === "number") {
    lines.push("Cash: " + peso(sale.cash));
    lines.push("Sukli: " + peso(sale.change));
  }
  lines.push("");
  lines.push("Salamat po! Balik kayo.");
  return lines;
}

function openReceipt(sale) {
  if (!sale) { return; }
  const lines = receiptLines(sale);
  receiptText = lines.join("\n");
  document.getElementById("receipt-paper").innerHTML = lines.map(function (l) {
    return "<div>" + (escapeHtml(l) || "&nbsp;") + "</div>";
  }).join("");
  document.getElementById("receipt-overlay").hidden = false;
}

function showLastReceiptButton() {
  document.getElementById("last-receipt-btn").hidden = !lastSale;
}

document.getElementById("last-receipt-btn").addEventListener("click", function () { openReceipt(lastSale); });
document.getElementById("receipt-close").addEventListener("click", function () {
  document.getElementById("receipt-overlay").hidden = true;
});
document.getElementById("receipt-share").addEventListener("click", function () {
  if (navigator.share) {
    navigator.share({ text: receiptText }).catch(function () {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(receiptText).then(function () { alert("Na-copy ang resibo."); }).catch(function () {});
  }
});
// Print: the receipt goes into its own hidden page (an iframe) and only that page is printed.
// (Printing the whole app page made iPhone print the screen, not the receipt.)
let printFrame = null;
document.getElementById("receipt-print").addEventListener("click", function () {
  if (printFrame) { printFrame.remove(); printFrame = null; }
  const lines = receiptText.split("\n");
  const body = lines.map(function (line, i) {
    return '<div class="' + (i === 0 ? "store" : "") + '">' + (escapeHtml(line) || "&nbsp;") + "</div>";
  }).join("");
  const page = "<!doctype html><html><head><meta charset=\"utf-8\"><title>Resibo</title><style>" +
    "@page { margin: 0; }" +
    "body { margin: 0; padding: 10mm; background: #fff; color: #000; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.45; }" +
    ".receipt { width: 72mm; max-width: 100%; white-space: pre-wrap; }" +
    ".store { text-align: center; font-weight: bold; font-size: 16px; }" +
    "</style></head><body><div class=\"receipt\">" + body + "</div></body></html>";

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(frame);
  printFrame = frame;
  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(page);
  doc.close();
  // give the little page a moment to draw, then open the print screen
  setTimeout(function () {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (error) {
      window.print();
    }
  }, 400);
  setTimeout(function () { if (printFrame === frame) { frame.remove(); printFrame = null; } }, 120000);
});

// ----- Boses: say the total and the sukli out loud -----
// Words for a number in Tagalog (for example 150 = "isandaan at limampu").
const T_ONES = ["", "isa", "dalawa", "tatlo", "apat", "lima", "anim", "pito", "walo", "siyam"];
const T_TEENS = ["sampu", "labing-isa", "labindalawa", "labintatlo", "labing-apat", "labinlima", "labing-anim", "labimpito", "labingwalo", "labinsiyam"];
const T_TENS = ["", "", "dalawampu", "tatlumpu", "apatnapu", "limampu", "animnapu", "pitumpu", "walumpu", "siyamnapu"];
const T_HUNDREDS = ["", "isandaan", "dalawandaan", "tatlondaan", "apatnaraan", "limandaan", "animnaraan", "pitondaan", "walondaan", "siyamnaraan"];

function tagalogUnder1000(n) {
  const parts = [];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) { parts.push(T_HUNDREDS[h]); }
  let small = "";
  if (rest >= 20) {
    small = T_TENS[Math.floor(rest / 10)] + (rest % 10 ? "'t " + T_ONES[rest % 10] : "");
  } else if (rest >= 10) {
    small = T_TEENS[rest - 10];
  } else if (rest > 0) {
    small = T_ONES[rest];
  }
  if (small) { parts.push(small); }
  return parts.join(" at ");
}

// "limampu" + "piso" -> "limampung piso" (the little linking sound)
function linkWord(words) {
  if (/[aeiou]$/.test(words)) { return words + "ng"; }
  if (/n$/.test(words)) { return words + "g"; }
  return words + " na";              // words ending in t or m: apat na, anim na, siyam na
}

function tagalogNumber(n) {
  if (n === 0) { return "sero"; }
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  let text = "";
  if (thousands > 0) {
    text = linkWord(tagalogUnder1000(thousands)) + " libo";
    if (rest > 0) { text += (rest >= 100 && rest % 100 !== 0 ? ", " : " at ") + tagalogUnder1000(rest); }
  } else {
    text = tagalogUnder1000(rest);
  }
  return text;
}

function tagalogPeso(amount) {
  amount = round2(amount);
  const pesos = Math.floor(amount);
  const cents = Math.round((amount - pesos) * 100);
  let text = linkWord(tagalogNumber(pesos)) + " piso";
  if (pesos === 0) { text = "sero piso"; }
  if (cents > 0) { text += " at " + linkWord(tagalogNumber(cents)) + " sentimo"; }
  return text;
}

function englishPeso(amount) {
  amount = round2(amount);
  const pesos = Math.floor(amount);
  const cents = Math.round((amount - pesos) * 100);
  let text = pesos + (pesos === 1 ? " peso" : " pesos");
  if (cents > 0) { text += " and " + cents + " centavos"; }
  return text;
}

function filipinoVoice() {
  if (!("speechSynthesis" in window)) { return null; }
  const voices = window.speechSynthesis.getVoices();
  for (let i = 0; i < voices.length; i++) {
    const lang = voices[i].lang.toLowerCase().replace("_", "-");
    if (lang.indexOf("fil") === 0 || lang.indexOf("tl") === 0) { return voices[i]; }
  }
  return null;
}

// parts = a list like [["Natanggap", 500], ["Sukli", 350]]. Uses a Filipino voice if the phone has one, otherwise English.
const ENGLISH_LABELS = { "Total": "Total", "Natanggap": "Received", "Sukli": "Change", "Kulang pa": "Short by", "Singil": "Collect", "Ibigay": "Give" };

function speakParts(parts, force) {
  if ((settings.voice === false && !force) || !("speechSynthesis" in window)) { return; }
  try {
    const voice = filipinoVoice();
    const text = parts.map(function (part) {
      return voice
        ? part[0] + ", " + tagalogPeso(part[1]) + "."
        : (ENGLISH_LABELS[part[0]] || part[0]) + ", " + englishPeso(part[1]) + ".";
    }).join(" ");
    const talk = new SpeechSynthesisUtterance(text);
    if (voice) { talk.voice = voice; talk.lang = voice.lang; } else { talk.lang = "en-US"; }
    talk.rate = settings.voiceRate || 1.25;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(talk);
  } catch (error) {}
}

function speakAmount(label, amount, force) {
  speakParts([[label, amount]], force);
}

// What the pay sheet should say right now:
// cash given and enough = "Received 500 pesos. Change 350 pesos." / too little = "Short by ..." / no cash yet = the total
function speakPayState() {
  const cash = parseFloat(document.getElementById("cash-input").value);
  const total = cartTotal();
  if (isNaN(cash)) {
    speakAmount("Total", total);
  } else if (cash < total) {
    speakParts([["Natanggap", cash], ["Kulang pa", total - cash]]);
  } else {
    speakParts([["Natanggap", cash], ["Sukli", round2(cash - total)]]);
  }
}

document.getElementById("pay-speak").addEventListener("click", function () { speakPayState(); });
// Tapping a bill (\u20B1100, \u20B1500...) says the received cash and the sukli right away
document.getElementById("quick-cash").addEventListener("click", function (event) {
  if (event.target.closest("button")) { speakPayState(); }
});

// Settings: store name, voice switch, test
function renderVoiceSettings() {
  document.getElementById("set-store-name").value = settings.storeName || "";
  document.getElementById("voice-toggle").checked = settings.voice !== false;
  document.getElementById("voice-speed").value = String(settings.voiceRate || 1.25);
  document.getElementById("voice-state").textContent = settings.voice !== false ? "ON" : "OFF";
  const info = document.getElementById("voice-info");
  if (!("speechSynthesis" in window)) {
    info.textContent = "Walang boses ang phone na ito.";
  } else if (filipinoVoice()) {
    info.textContent = "Tagalog na boses ang gagamitin.";
  } else {
    info.textContent = "Walang Tagalog na boses ang phone na ito, kaya English ang sasabihin. (Settings > Accessibility > Spoken Content > Voices para magdagdag ng Filipino.)";
  }
}
document.getElementById("set-store-name").addEventListener("input", function () {
  settings.storeName = this.value.trim();
  saveData();
});
document.getElementById("voice-speed").addEventListener("change", function () {
  settings.voiceRate = parseFloat(this.value);
  saveData();
  speakParts([["Natanggap", 200], ["Sukli", 49.5]], true);     // play a sample at the new speed
});
document.getElementById("voice-toggle").addEventListener("change", function () {
  settings.voice = this.checked;
  saveData();
  renderVoiceSettings();
});
document.getElementById("voice-test").addEventListener("click", function () {
  speakParts([["Natanggap", 200], ["Sukli", 49.5]], true);
});
if ("speechSynthesis" in window) {
  // the list of voices can load a moment after the page opens
  window.speechSynthesis.addEventListener("voiceschanged", renderVoiceSettings);
}
renderVoiceSettings();


/* ---------- 12. MGA GAMIT: DAGDAG STOCK, PAMILIHAN, CSV, SARA NA, CHART, UTANG PAALALA ---------- */

function openSheet(id) { byId(id).hidden = false; }
function closeSheet(id) { byId(id).hidden = true; }

// Saves a text file: Share sheet on an iPhone, a normal download on a laptop.
async function saveTextFile(fileName, text, type) {
  try {
    const file = new File([text], fileName, { type: type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: fileName });
      return;
    }
  } catch (error) {
    if (error && error.name === "AbortError") { return; }
  }
  const blob = new Blob([text], { type: type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// Sends text through the Share sheet (Messenger, SMS...). Copies it if sharing isn't possible.
function shareText(text) {
  if (navigator.share) {
    navigator.share({ text: text }).catch(function () {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function () { alert("Na-copy."); }).catch(function () {});
  }
}

byId("tool-receive").addEventListener("click", openReceive);
byId("tool-shop").addEventListener("click", openShop);
byId("tool-csv").addEventListener("click", function () { resetCsv(); openSheet("csv-overlay"); });


/* ----- Dagdag stock: scan what arrived, then add it all to the stock ----- */
let receiveLines = [];                         // [{ barcode, qty }]

function openReceive() {
  receiveLines = [];
  byId("receive-message").textContent = "";
  byId("receive-message").className = "message";
  byId("receive-input").value = "";
  renderReceive();
  openSheet("receive-overlay");
  if (hasMouse()) { byId("receive-input").focus(); }
}

function receiveAdd(code) {
  const product = findProduct(String(code).trim());
  if (!product) {
    const text = "Wala sa listahan: " + code;
    setReceiveMessage(text, "error");
    return { ok: false, text: text };
  }
  let line = receiveLines.find(function (l) { return l.barcode === product.barcode; });
  if (line) {
    line.qty++;
  } else {
    line = { barcode: product.barcode, qty: 1 };
    receiveLines.unshift(line);
  }
  const text = product.name + " +1 (" + line.qty + ")";
  setReceiveMessage(text, "ok");
  renderReceive();
  return { ok: true, text: text };
}

function setReceiveMessage(text, type) {
  const box = byId("receive-message");
  box.textContent = text;
  box.className = "message " + type;
}

function renderReceive() {
  let html = "";
  let pieces = 0;
  receiveLines.forEach(function (line) {
    const p = findProduct(line.barcode);
    if (!p) { return; }
    pieces += line.qty;
    html += '<div class="product-row recv-row">' + thumbHtml(p, "small") +
      '<div class="product-main"><div class="product-name">' + escapeHtml(p.name) + "</div>" +
      '<div class="product-code">Stock: ' + p.stock + " &rarr; " + (p.stock + line.qty) + "</div></div>" +
      '<div class="stepper">' +
        '<button type="button" class="step recv-step" data-barcode="' + escapeHtml(p.barcode) + '" data-change="-1" aria-label="One less">&minus;</button>' +
        '<input type="number" class="recv-qty" inputmode="numeric" min="0" data-barcode="' + escapeHtml(p.barcode) + '" value="' + line.qty + '" aria-label="Quantity">' +
        '<button type="button" class="step recv-step" data-barcode="' + escapeHtml(p.barcode) + '" data-change="1" aria-label="One more">+</button>' +
      "</div></div>";
  });
  if (html === "") {
    html = '<p class="empty">Wala pang na-scan.</p>';
  }
  byId("receive-list").innerHTML = html;
  byId("receive-done").disabled = pieces === 0;
}

byId("receive-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const code = byId("receive-input").value.trim();
  if (code) {
    receiveAdd(code);
  }
  byId("receive-input").value = "";
  if (hasMouse()) { byId("receive-input").focus(); }
});
byId("receive-camera").addEventListener("click", function () { openScanner("receive"); });
byId("receive-list").addEventListener("click", function (event) {
  const button = event.target.closest(".recv-step");
  if (!button) { return; }
  const line = receiveLines.find(function (l) { return l.barcode === button.getAttribute("data-barcode"); });
  if (!line) { return; }
  line.qty += parseInt(button.getAttribute("data-change"), 10);
  if (line.qty <= 0) {
    receiveLines = receiveLines.filter(function (l) { return l !== line; });
  }
  renderReceive();
});
byId("receive-list").addEventListener("change", function (event) {
  const input = event.target.closest(".recv-qty");
  if (!input) { return; }
  const line = receiveLines.find(function (l) { return l.barcode === input.getAttribute("data-barcode"); });
  const qty = parseInt(input.value, 10);
  if (line) {
    if (qty > 0) { line.qty = qty; } else { receiveLines = receiveLines.filter(function (l) { return l !== line; }); }
  }
  renderReceive();
});
byId("receive-cancel").addEventListener("click", function () {
  if (receiveLines.length > 0 && !confirm("Itigil? Hindi pa naidadagdag ang mga na-scan.")) { return; }
  closeSheet("receive-overlay");
});
byId("receive-done").addEventListener("click", function () {
  let kinds = 0;
  let pieces = 0;
  receiveLines.forEach(function (line) {
    const p = findProduct(line.barcode);
    if (p && line.qty > 0) {
      p.stock += line.qty;
      kinds++;
      pieces += line.qty;
    }
  });
  receiveLines = [];
  saveData();
  renderAll();
  closeSheet("receive-overlay");
  alert("Naidagdag na ang stock: " + kinds + " paninda, " + pieces + " piraso.");
});


/* ----- Pamilihan: what to buy ----- */
let shopRows = [];                             // [{ barcode, qty, on }]

// How many pieces of each product were sold (or taken para samen) in the last few days
function soldUnits(days) {
  const cutoff = Date.now() - days * 86400000;
  const counts = {};
  function add(item) {
    const key = normalizeBarcode(item.barcode);
    counts[key] = (counts[key] || 0) + item.qty;
  }
  sales.forEach(function (sale) {
    if (parseDate(sale.date).getTime() >= cutoff) { sale.items.forEach(add); }
  });
  ownUse.forEach(function (entry) {
    if (parseDate(entry.date).getTime() >= cutoff) { entry.items.forEach(add); }
  });
  return counts;
}

function openShop() {
  const sold = soldUnits(14);
  shopRows = products
    .filter(function (p) { return p.stock <= p.reorder; })
    .map(function (p) {
      const used = sold[normalizeBarcode(p.barcode)] || 0;
      // enough for 2 weeks of selling, and at least double the restock level
      const target = Math.max(used, p.reorder * 2);
      return { barcode: p.barcode, qty: Math.max(1, target - p.stock), on: true, sold: used };
    })
    .sort(function (a, b) {
      const pa = findProduct(a.barcode);
      const pb = findProduct(b.barcode);
      return (pa.stock - pb.stock) || (b.sold - a.sold);
    });
  renderShop();
  openSheet("shop-overlay");
}

function renderShop() {
  let html = "";
  let total = 0;
  let noCost = 0;
  shopRows.forEach(function (row) {
    const p = findProduct(row.barcode);
    if (!p) { return; }
    if (row.on) {
      if (typeof p.cost === "number") { total += p.cost * row.qty; } else { noCost++; }
    }
    html += '<div class="product-row shop-row">' +
      '<input type="checkbox" class="shop-check" data-barcode="' + escapeHtml(p.barcode) + '"' + (row.on ? " checked" : "") + ' aria-label="Isama">' +
      thumbHtml(p, "small") +
      '<div class="product-main"><div class="product-name">' + escapeHtml(p.name) + "</div>" +
      '<div class="product-code">Stock: ' + p.stock + " &middot; nabenta (14 araw): " + row.sold + "</div></div>" +
      '<input type="number" class="recv-qty" inputmode="numeric" min="1" data-barcode="' + escapeHtml(p.barcode) + '" value="' + row.qty + '" aria-label="Bibilhin">' +
      "</div>";
  });
  if (html === "") {
    html = '<p class="empty">Wala pang kulang ang stock.</p>';
  }
  byId("shop-list").innerHTML = html;
  byId("shop-total").textContent = peso(round2(total));
  byId("shop-hint").textContent = shopRows.length
    ? shopRows.length + " paninda ang malapit nang maubos o ubos na. Pwede mong baguhin ang dami."
    : "";
  byId("shop-note").textContent = noCost ? noCost + " paninda ang walang puhunan kaya hindi kasama sa gastos." : "";
  byId("shop-share").disabled = shopRows.filter(function (r) { return r.on; }).length === 0;
}

byId("shop-list").addEventListener("change", function (event) {
  const check = event.target.closest(".shop-check");
  const qty = event.target.closest(".recv-qty");
  if (check) {
    const row = shopRows.find(function (r) { return r.barcode === check.getAttribute("data-barcode"); });
    if (row) { row.on = check.checked; }
  } else if (qty) {
    const row = shopRows.find(function (r) { return r.barcode === qty.getAttribute("data-barcode"); });
    const n = parseInt(qty.value, 10);
    if (row && n > 0) { row.qty = n; }
  }
  renderShop();
});
byId("shop-close").addEventListener("click", function () { closeSheet("shop-overlay"); });
byId("shop-share").addEventListener("click", function () {
  const lines = ["Pamilihan - " + dayLabelLong(todayText())];
  shopRows.forEach(function (row) {
    const p = findProduct(row.barcode);
    if (p && row.on) { lines.push("- " + p.name + " x " + row.qty); }
  });
  lines.push("", "Tinatayang gastos: " + byId("shop-total").textContent);
  shareText(lines.join("\n"));
});


/* ----- CSV: import and export ----- */
let csvRows = [];                              // rows that passed the check
const CSV_COLUMNS = ["barcode", "name", "price", "cost", "stock", "reorder", "bundle_qty", "bundle_price"];

function csvCell(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function productsToCsv() {
  const lines = [CSV_COLUMNS.join(",")];
  products.forEach(function (p) {
    lines.push([
      p.barcode, p.name, p.price, typeof p.cost === "number" ? p.cost : "", p.stock, p.reorder,
      p.bundle ? p.bundle.qty : "", p.bundle ? p.bundle.price : ""
    ].map(csvCell).join(","));
  });
  return "ï»¿" + lines.join("\r\n") + "\r\n";      // the first character helps Excel read the letters right
}

// Reads CSV text into rows of cells. Understands quotes, commas, semicolons and tabs.
function parseCsv(text) {
  text = text.replace(/^ï»¿/, "");
  const firstLine = text.split(/\r?\n/)[0] || "";
  const counts = { ",": 0, ";": 0, "\t": 0 };
  Object.keys(counts).forEach(function (d) { counts[d] = firstLine.split(d).length - 1; });
  const delimiter = counts[";"] > counts[","] && counts[";"] >= counts["\t"] ? ";" : (counts["\t"] > counts[","] ? "\t" : ",");

  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { quoted = false; }
      else { cell += ch; }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") { i++; }
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter(function (r) { return r.some(function (c) { return c.trim() !== ""; }); });
}

// Which column is which, from the header words (English or Filipino)
function csvColumnMap(header) {
  const map = {};
  const wanted = {
    barcode: ["barcode", "code", "upc", "ean"],
    name: ["name", "pangalan", "paninda", "product", "item", "description"],
    price: ["price", "presyo", "srp", "retail", "selling"],
    cost: ["cost", "puhunan", "original", "capital", "binili"],
    stock: ["stock", "qty", "quantity", "dami"],
    reorder: ["reorder", "restock", "low"],
    bundleQty: ["bundleqty", "bundlequantity", "bundleilan"],
    bundlePrice: ["bundleprice", "bundlepresyo"]
  };
  header.forEach(function (raw, index) {
    const h = raw.toLowerCase().replace(/[^a-z]/g, "");
    // check bundle and reorder first so "bundle_price" is not taken as "price"
    ["bundleQty", "bundlePrice", "reorder", "barcode", "name", "price", "cost", "stock"].forEach(function (key) {
      if (map[key] === undefined && wanted[key].some(function (w) { return h === w || h.indexOf(w) === 0 || (key !== "price" && key !== "stock" && h.indexOf(w) >= 0); })) {
        if (key === "price" && h.indexOf("bundle") >= 0) { return; }
        if (key === "stock" && h.indexOf("re") === 0) { return; }
        map[key] = index;
      }
    });
  });
  return map;
}

function csvNumber(text) {
  const cleaned = String(text || "").replace(/[\u20B1,\s]/g, "").replace(/^php/i, "");
  if (cleaned === "") { return null; }
  const n = Number(cleaned);
  return isNaN(n) ? NaN : n;
}

// Checks every row. Returns { news, updates, errors }
function checkCsv(text) {
  const rows = parseCsv(text);
  const result = { news: [], updates: [], errors: [], problem: "" };
  if (rows.length < 2) {
    result.problem = "Walang laman ang file (kailangan ng header at kahit isang paninda).";
    return result;
  }
  const map = csvColumnMap(rows[0]);
  if (map.barcode === undefined || map.name === undefined || map.price === undefined) {
    result.problem = "Hindi makita ang columns na barcode, name at price sa unang linya ng file.";
    return result;
  }
  const seen = {};
  rows.slice(1).forEach(function (cells, i) {
    const line = i + 2;
    const get = function (key) { return map[key] === undefined ? "" : String(cells[map[key]] === undefined ? "" : cells[map[key]]).trim(); };
    let barcode = get("barcode").replace(/^="?|"$/g, "");
    const name = get("name");
    const price = csvNumber(get("price"));
    const cost = csvNumber(get("cost"));
    const stock = csvNumber(get("stock"));
    const reorder = csvNumber(get("reorder"));
    const bq = csvNumber(get("bundleQty"));
    const bp = csvNumber(get("bundlePrice"));

    function fail(reason) { result.errors.push("Linya " + line + ": " + reason); }
    if (/^\d+(\.\d+)?e\+?\d+$/i.test(barcode)) { return fail("sira ang barcode (" + barcode + "). Gawing Text ang column sa Excel."); }
    barcode = barcode.replace(/\.0+$/, "");
    if (!barcode) { return fail("walang barcode."); }
    if (!name) { return fail("walang pangalan."); }
    if (price === null || isNaN(price) || price < 0) { return fail("mali o walang presyo."); }
    if (cost !== null && (isNaN(cost) || cost < 0)) { return fail("mali ang cost."); }
    if (stock !== null && (isNaN(stock) || stock < 0)) { return fail("mali ang stock."); }
    if (reorder !== null && (isNaN(reorder) || reorder < 0)) { return fail("mali ang reorder."); }
    if ((bq === null) !== (bp === null) || isNaN(bq) || isNaN(bp) || (bq !== null && (bq < 2 || bp < 0))) { return fail("mali ang bundle (kailangan ang bundle_qty na 2 pataas at bundle_price)."); }
    const key = normalizeBarcode(barcode);
    if (seen[key]) { return fail("paulit-ulit ang barcode sa file."); }
    seen[key] = true;

    const row = { barcode: barcode, name: name, price: price, cost: cost, stock: stock === null ? null : Math.round(stock), reorder: reorder === null ? null : Math.round(reorder), bundle: bq === null ? null : { qty: Math.round(bq), price: bp } };
    if (findProduct(barcode)) { result.updates.push(row); } else { result.news.push(row); }
  });
  return result;
}

function resetCsv() {
  csvRows = null;
  byId("csv-preview").innerHTML = "";
  byId("csv-import").disabled = true;
  byId("csv-stock").checked = false;
  byId("csv-file").value = "";
}

byId("csv-export").addEventListener("click", function () {
  saveTextFile("paninda-" + todayText() + ".csv", productsToCsv(), "text/csv");
});
byId("csv-template").addEventListener("click", function () {
  saveTextFile("paninda-template.csv", "ï»¿" + CSV_COLUMNS.join(",") + "\r\n", "text/csv");
});
byId("csv-pick").addEventListener("click", function () { byId("csv-file").click(); });
byId("csv-file").addEventListener("change", function () {
  const file = this.files && this.files[0];
  if (!file) { return; }
  const reader = new FileReader();
  reader.onload = function () {
    const result = checkCsv(String(reader.result));
    csvRows = result;
    let html = "";
    if (result.problem) {
      html = '<p class="error-text">' + escapeHtml(result.problem) + "</p>";
    } else {
      html = "<p><strong>" + result.news.length + "</strong> bagong paninda &middot; <strong>" + result.updates.length + "</strong> dati nang nasa listahan (i-uupdate) &middot; <strong>" + result.errors.length + "</strong> may mali</p>";
      if (result.errors.length) {
        html += '<ul class="csv-errors">' + result.errors.slice(0, 6).map(function (e) { return "<li>" + escapeHtml(e) + "</li>"; }).join("") +
          (result.errors.length > 6 ? "<li>...at " + (result.errors.length - 6) + " pa</li>" : "") + "</ul>" +
          '<p class="hint">Ang mga may mali ay hindi ii-import.</p>';
      }
    }
    byId("csv-preview").innerHTML = html;
    byId("csv-import").disabled = !!result.problem || result.news.length + result.updates.length === 0;
  };
  reader.readAsText(file);
});
byId("csv-close").addEventListener("click", function () { closeSheet("csv-overlay"); });
byId("csv-import").addEventListener("click", function () {
  if (!csvRows) { return; }
  const overwriteStock = byId("csv-stock").checked;
  csvRows.news.forEach(function (r) {
    const p = { barcode: r.barcode, name: r.name, price: r.price, stock: r.stock === null ? 0 : r.stock, reorder: r.reorder === null ? 5 : r.reorder };
    if (r.cost !== null) { p.cost = r.cost; }
    if (r.bundle) { p.bundle = r.bundle; }
    products.push(p);
  });
  csvRows.updates.forEach(function (r) {
    const p = findProduct(r.barcode);
    p.name = r.name;
    p.price = r.price;
    if (r.cost !== null) { p.cost = r.cost; }
    if (r.reorder !== null) { p.reorder = r.reorder; }
    if (r.bundle) { p.bundle = r.bundle; }
    if (overwriteStock && r.stock !== null) { p.stock = r.stock; }
  });
  saveData();
  renderAll();
  const text = "Na-import: " + csvRows.news.length + " bago, " + csvRows.updates.length + " na-update.";
  resetCsv();
  closeSheet("csv-overlay");
  alert(text);
});


/* ----- Sara na ang tindahan: count the drawer ----- */
function closingNumbers() {
  const nums = { cashSales: 0, payments: 0 };
  dayEvents(todayText()).forEach(function (event) {
    const d = event.data;
    if (event.kind === "sale" && !d.utang) {
      nums.cashSales += d.total;
    } else if (event.kind === "payment") {
      nums.payments += d.amount;
    }
  });
  Object.keys(nums).forEach(function (k) { nums[k] = round2(nums[k]); });
  nums.expected = round2(nums.cashSales + nums.payments);
  return nums;
}
function lastClosing() {
  const list = settings.closings || [];
  return list.length ? list[list.length - 1] : null;
}

function openClose() {
  const last = lastClosing();
  byId("close-date").textContent = dayLabelLong(todayText());
  byId("close-start").value = last && typeof last.counted === "number" ? last.counted : "";
  byId("close-counted").value = "";
  renderClose();
  openSheet("close-overlay");
}

function closeStart() {
  const n = parseFloat(byId("close-start").value);
  return isNaN(n) ? 0 : n;
}

function diffWords(diff) {
  if (Math.abs(diff) < 0.005) { return { text: "Eksakto", cls: "ok" }; }
  return diff > 0 ? { text: "Sobra " + peso(diff), cls: "ok" } : { text: "Kulang " + peso(-diff), cls: "short" };
}

function renderClose() {
  const n = closingNumbers();
  const expected = round2(closeStart() + n.expected);
  const rows = [
    ["Panimulang cash", closeStart()],
    ["+ Benta (cash)", n.cashSales],
    ["+ Bayad sa utang", n.payments],
  ];
  byId("close-rows").innerHTML = rows.map(function (r) {
    return '<div class="sum-row"><span>' + r[0] + "</span><strong>" + peso(r[1]) + "</strong></div>";
  }).join("") + '<div class="sum-row total-row"><span>Dapat na nasa drawer</span><strong>' + peso(expected) + "</strong></div>";

  const counted = parseFloat(byId("close-counted").value);
  const diffBox = byId("close-diff");
  if (isNaN(counted)) {
    diffBox.className = "change-row";
    diffBox.innerHTML = "<span>Kulang / Sobra</span><strong>&ndash;</strong>";
  } else {
    const w = diffWords(round2(counted - expected));
    diffBox.className = "change-row diff-" + w.cls;
    diffBox.innerHTML = "<span>Kulang / Sobra</span><strong>" + w.text + "</strong>";
  }


  const history = (settings.closings || []).slice(-7).reverse();
  byId("close-history").innerHTML = history.length ? history.map(function (c) {
    const w = diffWords(c.diff);
    return '<div class="txn"><div class="txn-head"><span class="txn-time">' + escapeHtml(dayLabelLong(c.date)) + "</span>" +
      '<span class="txn-total diff-text-' + w.cls + '">' + w.text + "</span></div>" +
      '<div class="txn-pay">Nabilang ' + peso(c.counted) + " &middot; dapat " + peso(c.expected) + "</div></div>";
  }).join("") : '<p class="empty">Wala pang closing.</p>';
}

byId("close-btn").addEventListener("click", openClose);
["close-start", "close-counted"].forEach(function (id) {
  byId(id).addEventListener("input", renderClose);
});
byId("close-cancel").addEventListener("click", function () { closeSheet("close-overlay"); });
byId("close-save").addEventListener("click", function () {
  const counted = parseFloat(byId("close-counted").value);
  if (isNaN(counted)) {
    alert("Ilagay muna ang nabilang na cash sa drawer.");
    return;
  }
  const n = closingNumbers();
  const expected = round2(closeStart() + n.expected);
  if (!Array.isArray(settings.closings)) { settings.closings = []; }
  // one closing per day: saving again replaces the earlier one
  settings.closings = settings.closings.filter(function (c) { return c.date !== todayText(); });
  settings.closings.push({
    date: todayText(), ts: Date.now(), start: closeStart(), expected: expected,
    counted: round2(counted), diff: round2(counted - expected)
  });
  settings.closings = settings.closings.slice(-60);
  saveData();
  renderClose();
  const w = diffWords(round2(counted - expected));
  alert("Na-save ang closing: " + w.text + ". Bukas, " + peso(counted) + " ang magiging panimulang cash.");
  closeSheet("close-overlay");
});


/* ----- 7 Days: chart and best sellers ----- */
let chartMetric = "total";                     // "total" (benta) or "profit" (kita)

function renderWeekExtras(dates) {
  const today = todayText();
  const values = dates.map(function (date) { return dayStats(date)[chartMetric]; });
  const max = Math.max.apply(null, values.concat([1]));
  byId("week-chart").innerHTML = dates.map(function (date, i) {
    const v = values[i];
    const height = v > 0 ? Math.max(4, Math.round((v / max) * 100)) : 2;
    const weekday = parseDate(date).toLocaleDateString("en-US", { weekday: "short" });
    return '<button type="button" class="chart-col' + (date === weekDate ? " active" : "") + (date === today ? " is-today" : "") + '" data-date="' + date + '">' +
      '<span class="chart-val">' + (v > 0 ? pesoCompact(v) : "&ndash;") + "</span>" +
      '<span class="chart-track"><span class="chart-bar" style="height:' + height + '%"></span></span>' +
      '<span class="chart-day">' + weekday + "</span></button>";
  }).join("");
  byId("chart-total").classList.toggle("active", chartMetric === "total");
  byId("chart-profit").classList.toggle("active", chartMetric === "profit");

  // best sellers of the 7 days
  const totals = {};
  sales.forEach(function (sale) {
    if (dates.indexOf(sale.date) < 0) { return; }
    sale.items.forEach(function (item) {
      const key = normalizeBarcode(item.barcode);
      if (!totals[key]) { totals[key] = { name: item.name, barcode: item.barcode, qty: 0, money: 0, profit: 0, known: false }; }
      const t = totals[key];
      t.qty += item.qty;
      t.money += lineTotal(item);
      const cost = itemCost(item);
      if (cost !== null) { t.profit += lineTotal(item) - cost * item.qty; t.known = true; }
    });
  });
  const best = Object.keys(totals).map(function (k) { return totals[k]; })
    .sort(function (a, b) { return (b.qty - a.qty) || (b.money - a.money); })
    .slice(0, 5);
  byId("week-best").innerHTML = best.length ? best.map(function (t, i) {
    const p = findProduct(t.barcode) || { name: t.name };
    return '<div class="product-row best-row"><span class="rank">' + (i + 1) + "</span>" + thumbHtml(p, "small") +
      '<div class="product-main"><div class="product-name">' + escapeHtml(t.name) + "</div>" +
      '<div class="product-code">' + t.qty + " piraso &middot; benta " + peso(round2(t.money)) + "</div></div>" +
      (t.known ? '<div class="product-nums"><div class="product-profit">Kita ' + peso(round2(t.profit)) + "</div></div>" : "") +
      "</div>";
  }).join("") : '<p class="empty">Wala pang benta sa nakaraang 7 araw.</p>';
}

byId("chart-total").addEventListener("click", function () { chartMetric = "total"; renderWeek(); });
byId("chart-profit").addEventListener("click", function () { chartMetric = "profit"; renderWeek(); });
byId("week-chart").addEventListener("click", function (event) {
  const col = event.target.closest(".chart-col");
  if (col) { weekDate = col.getAttribute("data-date"); renderWeek(); }
});


/* ----- Utang: who has not paid for a long time ----- */
const STALE_DAYS = 14;
let staleOnly = false;

// Days since the last payment (or since the first utang, if the person never paid)
function debtStaleDays(person) {
  if (person.balance <= 0) { return 0; }
  let since = 0;
  person.entries.forEach(function (e) {
    if (e.type === "payment") { since = Math.max(since, e.ts || 0); }
  });
  if (!since) {
    person.entries.forEach(function (e) {
      if (e.type === "charge" && e.ts && (!since || e.ts < since)) { since = e.ts; }
    });
  }
  return since ? Math.floor((Date.now() - since) / 86400000) : 0;
}

byId("debt-stale-btn").addEventListener("click", function () { staleOnly = !staleOnly; renderUtang(); });
byId("debt-remind").addEventListener("click", function () {
  const person = findDebtPerson();
  if (!person || person.balance <= 0) { return; }
  const store = (settings.storeName || "").trim() || "tindahan";
  shareText("Magandang araw po, " + person.name + "! Paalala lang po sa utang ninyo na " + peso(person.balance) +
    " sa " + store + ". Salamat po!");
});


/* ---------- 13. RUNS WHEN THE PAGE OPENS ---------- */

drawIcons();
buildQuickCash();
renderSwitches();
renderAll();
showBackupStatus();
focusBarcodeBox();

// On iPhone Safari (not yet added to the Home Screen) show the install tip.
const isIphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
const isInstalled = window.navigator.standalone === true ||
  (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
document.getElementById("install-hint").hidden = !(isIphone && !isInstalled);

// Ask the browser not to delete our saved data when it is low on space.
try {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist();
  }
} catch (error) {}

// Let the page work offline: sw.js keeps a copy of the files (needs the https web link).
if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  const hadWorker = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(function (reg) {
    reg.update();                                   // look for a new version every time the app opens
  }).catch(function () {});
  // When a new version takes over, reload once so the new screen shows up
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (hadWorker && !reloaded) {
      reloaded = true;
      location.reload();
    }
  });
}

document.getElementById("app-version").textContent = APP_VERSION;




