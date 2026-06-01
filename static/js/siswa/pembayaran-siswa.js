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

        fetch("/api/pembayaran/simpan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
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
                    loadRiwayatPembayaran(selectedSiswa.nisn);
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

        const nisn = btn.dataset.nisn;
        const nama = btn.dataset.nama;
        const kelas = btn.dataset.kelas;

        // sembunyikan menu pembayaran
        document.getElementById("pembayaran-siswa-content").style.display = "none";

        // tampilkan menu riwayat
        document.getElementById("riwayat-pembayaran-content").style.display = "block";

        // isi info siswa
        document.getElementById("menu-riwayat-nisn").textContent = nisn;
        document.getElementById("menu-riwayat-nama").textContent = nama;
        document.getElementById("menu-riwayat-kelas").textContent = kelas;

        // load tabel riwayat
        loadRiwayatMenu(nisn);
    });

    function loadRiwayatPembayaran(nisn) {
        fetch(`/api/pembayaran/riwayat/${nisn}`)
            .then(res => res.json())
            .then(data => {
                const tbody = document.querySelector("#riwayat-table tbody");
                tbody.innerHTML = "";

                if (data.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align:center;">
                                Belum ada pembayaran
                            </td>
                        </tr>
                    `;
                    return;
                }

                data.forEach((item, index) => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${item.jenis.toUpperCase()}</td>
                            <td>${item.bulan}</td>
                            <td>${item.tanggal}</td>
                            <td>Rp ${Number(item.nominal).toLocaleString("id-ID")}</td>
                        </tr>
                    `;
                });
            })
            .catch(err => {
                console.error("Gagal load riwayat", err);
            });
    }

    function loadRiwayatMenu(nisn) {
        fetch(`/api/pembayaran/riwayat/${nisn}`)
            .then(res => res.json())
            .then(data => {
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
                            <td>${index + 1}</td>
                            <td>${item.tanggal}</td>
                            <td>${item.jenis.toUpperCase()} Bulan ${item.bulan}</td>
                            <td>Rp ${Number(item.nominal).toLocaleString("id-ID")}</td>
                        </tr>
                    `;
                });
            });
    }

    document.getElementById("btn-kembali-pembayaran")
        ?.addEventListener("click", function () {

            document.getElementById("riwayat-pembayaran-content").style.display = "none";
            document.getElementById("pembayaran-siswa-content").style.display = "block";
    });

    document.querySelectorAll(".modern-close").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.closest(".saas-modal-overlay").classList.remove("show");
        });
    });

    // =========================
    // INIT
    // =========================
    loadTable();

});