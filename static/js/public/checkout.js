lucide.createIcons();
const csrfToken =
    document.querySelector(
        'meta[name="csrf-token"]'
    )?.getAttribute("content");

const cartItems =
    document.querySelector(".cart-items");

const cartEmpty =
    document.getElementById("cart-empty");

const cartTotal =
    document.getElementById("cart-total");

let cart = [];

let cartTotalValue = 0;


// ======================================
// FORMAT TANGGAL (YYYY-MM-DD → DD-MM-YYYY)
// ======================================
function formatTanggal(isoDate, separator = "-") {

    if (!isoDate) return "-";

    const parts = isoDate.split("-");

    if (parts.length !== 3) return isoDate;

    const [year, month, day] = parts;

    return `${day}${separator}${month}${separator}${year}`;
}

function rupiah(nominal) {

    return "Rp" + Number(nominal)
        .toLocaleString("id-ID");
}

async function loadBiodataSiswa() {

    if (!siswaId) return;

    try {

        const res = await fetch(
            `/public/siswa-detail?siswa_id=${siswaId}`
        );

        if (!res.ok) return;

        const siswa = await res.json();

        // =========================
        // HEADER NAME
        // =========================
        const namaHeader =
            document.getElementById("nama-siswa-header");

        if (namaHeader) {

            const parts =
                (siswa.nama || "").split(" ");

            let nama =
                parts.slice(0, 2).join(" ");

            if (parts.length > 2) {
                nama += "...";
            }

            namaHeader.textContent = nama;
        }

        // =========================
        // PROFILE DROPDOWN
        // =========================
        document.getElementById("profile-nama").textContent =
            siswa.nama || "-";

        document.getElementById("profile-nisn").textContent =
            `NISN ${siswa.nisn || "-"}`;

        document.getElementById("profile-kelas").textContent =
            `${siswa.tingkat || "-"} ${siswa.sub_kelas || ""}`;

        // ===== STATUS (WARNA)
        const statusEl =
            document.getElementById("profile-status");

        const status =
            (siswa.status || "AKTIF").toUpperCase();

        statusEl.textContent =
            status.charAt(0) + status.slice(1).toLowerCase();

        statusEl.classList.remove(
            "aktif",
            "nonaktif",
            "lulus"
        );

        if (status === "NONAKTIF") {
            statusEl.classList.add("nonaktif");
        }
        else if (status === "LULUS") {
            statusEl.classList.add("lulus");
        }
        else {
            statusEl.classList.add("aktif");
        }

        // ===== TTL
        document.getElementById("profile-ttl").textContent =
            siswa.tempat_lahir && siswa.tanggal_lahir
                ? `${siswa.tempat_lahir}, ${formatTanggal(siswa.tanggal_lahir)}`
                : "-";

        // ===== ORANG TUA
        document.getElementById("profile-orangtua").textContent =
            siswa.nama_ayah ||
            siswa.nama_ibu ||
            "-";

        // ===== ALAMAT
        document.getElementById("profile-alamat").textContent =
            siswa.alamat || "-";

        lucide.createIcons();

    } catch (err) {

        console.error(
            "Gagal memuat biodata siswa",
            err
        );
    }
}

const siswaId =
    document.getElementById("siswa-id")?.value;

async function loadCart() {

    try {

        const res = await fetch(
            `/public/cart?siswa_id=${siswaId}`
        );

        cart = await res.json();

        renderCart();

    } catch(err) {

        console.error(
            "Gagal load cart",
            err
        );
    }
}

function renderCart() {

    cartItems.innerHTML = "";

    if (cart.length === 0) {

        cartEmpty.style.display = "flex";

        cartTotal.textContent = "Rp0";
        cartTotalValue = 0;

        return;
    }

    cartEmpty.style.display = "none";

    let total = 0;

    cart.forEach((item, index) => {

        total += item.nominal;

        const div = document.createElement("div");

        div.className = "cart-item";

        div.innerHTML = `
            <div class="cart-item-left">

                <div>

                    <p>
                        ${formatNamaTagihan(item)}
                    </p>

                </div>

            </div>

            <div class="cart-item-right">

                <p>
                    ${rupiah(item.nominal)}
                </p>

                <button
                    class="btn-remove"
                    data-id="${item.id}">

                    <i data-lucide="trash-2"></i>

                </button>

            </div>
        `;

        cartItems.appendChild(div);
    });
    cartTotalValue = total;
    cartTotal.textContent = rupiah(total);

    lucide.createIcons();
}

function formatNamaTagihan(item) {

    const jenis = (item.jenis || "").toUpperCase();

    if (jenis === "SPP") {
        const bulanNama = new Date(
            item.tahun,
            item.bulan - 1
        ).toLocaleString("id-ID", {
            month: "long"
        });

        return `SPP ${bulanNama} ${item.tahun}`;
    }

    if (jenis.includes("PEMBANGUNAN")) {
        return "Biaya Pembangunan";
    }

    return item.jenis || "-";
}

