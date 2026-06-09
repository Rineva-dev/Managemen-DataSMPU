lucide.createIcons();

const cartItems =
    document.querySelector(".cart-items");

const cartEmpty =
    document.querySelector(".cart-empty");

const cartTotal =
    document.getElementById("cart-total");

let cart = JSON.parse(
    localStorage.getItem("payment_cart") || "[]"
);

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

function renderCart() {

    cartItems.innerHTML = "";

    if (cart.length === 0) {

        cartEmpty.style.display = "flex";

        cartTotal.textContent = "Rp0";

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
                        ${item.nama}
                    </p>

                </div>

            </div>

            <div class="cart-item-right">

                <p>
                    ${rupiah(item.nominal)}
                </p>

                <button
                    class="btn-remove"
                    data-index="${index}">

                    <i data-lucide="trash-2"></i>

                </button>

            </div>
        `;

        cartItems.appendChild(div);
    });

    cartTotal.textContent = rupiah(total);

    lucide.createIcons();
}

document.addEventListener("click", function(e) {

    const btn =
        e.target.closest(".btn-remove");

    if (!btn) return;

    const index = btn.dataset.index;

    cart.splice(index, 1);

    localStorage.setItem(
        "payment_cart",
        JSON.stringify(cart)
    );

    renderCart();
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
    modalTotal.textContent =
        document.getElementById("cart-total").textContent;
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

loadBiodataSiswa();
renderCart();