/**
 * search.js
 * ----------------------------
 * Responsible for:
 * - Live search suggestions under the header search bar
 * - Navigating to products.html?q=... when user presses Enter
 * - Using allProducts from products.js to match product names
 */
// Function to initialize all search-related functionality (live suggestions, key presses)
function initSearch() {
    const input = $("#search-input");
    const suggestions = $("#search-suggestions");
    // Check if both the input field and the suggestions container exist on the page
    if (input.length === 0 || suggestions.length === 0) return;
    // function to hide the search suggestions container
    function closeSuggestions() {
        suggestions.hide();
    }
    //function to show the search suggestions container
    function openSuggestions() {
        // Only show the container if it actually contains suggestion items.
        if (suggestions.children().length > 0) {
            suggestions.show();
        }
    }
    // Attach an event handler that fires every time the content of the input field changes
    input.on("input", function () {
        // Get the current input value
        const q = $(this).val().trim().toLowerCase();
        suggestions.empty();// Clear any previous suggestions from the container
        // Check if the query is empty or if the product list hasn't been loaded
        if (!q || allProducts.length === 0) {
            //hide the suggestions and stop further processing
            closeSuggestions();
            return;
        }
        // Filter the global `allProducts` array to find matches.
        const matches = allProducts
            .filter(p => p.name.toLowerCase().includes(q))
            .slice(0, 10);// Limit the resulting array to the first 10 matches
        // Iterate over each product match found.
        matches.forEach(p => {
            // Create a regular expression to find all occurrences of the query `q` (case-insensitive, global).
            // The parentheses create a capture group, needed for the replacement string.
            // Replace the matched text with itself wrapped in `<mark>` tags for highlighting.
            const highlighted = p.name.replace(
                new RegExp("(" + q + ")", "ig"),
                "<mark>$1</mark>"
            );
            const item = $(`<div data-id="${p.id}">${highlighted}</div>`);
            item.on("click", function () {
                window.location.href = "product.html?id=" + encodeURIComponent(p.id);
            });
            suggestions.append(item);
        });
        openSuggestions();
    });
//keydown event handler to the search input field
    input.on("keydown", function (e) {
        // Check if the pressed key is the 'Enter' key
        if (e.key === "Enter") {
            e.preventDefault();// Prevent the default action
            const q = $(this).val().trim();
            // Check if the query is not empty
            if (q) {
                window.location.href = "products.html?q=" + encodeURIComponent(q);
            }
        }
    });
//click event handler to the entire document.
    $(document).on("click", function (e) {
        //if the clicked element is NOT within the element with the class '.search-wrapper'
        if (!$(e.target).closest(".search-wrapper").length) {
            closeSuggestions();// If the click was outside the search area, hide the suggestions
        }
    });
}
//runs only after the entire DOM is loaded
$(document).ready(function () {
    //call function to load product data
    loadProducts(function () {
        initSearch();
    });
});