document.addEventListener("click", async function(e) {

    const btn =
        e.target.closest(".btn-remove");

    if (!btn) return;

    const cartId = btn.dataset.id;

    try {

        await fetch(
            `/public/cart/delete/${cartId}`,
            {
                method: "DELETE",
                headers: {
                    "X-CSRFToken": csrfToken
                }

            }
        );

        await loadCart();

    } catch(err) {

        console.error(err);
    }
});

const navKontak = document.querySelector(".nav-kontak");
const footerKontak = document.getElementById("kontak");

if (navKontak && footerKontak) {

    navKontak.addEventListener("click", function (e) {

        e.preventDefault();

        const targetPosition =
            footerKontak.offsetTop - 40;

        const startPosition =
            window.pageYOffset;

        const distance =
            targetPosition - startPosition;

        const duration = 1400;
        let start = null;

        function animation(currentTime) {

            if (start === null) start = currentTime;

            const timeElapsed = currentTime - start;
            const progress = Math.min(timeElapsed / duration, 1);

            // easing lembut
            const ease = 1 - Math.pow(1 - progress, 3);

            window.scrollTo(
                0,
                startPosition + distance * ease
            );

            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            }
        }

        requestAnimationFrame(animation);
    });
}

// ==============================
// PAYMENT & TRANSFER MODAL
// ==============================

const paymentModal  = document.getElementById("payment-modal");
const transferModal = document.getElementById("transfer-modal");

const btnCheckout   = document.querySelector(".btn-checkout");
const btnCloseModal = document.getElementById("close-payment-modal");
const modalTotal    = document.getElementById("modal-total");

// buka modal metode
btnCheckout.addEventListener("click", () => {
    paymentModal.style.display = "flex";
    modalTotal.textContent = rupiah(cartTotalValue);
});

// tutup modal metode
btnCloseModal.addEventListener("click", () => {
    paymentModal.style.display = "none";
});

// pilih metode (UI)
document.querySelectorAll(".payment-method").forEach(method => {
    method.addEventListener("click", () => {
        document
            .querySelectorAll(".payment-method")
            .forEach(m => m.classList.remove("active"));

        method.classList.add("active");
        method.querySelector("input").checked = true;
    });
});

// lanjut pembayaran
document
.getElementById("confirm-payment")
.addEventListener("click", () => {

    const method =
        document.querySelector(
            'input[name="payment_method"]:checked'
        ).value;

    paymentModal.style.display = "none";

    if (method === "transfer") {

        document.getElementById("transfer-total")
            .textContent = rupiah(cartTotalValue);

        transferModal.style.display = "flex";
    } else {
        alert("Metode ini akan diaktifkan selanjutnya");
    }
});

// tutup modal transfer
document
.getElementById("close-transfer-modal")
.addEventListener("click", () => {
    transferModal.style.display = "none";
});

document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {

        document.querySelectorAll(".tab-btn")
            .forEach(b => b.classList.remove("active"));

        document.querySelectorAll(".tab-content")
            .forEach(c => c.classList.remove("active"));

        btn.classList.add("active");

        const tab = btn.dataset.tab;
        document.getElementById("tab-" + tab).classList.add("active");
    });
});

// ===============================
// PROFILE DROPDOWN TOGGLE
// ===============================
const btnProfile =
    document.getElementById("profile-btn");

const profileDropdown =
    document.getElementById("profile-dropdown");

if (btnProfile && profileDropdown) {

    btnProfile.addEventListener("click", function (e) {
        e.stopPropagation();
        profileDropdown.classList.toggle("show");
    });

    // klik di luar → tutup
    document.addEventListener("click", function () {
        profileDropdown.classList.remove("show");
    });

    // klik di dalam dropdown → jangan nutup
    profileDropdown.addEventListener("click", function (e) {
        e.stopPropagation();
    });
}

// ===============================
// SUBMIT TRANSFER
// ===============================

