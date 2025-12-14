/**
 * cart.js
 * ----------------------------
 * CORE MODULE: Responsible for cart, checkout, and confirmation flow.
 * NOTE: Assumes readCookie/writeCookie are available globally (e.g., in ui.js or a shared helpers.js)
 */

const CART_COOKIE = "myshop_cart";
const TAX_RATE = 0.10;

// Re-defining cookie helpers here for completeness if they are not in a shared utility file
function readCookie(name) {

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
}

function writeCookie(name, value, days) {

    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCart() {

    const raw = readCookie(CART_COOKIE);
    if (!raw) return [];
    try {
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}
function updateCartCountBadge() {
    const cart = getCart();
    let total = 0;

    cart.forEach(item => {
        if (typeof item === "number" || typeof item === "string") {
            // cart is just product IDs
            total += 1;
        } else if (item.quantity) {
            // cart item has quantity
            total += Number(item.quantity);
        } else if (item.qty) {
            // fallback for qty naming
            total += Number(item.qty);
        } else {
            // default: count as 1
            total += 1;
        }
    });

    $("#cart-count").text(total);
}
function saveCart(cart) {
   
    writeCookie(CART_COOKIE, JSON.stringify(cart), 7);
    updateCartCountBadge();
}

function addToCart(productId, quantity = 1) {
    let cart = getCart();
    const product = getProductById(productId); 

    if (!product) {
        console.error(`Product with ID ${productId} not found.`);
        return;
    }
    const existing = cart.find(item => item.id == productId);

    if (existing) {
        existing.qty += quantity;
    } else {
        cart.push({ id: productId, qty: quantity });
    }

    // Filter out invalid quantities
    cart = cart.filter(item => item.qty > 0); 
    saveCart(cart);
}
function updateCartItemQuantity(productId, quantity) {
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.qty = quantity;
        if (item.qty <= 0) {
            saveCart(cart.filter(i => i.id !== productId));
        } else {
            saveCart(cart);
        }
    }
}

function removeFromCart(productId) {
    const cart = getCart();
    saveCart(cart.filter(item => item.id !== productId));
    if($("#cart-section").length){
        renderCart(getCart());
    }
}
//Event handler to remove an items from the cart
function handleRemoveItem(){
    const id=$(this).data("product-id");
    const cart = getCart();
    const newCart= cart.filter(item=>item.id!=id);
    saveCart(newCart);
    renderCart();
}

//Calculates subtotal, tax and total
function cartTotals(cart) {
    let subtotal = 0;
    cart.forEach(item => {
        const p = getProductById(item.id);
        if (p && p.price) {
            subtotal += p.price * item.qty;
        }
    });
    
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    
    return { 
        subtotal: subtotal,
        tax: tax,
        total: total
    };
}
function renderCart(cart) {
    const cartItemsContainer = $("#cart-items-list");
    const cartSummaryContainer = $("#cart-summary-totals");
    cartItemsContainer.empty();
    cartSummaryContainer.empty();

    if (cart.length === 0) {
        cartItemsContainer.html("<p class=\"empty-cart-message\">Your cart is empty.</p>");
        cartSummaryContainer.html(`
            <p>Subtotal: $0.00</p>
            <p>Tax (10%): $0.00</p>
            <p class="cart-total-line">Total: <span>$0.00</span></p>
        `);
        $("#cart-checkout-btn").prop('disabled', true);
        return;
    }

    // Render Items
    cart.forEach(cartItem => {
        const product = getProductById(cartItem.id);
        if (!product) return; // Skip if product data couldn't be found
        
        const priceFormatted = product.price.toFixed(2);
        const subtotalFormatted = (product.price * cartItem.qty).toFixed(2);

        cartItemsContainer.append(`
            <li class="cart-item" data-product-id="${product.id}">
                <div class="cart-image">
                    <img src="${product.image}" alt="${product.title}">
                </div>
                <div class="cart-details">
                    <a href="product.html?id=${product.id}" class="cart-title">${product.title}</a>
                    <p class="cart-price">$${priceFormatted}</p>
                </div>
                <div class="cart-quantity">
                    <input type="number" 
                           min="1" 
                           value="${cartItem.qty}" 
                           class="cart-qty-input" 
                           data-product-id="${product.id}">
                </div>
                <div class="cart-subtotal">
                    $${subtotalFormatted}
                </div>
                <div class="cart-actions">
                    <button class="btn secondary cart-remove-btn" data-product-id="${product.id}">Remove</button>
                </div>
            </li>
        `);
    });

    // Render Totals
    const totals = cartTotals(cart);
    cartSummaryContainer.html(`
        <p>Subtotal: $${totals.subtotal.toFixed(2)}</p>
        <p>Tax (${(TAX_RATE * 100).toFixed(0)}%): $${totals.tax.toFixed(2)}</p>
        <p class="cart-total-line">Total: <span>$${totals.total.toFixed(2)}</span></p>
    `);
    $("#cart-checkout-btn").prop('disabled', false);

    // 3. Attach Event Handlers
    $(".cart-remove-btn").on("click", function() {
        const id = $(this).data("product-id");
        removeFromCart(id);
    });

    $(".cart-qty-input").on("change", function() {
        const id = $(this).data("product-id");
        const qty = $(this).val();
        updateQuantity(id, qty);
    });
}
// Helper function to render product list on checkout page (using correct ID)
function renderCheckoutSummaryItems(cart) {
    const itemsContainer = $("#checkout-cart-items"); // Targets the user's HTML ID
    if (itemsContainer.length === 0) return;
    itemsContainer.empty();

    cart.forEach(cartItem => {
        const product = getProductById(cartItem.id);
        if (!product) return;
        
        const itemTotal = (product.price * cartItem.qty).toFixed(2);
        
        itemsContainer.append(`
            <p class="summary-item">
                ${product.title} x ${cartItem.qty} 
                <span class="summary-item-price">$${itemTotal}</span>
            </p>
        `);
    });
}

// Function to render the totals and summary on the checkout page (using correct IDs)
function renderCheckoutSummary(cart) {
    const totals = cartTotals(cart);

    // Render the list of products
    renderCheckoutSummaryItems(cart);
    
    // Renders the totals to the correct IDs
    $("#checkout-subtotal").text(`${totals.subtotal.toFixed(2)}`);
    $("#checkout-tax").text(`${totals.tax.toFixed(2)}`);
    $("#checkout-total").text(`${totals.total.toFixed(2)}`);
}
// =========================================================
// PAGE INITIALIZATION FUNCTIONS
// =========================================================

function initCartPage() {
    // ensure product data is loaded before rendering the cart
    if (typeof loadProducts !== 'function') {
        console.error("loadProducts is required but not defined. Ensure products.js is loaded correctly.");
        return;
    }
    
    // Call loadProducts and run the cart logic inside its callback
    loadProducts(function() {
        const section = $("#cart-section");
        if (section.length === 0) return;

        // REDIRECT UNLOGGED-IN USERS TO LOGIN PAGE
        if (!isLoggedIn()) {
            alert("You must be logged in to view your cart.");
            // Added redirect parameter for better UX
            window.location.href = "login.html?redirect=cart.html"; 
            return; // Halt execution
        }
        
        const cart = getCart();
        renderCart(cart); // Now calls the new function
        updateCartCountBadge();

        $("#cart-checkout-btn").on("click",function(e){
            e.preventDefault();
            if (isLoggedIn()){
                window.location.href="checkout.html";
            }else{
                window.location.href = "login.html?redirect=checkout.html";
            }
        });
    });
}
function initCheckoutPage() {
    const section = $("#checkout-page");
    if (section.length === 0) return;

    // REDIRECT UNLOGGED-IN USERS TO LOGIN PAGE (Recommended security measure)
    if (!isLoggedIn()) {
        alert("You must be logged in to proceed to checkout.");
        window.location.href = "login.html"; 
        return; // Halt execution
    }

    const cart = getCart();
    if (cart.length === 0) {
        section.html("<h2>Checkout</h2><p>Your cart is empty. Please add items before checking out.</p><a href='products.html' class='btn primary'>Continue Shopping</a>");
        return;
    }

    // Load products data before attempting to calculate/render totals
    if (typeof loadProducts === 'function') {
        loadProducts(function() {
            renderCheckoutSummary(cart);
        });
    } else {
        // Fallback if products.js is not loaded
        console.error("loadProducts is not defined. Cannot render accurate checkout summary.");
    }

    $("#checkout-form").on("submit", function (e) {
        e.preventDefault();

        // Simple client-side validation
        const name = $("#checkout-name").val().trim();
        const email = $("#checkout-email").val().trim();
        const phone = $("#checkout-phone").val().trim();
        const address = $("#checkout-address").val().trim();
        const city = $("#checkout-city").val().trim();
        const postal = $("#checkout-postal").val().trim();

        if (!name || !email || !phone || !address || !city || !postal) {
            alert("Please fill out all required fields.");
            return;
        }

        const totals = cartTotals(cart);
        const order = {
            orderNumber: "ORD-" + Math.floor(Math.random() * 900000 + 100000),
            total: totals.total,
            items: cart
        };
        sessionStorage.setItem("myshop_last_order", JSON.stringify(order));
        saveCart([]);
        window.location.href = "confirmation.html";
    });
}

function initConfirmationPage() {
    const section = $("#confirmation-section");
    if (section.length === 0) return;

    const raw = sessionStorage.getItem("myshop_last_order");
    if (!raw) {
        section.html("<p>No recent order found.</p>");
        return;
    }
    const order = JSON.parse(raw);
    $("#order-number").text(order.orderNumber);
    $("#confirmation-total").text(order.total.toFixed(2));

    const itemsContainer = $("#confirmation-items");
    itemsContainer.empty();
    // NOTE: loadProducts is assumed to be defined in products.js
    if (typeof loadProducts === 'function') {
        loadProducts(function() {
            order.items.forEach(ci => {
                const p = getProductById(ci.id);
                if (!p) return;
                itemsContainer.append(
                    `<p>${p.title} × ${ci.qty} - $${(p.price * ci.qty).toFixed(2)}</p>`
                );
            });
        });
    }
}

$(document).ready(function () {
    initCartPage();
    initCheckoutPage();
    initConfirmationPage();
    updateCartCountBadge();
});