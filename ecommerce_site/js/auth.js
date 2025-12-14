/**
 * auth.js
 * ----------------------------
 * Responsible for:
 * - Front-end authentication using the ReqRes demo API
 * - Saving the auth token + email into a cookie
 * - Updating the account link in the header (login vs profile)
 * - Handling:
 *      • Login form (login.html)
 *      • Register form (register.html)
 *      • Profile page (profile.html) using mock data + cookies
 */

const AUTH_COOKIE = "myshop_auth";

function isLoggedIn() {
    return !!readCookie(AUTH_COOKIE);
}

function setAuthToken(token, email) {
    writeCookie(AUTH_COOKIE, JSON.stringify({ token, email }), 7);
    updateAccountLink();
}

function clearAuth() {
    writeCookie(AUTH_COOKIE, "", -1);
    updateAccountLink();
}

function getAuth() {
    const raw = readCookie(AUTH_COOKIE);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function updateAccountLink() {
    const link = $("#account-link");
    if (isLoggedIn()) {
        link.attr("href", "profile.html");
        link.attr("title", "Profile");
    } else {
        link.attr("href", "login.html");
        link.attr("title", "Login");
    }
}

function initLoginPage() {
    const form = $("#login-form");
    if (form.length === 0) return;

    const msg = $("#login-message");
    form.on("submit", function (e) {
        e.preventDefault();
        const email = $("#login-email").val().trim();
        const password = $("#login-password").val().trim();

        msg.text("Logging in...").removeClass("success error").addClass("loading");

        $.ajax({
            url: "https://api.allorigins.win/raw?url=https://reqres.in/api/login",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ email: email, password: password }),


            success: function (response) {
                // Mock API returns { token: "..." } on success
                setAuthToken(response.token, email);
                msg.text("Login successful! Redirecting...").removeClass("error loading").addClass("success");
                window.location.href = "index.html";
            },
            error: function (xhr) {
                const errorMsg = (xhr.responseJSON && xhr.responseJSON.error) 
                                 ? xhr.responseJSON.error 
                                 : "Login failed. Please try a different email or password.";
                msg.text(errorMsg).removeClass("success loading").addClass("error");
            }
        });
    });
}

function initRegisterPage() {
    const form = $("#register-form");
    if (form.length === 0) return;

    const msg = $("#register-message");
    form.on("submit", function (e) {
        e.preventDefault();
        const email = $("#register-email").val().trim();
        const password = $("#register-password").val().trim();

        msg.text("Registering...").removeClass("success error").addClass("loading");

        $.ajax({
            url: "https://api.allorigins.win/raw?url=https://reqres.in/api/register",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({ email: email, password: password }),


            success: function (response) {
                // Mock API returns { id: X, token: "..." } on success
                setAuthToken(response.token, email);
                msg.text("Registration successful! Redirecting to login...").removeClass("error loading").addClass("success");
                
                // For a demo, you often redirect them to log in after a moment
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1500);
            },
            error: function (xhr) {
                const errorMsg = (xhr.responseJSON && xhr.responseJSON.error) 
                                 ? xhr.responseJSON.error 
                                 : "Registration failed. Try a different email (e.g., 'eve.holt@reqres.in' is a known failure case).";
                msg.text(errorMsg).removeClass("success loading").addClass("error");
            }
        });
    });
}

function initProfilePage() {
    const page = $("#profile-page");
    if (page.length === 0) return;

    if (!requireLoginOrRedirect()) return;

    const auth = getAuth();
    const email = auth ? auth.email : "";

    const avatarEl = $("#profile-avatar");
    const nameEl = $("#profile-name");
    const emailEl = $("#profile-email");
    const phoneEl = $("#profile-phone");

    const stored = readCookie("myshop_profile");
    let userProfile = stored ? JSON.parse(stored) : {};

    function renderProfile() {
        nameEl.text(userProfile.name || "");
        emailEl.text(email);
        phoneEl.text(userProfile.phone || "");
        avatarEl.attr("src", userProfile.avatar || "https://reqres.in/img/faces/2-image.jpg");
        $("#profile-name-input").val(userProfile.name || "");
        $("#profile-phone-input").val(userProfile.phone || "");
    }

    $.getJSON("https://corsproxy.io/?https://reqres.in/api/users/2", function (data) {

        const user = data.data;
        if (!userProfile.name) userProfile.name = user.first_name + " " + user.last_name;
        if (!userProfile.avatar) userProfile.avatar = user.avatar;
        if (!userProfile.phone) userProfile.phone = "(555) 000-0000";
        writeCookie("myshop_profile", JSON.stringify(userProfile), 7);
        renderProfile();
    }).fail(function () {
        if (!userProfile.name) userProfile.name = "Demo User";
        if (!userProfile.phone) userProfile.phone = "(555) 000-0000";
        renderProfile();
    });

    $("#profile-form").on("submit", function (e) {
        e.preventDefault();
        userProfile.name = $("#profile-name-input").val().trim();
        userProfile.phone = $("#profile-phone-input").val().trim();
        writeCookie("myshop_profile", JSON.stringify(userProfile), 7);
        renderProfile();
        $("#profile-message").text("Saved to cookie (front-end only).");
    });
}

$(document).ready(function () {
    updateAccountLink();
    initLoginPage();
    initRegisterPage();
    //initProfilePage();
});
