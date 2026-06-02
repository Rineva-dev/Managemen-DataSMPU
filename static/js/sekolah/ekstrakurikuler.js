let selectedEkskulId = null;
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

        try {

            const res = await fetch(
                "/sekolah/ekstrakurikuler/create",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrfToken
                    },
                    body: JSON.stringify({
                        nama,
                        pembina_id,
                        hari,
                        tahun_id
                    })
                }
            );

            const text = await res.text();

            let data;

            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("Response bukan JSON:", text);
                showNotification("Server error", "error");
                return;
            }

            if (data.success) {

                showNotification(
                    "Ekstrakurikuler berhasil disimpan",
                    "success"
                );

                modal.classList.remove("show");

                const tbody =
                    document.querySelector("#ekskul-table tbody");

                const newRow =
                    document.createElement("tr");

                newRow.dataset.id = data.id;

                const nomor =
                    tbody.querySelectorAll("tr").length + 1;

                newRow.innerHTML = `
                    <td>${nomor}</td>
                    <td>${nama}</td>
                    <td>${hari}</td>
                    <td>0</td>
                `;

                tbody.appendChild(newRow);

                attachRowClick(newRow);

            } else {

                showNotification(
                    data.message || "Gagal menyimpan",
                    "error"
                );

            }

        } catch (err) {

            console.error(err);

            showNotification(
                "Terjadi kesalahan server",
                "error"
            );

        }
    });

    function attachRowClick(row) {

        row.addEventListener("click", () => {

            document.querySelectorAll("#ekskul-table tbody tr")
                .forEach(r => r.classList.remove("selected"));

            row.classList.add("selected");

            selectedEkskulId = row.dataset.id;

            document.getElementById("edit-ekskul-btn").disabled = false;
            document.getElementById("anggota-ekskul-btn").disabled = false;
            document.getElementById("jadwal-ekskul-btn").disabled = false;
            document.getElementById("delete-ekskul-btn").disabled = false;

            loadEkskulDetail(selectedEkskulId);
        });
    }

    async function loadEkskulDetail(ekskulId) {

        const tbody =
            document.getElementById("detail-anggota-body");

        const title =
            document.getElementById("ekskul-detail-title");

        const res = await fetch(
            `/sekolah/ekstrakurikuler/${ekskulId}/siswa`
        );

        const data = await res.json();

        tbody.innerHTML = "";

        if (!data.length) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty">
                        Belum ada anggota
                    </td>
                </tr>
            `;

            return;
        }

        let html = "";

        data.forEach((siswa, index) => {

            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${siswa.nisn || "-"}</td>
                    <td>${siswa.nama}</td>
                    <td>
                        ${siswa.tingkat || ""}
                        ${siswa.sub_kelas || ""}
                    </td>
                </tr>
            `;

        });

        tbody.innerHTML = html;

        const selectedRow =
            document.querySelector(
                `#ekskul-table tr[data-id="${ekskulId}"] td:nth-child(2)`
            );

        if (selectedRow) {
            title.textContent =
                selectedRow.textContent.trim();
        }
    }

    document.querySelectorAll("#ekskul-table tbody tr")
        .forEach(attachRowClick);

    document
    .getElementById("edit-ekskul-btn")
    ?.addEventListener("click", async () => {

        if (!selectedEkskulId) return;

        const res = await fetch(
            `/sekolah/ekstrakurikuler/detail/${selectedEkskulId}`
        );

        const data = await res.json();

        if (!data.success) return;

        document.getElementById("ekskul-id").value =
            data.ekskul.id;

        document.getElementById("ekskul-nama").value =
            data.ekskul.nama;

        document.getElementById("ekskul-hari").value =
            data.ekskul.hari;

        document.getElementById("ekskul-pembina").value =
            data.ekskul.pembina_id;

        modal.classList.add("show");
    });

    document
    .getElementById("delete-ekskul-btn")
    ?.addEventListener("click", async () => {

        if (!selectedEkskulId) return;

        if (!confirm("Hapus ekstrakurikuler ini?")) {
            return;
        }

        const res = await fetch(
            `/sekolah/ekstrakurikuler/delete/${selectedEkskulId}`,
            {
                method: "POST",
                headers: {
                    "X-CSRFToken": csrfToken
                }
            }
        );

        const data = await res.json();

        if (data.success) {

            const row = document.querySelector(
                `#ekskul-table tr[data-id="${selectedEkskulId}"]`
            );

            if (row) row.remove();

            selectedEkskulId = null;

            document.getElementById("edit-ekskul-btn").disabled = true;
            document.getElementById("anggota-ekskul-btn").disabled = true;
            document.getElementById("jadwal-ekskul-btn").disabled = true;
            document.getElementById("delete-ekskul-btn").disabled = true;

            showNotification("Ekstrakurikuler dihapus", "success");
        } else {
            alert(data.message);
        }

    });

    const anggotaModal = document.getElementById("anggota-ekskul-modal");

    document.getElementById("anggota-ekskul-btn")?.addEventListener("click", async () => {

        if (!selectedEkskulId) return;

        const res = await fetch(
            `/sekolah/ekstrakurikuler/anggota/${selectedEkskulId}`
        );

        const data = await res.json();

        anggotaEkskul = [...data.anggota];
        allSiswaAvailable = [...data.available];

        renderAnggota(data.anggota);
        renderSiswa(data.available);

        anggotaModal.classList.add("show");

    });

    anggotaModal
    ?.querySelector(".modal-close-btn")
    ?.addEventListener("click", () => {

        anggotaModal.classList.remove("show");

    });

    document
    .querySelectorAll(".close-rombel")
    .forEach(btn => {

        btn.addEventListener("click", () => {
            anggotaModal.classList.remove("show");
        });

    });

    let anggotaEkskul = [];
    let allSiswaAvailable = [];

    function renderSiswa(data){

        const container =
            document.getElementById("siswa-available-list");

        let html = "";

        data.forEach(siswa => {

            html += `
                <div class="anggota-item">
                    <input
                        type="checkbox"
                        value="${siswa.id}">

                    <label>
                        ${siswa.nisn || "-"} - ${siswa.nama}
                    </label>
                </div>
            `;
        });

        container.innerHTML = html;

        document.getElementById("available-count")
            .textContent = `${data.length} siswa`;
    }

    function renderAnggota(data){

        const container =
            document.getElementById("anggota-ekskul-list");

        let html = "";

        data.forEach(siswa => {

            html += `
                <div class="anggota-item">
                    <input
                        type="checkbox"
                        value="${siswa.id}">

                    <label>
                        ${siswa.nisn || "-"} - ${siswa.nama}
                    </label>
                </div>
            `;
        });

        container.innerHTML = html;

        document.getElementById("anggota-count")
            .textContent = `${data.length} siswa`;
    }

    document
    .getElementById("btn-tambah-anggota")
    ?.addEventListener("click", () => {

        const checked = document.querySelectorAll(
            "#siswa-available-list input:checked"
        );

        if (!checked.length) return;

        checked.forEach(cb => {

            const id = Number(cb.value);

            const siswa = allSiswaAvailable.find(
                s => Number(s.id) === id
            );

            if (!siswa) return;

            anggotaEkskul.push(siswa);

            allSiswaAvailable =
                allSiswaAvailable.filter(
                    s => Number(s.id) !== id
                );

        });

        renderAnggota(anggotaEkskul);
        renderSiswa(allSiswaAvailable);

    });

    document
    .getElementById("btn-hapus-anggota")
    ?.addEventListener("click", () => {

        const checked = document.querySelectorAll(
            "#anggota-ekskul-list input:checked"
        );

        if (!checked.length) return;

        checked.forEach(cb => {

            const id = Number(cb.value);

            const siswa = anggotaEkskul.find(
                s => Number(s.id) === id
            );

            if (!siswa) return;

            allSiswaAvailable.push(siswa);

            anggotaEkskul =
                anggotaEkskul.filter(
                    s => Number(s.id) !== id
                );

        });

        renderAnggota(anggotaEkskul);
        renderSiswa(allSiswaAvailable);

    });

    document
    .getElementById("save-ekskul-anggota")
    ?.addEventListener("click", async () => {

        const siswaIds =
            anggotaEkskul.map(s => s.id);

        const res = await fetch(
            "/sekolah/ekstrakurikuler/update-anggota",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                body: JSON.stringify({
                    ekskul_id: selectedEkskulId,
                    siswa_ids: siswaIds
                })
            }
        );

        const data = await res.json();

        if (data.success) {

            showNotification("Anggota berhasil diperbarui", "success");

            anggotaModal.classList.remove("show");

            loadEkskulDetail(selectedEkskulId);

        } else {

            showNotification("Gagal menyimpan", "error");

        }

    });

    let searchTimer;

    document
    .getElementById("search-siswa-ekskul")
    ?.addEventListener("input", function(){

        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {

            const keyword =
                this.value.toLowerCase();

            if (!keyword) {
                renderSiswa(allSiswaAvailable);
                return;
            }

            const filtered =
                allSiswaAvailable.filter(siswa => {

                    return (
                        (siswa.nama || "")
                            .toLowerCase()
                            .includes(keyword)

                        ||

                        (siswa.nisn || "")
                            .toLowerCase()
                            .includes(keyword)
                    );

                });

            renderSiswa(filtered);

        }, 200);

    });

});