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

// Variables that hold the data while the page is open.
let products = loadData(PRODUCTS_KEY, DEFAULT_PRODUCTS);
let sales = loadData(SALES_KEY, []);   // finished sales
let cart = [];                          // items in the sale happening right now


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
  } catch (error) {
    console.log("Could not save", error);
  }
}


/* ---------- 3. HELPER FUNCTIONS ---------- */

// Turn 12 into "₱12.00"
function peso(amount) {
  return "₱" + amount.toFixed(2);
}

// Make text safe before putting it into the page
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Today's date in YOUR local time, like "2026-11-09" (used for the daily total)
function todayText() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + month + "-" + day;
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
    const text = "Not in your list: " + barcode;
    showMessage(text, "error");
    return { ok: false, text: text };
  }

  const inCart = cart.find(function (item) {
    return item.barcode === product.barcode;
  });
  const alreadyInCart = inCart ? inCart.qty : 0;

  // Don't sell more than we have in stock.
  if (alreadyInCart + 1 > product.stock) {
    const text = "Not enough stock for " + product.name + " (only " + product.stock + " left).";
    showMessage(text, "error");
    return { ok: false, text: text };
  }

  if (inCart) {
    inCart.qty = inCart.qty + 1;
  } else {
    cart.push({ barcode: product.barcode, name: product.name, price: product.price, qty: 1 });
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
    showMessage("Only " + product.stock + " in stock for " + product.name + ".", "error");
    return;
  } else {
    item.qty = newQty;
  }
  renderSell();
}

function cartTotal() {
  let total = 0;
  cart.forEach(function (item) {
    total = total + item.price * item.qty;
  });
  return total;
}

function cartItemCount() {
  let count = 0;
  cart.forEach(function (item) {
    count = count + item.qty;
  });
  return count;
}


/* ---------- 5. CHARGING ---------- */

// cash can be NaN (not typed). That's fine; we just don't record change then.
function chargeSale(cash) {
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
    date: todayText(),
    time: new Date().toLocaleTimeString(),
    total: total,
    items: cart.map(function (item) {
      return { barcode: item.barcode, name: item.name, qty: item.qty, price: item.price };
    })
  };
  if (!isNaN(cash)) {
    sale.cash = cash;
    sale.change = cash - total;
  }
  sales.push(sale);

  saveData();

  const changeText = isNaN(cash) ? "" : " Change: " + peso(cash - total);
  showMessage("Sale complete: " + peso(total) + "." + changeText, "ok");

  cart = [];
  renderAll();
}


/* ---------- 6. DRAWING THE SCREEN ----------
   "render" functions rebuild part of the page from the current data. */

// The tap-to-add grid. Bestsellers come first.
function renderTiles() {
  const query = document.getElementById("search-input").value.trim().toLowerCase();
  const sold = soldCounts();

  const list = products
    .filter(function (p) {
      return query === "" || p.name.toLowerCase().includes(query) || p.barcode.includes(query);
    })
    .sort(function (a, b) {
      return (sold[b.barcode] || 0) - (sold[a.barcode] || 0) || a.name.localeCompare(b.name);
    });

  let html = "";
  list.forEach(function (p) {
    const inCart = cart.find(function (i) { return i.barcode === p.barcode; });
    const qty = inCart ? inCart.qty : 0;
    const soldOut = p.stock - qty <= 0;
    const stockText = p.stock <= 0 ? "Out of stock" : (p.stock - qty) + " left";

    html += '<button class="tile" data-barcode="' + escapeHtml(p.barcode) + '"' + (soldOut ? " disabled" : "") + ">" +
      '<span class="tile-name">' + escapeHtml(p.name) + "</span>" +
      '<span class="tile-price">' + peso(p.price) + "</span>" +
      '<span class="tile-stock">' + stockText + "</span>" +
      (qty > 0 ? '<span class="tile-badge">' + qty + "</span>" : "") +
      "</button>";
  });

  if (list.length === 0) {
    html = '<p class="empty">No products found.</p>';
  }
  document.getElementById("tile-grid").innerHTML = html;
}

