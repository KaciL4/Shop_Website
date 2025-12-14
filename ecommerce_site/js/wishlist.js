function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) +
        "; expires=" + expires + "; path=/";
}

function getCookie(name) {
    return document.cookie
        .split("; ")
        .find(row => row.startsWith(name + "="))
        ?.split("=")[1];
}

function getWishlist() {
    const cookie = getCookie("wishlist");
    return cookie ? JSON.parse(decodeURIComponent(cookie)) : [];
}

function saveWishlist(wishlist) {
    setCookie("wishlist", JSON.stringify(wishlist), 30);
}

function addToWishlist(productId) {
    let wishlist = getWishlist().map(String);
    const pid = String(productId);

    if (!wishlist.includes(pid)) {
        wishlist.push(pid);
        saveWishlist(wishlist);
        alert("Added to wishlist");
    } else {
        alert("Already in wishlist!");
    }
}



function removeFromWishlist(productId) {
    const pid = String(productId);

    let wishlist = getWishlist().map(String);
    wishlist = wishlist.filter(id => id !== pid);

    saveWishlist(wishlist);
    displayWishlist();
}




function displayWishlist() {
    const wishlist = getWishlist();
    const container = document.getElementById("wishlist-container");
    container.innerHTML = "";

    if (wishlist.length === 0) {
        container.textContent = "Your wishlist is empty 💔";
        return;
    }

    wishlist.forEach(id => {
        const product = getProductById(id);
        if (!product) return;

        container.innerHTML += `
            <article class="product-card">
                <img src="${product.image || 'assets/placeholder.png'}" alt="${product.title}">
                <h3>${product.title}</h3>
                <p class="price">$${product.price.toFixed(2)}</p>
                <button class="btn secondary"
                        onclick="removeFromWishlist('${id}')">
                    Remove
                </button>
            </article>
        `;
    });
}  

// make sure produts are loaded
$(document).ready(function () {
    loadProducts(function () {
        displayWishlist();
    });
});

