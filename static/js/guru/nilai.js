document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // ELEMENT
    // =====================================

    const editButtons =
        document.querySelectorAll(".edit-header-btn");


    let activeType = null;
    let originalValues = {};

    

    // =====================================
    // SEARCH SISWA
    // =====================================

    const searchInput =
        document.getElementById("search-siswa");

    if (searchInput) {

        searchInput.addEventListener("input", () => {

            const keyword =
                searchInput.value.toLowerCase();

            document.querySelectorAll("#nilai-list tr")
                .forEach(row => {

                    const nama =
                        row.querySelector(".nama-siswa")
                            .textContent
                            .toLowerCase();

                    const nisn =
                        row.children[1]
                            .textContent
                            .toLowerCase();

                    const match =
                        nama.includes(keyword)
                        || nisn.includes(keyword);

                    row.style.display =
                        match ? "" : "none";

                });

        });

    }

    document.querySelectorAll('.edit-header-btn').forEach(btn => {

        btn.addEventListener('click', async () => {

            const type = btn.dataset.type;
            const header = btn.closest('.editable-header');
            const isEditing = header.classList.contains('editing');

            /* ================= SIMPAN ================= */
            if (isEditing) {
                await saveNilai(type);
                return;
            }

            /* ================= RESET HEADER ================= */
            document.querySelectorAll('.editable-header')
                .forEach(h => h.classList.remove('editing'));

            document.querySelectorAll('.edit-header-btn')
                .forEach(b => {
                    b.style.display = 'none';
                    b.innerHTML = `<i data-lucide="pencil"></i>`;
                    b.title = 'Edit';
                });

            /* ================= MASUK MODE EDIT ================= */
            activeType = type;
            header.classList.add('editing');

            btn.style.display = 'inline-flex';
            btn.innerHTML = `<i data-lucide="save"></i>`;
            btn.title = 'Simpan';

            enableEditCell(type);
            lucide.createIcons();
        });

    });

    function enableEditCell(type) {

        document.querySelectorAll(`.nilai-cell[data-type="${type}"]`)
            .forEach(cell => {

                const value = cell.dataset.value || '';
                const siswaId = cell.closest('tr').dataset.siswaId;

                originalValues[siswaId] = value;

                cell.classList.add('editing');
                cell.innerHTML = `
                    <input type="number"
                        min="0"
                        max="100"
                        class="nilai-input"
                        value="${value}">
                `;
            });
    }

    async function saveNilai(type) {

        const payload = [];

        document.querySelectorAll(`.nilai-cell[data-type="${type}"]`)
            .forEach(cell => {

                const input = cell.querySelector('input');
                if (!input) return;

                const nilai =
                    input.value.trim() === ''
                        ? null
                        : parseInt(input.value);
                const row = cell.closest('tr');

                if (nilai !== null && (nilai < 0 || nilai > 100)) {
                    showNotification("Nilai harus 0 – 100", "error");
                    throw new Error("Invalid nilai");
                }

                if (!row || !row.dataset.siswaId) {
                    console.warn('Row siswa tidak ditemukan', cell);
                    return;
                }

                payload.push({
                    siswa_id: row.dataset.siswaId,
                    type,
                    nilai
                });

                cell.dataset.value = nilai ?? '';
                cell.classList.remove('editing');
                cell.textContent = nilai ?? '-';
            });

        const kelasMapelId =
            document.getElementById("nilai-table")
                .dataset.kelasMapelId;

        const res = await fetch('/kelas-ampu/api/nilai/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken
            },
            body: JSON.stringify({
                kelas_mapel_id: kelasMapelId,
                nilai: payload
            })
        });

        const data = await res.json();

        if (!data.success) {
            showNotification(data.message || "Gagal menyimpan", "error");
            return;
        }

        applyNilaiColor();
        updateNilaiAkhir();
        updateSummaryCards();

        showNotification("Nilai berhasil disimpan", "success");

        document.querySelectorAll('.editable-header')
            .forEach(h => h.classList.remove('editing'));

        document.querySelectorAll('.edit-header-btn')
            .forEach(b => {
                b.style.display = 'inline-flex';
                b.innerHTML = `<i data-lucide="pencil"></i>`;
                b.title = 'Edit';
            });

        activeType = null;
        originalValues = {};
        lucide.createIcons();
    }

    function updateNilaiAkhir() {

        document.querySelectorAll("#nilai-list tr")
            .forEach(row => {

                const kehadiran = parseInt(
                    row.querySelector('[data-type="kehadiran"]')
                        ?.dataset.value || 0
                );

                const keaktifan = parseInt(
                    row.querySelector('[data-type="keaktifan"]')
                        ?.dataset.value || 0
                );

                const harian = parseInt(
                    row.querySelector('[data-type="harian"]')
                        ?.dataset.value || 0
                );

                const uas = parseInt(
                    row.querySelector('[data-type="uas"]')
                        ?.dataset.value || 0
                );

                const nilaiAkhir = Math.round(
                    (kehadiran * 0.10) +
                    (keaktifan * 0.20) +
                    (harian * 0.30) +
                    (uas * 0.40)
                );

                const badge =
                    row.querySelector(".nilai-badge");

                if (!badge) return;

                badge.textContent = nilaiAkhir;

                badge.classList.remove(
                    "badge-green",
                    "badge-blue",
                    "badge-yellow",
                    "badge-red"
                );

                const kkm = parseInt(
                    row.querySelector('[data-type="harian"]')
                        ?.dataset.kkm || 75
                );

                // =========================
                // RANGE DINAMIS
                // =========================
                const interval =
                    Math.round((100 - kkm) / 3);

                const batasC =
                    kkm + interval - 1;

                const batasB =
                    batasC + interval;

                // =========================
                // PENENTUAN GRADE
                // =========================
                if (nilaiAkhir >= batasB + 1) {
                    badge.classList.add("badge-green");
                }
                else if (nilaiAkhir >= batasC + 1) {
                    badge.classList.add("badge-blue");
                }
                else if (nilaiAkhir >= kkm) {
                    badge.classList.add("badge-yellow");
                }
                else {
                    badge.classList.add("badge-red");
                }

            });
    }

    function applyNilaiColor() {

        document.querySelectorAll(".nilai-cell")
            .forEach(cell => {

                const rawValue = cell.dataset.value;

                const value = parseInt(rawValue);

                const kkm = parseInt(
                    document.getElementById("nilai-table")
                        ?.dataset.kkm || 75
                );

                // reset class
                cell.classList.remove(
                    "nilai-bagus",
                    "nilai-cukup",
                    "nilai-warning",
                    "nilai-kurang"
                );

                // kalau kosong
                if (isNaN(value)) {
                    return;
                }

                // =========================
                // RANGE DINAMIS
                // =========================
                const interval =
                    Math.round((100 - kkm) / 3);

                const batasC =
                    kkm + interval - 1;

                const batasB =
                    batasC + interval;

                // =========================
                // WARNA BERDASARKAN GRADE
                // =========================
                if (value >= batasB + 1) {

                    // A
                    cell.classList.add("nilai-bagus");

                }
                else if (value >= batasC + 1) {

                    // B
                    cell.classList.add("nilai-cukup");

                }
                else if (value >= kkm) {

                    // C
                    cell.classList.add("nilai-warning");

                }
                else {

                    // D
                    cell.classList.add("nilai-kurang");

                }

            });
    }

    function updateSummaryCards() {

        const rows =
            document.querySelectorAll("#nilai-list tr");

        let totalNilai = 0;
        let totalSiswa = 0;
        let totalTuntas = 0;
        let totalBelumTuntas = 0;

        rows.forEach(row => {

            const badge =
                row.querySelector(".nilai-badge");

            if (!badge) return;

            const nilaiAkhir =
                parseInt(badge.textContent || 0);

            const kkm = parseInt(
                row.querySelector('[data-type="harian"]')
                    ?.dataset.kkm || 75
            );

            totalNilai += nilaiAkhir;
            totalSiswa++;

            if (nilaiAkhir >= kkm) {
                totalTuntas++;
            }
            else {
                totalBelumTuntas++;
            }

        });

        const rata =
            totalSiswa > 0
                ? (totalNilai / totalSiswa).toFixed(2)
                : 0;

        document.getElementById("rata-kelas")
            .textContent = rata;

        document.getElementById("total-tuntas")
            .textContent = totalTuntas;

        document.getElementById("total-belum-tuntas")
            .textContent = totalBelumTuntas;
    }

    applyNilaiColor();

});