function renderCart() {
  let html = "";

  cart.forEach(function (item) {
    html += "<li>" +
      '<div class="cart-info"><div class="cart-name">' + escapeHtml(item.name) + "</div>" +
      '<div class="cart-sub">' + peso(item.price) + " each</div></div>" +
      '<div class="stepper">' +
        '<button class="step" data-barcode="' + escapeHtml(item.barcode) + '" data-change="-1" aria-label="One less">&minus;</button>' +
        '<span class="qty">' + item.qty + "</span>" +
        '<button class="step" data-barcode="' + escapeHtml(item.barcode) + '" data-change="1" aria-label="One more">+</button>' +
      "</div>" +
      '<div class="cart-line-total">' + peso(item.price * item.qty) + "</div>" +
      "</li>";
  });

  if (cart.length === 0) {
    html = '<li class="empty">No items yet. Tap a product or scan a barcode.</li>';
  }
  document.getElementById("cart-list").innerHTML = html;
}

function renderCheckoutBar() {
  document.getElementById("cart-total").textContent = peso(cartTotal());
  document.getElementById("item-count").textContent = cartItemCount();
  document.getElementById("charge-btn").disabled = cart.length === 0;
}

// Redraw everything on the Sell tab
function renderSell() {
  renderTiles();
  renderCart();
  renderCheckoutBar();
}

function renderProducts() {
  let html = "";

  products.forEach(function (p) {
    const needsRestock = p.stock <= p.reorder;
    const status = needsRestock
      ? '<span class="pill restock">RESTOCK</span>'
      : '<span class="pill ok-status">OK</span>';

    html += '<div class="product-row">' +
      '<div class="product-main"><div class="product-name">' + escapeHtml(p.name) + "</div>" +
      '<div class="product-code">' + escapeHtml(p.barcode) + "</div></div>" +
      '<div class="product-nums"><div>' + peso(p.price) + "</div>" +
      '<div class="product-stock">Stock: ' + p.stock + "</div></div>" +
      status +
      "</div>";
  });

  if (products.length === 0) {
    html = '<p class="empty">No products yet. Add one below.</p>';
  }
  document.getElementById("product-list").innerHTML = html;
}

// Today's total sales and number of sales shown at the top of the page
function renderSummary() {
  const today = todayText();
  let total = 0;
  let count = 0;

  sales.forEach(function (sale) {
    if (sale.date === today) {
      total = total + sale.total;
      count = count + 1;
    }
  });

  document.getElementById("today-total").textContent = peso(total);
  document.getElementById("today-count").textContent = count;
}

function renderAll() {
  renderSell();
  renderProducts();
  renderSummary();
}


/* ---------- 7. TABS ---------- */

function showView(name) {
  document.getElementById("view-sell").hidden = name !== "sell";
  document.getElementById("view-products").hidden = name !== "products";
  document.getElementById("checkout-bar").hidden = name !== "sell";
  document.getElementById("tab-sell").classList.toggle("active", name === "sell");
  document.getElementById("tab-products").classList.toggle("active", name === "products");
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
  let html = '<button type="button" data-cash="exact">Exact</button>';
  QUICK_CASH.forEach(function (amount) {
    html += '<button type="button" data-cash="' + amount + '">₱' + amount + "</button>";
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
    label.textContent = "Change";
    amount.textContent = peso(0);
    confirmButton.disabled = false;       // allowed: sale without typing the cash
  } else if (cash < total) {
    label.textContent = "Still needed";
    amount.textContent = peso(total - cash);
    confirmButton.disabled = true;
  } else {
    label.textContent = "Change";
    amount.textContent = peso(cash - total);
    confirmButton.disabled = false;
  }
}

document.getElementById("charge-btn").addEventListener("click", openPay);
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
}

