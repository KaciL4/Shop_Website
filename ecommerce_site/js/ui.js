/**
 * ui.js
 * ---------
 * Handles small global UI behaviours:
 * - Sets the current year in the footer
 * - Applies dark mode toggle using a CSS class and localStorage
 * - Runs the simple hero slider on the home page
 */
// Use the jQuery library shorthand to ensure the code runs only after the entire DOM is loaded and ready.
$(document).ready(function () {
    // Footer year
    $("#year").text(new Date().getFullYear());

    // Dark mode functionality section
    const DARK_KEY = "myshop_dark";
    const savedDark = localStorage.getItem(DARK_KEY);
    //Check if the saved value is equal to the string "1" (indicating dark mode was previously enabled)
    if (savedDark === "1") {
        $("body").addClass("dark");
    }
    $("#dark-mode-toggle").on("click", function () {
        $("body").toggleClass("dark");
        localStorage.setItem(DARK_KEY, $("body").hasClass("dark") ? "1" : "0");
    });

    // Simple hero slider
    const slides = $(".hero-slide");
    // Newsletter form: prevent real submit and show a simple demo message
    const newsletter = $("#newsletter-form");
    // Check if the newsletter form element exists on the current page.
    if (newsletter.length) {
        // If the form exists
        newsletter.on("submit", function (e) {
            e.preventDefault();// Prevent the browser's default form submission action
            const email = $("#newsletter-email").val().trim();// Get the value of the email input field, remove leading/trailing whitespace, and store it.
            if (!email) {
                alert("Please enter an email address.");
            } else {
                // If not empty, display a success message, noting that this is a demo and no real email is sent.
                alert("Thanks for subscribing! (Demo only, no real emails will be sent.)");
            }
        });
    }
// Check if any hero slides were found on the page.
    if (slides.length > 0) {
        let idx = 0;
        // Set up a function to execute repeatedly every 4000 milliseconds (4 seconds)
        setInterval(function () {
            slides.removeClass("active");
            idx = (idx + 1) % slides.length;
            slides.eq(idx).addClass("active");
        }, 4000);
    }
});
// Function to read the value of a specific cookie by its name.
function readCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    // Loop through each cookie string in the array
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    // If the loop completes without finding a matching cookie, return null.
    return null;
}
// Function to set (write) a cookie with a name, value, and an optional expiration duration in days.
function writeCookie(name, value, days) {
    let expires = "";
    // Check if the 'days' parameter was provided
    if (days) {
        // Create a new Date object for the current time.
        const date = new Date();
        // Set the date's time to the current time plus the calculated number of milliseconds for the given days.
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    // Set the document.cookie: concatenate the name, value, expires string, and a required path attribute.
    document.cookie = name + "=" + value + expires + "; path=/";
}

