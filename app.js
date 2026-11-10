/* =====================================================
   My Sari-Sari POS - app.js (phone-friendly version)
   HTML = the structure, CSS = the look, JavaScript = what happens when you tap or scan.
   ===================================================== */


/* ---------- 1. DATA ----------
   An "array" is a list. Each product is an "object": a bundle of labeled values.
   These are SAMPLE products. Replace them with your own using the Products tab. */
const DEFAULT_PRODUCTS = [
    { barcode: "0000000000011", name: "Pancit Canton Kalamansi 60g", price: 12, cost: 9.50, stock: 47, reorder: 10, featured: true },
    { barcode: "0000000000028", name: "Coffee 3-in-1 Sachet", price: 8, cost: 6.00, stock: 95, reorder: 20, featured: true },
    { barcode: "0000000000035", name: "Softdrink Mismo 200ml", price: 15, cost: 11.00, stock: 22, reorder: 6, featured: true },
    { barcode: "0000000000042", name: "Bar Soap", price: 25, cost: 19.00, stock: 4, reorder: 5, featured: false }
];

// The browser remembers data using "localStorage". We save under these names.
const PRODUCTS_KEY = "pos_products";
const SALES_KEY = "pos_sales";
const LAST_BACKUP_KEY = "pos_last_backup";

const EWALLET_KEY = "pos_ewallet";        // GCash / Maya balances and settings
const EWALLET_TX_KEY = "pos_ewallet_tx";  // every GCash / Maya cash in, cash out and balance change
const LEDGER_KEY = "pos_utang";           // utang: charges and payments

// Starting values for GCash / Maya. Your numbers are typed in the app (Products tab),
// NOT written here, because this code is public on GitHub.
const DEFAULT_EWALLET = {
    gcash: { numbers: "", balance: 0 },
    maya: { numbers: "", balance: 0 },
    cashOutFee: "deduct"
};

// Variables that hold the data while the page is open.
let products = loadData(PRODUCTS_KEY, DEFAULT_PRODUCTS);
let sales = loadData(SALES_KEY, []);   // finished sales
let cart = [];                          // items in the sale happening right now
let ewallet = loadData(EWALLET_KEY, DEFAULT_EWALLET);
let ewalletTx = loadData(EWALLET_TX_KEY, []);
let ledger = loadData(LEDGER_KEY, []);
normalizeEwallet();
normalizeProductFields(); // Ensures older data structures safely include cost and featured toggles


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
        localStorage.setItem(EWALLET_KEY, JSON.stringify(ewallet));
        localStorage.setItem(EWALLET_TX_KEY, JSON.stringify(ewalletTx));
        localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
    } catch (error) {
        console.log("Could not save", error);
    }
}

// Ensure products have cost and featured fields if loaded from older backups
function normalizeProductFields() {
    products.forEach(function (p) {
        if (typeof p.cost !== "number") {
            p.cost = 0;
        }
        if (typeof p.featured !== "boolean") {
            p.featured = false; // Default unspecified products to false so they stay in background unless toggled
        }
    });
}


/* ---------- 3. HELPER FUNCTIONS ---------- */

