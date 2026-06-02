// ==========================================
// PEMBAYARAN SISWA
// pembayaran-siswa.js
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    // =========================
    // ELEMENT
    // =========================
    const addBtn = document.getElementById("add-pembayaran-btn");
    const modal = document.getElementById("pembayaran-form-container");
    const closeBtn = modal?.querySelector(".close");
    const cancelBtn = modal?.querySelector(".btn-cancel");

    const inputCariSiswa = document.getElementById("input-cari-siswa");
    const hasilSiswa = document.getElementById("hasil-siswa");

    const detailSiswa = document.getElementById("detail-siswa");
    const detailNisn = document.getElementById("detail-nisn");
    const detailNama = document.getElementById("detail-nama");
    const detailKelas = document.getElementById("detail-kelas");

    const jenisPembayaran = document.getElementById("jenis-pembayaran");
    const bulanBayar = document.getElementById("bulan-bayar");
    const tanggalBayar = document.getElementById("tanggal-bayar");
    const nominalBayar = document.getElementById("nominal-bayar");

    const saveBtn = document.getElementById("pembayaran-save");

    const tableBody = document.querySelector("#pembayaran-table tbody");
    const searchInput = document.getElementById("pembayaran-search-input");
    const bayarPerPageInput = document.getElementById("pembayaran-per-page");
    const totalDataSpan = document.getElementById("pembayaran-total-data");
    const perPageUp = document.getElementById("perpage-up");
    const perPageDown = document.getElementById("perpage-down");

    let selectedSiswa = null;
    let allData = [];
    let currentPage = 1;
    let perPage = parseInt(bayarPerPageInput?.value) || 10;

    // =========================
    // MODAL HANDLER
    // =========================
    addBtn?.addEventListener("click", () => {
        resetForm();
        modal.classList.add("show");
    });

    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);

    function showMenu(menu) {

        const pembayaran = document.getElementById("pembayaran-siswa-content");
        const riwayat = document.getElementById("riwayat-pembayaran-content");

        if (menu === "pembayaran") {
            pembayaran.style.display = "block";
            riwayat.style.display = "none";
        }

        if (menu === "riwayat") {
            pembayaran.style.display = "none";
            riwayat.style.display = "block";
        }
    }

    function closeModal() {
        modal.classList.remove("show");
    }

    function resetForm() {
        inputCariSiswa.value = "";
        hasilSiswa.innerHTML = "";
        detailSiswa.style.display = "none";
        selectedSiswa = null;
        bulanBayar.value = "";
        tanggalBayar.value = "";
        nominalBayar.value = "";
    }

    // =========================
    // AUTOCOMPLETE SISWA
    // =========================
    let searchTimeout;

    inputCariSiswa?.addEventListener("input", () => {
        const keyword = inputCariSiswa.value.trim();

        clearTimeout(searchTimeout);

        if (keyword.length < 1) {
            hasilSiswa.innerHTML = "";
            return;
        }

        searchTimeout = setTimeout(() => {
            fetch(`/api/siswa/search?q=${encodeURIComponent(keyword)}`)
                .then(res => res.json())
                .then(renderHasilSiswa)
                .catch(err => console.error(err));
        }, 300);
    });

    function renderHasilSiswa(data) {
        hasilSiswa.innerHTML = "";

        if (!data.length) {
            hasilSiswa.innerHTML = `<div class="search-empty">Siswa tidak ditemukan</div>`;
            return;
        }

        data.forEach(siswa => {
            const div = document.createElement("div");
            div.className = "search-item";
            div.textContent = `${siswa.nisn} - ${siswa.nama}`;

            div.addEventListener("click", () => pilihSiswa(siswa));
            hasilSiswa.appendChild(div);
        });
    }

    function pilihSiswa(siswa) {
        selectedSiswa = siswa;

        inputCariSiswa.value = `${siswa.nisn} - ${siswa.nama}`;
        hasilSiswa.innerHTML = "";

        detailNisn.textContent = siswa.nisn;
        detailNama.textContent = siswa.nama;
        detailKelas.textContent = `${siswa.tingkat} - ${siswa.rombel}`;

        detailSiswa.style.display = "block";
    }

    document.addEventListener("click", function (e) {
        if (!e.target.closest(".autocomplete-wrapper")) {
            hasilSiswa.innerHTML = "";
        }
    });

    // =========================
    // SIMPAN PEMBAYARAN
    // =========================
    saveBtn?.addEventListener("click", () => {
        if (!selectedSiswa) {
            alert("Pilih siswa terlebih dahulu");
            return;
        }

        if (!bulanBayar.value || !tanggalBayar.value || !nominalBayar.value) {
            alert("Lengkapi data pembayaran");
            return;
        }

        const payload = {
            nisn: selectedSiswa.nisn,
            jenis: jenisPembayaran.value,
            bulan: bulanBayar.value,
            tanggal: tanggalBayar.value,
            nominal: nominalBayar.value.replace(/[^0-9]/g, "")
        };

        const headers = {
            "Content-Type": "application/json"
        };

        if (typeof csrfToken !== "undefined") {
            headers["X-CSRFToken"] = csrfToken;
        }

        fetch("/api/pembayaran/simpan", {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        })
            .then(res => {
                if (!res.ok) throw new Error("Gagal menyimpan");
                return res.json();
            })
            .then(() => {
                closeModal();
                loadTable();

                if (selectedSiswa) {
                    bukaRiwayatPembayaran(
                        selectedSiswa.nisn,
                        selectedSiswa.nama,
                        `${selectedSiswa.tingkat} - ${selectedSiswa.rombel}`
                    );
                }
            })
            .catch(err => alert(err.message));
    });

    // =========================
    // LOAD TABLE SISWA
    // =========================
    function loadTable(keyword = "") {
        fetch(`/api/pembayaran/siswa?search=${encodeURIComponent(keyword)}`, {
            credentials: "include"
        })
            .then(res => {
                if (!res.ok) throw new Error("Gagal load");
                return res.json();
            })
            .then(data => {
                allData = Array.isArray(data) ? data : [];
                renderTable();
                lucide?.createIcons();
            })
            .catch(err => console.error(err));
    }

    function renderTable() {
        tableBody.innerHTML = "";

        const totalData = allData.length;

        if (totalDataSpan) {
            totalDataSpan.textContent = totalData;
        }

        const totalPages = Math.ceil(totalData / perPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;

        if (!totalData) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;">
                        Tidak ada data
                    </td>
                </tr>
            `;
            renderPagination(); // tetap render (biar bersih)
            return;
        }

        const start = (currentPage - 1) * perPage;
        const end = start + perPage;
        const pageData = allData.slice(start, end);

        pageData.forEach((row, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${start + index + 1}</td>
                <td>${row.nisn}</td>
                <td>${row.nama}</td>
                <td>${row.tingkat || '-'}</td>
                <td>${row.rombel || '-'}</td>
                <td>${formatStatus(row.status)}</td>
                <td class="aksi-cell">
                    <button class="action-btn aksi-btn"
                        data-nisn="${row.nisn}"
                        data-nama="${row.nama}"
                        data-kelas="${(row.tingkat || '-') + ' - ' + (row.rombel || '-')}"
                        onclick="window.location.href='/pembayaran/riwayat/${row.nisn}'">
                    >
                        <i data-lucide="history"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        renderPagination();
        lucide?.createIcons();
    }

    function renderPagination() {
        const pagination = document.getElementById("pembayaran-pagination");
        if (!pagination) return;

        const totalPages = Math.ceil(allData.length / perPage);

        pagination.innerHTML = "";

        if (totalPages === 0) return;

        // ================= PREV =================
        const prevBtn = document.createElement("button");
        prevBtn.textContent = "Prev";
        prevBtn.className = "page-btn";
        prevBtn.disabled = currentPage === 1;

        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        };

        pagination.appendChild(prevBtn);

        // ================= NUMBER (SELALU ADA) =================
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement("button");
            pageBtn.textContent = i;
            pageBtn.className = "page-btn";

            if (i === currentPage) {
                pageBtn.classList.add("active");
            }

            pageBtn.onclick = () => {
                currentPage = i;
                renderTable();
            };

            pagination.appendChild(pageBtn);
        }

        // ================= NEXT =================
        const nextBtn = document.createElement("button");
        nextBtn.textContent = "Next";
        nextBtn.className = "page-btn";
        nextBtn.disabled = currentPage === totalPages;

        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        };

        pagination.appendChild(nextBtn);
    }


    if (bayarPerPageInput) {
        bayarPerPageInput.addEventListener("change", () => {
            perPage = parseInt(bayarPerPageInput.value) || 10;
            currentPage = 1;
            renderTable();
        });
    }

    if (perPageUp && bayarPerPageInput) {
        perPageUp.addEventListener("click", function () {
            bayarPerPageInput.stepUp();
            perPage = parseInt(bayarPerPageInput.value) || 10;
            currentPage = 1;
            loadTable(searchInput?.value.trim() || "");
        });
    }

    if (perPageDown && bayarPerPageInput) {
        perPageDown.addEventListener("click", function () {
            if (bayarPerPageInput.value > 1) {
                bayarPerPageInput.stepDown();
                perPage = parseInt(bayarPerPageInput.value) || 10;
                currentPage = 1;
                loadTable(searchInput?.value.trim() || "");
            }
        });
    }

    function formatStatus(status) {
        if (!status) {
            return '<span class="badge gray">-</span>';
        }

        const s = status.toLowerCase();

        if (s === "aktif") {
            return '<span class="badge green">Aktif</span>';
        }

        if (s === "nonaktif" || s === "keluar") {
            return '<span class="badge red">Nonaktif</span>';
        }

        return `<span class="badge gray">${status}</span>`;
    }

    nominalBayar?.addEventListener("input", function (e) {
        let value = e.target.value.replace(/[^0-9]/g, ""); // ambil angka saja

        if (!value) {
            e.target.value = "";
            return;
        }

        const formatted = Number(value).toLocaleString("id-ID");
        e.target.value = "Rp " + formatted;
    });

    nominalBayar.addEventListener("focus", function () {
        if (!this.value) {
            this.value = "Rp ";
        }
    });

    // =========================
    // SEARCH TABLE
    // =========================
    searchInput?.addEventListener("input", () => {
        loadTable(searchInput.value.trim());
    });

    document.addEventListener("click", function (e) {
        const btn = e.target.closest(".aksi-btn");
        if (!btn) return;

        bukaRiwayatPembayaran(
            btn.dataset.nisn,
            btn.dataset.nama,
            btn.dataset.kelas
        );
    });

    function loadRiwayatPembayaran(nisn, page = 1, limit = 10) {
        fetch(`/api/pembayaran/riwayat/${nisn}?page=${page}&limit=${limit}`, {
            credentials: "include"
        })
        .then(res => res.json())
        .then(res => {
            const data = res.data || [];
            const tbody = document.querySelector("#menu-riwayat-table tbody");
            tbody.innerHTML = "";

            if (!data.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align:center;">
                            Belum ada pembayaran
                        </td>
                    </tr>
                `;
                return;
            }

            data.forEach((item, index) => {
                tbody.innerHTML += `
                    <tr>
                        <td>${(page - 1) * limit + index + 1}</td>
                        <td>${item.tanggal || '-'}</td>
                        <td>${item.jenis.toUpperCase()} ${item.bulan || ''}</td>
                        <td>Rp ${Number(item.nominal).toLocaleString("id-ID")}</td>
                    </tr>
                `;
            });

            renderRiwayatPagination(
                res.pagination.page,
                res.pagination.limit,
                res.pagination.total,
                nisn
            );
        })
        .catch(err => {
            console.error("Gagal load riwayat:", err);
            alert("Gagal memuat riwayat pembayaran");
        });
    }

    function renderRiwayatPagination(page, limit, total, nisn) {
        const container = document.getElementById("riwayat-pagination");
        if (!container) return;

        container.innerHTML = "";
        const totalPages = Math.ceil(total / limit);
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = "page-btn";
            if (i === page) btn.classList.add("active");

            btn.onclick = () => loadRiwayatPembayaran(nisn, i, limit);
            container.appendChild(btn);
        }
    }

    function loadSummaryPembayaran(nisn) {
        fetch(`/api/pembayaran/riwayat/${nisn}/summary`)
            .then(res => res.json())
            .then(data => {
                document.getElementById("sum-total-transaksi").textContent =
                    data.total_transaksi;

                document.getElementById("sum-total-nominal").textContent =
                    "Rp " + Number(data.total_nominal).toLocaleString("id-ID");

                document.getElementById("sum-terakhir-bayar").textContent =
                    data.terakhir_bayar || "-";
            });
    }


    document.querySelectorAll(".modern-close").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.closest(".saas-modal-overlay").classList.remove("show");
        });
    });

    function bukaRiwayatPembayaran(nisn, nama, kelas) {

        // simpan state
        sessionStorage.setItem("menuAktif", "riwayat_pembayaran");
        sessionStorage.setItem("riwayat_nisn", nisn);
        sessionStorage.setItem("riwayat_nama", nama);
        sessionStorage.setItem("riwayat_kelas", kelas);

        // tampilkan menu
        showMenu("riwayat");

        // isi header
        document.getElementById("menu-riwayat-nisn").textContent = nisn;
        document.getElementById("menu-riwayat-nama").textContent = nama;
        document.getElementById("menu-riwayat-kelas").textContent = kelas;

        // 🔥 INI INTINYA
        loadRiwayatPembayaran(nisn, 1, 10);
        loadSummaryPembayaran(nisn);
    }

    document.getElementById("btn-kembali-pembayaran")
    ?.addEventListener("click", () => {

        // reset state
        sessionStorage.removeItem("menuAktif");
        sessionStorage.removeItem("riwayat_nisn");
        sessionStorage.removeItem("riwayat_nama");
        sessionStorage.removeItem("riwayat_kelas");

        showMenu("pembayaran");
    });

    const menuAktif = sessionStorage.getItem("menuAktif");

    if (menuAktif === "riwayat_pembayaran") {

        const nisn  = sessionStorage.getItem("riwayat_nisn");
        const nama  = sessionStorage.getItem("riwayat_nama");
        const kelas = sessionStorage.getItem("riwayat_kelas");

        if (nisn) {
            bukaRiwayatPembayaran(nisn, nama, kelas);
        }

    } else {
        showMenu("pembayaran");
    }

    document.getElementById("menu-pembayaran")
    ?.addEventListener("click", () => {

        // 🔥 RESET SEMUA STATE RIWAYAT
        sessionStorage.removeItem("menuAktif");
        sessionStorage.removeItem("riwayat_nisn");
        sessionStorage.removeItem("riwayat_nama");
        sessionStorage.removeItem("riwayat_kelas");

        showMenu("pembayaran");
    });

    // =========================
    // INIT
    // =========================
    loadTable();

});