async function openScanner(mode) {
  scannerMode = mode;
  lastScanCode = "";
  unlockAudio();
  document.getElementById("scanner-overlay").hidden = false;
  setScannerStatus("Starting camera...");

  try {
    await loadScannerLibrary();
  } catch (error) {
    setScannerStatus("Couldn't load the scanner. Check your internet connection, or type the barcode instead.");
    return;
  }

  try {
    scanner = new Html5Qrcode("reader", {
      verbose: false,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39
      ]
    });
    await scanner.start(
      { facingMode: "environment" },                     // the back camera
      {
        fps: 10,
        qrbox: function (width, height) {                // the scanning box
          return { width: Math.floor(width * 0.85), height: Math.floor(Math.min(height * 0.5, 160)) };
        }
      },
      onScanSuccess,
      function () {}                                      // called on every frame with no barcode: ignore
    );
    setScannerStatus(mode === "fill" ? "Point the camera at the barcode." : "Point the camera at a barcode. It keeps scanning until you tap Done.");
  } catch (error) {
    scanner = null;
    setScannerStatus("Couldn't open the camera. Allow camera access for this page (iPhone: Settings > Safari > Camera), then try again.");
  }
}

async function closeScanner() {
  const active = scanner;
  scanner = null;
  if (active) {
    try { await active.stop(); } catch (error) {}
    try { active.clear(); } catch (error) {}
  }
  document.getElementById("scanner-overlay").hidden = true;
}

// Called by the library each time it reads a barcode
function onScanSuccess(code) {
  // The camera sees the same barcode many times a second. Ignore repeats within 2 seconds.
  const now = Date.now();
  if (code === lastScanCode && now - lastScanTime < 2000) {
    return;
  }
  lastScanCode = code;
  lastScanTime = now;

  if (scannerMode === "fill") {
    document.getElementById("new-barcode").value = code;
    beep(true);
    closeScanner();
    return;
  }

  const result = addToCart(code);
  beep(result.ok);
  setScannerStatus(result.text);
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
    message.textContent = "That barcode is already in your product list.";
    return;
  }

  products.push({
    barcode: barcode,
    name: name,
    price: parseFloat(document.getElementById("new-price").value),
    stock: parseInt(document.getElementById("new-stock").value, 10),
    // "|| 5" means: if the box was left empty, use 5
    reorder: parseInt(document.getElementById("new-reorder").value, 10) || 5
  });

  saveData();
  renderAll();
  this.reset();
  message.textContent = "Added: " + name;
});


/* ---------- 12. BACKUP AND RESTORE ----------
   A backup is a text file (.json) holding your products and sales. */

function makeBackup() {
  return {
    app: "sari-sari-pos",
    version: 1,
    savedAt: new Date().toISOString(),
    products: products,
    sales: sales
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
           typeof p.reorder === "number";
  });
  if (!productsOk) {
    return "Some products in the backup file are damaged.";
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
  try {
    data = JSON.parse(text);
  } catch (error) {
    alert("That file couldn't be read. Is it a backup file from this POS?");
    return;
  }

  const problem = checkBackup(data);
  if (problem) {
    alert(problem);
    return;
  }

  const question = "Restore this backup?\n\n" +
    data.products.length + " products and " + data.sales.length + " sales" +
    (data.savedAt ? " (saved " + new Date(data.savedAt).toLocaleString() + ")" : "") +
    ".\n\nThis REPLACES the data currently on this page.";
  if (!confirm(question)) {
    return;
  }

  products = data.products;
  sales = data.sales;
  cart = [];
  saveData();
  renderAll();
  showMessage("Backup restored.", "ok");
}

document.getElementById("backup-btn").addEventListener("click", saveBackup);

document.getElementById("restore-btn").addEventListener("click", function () {
  document.getElementById("restore-file").click();
});

document.getElementById("restore-file").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) { return; }
  const reader = new FileReader();
  reader.onload = function () {
    restoreBackup(reader.result);
  };
  reader.readAsText(file);
  this.value = "";   // so choosing the same file again still works
});

// Reset everything back to the sample data (asks first)
document.getElementById("reset-btn").addEventListener("click", function () {
  if (confirm("Delete all your products and sales and go back to the sample data?")) {
    products = JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));   // a fresh copy of the samples
    sales = [];
    cart = [];
    saveData();
    renderAll();
  }
});


/* ---------- 13. RUNS WHEN THE PAGE OPENS ---------- */

buildQuickCash();
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
  navigator.serviceWorker.register("sw.js").catch(function () {});
}
