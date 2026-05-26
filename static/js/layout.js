// ==========================================
// LAYOUT.JS
// Header Dropdown + Logout + Sidebar
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
    // ==========================
    // USER DROPDOWN
    // ==========================
    const dropbtn = document.querySelector(".dropbtn");
    const userDropdown = document.querySelector(".user-dropdown");
    const dropdownContent = document.querySelector(".dropdown-content");

    if (dropbtn && dropdownContent) {

        dropbtn.addEventListener("click", function (e) {
            e.stopPropagation();
            dropdownContent.classList.toggle("show");
        });

        window.addEventListener("click", function (e) {
            if (!userDropdown.contains(e.target)) {
                dropdownContent.classList.remove("show");
            }
        });

    }

    // ==========================
    // LOGOUT HEADER
    // ==========================
    const logoutBtn = document.querySelector(".logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function (e) {
            e.preventDefault();
            localStorage.removeItem("activeMenu");
            localStorage.removeItem("sekolahMenuOpen"); // ← TAMBAHKAN INI
            document.documentElement.classList.remove("sekolah-open");
            window.location.href = "/logout";
        });
    }

    // ==========================
    // LOGOUT SIDEBAR (kalau ada)
    // ==========================
    const sidebarLogoutBtn = document.querySelector(".logout-btn");
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener("click", function (e) {
            e.preventDefault();
            localStorage.removeItem("activeMenu");
            localStorage.removeItem("sekolahMenuOpen");
            window.location.href = "/logout";
        });
    }

    const toggleBtn = document.getElementById("sidebarToggle");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebar-overlay");

    if (!toggleBtn || !sidebar || !overlay) return;

    // Toggle sidebar
    toggleBtn.addEventListener("click", function () {

        sidebar.classList.toggle("active");
        overlay.classList.toggle("active");

    });

    // Klik overlay → tutup sidebar
    overlay.addEventListener("click", function () {

        console.log("OVERLAY CLICKED"); // debug

        sidebar.classList.remove("active");
        overlay.classList.remove("active");

    });

    let touchStartX = 0;
    let touchEndX = 0;

    sidebar.addEventListener("touchstart", e => {
        touchStartX = e.changedTouches[0].screenX;
    });

    sidebar.addEventListener("touchend", e => {

        touchEndX = e.changedTouches[0].screenX;

        const swipeDistance = touchStartX - touchEndX;

        if (swipeDistance > 80) {

            sidebar.classList.remove("active");
            overlay.classList.remove("active");

        }

    });

});