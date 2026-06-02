document.addEventListener("DOMContentLoaded", () => {

    // ambil nisn dari URL
    const nisn = window.location.pathname.split("/").pop();

    loadSummary(nisn);
    loadRiwayat(nisn, 1, 10);

    function loadRiwayat(nisn, page, limit) {
        fetch(`/api/pembayaran/riwayat/${nisn}?page=${page}&limit=${limit}`)
            .then(res => res.json())
            .then(res => {
                const tbody = document.querySelector("#riwayat-table tbody");
                tbody.innerHTML = "";

                if (!res.data.length) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="4" style="text-align:center">
                                Belum ada pembayaran
                            </td>
                        </tr>
                    `;
                    return;
                }

                res.data.forEach((row, i) => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${(page - 1) * limit + i + 1}</td>
                            <td>${row.tanggal}</td>
                            <td>${row.jenis.toUpperCase()} ${row.bulan || ""}</td>
                            <td>Rp ${Number(row.nominal).toLocaleString("id-ID")}</td>
                        </tr>
                    `;
                });

                renderPagination(
                    res.pagination.page,
                    res.pagination.limit,
                    res.pagination.total,
                    nisn
                );
            });
    }

    function renderPagination(page, limit, total, nisn) {
        const container = document.getElementById("riwayat-pagination");
        container.innerHTML = "";

        const totalPages = Math.ceil(total / limit);
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = "page-btn";
            if (i === page) btn.classList.add("active");

            btn.onclick = () => loadRiwayat(nisn, i, limit);
            container.appendChild(btn);
        }
    }

    function loadSummary(nisn) {
        fetch(`/api/pembayaran/riwayat/${nisn}/summary`)
            .then(res => res.json())
            .then(data => {

                document.getElementById("sum-total-transaksi").textContent =
                    data.total_transaksi || 0;

                document.getElementById("sum-total-nominal").textContent =
                    "Rp " +
                    Number(data.total_nominal || 0)
                    .toLocaleString("id-ID");

                document.getElementById("sum-terakhir-bayar").textContent =
                    data.terakhir_bayar || "-";
            });
    }
});