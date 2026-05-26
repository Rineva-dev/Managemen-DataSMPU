// ==========================================
// DROPDOWN.JS
// Custom Dropdown (Reusable)
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    const dropdowns = document.querySelectorAll(".custom-dropdown");

    // Kalau tidak ada custom dropdown, hentikan
    if (!dropdowns.length) return;

    function closeAllDropdowns() {
        dropdowns.forEach(d => {
            d.classList.remove("open");
        });
    }

    dropdowns.forEach(dropdown => {

        const selected =
            dropdown.querySelector(".selected") ||
            dropdown.querySelector(".dropdown-selected");

        const optionsContainer =
            dropdown.querySelector(".options") ||
            dropdown.querySelector(".dropdown-options");

        const options =
            dropdown.querySelectorAll(".option, .dropdown-option");

        const selectedText = dropdown.querySelector(".selected-text");
        const hiddenInput = dropdown.querySelector("input[type='hidden']");

        if (!selected || !optionsContainer) return;

        // Klik untuk buka/tutup
        selected.addEventListener("click", function (e) {
            e.stopPropagation();

            // Tutup yang lain dulu
            closeAllDropdowns();

            dropdown.classList.toggle("open");
        });

        // Pilih option
        options.forEach(option => {
            option.addEventListener("click", function () {

                const value = option.getAttribute("data-value");
                const label = option.textContent;

                if (selectedText) {
                    selectedText.textContent = label;
                } else {
                    selected.textContent = label;
                }
                if(hiddenInput){
                    hiddenInput.value = value;
                }
                dropdown.setAttribute("data-selected", value);

                dropdown.classList.remove("open");

                // Trigger event custom kalau mau dipakai dashboard
                dropdown.dispatchEvent(new Event("change"));
            });
        });

    });

    // Klik luar → tutup semua
    window.addEventListener("click", function () {
        closeAllDropdowns();
    });

    // ============================
    // SET VALUE SAAT EDIT
    // ============================

    dropdowns.forEach(dropdown => {

        const hiddenInput = dropdown.querySelector("input[type='hidden']");
        const selectedText = dropdown.querySelector(".selected-text");
        const options = dropdown.querySelectorAll(".dropdown-option");

        if(hiddenInput && hiddenInput.value){

            options.forEach(option => {

                if(option.dataset.value == hiddenInput.value){

                    if(selectedText){
                        selectedText.textContent = option.textContent;
                    }

                }

            });

        }

    });

});

