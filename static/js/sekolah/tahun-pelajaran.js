document.addEventListener("DOMContentLoaded", function () {

    const addBtn = document.getElementById("add-tahun-btn");
    if (!addBtn) return;

    const tableBody = document.querySelector("#tahun-table tbody");
    const modal = document.getElementById("tahun-form-container");
    const closeBtn = modal.querySelector(".close");
    const cancelBtn = document.getElementById("tahun-cancel");
    const saveBtn = document.getElementById("tahun-save");

    const tahunPelajaranInput = document.getElementById("tahun-pelajaran-value");
    const tahunOptionsContainer = document.getElementById("tahun-options");

    const semesterInput = document.getElementById("tahun-semester");
    const semesterMulaiInput = document.getElementById("semester-mulai");
    const semesterAkhirInput = document.getElementById("semester-akhir");

    [tahunPelajaranInput, semesterInput].forEach(input => {
        input.addEventListener("input", clearDuplicateError);
    });

    const searchInput = document.getElementById("tahun-search-input");
    const searchBtn = document.getElementById("tahun-search-btn");

    const perPageInput = document.getElementById("tahun-per-page");
    const totalDataSpan = document.getElementById("tahun-total-data");
    const tahunPagination = document.getElementById('tahun-pagination');
    const perPageUp = document.getElementById("perpage-up");
    const perPageDown = document.getElementById("perpage-down");

    let dataTahun = [];
    let editId = null;
    let currentPage = 1;
    let rowMap = new Map();


    /* ===============================
        LOAD DATA DARI BACKEND
    =============================== */
    let isLoading = false;

    async function loadData() {

        if (isLoading) return;
        isLoading = true;

        try {
            const res = await fetch("/api/tahun-pelajaran");
            const newData = await res.json();

            if (!newData) {
                isLoading = false;
                return;
            }

            dataTahun = newData;
            renderTable();

            await loadLatestActivity();

        } catch (err) {
            console.error("Gagal load:", err);
        }

        isLoading = false;
    }

    loadData();
    generateTahunPelajaran();

    function generateTahunPelajaran() {

        const currentYear = new Date().getFullYear();

        const tahunList = [
            `${currentYear - 1}/${currentYear}`,
            `${currentYear}/${currentYear + 1}`
        ];

        tahunOptionsContainer.innerHTML = "";

        tahunList.forEach(tahun => {

            const option = document.createElement("div");
            option.classList.add("dropdown-option");
            option.setAttribute("data-value", tahun);
            option.textContent = tahun;

            option.addEventListener("click", function () {

                tahunPelajaranInput.value = tahun;

                const selectedText = tahunOptionsContainer
                    .closest(".custom-dropdown")
                    .querySelector(".selected-text");

                selectedText.textContent = tahun;
                
                tahunOptionsContainer.style.display = "none";
                setDateRangeByTahun(tahun);
            });

            tahunOptionsContainer.appendChild(option);
        });
    }

    function setDateRangeByTahun(tahunPelajaran) {

        if (!tahunPelajaran) return;

        // Split "2025/2026"
        const [startYear, endYear] = tahunPelajaran.split("/");

        const minDate = `${startYear}-01-01`;
        const maxDate = `${endYear}-12-31`;

        semesterMulaiInput.min = minDate;
        semesterMulaiInput.max = maxDate;

        semesterAkhirInput.min = minDate;
        semesterAkhirInput.max = maxDate;

        // Optional: reset value kalau di luar range
        if (semesterMulaiInput.value &&
            (semesterMulaiInput.value < minDate || semesterMulaiInput.value > maxDate)) {
            semesterMulaiInput.value = "";
        }

        if (semesterAkhirInput.value &&
            (semesterAkhirInput.value < minDate || semesterAkhirInput.value > maxDate)) {
            semesterAkhirInput.value = "";
        }
    }

    /* ===============================
        MODAL CONTROL
    =============================== */

    function openModal() {
        modal.classList.add("show");
    }

    function closeModal() {
        modal.classList.remove("show");
        resetForm();
        editId = null;
    }

    document.getElementById("add-tahun-btn")
        .addEventListener("click", openModal);

    document.querySelector("#tahun-form-container .close")
        .addEventListener("click", closeModal);

    document.getElementById("tahun-cancel")
        .addEventListener("click", closeModal);

    addBtn.addEventListener("click", () => {
        editId = null;
        document.getElementById("tahun-form-title").innerText = "Tambah Tahun Pelajaran";
        openModal();
    });

    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);

    function isDuplicateTahunSemester(tahunPelajaran, semester) {
        return dataTahun.some(item => {

            if (editId && item.id === editId) return false;

            return (
                item.tahun_pelajaran === tahunPelajaran &&
                item.semester === semester
            );
        });
    }

    function setDuplicateError() {
        tahunPelajaranInput.classList.add("input-error");
        semesterInput.classList.add("input-error");
    }

    function clearDuplicateError() {
        tahunPelajaranInput.classList.remove("input-error");
        semesterInput.classList.remove("input-error");
    }
    
    /* ===============================
        SAVE DATA (POST / PUT)
    =============================== */
    saveBtn.addEventListener("click", async function () {

        const tahunPelajaran = tahunPelajaranInput.value;
        const semester = semesterInput.value;
        const semesterMulai = semesterMulaiInput.value;
        const semesterAkhir = semesterAkhirInput.value;

        if (!tahunPelajaran || !semester || !semesterMulai || !semesterAkhir) {
            alert("Semua field wajib diisi!");
            return;
        }

        if (semesterMulai >= semesterAkhir) {
            showNotification("Tanggal berakhir harus setelah tanggal mulai!", "error");
            return;
        }

        if (isDuplicateTahunSemester(tahunPelajaran, semester)) {
            setDuplicateError();
            showNotification("Tahun pelajaran dan semester sudah ada!", "error");
            return;
        }

        const payload = {
            tahun_pelajaran: tahunPelajaran,
            semester: semester,
            semester_mulai: semesterMulai,
            semester_akhir: semesterAkhir
        };

        try {

            const response = editId
                ? await fetch(`/api/tahun-pelajaran/${editId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
                    body: JSON.stringify(payload)
                })
                : await fetch("/api/tahun-pelajaran", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-CSRFToken": csrfToken },
                    body: JSON.stringify(payload)
                });

            await response.json();

            await loadData();
            closeModal();

        } catch (err) {
            console.error("Gagal simpan:", err);
        }

    });

    function formatTanggalIndonesia(tanggalString) {
        const [year, month, day] = tanggalString.split("-");
        const tanggal = new Date(year, month - 1, day);

        return tanggal.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    /* ===============================
        LOAD LATEST ACTIVITY
    =============================== */
    async function loadLatestActivity() {

        try {
            const res = await fetch("/api/activity/tahun-pelajaran/latest");

            if (!res.ok) return;

            const data = await res.json();

            const activityElement = document.getElementById("info-activity");

            if (!activityElement) return;

            if (!data || !data.activity) {
                activityElement.textContent = "-";
                return;
            }

            activityElement.textContent = data.activity;

        } catch (err) {
            console.error("Gagal load activity:", err);
        }
    }

    /* ===============================
        RENDER TABLE
    =============================== */
    function renderTable(filteredData = null) {

        const perPage = parseInt(perPageInput.value) || 10;
        const data = filteredData !== null ? filteredData : dataTahun;

        totalDataSpan.innerText = data.length;

        const totalPages = Math.ceil(data.length / perPage);
        if (currentPage > totalPages) currentPage = 1;

        const start = (currentPage - 1) * perPage;
        const end = start + perPage;
        const pageData = data.slice(start, end);

        // 🔴 SELALU RESET TABLE
        tableBody.innerHTML = "";

        if (data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;">
                        Data tidak ditemukan
                    </td>
                </tr>
            `;
            renderPagination(0);
            updateSummary([]);
            return;
        }

        pageData.forEach((item, index) => {

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${start + index + 1}</td>
                <td>${item.tahun_pelajaran}</td>
                <td>${item.semester}</td>
                <td>${formatTanggalIndonesia(item.semester_mulai)}</td>
                <td>${formatTanggalIndonesia(item.semester_akhir)}</td>
                <td>${item.status}</td>
                <td class="action-cell">
                    <button class="action-btn edit-btn">
                        <i data-lucide="pencil"></i>
                    </button>
                    <button class="action-btn delete-btn">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            `;

            const editBtn = tr.querySelector(".edit-btn");
            const deleteBtn = tr.querySelector(".delete-btn");

            editBtn.onclick = function () {
                editId = item.id;
                document.getElementById("tahun-form-title").innerText = "Edit Tahun Pelajaran";

                tahunPelajaranInput.value = item.tahun_pelajaran;
                semesterInput.value = item.semester;
                semesterMulaiInput.value = item.semester_mulai;
                semesterAkhirInput.value = item.semester_akhir;

                tahunPelajaranInput.closest(".custom-dropdown")
                    .querySelector(".selected-text").textContent = item.tahun_pelajaran;

                semesterInput.closest(".custom-dropdown")
                    .querySelector(".selected-text").textContent = item.semester;

                tahunPelajaranInput.disabled = true;
                semesterInput.disabled = true;
                setDateRangeByTahun(item.tahun_pelajaran);
                openModal();
            };

            deleteBtn.onclick = async function () {

                if (item.status === "Aktif") {
                    showNotification(
                        "Tahun pelajaran sedang <strong>Aktif</strong>. Data tidak bisa dihapus.",
                        "error"
                    );
                    return;
                }

                const confirmed = await showConfirm(
                    `Yakin ingin menghapus <strong>${item.tahun_pelajaran} - Semester ${item.semester}</strong>?`
                );

                if (!confirmed) return;

                try {
                    const response = await fetch(`/api/tahun-pelajaran/${item.id}`, {
                        method: "DELETE",
                        headers: {
                            "X-CSRFToken": csrfToken
                        }
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        showNotification(result.error || "Gagal menghapus data", "error");
                        return;
                    }

                    showNotification("Data berhasil dihapus", "success");
                    await loadData();

                } catch (err) {
                    showNotification("Terjadi kesalahan server", "error");
                }
            };

            tableBody.appendChild(tr);
        });

        if (window.lucide) {
            lucide.createIcons();
        }

        renderPagination(totalPages);
        updateSummary(data);
    }

    function formatTanggalJamIndonesia(datetimeString) {

        if (!datetimeString) {
            return { tanggal: "-", jam: "" };
        }

        const dateObj = new Date(datetimeString); // LANGSUNG PAKAI ISO STRING

        if (isNaN(dateObj.getTime())) {
            return { tanggal: "-", jam: "" };
        }

        const tanggal = dateObj.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });

        const jam = dateObj.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });

        return {
            tanggal: tanggal,
            jam: jam + " WITA"
        };
    }

    function updateSummary(data) {
        const totalElement = document.getElementById("info-total");
        const tahunElement = document.getElementById("info-aktif");
        const semesterElement = document.getElementById("info-semester");
        const statusBadge = document.getElementById("summary-status");
        const dateDiv = document.querySelector(".info-update");
        const timeDiv = document.querySelector(".update-time");
        const userElement = document.getElementById("info-user");

        if (!totalElement || !tahunElement || !semesterElement || !statusBadge) {
            console.log("Element summary tidak lengkap");
            return;
        }

        totalElement.textContent = data.length;

        if (!data || data.length === 0) {
            tahunElement.textContent = "-";
            semesterElement.textContent = "-";
            statusBadge.textContent = "Nonaktif";
            statusBadge.classList.remove("active");

            if (dateDiv) dateDiv.textContent = "-";
            if (timeDiv) timeDiv.textContent = "";
            if (userElement) userElement.textContent = "-";
            return;
        }

        // Cari yang aktif
        const aktif = data.find(d =>
            d.status && d.status.toLowerCase() === "aktif"
        );

        if (aktif) {
            tahunElement.textContent = aktif.tahun_pelajaran;
            semesterElement.textContent = "Semester " + aktif.semester;

            statusBadge.textContent = "Aktif";
            statusBadge.classList.add("active");

            const formatted = formatTanggalJamIndonesia(aktif.updated_at);

            if (dateDiv) dateDiv.textContent = formatted.tanggal;
            if (timeDiv) timeDiv.textContent = formatted.jam;
            if (userElement) userElement.textContent = aktif.updated_by || "-";
        } else {
            tahunElement.textContent = "-";
            semesterElement.textContent = "-";
            statusBadge.textContent = "Nonaktif";
            statusBadge.classList.remove("active");

            if (dateDiv) dateDiv.textContent = "-";
            if (timeDiv) timeDiv.textContent = "";
            if (userElement) userElement.textContent = "-";
        }
    }

    /* ===============================
        PAGINATION
    =============================== */
    function renderPagination(totalPages) {
        tahunPagination.innerHTML = '';

        const prev = document.createElement('button');
        prev.textContent = 'Prev';
        prev.disabled = currentPage === 1;
        prev.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
        tahunPagination.appendChild(prev);

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = i === currentPage ? 'active' : '';
            btn.addEventListener('click', () => {
                currentPage = i;
                renderTable();
            });
            tahunPagination.appendChild(btn);
        }

        const next = document.createElement('button');
        next.textContent = 'Next';
        next.disabled = currentPage === totalPages;
        next.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
        tahunPagination.appendChild(next);
    }

    perPageUp.addEventListener("click", function () {
        perPageInput.stepUp();
        currentPage = 1;
        renderTable();
    });

    perPageDown.addEventListener("click", function () {
        if (perPageInput.value > 1) {
            perPageInput.stepDown();
            currentPage = 1;
            renderTable();
        }
    });

    /* ===============================
        SEARCH
    =============================== */
    searchBtn.addEventListener("click", function () {

        const keyword = searchInput.value.trim().toLowerCase();

        if (!keyword) {
            currentPage = 1;
            renderTable(); // tampilkan semua
            return;
        }

        const filtered = dataTahun.filter(item =>
            (item.tahun_pelajaran || "").toLowerCase().includes(keyword) ||
            (item.semester || "").toLowerCase().includes(keyword) ||
            (item.status || "").toLowerCase().includes(keyword)
        );

        currentPage = 1;
        renderTable(filtered);
    });

    searchInput.addEventListener("keyup", function (e) {
        if (e.key === "Enter") {
            searchBtn.click();
        }
    });

    /* ===============================
        UTIL
    =============================== */
    function resetForm() {
        tahunPelajaranInput.value = "";
        semesterInput.value = "";
        semesterMulaiInput.value = "";
        semesterAkhirInput.value = "";

        semesterMulaiInput.removeAttribute("min");
        semesterMulaiInput.removeAttribute("max");
        semesterAkhirInput.removeAttribute("min");
        semesterAkhirInput.removeAttribute("max");

        tahunPelajaranInput.disabled = false;
        semesterInput.disabled = false;

        tahunPelajaranInput.closest(".custom-dropdown")
            .classList.remove("dropdown-disabled");

        semesterInput.closest(".custom-dropdown")
            .classList.remove("dropdown-disabled");

        // Reset masing-masing dropdown sesuai defaultnya
        tahunPelajaranInput.closest(".custom-dropdown")
            .querySelector(".selected-text").textContent = "Pilih Tahun Pelajaran";

        semesterInput.closest(".custom-dropdown")
            .querySelector(".selected-text").textContent = "Pilih Semester";
    }

    perPageInput.addEventListener("change", function () {
        currentPage = 1;
        renderTable();
    });

    document.querySelectorAll(".dropdown-selected").forEach(selected => {
        selected.addEventListener("click", function (e) {

            const wrapper = this.closest(".custom-dropdown");
            if (wrapper.classList.contains("dropdown-disabled")) {
                return;
            }

            e.stopPropagation();

            const currentOptions = this.nextElementSibling;

            // Tutup semua dropdown dulu
            document.querySelectorAll(".dropdown-options").forEach(options => {
                if (options !== currentOptions) {
                    options.style.display = "none";
                }
            });

            // Toggle dropdown yang diklik
            currentOptions.style.display =
                currentOptions.style.display === "block" ? "none" : "block";
        });
    });

    document.addEventListener("click", function (e) {
        document.querySelectorAll(".custom-dropdown").forEach(dropdown => {

            if (!dropdown.contains(e.target)) {
                const options = dropdown.querySelector(".dropdown-options");
                if (options) options.style.display = "none";
            }
        });
    });

    // Handle klik option semua dropdown
    document.querySelectorAll(".dropdown-option").forEach(option => {
        option.addEventListener("click", function () {

            const value = this.getAttribute("data-value");
            const dropdown = this.closest(".custom-dropdown");
            const selectedText = dropdown.querySelector(".selected-text");
            const hiddenInput = dropdown.querySelector("input");

            // Set value
            if (hiddenInput) hiddenInput.value = value;
            if (selectedText) selectedText.textContent = this.textContent;

            // Tutup dropdown
            this.parentElement.style.display = "none";
        });
    });

});