// ======================================
// ELEMENT
// ======================================
const tableBody =
    document.getElementById("verification-body");

const searchInput =
    document.getElementById("search-verifikasi");

let pembayaranList = [];

// ======================================
// FORMAT RUPIAH
// ======================================
function rupiah(nominal) {

    return "Rp" + Number(nominal)
        .toLocaleString("id-ID");
}

// ======================================
// LOAD DATA
// ======================================
async function loadVerifikasiPembayaran() {

    try {

        const res = await fetch(
            "/verifikasi-pembayaran/list"
        );

        const data = await res.json();

        pembayaranList = data || [];

        renderTable(
            pembayaranList
        );

    } catch (err) {

        console.error(
            "Gagal load verifikasi",
            err
        );

        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    Gagal memuat data
                </td>
            </tr>
        `;
    }
}

// ======================================
// RENDER TABLE
// ======================================

function renderTable(data) {

    if (!data.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    Tidak ada pembayaran pending
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = data.map((item, index) => {

        let buktiUrl =
            `/static/uploads/transfer/${item.bukti}`;

        return `
            <tr>

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${item.tanggal}
                </td>

                <td>
                    ${item.nama}
                </td>

                <td>
                    ${item.nisn}
                </td>

                <td>
                    ${item.metode}
                </td>

                <td>
                    ${rupiah(item.total)}
                </td>

                <td>

                    <span class="status-pending">

                        ${item.status}

                    </span>

                </td>

                <td>

                    <a
                        href="${buktiUrl}"
                        target="_blank"
                        class="btn btn-secondary">

                        Lihat Bukti

                    </a>

                </td>

                <td>

                    <div
                        style="
                            display:flex;
                            gap:8px;
                        ">

                        <button
                            class="btn-approve"
                            data-id="${item.id}">

                            Approve

                        </button>

                        <button
                            class="btn-reject"
                            data-id="${item.id}">

                            Reject

                        </button>

                    </div>

                </td>

            </tr>
        `;

    }).join("");
}

// ======================================
// SEARCH
// ======================================

searchInput?.addEventListener(
    "input",
    function() {

        const keyword =
            this.value.toLowerCase();

        const filtered =
            pembayaranList.filter(item => {

                return (
                    item.nama
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    item.nisn
                        .toLowerCase()
                        .includes(keyword)
                );
            });

        renderTable(filtered);
    }
);

// ======================================
// APPROVE BUTTON
// ======================================

document.addEventListener(
    "click",
    async function(e) {

        const btnApprove =
            e.target.closest(".btn-approve");

        if (btnApprove) {

            const id =
                btnApprove.dataset.id;

            alert(
                "Approve pembayaran ID " + id
            );

            return;
        }

        const btnReject =
            e.target.closest(".btn-reject");

        if (btnReject) {

            const id = btnReject.dataset.id;

            rejectPembayaran(id);
        }
    }
);

async function rejectPembayaran(id) {

    try {

        const res = await fetch("/verifikasi-pembayaran/reject", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({ id })
        });

        const result = await res.json();

        if (result.success) {

            alert("Pembayaran ditolak");

            loadVerifikasiPembayaran();

        } else {

            alert(result.error || "Gagal reject");
        }

    } catch (err) {

        console.error(err);
        alert("Terjadi kesalahan server");
    }
}

// ======================================
// INIT
// ======================================

loadVerifikasiPembayaran();