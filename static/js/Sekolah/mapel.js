document.addEventListener("DOMContentLoaded", () => {

    const modal = document.getElementById("mapel-form-container");
    const btnAdd = document.getElementById("add-mapel-btn");
    const btnCancel = document.getElementById("mapel-cancel");
    const btnSave = document.getElementById("mapel-save");

    const btnClose = modal ? modal.querySelector(".modern-close") : null;

    // === OPEN MODAL ===
    if (btnAdd) {
        btnAdd.addEventListener("click", () => {
            if (!modal) return;
            resetForm();
            modal.classList.add("show");
        });
    }

    // === CLOSE MODAL ===
    if (btnClose) btnClose.addEventListener("click", closeModal);
    if (btnCancel) btnCancel.addEventListener("click", closeModal);
    if (btnSave) btnSave.addEventListener("click", saveMapel);

    function closeModal() {
        if (!modal) return;
        modal.classList.remove("show");
    }

    function resetForm() {
        document.getElementById("mapel-id").value = "";
        document.getElementById("mapel-nama").value = "";
        document.getElementById("mapel-jenis").value = "";
        const jenisDropdownText = document.querySelector("#mapelJenisDropdown .selected-text");
        if (jenisDropdownText) jenisDropdownText.innerText = "Pilih Jenis";
    }

    // === SAVE MAPEL (API) ===
    async function saveMapel() {
        const id = document.getElementById("mapel-id").value;
        const nama = document.getElementById("mapel-nama").value.trim();
        const jenis = document.getElementById("mapel-jenis").value;

        if (!nama || !jenis) {
            alert("Lengkapi data mata pelajaran");
            return;
        }

        try {
            const res = await fetch("/api/mapel/simpan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                body: JSON.stringify({ id: id || null, nama, jenis })
            });
            const data = await res.json();
            if (data.success) {
                closeModal();
                location.reload();
            } else {
                alert(data.message || "Gagal menyimpan data");
            }
        } catch (err) {
            console.error(err);
            alert("Gagal menyimpan data");
        }
    }

    const table = document.getElementById("mapel-table");
    if (table) {
        table.addEventListener("click", async (e) => {
            const editBtn = e.target.closest(".edit-btn");
            const deleteBtn = e.target.closest(".delete-btn");

            if (editBtn) await editMapel(editBtn.dataset.id);
            if (deleteBtn) await hapusMapel(deleteBtn.dataset.id, deleteBtn);
        });
    }

    async function editMapel(id) {
        if (!modal) return;

        const res = await fetch(`/api/mapel/${id}`);
        const data = await res.json();

        document.getElementById("mapel-id").value = data.id;
        document.getElementById("mapel-nama").value = data.nama;
        document.getElementById("mapel-jenis").value = data.jenis;

        const jenisDropdownText = document.querySelector("#mapelJenisDropdown .selected-text");
        if (jenisDropdownText) {
            jenisDropdownText.innerText = data.jenis === "wajib" ? "Wajib" : "Muatan Lokal";
        }

        modal.classList.add("show");
    }

    // =====================
    // CEK TABEL KOSONG MUATAN LOKAL
    // =====================
    function checkEmptyMulok() {
        const tbody = document.querySelector("#mapel-table tbody");
        if (!tbody) return;

        // cari header Muatan Lokal berdasarkan teks
        const headers = tbody.querySelectorAll("tr.group-header");
        let mulokHeader = null;

        headers.forEach(h => {
            if (h.innerText.toLowerCase().includes("muatan lokal")) {
                mulokHeader = h;
            }
        });

        if (!mulokHeader) return;

        // hapus row kosong lama (khusus setelah header ini)
        let next = mulokHeader.nextElementSibling;
        while (next && !next.classList.contains("group-header")) {
            if (next.classList.contains("empty")) {
                const temp = next;
                next = next.nextElementSibling;
                temp.remove();
                continue;
            }
            next = next.nextElementSibling;
        }

        // cek apakah masih ada data
        next = mulokHeader.nextElementSibling;
        let hasMulok = false;

        while (next && !next.classList.contains("group-header")) {
            if (!next.classList.contains("empty")) {
                hasMulok = true;
                break;
            }
            next = next.nextElementSibling;
        }

        // kalau kosong → tampilkan placeholder
        if (!hasMulok) {
            const emptyRow = document.createElement("tr");
            emptyRow.classList.add("empty");
            emptyRow.innerHTML = `
                <td colspan="5" style="text-align:center;">
                    Belum ada muatan lokal
                </td>
            `;

            mulokHeader.after(emptyRow);
        }
    }

    async function hapusMapel(id, deleteBtn) {
        const ok = await showConfirm(
            "Yakin ingin menghapus mata pelajaran ini?",
            "Hapus",
            "btn-danger"
        );

        if (!ok) return;

        try {
            const res = await fetch(`/api/mapel/hapus/${id}`, {
                method: "DELETE",
                headers: { "X-CSRFToken": csrfToken }
            });

            if (res.ok) {
                // hapus row dari tabel
                const row = deleteBtn.closest("tr");
                if (row) row.remove();

                checkEmptyMulok();

                showNotification("Mata pelajaran berhasil dihapus", "success");
            } else {
                showNotification("Gagal menghapus data", "error");
            }

        } catch (err) {
            console.error(err);
            showNotification("Gagal menghapus data", "error");
        }
    }

    checkEmptyMulok();
});