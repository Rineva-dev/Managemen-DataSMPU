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

    const saveBtn = document.getElementById("ekskul-save");

    saveBtn?.addEventListener("click", async () => {

        const nama = document.getElementById("ekskul-nama").value.trim();
        const pembina_id = document.getElementById("ekskul-pembina").value;
        const hari = document.getElementById("ekskul-hari").value.trim();
        const tahun_id = document.getElementById("ekskul-tahun-id").value;

        if (!nama) {
            alert("Nama ekstrakurikuler wajib diisi");
            return;
        }

        const res = await fetch(
            "/sekolah/ekstrakurikuler/create",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCookie("csrf_token")
                },
                body: JSON.stringify({
                    nama,
                    pembina_id,
                    hari,
                    tahun_id
                })
            }
        );

        const data = await res.json();

        if (data.success) {
            alert("Ekstrakurikuler berhasil disimpan");
            location.reload();
        } else {
            alert(data.message || "Gagal menyimpan");
        }
    });

});