/**
 * products.js
 * ----------------------------
 * Responsible for:
 * - Loading product, category, and review JSON data via AJAX
 * - Normalizing and storing all products in memory
 * - Rendering:
 *      • Home page categories and featured products
 *      • Product Listing Page (filters, sorting, pagination)
 *      • Product Detail Page (details, related products, reviews)
 * - Providing helper functions (getProductById, getReviewsForProduct)
 * - Integrating with the cart logic via addToCart()
 */

let allProducts = [];//array to store all product objects once loaded
let allCategories = [];//array to store all category objects (name, slug, description).
let allReviews = []; // array to store all reviews, flattened for easy lookup across products.
// Converts a category name into a URL-friendly, lowercased, hyphen-separated string (slug)
function slugifyCategory(name) {
    return name
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
//function to load all necessary data (products, categories, reviews) using AJAX, normalizes it, and executes a callback function upon completion.
function loadProducts(callback) {
    if (allProducts.length > 0) {
        if (callback) callback();
        return;
    }
    let rawReviews = [];

    // Use an array to store deferred objects for $.when
    const productRequests = [
        // path for products.json
        $.getJSON("data/products.json", function (data) {
            allProducts = data;
        }),

        // Loads and manually parses category data from categories.xml
        $.ajax({
            url: "data/categories.xml",
            dataType: "xml",
            success: function(xmlData) {
                allCategories = [];
                // Manually parse the XML structure to get the category names
                $(xmlData).find('category').each(function() {
                    const $category = $(this);
                    const categoryName = $category.find('name').text();

                    allCategories.push({
                        name: categoryName,
                        slug: slugifyCategory(categoryName),
                        description:$category.find('description').text()
                    });
                });
            }
        }),

        // Loads raw review data from reviews.json
        $.getJSON("data/reviews.json", function (data) {
            rawReviews = data;
        })
    ];

    // Use $.when with the array of requests to wait for all data to load
    $.when(...productRequests).then(function () {
        // Normalize products from your data structure
        allProducts = allProducts.map(p => {
            const officialName = p.category;
            // Find the official category object using the raw category name from products.json
            const officialCategory = allCategories.find(c => c.name === officialName);

            // Use the official slug if found, otherwise generate it (fallback)
            const normalizedSlug = officialCategory
                ? officialCategory.slug
                : slugifyCategory(p.category);
            return{
                ...p,
                title: p.name,
                categoryName: officialName,
                categorySlug: normalizedSlug,
                reviews: [] // will be filled in the next step
            }

        });

        // Flatten and merge reviews
        rawReviews.forEach(pr => {
            const product = allProducts.find(p => p.id == pr.product_id);
            if (product) {
                product.reviews = pr.reviews.map(r => ({
                    id: r.review_id,
                    author: r.user,
                    rating: r.rating,
                    title: r.title,
                    text: r.comment
                }));
            }
        });

        // Flatten all reviews for lookup
        allReviews = allProducts.flatMap(p => p.reviews);
        // Executes the callback and initializes page-specific rendering functions
        if (callback) callback();

        // Initialize pages that rely on product data
        initProductListingPage();
        initHomePage();
        initProductDetailPage();
    });
}
//function to retrieve a single product object from `allProducts` by matching its numerical ID
function getProductById(id) {
    const searchId = parseInt(id,10);
    return allProducts.find(p => p.id ===searchId);
}
//function to retrieve all review objects from `allReviews` that match the given product ID
function getReviewsForProduct(id) {
    const pid = String(id);
    return allReviews.filter(r => r.productId === pid);
}
// function to render category cards on the home page using data from `allCategories`
function renderCategoriesOnHome() {
    const container = $("#home-categories");
    if (container.length === 0) return;
    container.empty();
    allCategories.forEach(cat => {
        const card = $(
            `<article class="category-card">
                <h3>${cat.name}</h3>
                <p>${cat.description}</p>
                <a href="products.html?category=${encodeURIComponent(cat.slug)}" class="btn secondary">Shop ${cat.name}</a>
            </article>`
        );
        container.append(card);
    });
}
// function to generate the HTML string for a single product card, optionally highlighting a search term in the title
function productCardHtml(p, searchTerm) {
    const img = p.image || "assets/placeholder.png";
    let titleHtml = p.title;
    if (searchTerm) {
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const reHigh = new RegExp("(" + escaped + ")", "ig");
        titleHtml = p.title.replace(reHigh, "<mark>$1</mark>");
    }
    return `
    <article class="product-card">
        <img src="${img}" alt="${p.title}">
        <h3>${titleHtml}</h3>
        <p class="price">$${p.price.toFixed(2)}</p>
        <p>${p.categoryName}</p>
        <a href="product.html?id=${encodeURIComponent(p.id)}" class="btn secondary">View details</a>
    </article>`;
}
// function to render a set of product as "featured" on the home page
function renderFeaturedProducts() {
    const container = $("#featured-products");
    if (container.length === 0) return;
    container.empty();
    // Use first N products as "featured" if no explicit flag
    const featured = allProducts.slice(0, 49);
    featured.forEach(p => container.append(productCardHtml(p)));
}
// function to initialize all functionality for the Product Listing Page (PLP): filters, sorting, pagination, and URL handling
function initPLP() {
    const list = $("#product-list");
    const breadcrumbs = $("#breadcrumbs");

    if (list.length === 0) return;

    const categoryFilter = $("#category-filter");
    const priceRange = $("#price-range");
    const priceLabel = $("#price-range-value");
    const sortSelect = $("#sort-select");
    const pagination = $("#pagination");
    const info = $("#product-results-info");

    // Populate categories drop-down
    allCategories.forEach(cat => {
        categoryFilter.append(`<option value="${cat.slug}">${cat.name}</option>`);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get("q") || "";
    const categoryQ = urlParams.get("category") || "";

    if (categoryQ) {
        categoryFilter.val(categoryQ);
    }

    let currentPage = 1;
    const perPage = 49;

    function applyFiltersAndRender() {
        let filtered = [...allProducts];

        const cat = categoryFilter.val();
        if (cat) {
            filtered = filtered.filter(p => p.categorySlug === cat);
        }

        const maxPrice = parseFloat(priceRange.val());
        priceLabel.text(maxPrice);
        filtered = filtered.filter(p => p.price <= maxPrice);

        if (q) {
            const qLower = q.toLowerCase();
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(qLower) ||
                p.description.toLowerCase().includes(qLower)
            );
        }

        const sortVal = sortSelect.val();
        if (sortVal === "price-asc") {
            filtered.sort((a, b) => a.price - b.price);
        } else if (sortVal === "price-desc") {
            filtered.sort((a, b) => b.price - a.price);
        }

        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / perPage));
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * perPage;
        const pageItems = filtered.slice(start, start + perPage);

        list.empty();
        pageItems.forEach(p => list.append(productCardHtml(p, q)));

        info.text(`Showing ${pageItems.length} of ${total} products${q ? ` for "${q}"` : ""}.`);
        if (breadcrumbs.length) {
            let crumb = '<a href="index.html">Home</a> / <span>All products</span>';
            if (cat && q) {
                const catObj = allCategories.find(c => c.slug === cat);
                const catName = catObj ? catObj.name : cat;
                crumb = '<a href="index.html">Home</a> / <a href="products.html">All products</a> / <span>' + catName + ' & search "' + q + '"</span>';
            } else if (cat) {
                const catObj = allCategories.find(c => c.slug === cat);
                const catName = catObj ? catObj.name : cat;
                crumb = '<a href="index.html">Home</a> / <span>' + catName + '</span>';
            } else if (q) {
                crumb = '<a href="index.html">Home</a> / <span>Search "' + q + '"</span>';
            }
            breadcrumbs.html(crumb);
        }


        pagination.empty();
        for (let i = 1; i <= totalPages; i++) {
            const btn = $(`<button type="button">${i}</button>`);
            if (i === currentPage) btn.addClass("active");
            btn.on("click", function () {
                currentPage = i;
                applyFiltersAndRender();
            });
            pagination.append(btn);
        }
    }
    // Attaches event handlers to re-run `applyFiltersAndRender` whenever a filter or sort control changes
    priceRange.on("input change", applyFiltersAndRender);
    categoryFilter.on("change", function () {
        currentPage = 1;
        applyFiltersAndRender();
    });
    sortSelect.on("change", applyFiltersAndRender);

    applyFiltersAndRender();
}
// function to initialize all functionality for the Product Detail Page (PDP): displays product data, handles the "Add to Cart" button, and renders related products/reviews
function initPDP() {
    const container = $("#product-detail");
    const breadcrumbs = $("#breadcrumbs");
    if (container.length === 0) return;
// Retrieves product ID from URL and fetches the product data using `getProductById`
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    const product = getProductById(id);
    if (!product) {
        container.html("<p>Product not found.</p>");
        return;
    }
// Updates breadcrumbs to reflect the product's category and title
    if (breadcrumbs.length) {
        const catSlug = product.categorySlug;
        const catObj = allCategories.find(c => c.slug === catSlug);
        const catName = catObj ? catObj.name : product.categoryName;
        const catLink = "products.html?category=" + encodeURIComponent(catSlug);
        breadcrumbs.html(`<a href="index.html">Home</a> / <a href="products.html">All products</a> / <a href="${catLink}">${catName}</a> / <span>${product.title}</span>`);
    }

    const img = product.image || "assets/placeholder.png";
    container.html(`
    <div>
        <img src="${img}" alt="${product.title}">
    </div>
    <div>
        <h1>${product.title}</h1>
        <p class="price">$${product.price.toFixed(2)}</p>
        <p>SKU: ${product.sku}</p>
        <p>Availability: ${product.stock > 0 ? "In stock" : "Out of stock"}</p>
        <p>${product.description}</p>

        <div class="quantity-selector">
            <label for="pdp-qty">Qty:</label>
            <input type="number" id="pdp-qty" min="1" value="1">
        </div>

        <div class="pdp-actions">
            <button class="btn primary" id="pdp-add-cart">Add to Cart</button>
            <button class="btn secondary" id="pdp-add-wishlist">❤️ Add to Wishlist</button>
        </div>
    </div>
`);

    // click handler to the "Add to Cart" button
    $("#pdp-add-cart").on("click", function () {
        const qty = parseInt($("#pdp-qty").val(), 10) || 1;
        addToCart(product.id, qty);
        alert("Added to cart!");
    });

    // wishlist click handler
    $("#pdp-add-wishlist").on("click", function () {
    addToWishlist(product.id);
    });

    // Disable btn if product is already in Wishlist
    const wishlist = getWishlist();
    const wishlistBtn = $("#pdp-add-wishlist");

    if (wishlist.includes(product.id)) {
        wishlistBtn.text("In Wishlist");
        wishlistBtn.prop("disabled", true);
    }


// Renders related products by filtering for items in the same category
    const relatedContainer = $("#related-products");
    const related = allProducts.filter(p => p.category === product.category && p.id !== product.id);
    related.slice(0, 7).forEach(p => relatedContainer.append(productCardHtml(p)));
// Renders reviews using the `getReviewsForProduct` helper function
    const reviews = getReviewsForProduct(product.id);
    const reviewsList = $("#reviews-list");
    reviewsList.empty();
    if (reviews.length === 0) {
        reviewsList.append("<p>No reviews yet.</p>");
    } else {
        reviews.forEach(r => {
            reviewsList.append(`
                <article class="review-card">
                    <strong>${r.author}</strong> - Rating: ${r.rating}/5
                    <p><em>${r.title}</em></p>
                    <p>${r.text}</p>
                </article>
            `);
        });
    }
}

$(document).ready(function () {
    loadProducts(function () {
        renderCategoriesOnHome();
        renderFeaturedProducts();
        initPLP();
        initPDP();
    });
});