// Turn 12 into "₱12.00"
function peso(amount) {
    // 1234.5 becomes "₱1,234.50"
    return "₱" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Like peso(), but a whole amount drops the ".00": 1500 becomes "₱1,500"
function pesoShort(amount) {
    return Number.isInteger(amount) ? "₱" + amount.toLocaleString("en-US") : peso(amount);
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
    box.textContent = (type === "error" ? "⚠️ " : "✅ ") + text;
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
        cart.push({
            barcode: product.barcode,
            name: product.name,
            price: product.price,
            cost: product.cost || 0,
            qty: 1
        });
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
// utang is { name, takenBy } when the sale is charged to utang instead of paid in cash.
function chargeSale(cash, utang) {
    if (cart.length === 0) {
        return;
    }

    const total = cartTotal();

    // Subtract the sold quantities from stock.
    cart.forEach(function (item) {
        const product = findProduct(item.barcode);
        if (product) {
            product.stock = product.stock - item.qty;
        }
    });

    const sale = {
        ts: Date.now(),
        date: todayText(),
        time: new Date().toLocaleTimeString(),
        total: total,
        items: cart.map(function (item) {
            return {
                barcode: item.barcode,
                name: item.name,
                qty: item.qty,
                price: item.price,
                cost: item.cost !== undefined ? item.cost : (findProduct(item.barcode)?.cost || 0)
            };
        })
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

    saveData();

    if (utang) {
        showMessage("Charged to utang: " + utang.name + " " + peso(total) + ".", "ok");
    } else {
        const changeText = isNaN(cash) ? "" : " Change: " + peso(cash - total);
        showMessage("Sale complete: " + peso(total) + "." + changeText, "ok");
    }

    cart = [];
    renderAll();
}


/* ---------- 6. DRAWING THE SCREEN ----------
   "render" functions rebuild part of the page from the current data. */

// The tap-to-add grid. Only shows featured items unless searching. Limits strictly to top 9 products.
function renderTiles() {
    const query = document.getElementById("search-input").value.trim().toLowerCase();
    const sold = soldCounts();

    let list = products.filter(function (p) {
        const matchesSearch = query === "" || p.name.toLowerCase().includes(query) || p.barcode.includes(query);
        if (query !== "") {
            return matchesSearch; // Show all matching products if user is searching
        }
        return p.featured === true; // Otherwise only show items toggled for the front page
    });

    // Sort by bestsellers first, then name
    list.sort(function (a, b) {
        return (sold[b.barcode] || 0) - (sold[a.barcode] || 0) || a.name.localeCompare(b.name);
    });

    // If not searching, limit default view strictly to top 9 featured items
    if (query === "" && list.length > 9) {
        list = list.slice(0, 9);
    }

    let html = "";
    list.forEach(function (p) {
        const inCart = cart.find(function (i) { return i.barcode === p.barcode; });
        const qty = inCart ? inCart.qty : 0;
        const soldOut = p.stock - qty <= 0;
        const stockText = p.stock <= 0 ? "Out of stock" : (p.stock - qty) + " left";

        const low = p.stock - qty <= p.reorder;            // running low: shown in red
        const colors = tileColors(p);
        html += '<button class="tile' + (qty > 0 ? " in-cart" : "") + '" style="--tile-bg:' + colors[0] + ";--tile-border:" + colors[1] + '" data-barcode="' + escapeHtml(p.barcode) + '"' + (soldOut ? " disabled" : "") + ">" +
            '<span class="tile-icon">' + productIcon(p) + "</span>" +
            '<span class="tile-name">' + escapeHtml(p.name) + "</span>" +
            '<span class="tile-price">' + peso(p.price) + "</span>" +
            '<span class="tile-stock' + (low ? " low" : "") + '">' + stockText + "</span>" +
            (qty > 0 ? '<span class="tile-badge">' + qty + "</span>" : "") +
            "</button>";
    });

    if (list.length === 0) {
        html = '<p class="empty">' + (query === "" ? "No featured products. Toggle products to show on front page under Products tab or use search." : "No products found.") + '</p>';
    }
    document.getElementById("tile-grid").innerHTML = html;
}

function renderCart() {
    let html = "";

    cart.forEach(function (item) {
        const cartProduct = findProduct(item.barcode);
        html += "<li>" +
            '<span class="cart-icon">' + (cartProduct ? productIcon(cartProduct) : "🛒") + "</span>" +
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

        const colors = tileColors(p);
        const profitMargin = p.price - (p.cost || 0);
        html += '<div class="product-row" data-barcode="' + escapeHtml(p.barcode) + '">' +
            '<span class="prod-icon" style="background:' + colors[0] + ";border-color:" + colors[1] + '">' + productIcon(p) + "</span>" +
            '<div class="product-main"><div class="product-name">' + escapeHtml(p.name) + (p.featured ? ' <span class="tag sale">Featured</span>' : '') + "</div>" +
            '<div class="product-code">' + escapeHtml(p.barcode) + " &middot; Cost: " + peso(p.cost || 0) + " &middot; Profit: " + peso(profitMargin) + "</div></div>" +
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

// Today's total and number of transactions shown at the top of the page
function renderSummary() {
    const stats = todayStats();
    document.getElementById("today-total").textContent = peso(stats.total);
    document.getElementById("today-count").textContent = stats.count;
}

// Everything that happened today, newest first:
// product sales, GCash/Maya, utang payments received, and wallet balance changes.
function todayEvents() {
    const today = todayText();
    const events = [];

    sales.forEach(function (sale, index) {
        if (sale.date === today) {
            events.push({ kind: "sale", ts: sale.ts || 0, order: index, data: sale });
        }
    });
    ewalletTx.forEach(function (tx, index) {
        if (tx.date === today) {
            events.push({ kind: tx.type === "adjust" ? "adjust" : "wallet", ts: tx.ts || 0, order: index, data: tx });
        }
    });
    ledger.forEach(function (entry, index) {
        if (entry.type === "payment" && entry.date === today) {
            events.push({ kind: "payment", ts: entry.ts || 0, order: index, data: entry });
        }
    });

    // newest first (older records without a timestamp go last, in the order they were saved)
    events.sort(function (a, b) {
        return (b.ts - a.ts) || (b.order - a.order);
    });
    return events;
}

// Today's numbers.
// Total = sales paid in cash + GCash/Maya fees + utang payments received.
// Sales charged to utang are NOT in the total until the person pays.
function todayStats() {
    const stats = { total: 0, count: 0, items: 0, fees: 0, cashIn: 0, cashOut: 0, utangCharged: 0, profit: 0 };

    todayEvents().forEach(function (event) {
        const d = event.data;
        if (event.kind === "sale") {
            stats.count++;
            d.items.forEach(function (item) {
                stats.items += item.qty;
                const itemCost = item.cost !== undefined ? item.cost : (findProduct(item.barcode)?.cost || 0);
                stats.profit += (item.price - itemCost) * item.qty;
            });
            if (d.utang) {
                stats.utangCharged += d.total;
            } else {
                stats.total += d.total;
            }
        } else if (event.kind === "wallet") {
            stats.count++;
            stats.fees += d.fee;
            stats.total += d.fee;
            stats.profit += d.fee; // GCash/Maya fee is straight profit/revenue
            if (d.type === "in") { stats.cashIn += d.amount; } else { stats.cashOut += d.amount; }
        } else if (event.kind === "payment") {
            stats.count++;
            stats.total += d.amount;
        }
    });

    Object.keys(stats).forEach(function (key) {
        stats[key] = round2(stats[key]);
    });
    return stats;
}

// The Today tab
function renderToday() {
    const stats = todayStats();
    document.getElementById("stat-total").textContent = peso(stats.total);
    document.getElementById("stat-profit").textContent = peso(stats.profit);
    document.getElementById("stat-count").textContent = stats.count;
    document.getElementById("stat-items").textContent = stats.items;
    // whole pesos are shown without ".00" so the small boxes stay readable
    document.getElementById("stat-fees").textContent = pesoShort(stats.fees);
    document.getElementById("stat-cashin").textContent = pesoShort(stats.cashIn);
    document.getElementById("stat-cashout").textContent = pesoShort(stats.cashOut);
    document.getElementById("stat-hint").textContent =
        "Total = cash sales + GCash/Maya fees + utang payments received." +
        (stats.utangCharged > 0 ? " Charged to utang today (" + peso(stats.utangCharged) + ") is not in the total." : "");

    let html = "";

    todayEvents().forEach(function (event) {
        const d = event.data;

        if (event.kind === "sale") {
            let lines = "";
            let saleProfit = 0;
            d.items.forEach(function (item) {
                const itemCost = item.cost !== undefined ? item.cost : (findProduct(item.barcode)?.cost || 0);
                const lineProfit = (item.price - itemCost) * item.qty;
                saleProfit += lineProfit;
                lines += "<li><span>" + item.qty + " &times; " + escapeHtml(item.name) + "</span>" +
                    '<span class="line-amount">' + peso(item.price * item.qty) + " (Profit: " + peso(lineProfit) + ")</span></li>";
            });

            let pay = "";
            let tag = '<span class="tag sale">SALE &middot; Profit: ' + peso(saleProfit) + '</span>';
            if (d.utang) {
                tag = '<span class="tag utang">UTANG &middot; ' + escapeHtml(d.utang.name) + " &middot; Profit: " + peso(saleProfit) + "</span>";
                pay = '<div class="txn-pay">Charged to utang' +
                    (d.utang.takenBy ? " &middot; taken by " + escapeHtml(d.utang.takenBy) : "") + "</div>";
            } else if (typeof d.cash === "number") {
                // older sales may not have cash/change saved
                pay = '<div class="txn-pay">Cash ' + peso(d.cash) + " &middot; Change " + peso(d.change) + "</div>";
            }

            html += '<div class="txn ' + (d.utang ? "k-utang" : "k-sale") + '">' +
                '<div class="txn-head"><span class="txn-time">' + escapeHtml(d.time) + tag + "</span>" +
                '<span class="txn-total">' + peso(d.total) + "</span></div>" +
                '<ul class="txn-items">' + lines + "</ul>" + pay + "</div>";

        } else if (event.kind === "wallet") {
            const label = WALLET_NAMES[d.wallet] + " &middot; " + (d.type === "in" ? "Cash in" : "Cash out");
            const cashText = d.cashDelta >= 0
                ? "Customer gave " + peso(d.cashDelta)
                : "Gave customer " + peso(-d.cashDelta);
            html += '<div class="txn k-' + d.wallet + '">' +
                '<div class="txn-head"><span class="txn-time">' + escapeHtml(d.time) + '<span class="tag ' + d.wallet + '">' + label + " &middot; Profit: " + peso(d.fee) + "</span></span>" +
                '<span class="txn-total">' + peso(d.amount) + "</span></div>" +
                '<div class="txn-pay">Fee ' + peso(d.fee) + " &middot; " + cashText + "</div></div>";

        } else if (event.kind === "payment") {
            html += '<div class="txn k-utang">' +
                '<div class="txn-head"><span class="txn-time">' + escapeHtml(d.time) + '<span class="tag utang">UTANG PAYMENT</span></span>' +
                '<span class="txn-total">' + peso(d.amount) + "</span></div>" +
                '<div class="txn-pay">From ' + escapeHtml(d.name) + "</div></div>";

        } else if (event.kind === "adjust") {
            html += '<div class="txn muted k-' + d.wallet + '">' +
                '<div class="txn-head"><span class="txn-time">' + escapeHtml(d.time) + '<span class="tag">' + WALLET_NAMES[d.wallet] + " balance changed</span></span>" +
                '<span class="txn-pay">' + (d.walletDelta >= 0 ? "+" : "&minus;") + peso(Math.abs(d.walletDelta)) + "</span></div>" +
                '<div class="txn-pay">New balance ' + peso(d.balanceAfter) + "</div></div>";
        }
    });

    if (html === "") {
        html = '<p class="empty">Nothing yet today.</p>';
    }
    document.getElementById("today-list").innerHTML = html;
}

function renderAll() {
    renderSell();
    renderProducts();
    renderWallets();
    renderUtang();
    renderSummary();
    renderToday();
}


/* ---------- 7. TABS ---------- */

function showView(name) {
    const views = ["sell", "today", "utang", "products"];
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
    if (name === "utang") {
        renderUtang();
    }
    if (name === "products") {
        fillWalletSettings();
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
    let html = '<button type="button" class="bill exact" data-cash="exact">✔ Exact</button>';
    QUICK_CASH.forEach(function (amount) {
        html += '<button type="button" class="bill ' + BILL_CLASS[amount] + '" data-cash="' + amount + '">₱' + amount + "</button>";
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
    } catch (error) { }
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
    } catch (error) { }
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
            function () { }                                      // called on every frame with no barcode: ignore
        );
        setScannerStatus(mode === "sell" ? "Point the camera at a barcode. It keeps scanning until you tap Done." : "Point the camera at the barcode.");
    } catch (error) {
        scanner = null;
        setScannerStatus("Couldn't open the camera. Allow camera access for this page (iPhone: Settings > Safari > Camera), then try again.");
    }
}

async function closeScanner() {
    const active = scanner;
    scanner = null;
    if (active) {
        try { await active.stop(); } catch (error) { }
        try { active.clear(); } catch (error) { }
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

    if (scannerMode === "fill" || scannerMode === "edit") {
        // fill the barcode box of the Add form, or of the Edit sheet, then close the camera
        const boxId = scannerMode === "fill" ? "new-barcode" : "edit-barcode";
        document.getElementById(boxId).value = code;
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

    // If the "Restock at" box was left empty, use 5
    let reorder = parseInt(document.getElementById("new-reorder").value, 10);
    if (isNaN(reorder)) {
        reorder = 5;
    }

    const newProduct = {
        barcode: barcode,
        name: name,
        price: parseFloat(document.getElementById("new-price").value),
        cost: parseFloat(document.getElementById("new-cost").value) || 0,
        stock: parseInt(document.getElementById("new-stock").value, 10),
        reorder: reorder,
        featured: document.getElementById("new-featured").checked
    };
    if (newIcon) {
        newProduct.icon = newIcon;
    }
    products.push(newProduct);

    saveData();
    renderAll();
    this.reset();
    document.getElementById("new-featured").checked = true; // reset default
    newIcon = "";
    setPickedIcon("new-icons", "");
    message.textContent = "Added: " + name;
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
    editIcon = product.icon || "";
    setPickedIcon("edit-icons", editIcon);
    document.getElementById("edit-name").value = product.name;
    document.getElementById("edit-barcode").value = product.barcode;
    document.getElementById("edit-price").value = product.price;
    document.getElementById("edit-cost").value = product.cost !== undefined ? product.cost : 0;
    document.getElementById("edit-stock").value = product.stock;
    document.getElementById("edit-reorder").value = product.reorder;
    document.getElementById("edit-featured").checked = product.featured === true;
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
        message.textContent = "Another product already uses that barcode: " + other.name;
        return;
    }

    const oldBarcode = product.barcode;
    product.name = document.getElementById("edit-name").value.trim();
    product.barcode = newBarcode;
    product.price = parseFloat(document.getElementById("edit-price").value);
    product.cost = parseFloat(document.getElementById("edit-cost").value) || 0;
    product.stock = parseInt(document.getElementById("edit-stock").value, 10);
    product.reorder = parseInt(document.getElementById("edit-reorder").value, 10);
    product.featured = document.getElementById("edit-featured").checked;

    if (editIcon) {
        product.icon = editIcon;
    } else {
        delete product.icon;               // no picture chosen: it is guessed from the name
    }

    // If this product is in the current sale, update that line too.
    const line = cart.find(function (item) { return item.barcode === oldBarcode; });
    if (line) {
        line.barcode = product.barcode;
        line.name = product.name;
        line.price = product.price;
        line.cost = product.cost;
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
    if (!confirm("Delete " + product.name + "?\n\nYour past sales records are kept.")) {
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
    if (confirm("Delete ALL products and sales and start with an empty list?\n\nGCash/Maya and utang records are kept.\nSave a backup first if you want to keep anything.")) {
        products = [];
        sales = [];
        cart = [];
        saveData();
        renderAll();
    }
});


/* ---------- 11c. GCASH AND MAYA ----------
   The "stock" of GCash / Maya is the money in your wallet (the balance).
   Cash in  = the customer gives you cash, you send e-money  -> balance goes DOWN
   Cash out = you give the customer cash, they send e-money  -> balance goes UP */

const WALLET_NAMES = { gcash: "GCash", maya: "Maya" };
let walletInUse = "gcash";   // which wallet the sheet is open for
let walletMode = "in";       // "in" (cash in) or "out" (cash out)
let feeEdited = false;       // true after you type your own fee

function byId(id) {
    return document.getElementById(id);
}

// Round to centavos so numbers like 0.1 + 0.2 don't show up as 0.30000000000000004
function round2(n) {
    return Math.round(n * 100) / 100;
}

// Make sure the saved wallet data has every field (also fixes data from a backup)
function normalizeEwallet() {
    ["gcash", "maya"].forEach(function (name) {
        const w = ewallet[name] || {};
        ewallet[name] = {
            numbers: typeof w.numbers === "string" ? w.numbers : "",
            balance: typeof w.balance === "number" ? w.balance : 0
        };
    });
    if (ewallet.cashOutFee !== "extra") {
        ewallet.cashOutFee = "deduct";
    }
}

// THE FEE RULE (same for GCash and Maya, cash in and cash out):
//   every full 1,000 costs 15, and the leftover part costs
//   10 if it is 1-500, or 15 if it is 501-999.
//   Examples: 300 = 10, 500 = 10, 501 = 15, 1000 = 15, 1500 = 25, 2400 = 40, 2600 = 45
function walletFee(amount) {
    if (!(amount > 0)) {
        return 0;
    }
    const thousands = Math.floor(amount / 1000);
    const rest = amount - thousands * 1000;
    let restFee = 0;
    if (rest > 0 && rest <= 500) {
        restFee = 10;
    } else if (rest > 500) {
        restFee = 15;
    }
    return thousands * 15 + restFee;
}

// What a transaction does to the wallet balance and to the cash in your drawer.
function walletEffects(mode, amount, fee) {
    if (mode === "in") {
        // customer pays amount + fee in cash, wallet sends out the amount
        return { wallet: round2(-amount), cash: round2(amount + fee) };
    }
    if (ewallet.cashOutFee === "extra") {
        // customer sends amount + fee to your wallet, you hand over the full amount
        return { wallet: round2(amount + fee), cash: round2(-amount) };
    }
    // fee is taken from the cash: customer sends the amount, you hand over amount - fee
    return { wallet: round2(amount), cash: round2(-(amount - fee)) };
}

function renderWallets() {
    byId("bal-gcash").textContent = peso(ewallet.gcash.balance);
    byId("bal-maya").textContent = peso(ewallet.maya.balance);
}

function openWallet(name) {
    walletInUse = name;
    feeEdited = false;
    byId("wallet-form").className = "sheet theme-" + name;   // blue for GCash, green for Maya
    byId("wallet-title").textContent = WALLET_NAMES[name];
    const numbers = ewallet[name].numbers.trim();
    byId("wallet-numbers").textContent = numbers
        ? "Number: " + numbers
        : "No number saved yet. Add it in the Products tab, under GCash & Maya settings.";
    byId("wallet-amount").value = "";
    byId("wallet-fee").value = "";
    setWalletMode("in");
    byId("wallet-overlay").hidden = false;
    if (hasMouse()) {
        byId("wallet-amount").focus();
    }
}

function closeWallet() {
    byId("wallet-overlay").hidden = true;
}

function setWalletMode(mode) {
    walletMode = mode;
    byId("mode-in").classList.toggle("active", mode === "in");
    byId("mode-out").classList.toggle("active", mode === "out");
    byId("mode-hint").textContent = mode === "in"
        ? "Cash in: the customer hands you cash and you send it to their wallet."
        : "Cash out: you hand the customer cash and they send it to your wallet.";
    updateWalletSheet();
}

function signedPeso(n) {
    return (n >= 0 ? "+" : "−") + peso(Math.abs(n));
}

// Recalculate the fee, the summary and any error every time something changes
function updateWalletSheet() {
    const name = walletInUse;
    const amountBox = byId("wallet-amount");
    const feeBox = byId("wallet-fee");
    const amount = parseFloat(amountBox.value);
    const hasAmount = !isNaN(amount) && amount > 0;

    if (!feeEdited) {
        feeBox.value = hasAmount ? walletFee(amount) : "";
    }
    const fee = parseFloat(feeBox.value);
    const balance = ewallet[name].balance;
    byId("wallet-balance").textContent = peso(balance);

    let error = "";
    if (hasAmount) {
        if (isNaN(fee) || fee < 0) {
            error = "Enter the fee (0 or more).";
        } else if (walletMode === "in" && amount > balance) {
            error = "Not enough in your " + WALLET_NAMES[name] + " balance (" + peso(balance) + ").";
        } else if (walletMode === "out" && ewallet.cashOutFee === "deduct" && fee > amount) {
            error = "The fee is bigger than the amount.";
        }
    }
    const ok = hasAmount && error === "";

    if (ok) {
        const effect = walletEffects(walletMode, round2(amount), round2(fee));
        byId("sum-cash-label").textContent = effect.cash >= 0 ? "Customer gives you" : "Give the customer";
        byId("sum-cash").textContent = peso(Math.abs(effect.cash));
        byId("sum-change").textContent = signedPeso(effect.wallet);
        byId("sum-wallet").textContent = peso(round2(balance + effect.wallet));
    } else {
        byId("sum-cash-label").textContent = walletMode === "in" ? "Customer gives you" : "Give the customer";
        byId("sum-cash").textContent = "-";
        byId("sum-change").textContent = "-";
        byId("sum-wallet").textContent = "-";
    }

    byId("wallet-error").textContent = error;
    byId("wallet-confirm").disabled = !ok;
}

function completeWallet() {
    const name = walletInUse;
    const amount = round2(parseFloat(byId("wallet-amount").value));
    const fee = round2(parseFloat(byId("wallet-fee").value));

    // the same checks as above, in case the button was pressed anyway
    if (!(amount > 0) || isNaN(fee) || fee < 0) {
        return;
    }
    if (walletMode === "in" && amount > ewallet[name].balance) {
        return;
    }

    const effect = walletEffects(walletMode, amount, fee);
    const balanceAfter = round2(ewallet[name].balance + effect.wallet);

    ewalletTx.push({
        ts: Date.now(),
        date: todayText(),
        time: new Date().toLocaleTimeString(),
        wallet: name,
        type: walletMode,
        amount: amount,
        fee: fee,
        walletDelta: effect.wallet,
        cashDelta: effect.cash,
        balanceAfter: balanceAfter
    });
    ewallet[name].balance = balanceAfter;
    saveData();

    const handText = effect.cash >= 0 ? "Collect " + peso(effect.cash) : "Give " + peso(-effect.cash);
    closeWallet();
    renderAll();
    showMessage(WALLET_NAMES[name] + (walletMode === "in" ? " cash in " : " cash out ") + peso(amount) +
        " done. " + handText + ".", "ok");
}

// Settings on the Products tab: numbers, balances, cash-out style
function fillWalletSettings() {
    byId("set-gcash-numbers").value = ewallet.gcash.numbers;
    byId("set-gcash-balance").value = ewallet.gcash.balance;
    byId("set-maya-numbers").value = ewallet.maya.numbers;
    byId("set-maya-balance").value = ewallet.maya.balance;
    byId("set-cashout-mode").value = ewallet.cashOutFee;
}

function saveWalletSettings() {
    const message = byId("wallet-settings-msg");

    // check both balances first, so nothing is half-saved
    const typed = {};
    let problem = "";
    ["gcash", "maya"].forEach(function (name) {
        const value = parseFloat(byId("set-" + name + "-balance").value);
        if (isNaN(value) || value < 0) {
            problem = "Type a balance of 0 or more for " + WALLET_NAMES[name] + ".";
        }
        typed[name] = value;
    });
    if (problem) {
        message.textContent = problem;
        return;
    }

    ["gcash", "maya"].forEach(function (name) {
        ewallet[name].numbers = byId("set-" + name + "-numbers").value.trim();
        const newBalance = round2(typed[name]);
        const difference = round2(newBalance - ewallet[name].balance);
        if (difference !== 0) {
            // keep a record of every manual change, so the balance can always be explained
            ewalletTx.push({
                ts: Date.now(), date: todayText(), time: new Date().toLocaleTimeString(),
                wallet: name, type: "adjust", amount: difference, fee: 0,
                walletDelta: difference, cashDelta: 0, balanceAfter: newBalance
            });
            ewallet[name].balance = newBalance;
        }
    });
    ewallet.cashOutFee = byId("set-cashout-mode").value === "extra" ? "extra" : "deduct";

    saveData();
    renderAll();
    fillWalletSettings();
    message.textContent = "Saved.";
}

document.querySelectorAll(".wallet-tile").forEach(function (button) {
    button.addEventListener("click", function () {
        openWallet(button.getAttribute("data-wallet"));
    });
});
byId("mode-in").addEventListener("click", function () { setWalletMode("in"); });
byId("mode-out").addEventListener("click", function () { setWalletMode("out"); });
byId("wallet-amount").addEventListener("input", function () {
    feeEdited = false;                 // a new amount means a new automatic fee
    updateWalletSheet();
});
byId("wallet-fee").addEventListener("input", function () {
    feeEdited = true;                  // the fee was typed by hand: leave it alone
    updateWalletSheet();
});
byId("wallet-form").addEventListener("submit", function (event) {
    event.preventDefault();
    completeWallet();
});
byId("wallet-cancel").addEventListener("click", closeWallet);
byId("save-wallet-settings").addEventListener("click", saveWalletSettings);


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

    // suggestions while typing a name in the "Charge to utang" sheet
    byId("utang-names").innerHTML = people.map(function (p) {
        return '<option value="' + escapeHtml(p.name) + '"></option>';
    }).join("");

    const query = byId("debt-search").value.trim().toLowerCase();
    const shown = people
        .filter(function (p) { return query === "" || p.name.toLowerCase().includes(query); })
        .sort(function (a, b) {
            // people who still owe come first, biggest amount first
            return ((b.balance > 0) - (a.balance > 0)) || (b.balance - a.balance) || (b.last - a.last);
        });

    let html = "";
    shown.forEach(function (p) {
        const lastEntry = p.entries[p.entries.length - 1];
        const status = p.balance > 0
            ? '<div class="product-nums"><div>' + peso(p.balance) + "</div></div>"
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
                    '<span class="line-amount">' + peso(item.price * item.qty) + "</span></li>";
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


/* ---------- 11e. PICTURES AND COLORS ----------
   Every product has a picture (an emoji) and a color, so people who can't read well
   can find things by looking. If no picture is chosen, one is guessed from the name. */

const PRODUCT_ICONS = ["🍜", "☕", "🧃", "💧", "🥤", "🧴", "🧼", "🪥", "🧻", "🍞", "🍪", "🍫", "🍬", "🍿", "🥫", "🧂", "🍚", "🥚", "🛢️", "🔋", "🛒"];

// soft background and border color for the product tiles (the same picture always gets the same color)
const TILE_COLORS = [
    ["#fff3c4", "#eec746"],   // yellow
    ["#ffdce8", "#ee8fb0"],   // pink
    ["#d8eefc", "#6fbbe8"],   // sky blue
    ["#e8f6c8", "#a6cf4f"],   // lime
    ["#ffe0cc", "#ee9f6d"],   // peach
    ["#e6deff", "#a994ec"],   // lilac
    ["#cff3e6", "#62c9a7"],   // mint
    ["#f1e6d2", "#cdb47f"]    // sand
];

// words in a product name -> picture
const ICON_GUESS = [
    ["🍜", ["noodle", "pancit", "canton", "lucky me", "nissin", "ramen"]],
    ["☕", ["coffee", "kape", "kopiko", "nescafe", "great taste", "3-in-1", "3in1"]],
    ["🧃", ["juice", "c2", "tang", "zest"]],
    ["💧", ["water", "tubig", "mineral"]],
    ["🥤", ["coke", "sprite", "royal", "pepsi", "softdrink", "soft drink", "soda", "mismo", "mountain dew", "7up", "sting", "gatorade"]],
    ["🧴", ["shampoo", "conditioner", "lotion", "sunsilk", "palmolive", "creamsilk"]],
    ["🧼", ["soap", "sabon", "safeguard", "dove", "detergent", "surf", "tide", "bleach", "zonrox"]],
    ["🪥", ["toothpaste", "toothbrush", "colgate", "close up"]],
    ["🧻", ["tissue", "napkin"]],
    ["🍞", ["bread", "pandesal", "tasty"]],
    ["🍪", ["biscuit", "cracker", "skyflakes", "sky flakes", "fita", "cookie", "oreo", "rebisco", "hello panda"]],
    ["🍫", ["chocolate", "choco", "cloud 9", "snickers"]],
    ["🍬", ["candy", "sweet", "lollipop", "menthol", "mentos", "hany", "pastillas"]],
    ["🍿", ["chips", "piattos", "chippy", "nova", "popcorn", "v-cut", "oishi"]],
    ["🥫", ["sardines", "corned", "tuna", "canned", "ligo", "555", "argentina", "mega"]],
    ["🧂", ["salt", "asin", "pepper", "vetsin", "ajinomoto", "toyo", "soy", "suka", "vinegar", "patis", "ketchup", "sauce", "magic sarap", "seasoning"]],
    ["🍚", ["rice", "bigas"]],
    ["🥚", ["egg", "itlog"]],
    ["🛢️", ["oil", "mantika"]],
    ["🔋", ["battery", "baterya", "eveready"]]
];

function guessIcon(name) {
    const text = String(name).toLowerCase();
    for (let i = 0; i < ICON_GUESS.length; i++) {
        const words = ICON_GUESS[i][1];
        if (words.some(function (word) { return text.includes(word); })) {
            return ICON_GUESS[i][0];
        }
    }
    return "🛒";
}

function productIcon(p) {
    return p.icon || guessIcon(p.name);
}

function tileColors(p) {
    const index = PRODUCT_ICONS.indexOf(productIcon(p));
    return TILE_COLORS[(index < 0 ? 0 : index) % TILE_COLORS.length];
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

// ----- the row of pictures to choose from (Add product and Edit product) -----
let newIcon = "";
let editIcon = "";

function buildIconPicker(id) {
    byId(id).innerHTML = PRODUCT_ICONS.map(function (icon) {
        return '<button type="button" class="icon-opt" data-icon="' + icon + '">' + icon + "</button>";
    }).join("");
}

function setPickedIcon(id, icon) {
    byId(id).querySelectorAll(".icon-opt").forEach(function (button) {
        button.classList.toggle("picked", button.getAttribute("data-icon") === icon);
    });
}

// Tapping the same picture again un-picks it (so it goes back to guessing)
byId("new-icons").addEventListener("click", function (event) {
    const button = event.target.closest(".icon-opt");
    if (button) {
        const icon = button.getAttribute("data-icon");
        newIcon = newIcon === icon ? "" : icon;
        setPickedIcon("new-icons", newIcon);
    }
});
byId("edit-icons").addEventListener("click", function (event) {
    const button = event.target.closest(".icon-opt");
    if (button) {
        const icon = button.getAttribute("data-icon");
        editIcon = editIcon === icon ? "" : icon;
        setPickedIcon("edit-icons", editIcon);
    }
});
buildIconPicker("new-icons");
buildIconPicker("edit-icons");

// ----- quick amounts for GCash / Maya (tap instead of typing) -----
const WALLET_QUICK = [100, 200, 300, 500, 1000, 2000];

byId("wallet-quick").innerHTML = WALLET_QUICK.map(function (amount) {
    return '<button type="button" class="bill ' + (BILL_CLASS[amount] || "bx") + '" data-amount="' + amount + '">₱' + amount + "</button>";
}).join("");

byId("wallet-quick").addEventListener("click", function (event) {
    const button = event.target.closest("button");
    if (!button) { return; }
    byId("wallet-amount").value = button.getAttribute("data-amount");
    feeEdited = false;
    updateWalletSheet();
});


/* ---------- 12. BACKUP AND RESTORE ----------
   A backup is a text file (.json) holding your products and sales. */

function makeBackup() {
    return {
        app: "sari-sari-pos",
        version: 3,
        savedAt: new Date().toISOString(),
        products: products,
        sales: sales,
        ewallet: ewallet,
        ewalletTx: ewalletTx,
        ledger: ledger
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
    // These three only exist in newer backups, so they are optional.
    if (data.ewalletTx !== undefined && !Array.isArray(data.ewalletTx)) {
        return "The GCash/Maya records in the backup file are damaged.";
    }
    if (data.ledger !== undefined && !Array.isArray(data.ledger)) {
        return "The utang records in the backup file are damaged.";
    }
    if (data.ewallet !== undefined && (typeof data.ewallet !== "object" || data.ewallet === null)) {
        return "The GCash/Maya settings in the backup file are damaged.";
    }
    return "";
}

function showBackupStatus() {
    const box = document.getElementById("backup-status");
    let last = "";
    try { last = localStorage.getItem(LAST_BACKUP_KEY) || ""; } catch (error) { }
    box.textContent = last
        ? "Last backup saved: " + new Date(last).toLocaleString()
        : "You haven't saved a backup yet.";
}

function markBackupDone() {
    try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch (error) { }
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
    // An older backup has no GCash/Maya or utang data: keep what is on this page instead of wiping it.
    if (data.ewallet !== undefined) { ewallet = data.ewallet; normalizeEwallet(); }
    if (data.ewalletTx !== undefined) { ewalletTx = data.ewalletTx; }
    if (data.ledger !== undefined) { ledger = data.ledger; }
    normalizeProductFields();
    cart = [];
    saveData();
    renderAll();
    fillWalletSettings();
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
    if (confirm("Delete all your products and sales and go back to the sample data?\n\nGCash/Maya and utang records are kept.")) {
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
} catch (error) { }

// Let the page work offline: sw.js keeps a copy of the files (needs the https web link).
if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
    navigator.serviceWorker.register("sw.js").catch(function () { });
}