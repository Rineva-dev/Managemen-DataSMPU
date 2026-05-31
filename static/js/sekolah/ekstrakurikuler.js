document.addEventListener("DOMContentLoaded", () => {

    const addBtn = document.getElementById("add-ekskul-btn");
    const modal = document.getElementById("ekskul-form-container");

    const closeBtn = modal?.querySelector(".modern-close");
    const cancelBtn = document.getElementById("ekskul-cancel");

    addBtn?.addEventListener("click", () => {
        modal.classList.add("show");
    });

    closeBtn?.addEventListener("click", () => {
        modal.classList.remove("show");
    });

    cancelBtn?.addEventListener("click", () => {
        modal.classList.remove("show");
    });

    modal?.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("show");
        }
    });

    document.querySelectorAll("#ekskul-form-container .dropdown-option")
    .forEach(option => {

        option.addEventListener("click", () => {

            const dropdown =
                option.closest(".custom-dropdown");

            const hidden =
                dropdown.querySelector("input[type='hidden']");

            const selectedText =
                dropdown.querySelector(".selected-text");

            hidden.value = option.dataset.value;
            selectedText.textContent = option.textContent.trim();

        });

    });

});