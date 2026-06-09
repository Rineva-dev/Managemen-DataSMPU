// ======================================
// ELEMENT
// ======================================
const tableBody =
    document.getElementById("verification-body");

const searchInput =
    document.getElementById("search-verifikasi");

const PAYMENT_BASE_URL = "https://payment.smpuhamzanwadi.sch.id";

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

        const buktiUrl = item.bukti
            ? `${PAYMENT_BASE_URL}/public/bukti/${item.bukti}`
            : "#";

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

                    <button
                        class="btn btn-secondary btn-view-bukti"
                        data-url="${buktiUrl}">
                        Lihat Bukti
                    </button>

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

            const id = btnApprove.dataset.id;

            approvePembayaran(id);

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

async function approvePembayaran(id) {

    try {

        const res = await fetch("/verifikasi-pembayaran/approve", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({ id })
        });

        const result = await res.json();

        console.log("APPROVE RESPONSE:");
        console.log(text);

        if (result.success) {

            alert("Pembayaran berhasil di-approve");

            loadVerifikasiPembayaran(); // refresh tabel

        } else {

            alert(result.error || "Gagal approve");
        }

    } catch (err) {

        console.error(err);
        alert("Terjadi kesalahan server");
    }
}

const modal = document.getElementById("bukti-modal");
const modalImg = document.getElementById("bukti-image");
const closeBtn = document.getElementById("close-bukti-modal");

if (modal && modalImg && closeBtn) {

    document.addEventListener("click", function (e) {

        const btn = e.target.closest(".btn-view-bukti");
        if (!btn) return;

        modalImg.src = btn.dataset.url;
        modal.style.display = "flex";
    });

    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
        modalImg.src = "";
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
            modalImg.src = "";
        }
    });
}

// ======================================
// INIT
// ======================================

loadVerifikasiPembayaran();