document
.getElementById("submit-transfer")
.addEventListener("click", async () => {

    const file =
        document.getElementById("bukti-transfer").files[0];

    if (!file) {
        alert("Upload bukti transfer terlebih dahulu");
        return;
    }

    // =========================
    // SIMULASI DATA TRANSAKSI
    // =========================
    const formData = new FormData();

    formData.append("siswa_id", siswaId);
    formData.append("total", cartTotalValue);
    formData.append("metode", "Transfer Bank");
    formData.append("bukti", file);

    formData.append(
        "detail",
        JSON.stringify(cart.map(item => ({
            cart_id: item.id,
            jenis: item.jenis,
            bulan: item.bulan,
            tahun: item.tahun,
            nominal: item.nominal
        })))
    );

    const res = await fetch("/public/upload-pembayaran", {
        method: "POST",

        headers: {
            "X-CSRFToken": csrfToken
        },

        body: formData
    });

    const text = await res.text();

    console.log("RESPONSE:");
    console.log(text);

    let result = {};

    try {
        result = JSON.parse(text);
    } catch(e) {
        alert("Response backend bukan JSON");
        return;
    }

    if (!result.success) {
        alert(result.error || "Gagal upload");
        return;
    }

    // =========================
    // TUTUP MODAL
    // =========================
    transferModal.style.display = "none";

    // =========================
    // PINDAH KE TAB STATUS
    // =========================
    document.querySelectorAll(".tab-btn")
        .forEach(btn => btn.classList.remove("active"));

    document.querySelectorAll(".tab-content")
        .forEach(tab => tab.classList.remove("active"));

    document
        .querySelector('[data-tab="status"]')
        .classList.add("active");

    document
        .getElementById("tab-status")
        .classList.add("active");

    // =========================
    // RENDER STATUS
    // =========================
    const statusList =
        document.getElementById("status-list");

    await loadStatusPembayaran();
    await loadRiwayatPembayaran();
    await loadCart();

    // =========================
    // RESET INPUT FILE
    // =========================
    document.getElementById("bukti-transfer").value = "";

    lucide.createIcons();
});

async function loadStatusPembayaran() {

    const statusList =
        document.getElementById("status-list");

    try {

        const res = await fetch(
            `/public/status-pembayaran?siswa_id=${siswaId}`
        );

        const data = await res.json();

        if (!data.length) {

            statusList.innerHTML = `
                <div class="cart-empty">

                    <i data-lucide="clock-3"></i>

                    <p>
                        Belum Ada Transaksi Pembayaran
                    </p>

                </div>
            `;

            lucide.createIcons();
            return;
        }

        statusList.innerHTML = data.map(item => {

            let detailHtml = "";

            try {

                const details =
                    JSON.parse(item.detail || "[]");

                detailHtml = details.map(d => `
                    <div class="status-detail-item">

                        <span>
                            - ${formatNamaTagihan(d)}
                        </span>

                        <span>
                            ${rupiah(d.nominal)}
                        </span>

                    </div>
                `).join("");

            } catch(e) {

                console.error(e);
            }

            return `
                <div class="status-item">

                    <div class="status-header">

                        <div class="title-status">

                            <strong class="status-title">
                                ${item.metode}
                            </strong>

                            <small class="status-date">
                                ${item.tanggal}
                            </small>

                        </div>

                        <div class="status-badge pending">
                            ${item.status}
                        </div>

                    </div>

                    <div class="status-detail">

                        ${detailHtml}

                    </div>

                    <div class="status-footer">
                        <strong class="footer-title">
                            Total
                        </strong>
                        <strong class="status-price">
                            ${rupiah(item.total)}
                        </strong>

                    </div>

                </div>
            `;

        }).join("");

        lucide.createIcons();

    } catch(err) {

        console.error(err);
    }
}

async function loadRiwayatPembayaran() {

    const historyList =
        document.getElementById("history-list");

    try {

        const res = await fetch(
            `/public/riwayat-pembayaran?siswa_id=${siswaId}`
        );

        const data = await res.json();

        if (!data.length) {

            historyList.innerHTML = `
                <div class="cart-empty">

                    <i data-lucide="receipt-text"></i>

                    <p>
                        Tidak Ada Riwayat Pembayaran
                    </p>

                </div>
            `;

            lucide.createIcons();

            return;
        }

        historyList.innerHTML = data.map(item => {

            let detailHtml = "";

            try {

                const details =
                    JSON.parse(item.detail || "[]");

                detailHtml = details.map(d => `

                    <div class="status-detail-item">

                        <span>
                            - ${formatNamaTagihan(d)}
                        </span>

                        <span>
                            ${rupiah(d.nominal)}
                        </span>

                    </div>

                `).join("");

            } catch(e) {

                console.error(e);
            }

            return `

                <div class="status-item">

                    <div class="status-header">

                        <div class="title-status">

                            <strong class="history-title">
                                ${item.metode}
                            </strong>

                            <small class="status-date">
                                ${item.tanggal}
                            </small>

                        </div>

                        <div class="status-badge ${
                            item.status === "DITOLAK"
                                ? "rejected"
                                : "success"
                        }">

                            ${item.status}

                        </div>

                    </div>

                    <div class="status-detail">

                        ${detailHtml}

                    </div>

                    <div class="status-footer">

                        <strong class="footer-title">
                            Total
                        </strong>

                        <strong class="history-price">
                            ${rupiah(item.total)}
                        </strong>

                    </div>

                </div>

            `;

        }).join("");

        lucide.createIcons();

    } catch(err) {

        console.error(err);
    }
}

loadBiodataSiswa();
loadCart();
loadStatusPembayaran();
loadRiwayatPembayaran();