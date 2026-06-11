const asal = document.referrer;
const domain = window.location.origin;
const halamanAsalBoleh = [`${domain}/public/tagihan-siswa`];

const sudahMasukSebelumnya = sessionStorage.getItem("akses_checkout_diizinkan");
const dariHalamanBenar = halamanAsalBoleh.some(link => asal.includes(link));

if (asal.includes("/public/payment") || asal === "" || asal === null) {
    // 🔒 PERKUAT: PAKSA TANDAI SELALU JIKA DARI HALAMAN UTAMA / PAYMENT
    sessionStorage.setItem("dari_halaman_payment", "YA");
}

// ✅ TAMBAH: CEK LANGSUNG DARI URL, JIKA TAB NYA RIWAYAT/STATUS, TANDAI LANGSUNG
const paramsAwal = new URLSearchParams(window.location.search);
if(paramsAwal.get('tab') === 'status' || paramsAwal.get('tab') === 'history'){
    sessionStorage.setItem("dari_halaman_payment", "YA");
}

// ✅ Simpan asal halaman agar nav tahu posisi kita (jika masuk dari menu Riwayat)
if (asal.includes("/public/payment") || asal === "" || asal === null) {
    // Cek apakah ada penanda dari navigasi SPA
    if (sessionStorage.getItem("dari_halaman_payment") !== "YA") {
        // Jika referrer kosong tapi kita ada di halaman riwayat, asumsikan dari payment
        const params = new URLSearchParams(window.location.search);
        if(params.get('tab') === 'status' || params.get('tab') === 'history'){
            sessionStorage.setItem("dari_halaman_payment", "YA");
        }
    }
}

// ✅ PERBAIKAN: JANGAN PAKSA PINDAH JIKA SUDAH PUNYA AKSES, AGAR SPA AMAN
if (!dariHalamanBenar && !sudahMasukSebelumnya && !sessionStorage.getItem("dari_halaman_payment")) {
    if(!asal) {
        // Jika langsung akses link tanpa riwayat, izinkan saja jika ada penanda session sebelumnya
        if(!sudahMasukSebelumnya) {
            window.location.href = "/public/payment";
        }
    }
}

lucide.createIcons();
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
const cartItems = document.querySelector(".cart-items");
const cartEmpty = document.getElementById("cart-empty");
const cartTotal = document.getElementById("cart-total");

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

    return "Rp" + " " + Number(nominal)
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
        
        // ✅ Panggil nav ulang setelah cart load
        gantiNavBerdasarkanTab("cart");

    } catch(err) {

        console.error(
            "Gagal load cart",
            err
        );
    }
}

// ✅ TAMBAH: Fungsi pengelompokan tagihan
function kelompokkanTagihan(items) {
    const kelompok = {
        SPP: [],
        PEMBANGUNAN: [],
        LAINNYA: []
    };

    items.forEach(item => {
        const jenis = (item.jenis || "").toUpperCase();
        if (jenis === "SPP") {
            kelompok.SPP.push(item);
        } else if (jenis.includes("PEMBANGUNAN")) {
            kelompok.PEMBANGUNAN.push(item);
        } else {
            kelompok.LAINNYA.push(item);
        }
    });

    // Hapus kelompok yang kosong
    Object.keys(kelompok).forEach(key => {
        if (kelompok[key].length === 0) delete kelompok[key];
    });

    return kelompok;
}

// ✅ UBAH: Isi fungsi renderCart menjadi seperti ini
function renderCart() {
    cartItems.innerHTML = "";

    if (cart.length === 0) {
        cartEmpty.style.display = "flex";
        cartTotal.textContent = "Rp 0";
        cartTotalValue = 0;
        return;
    }

    cartEmpty.style.display = "none";

    const dataKelompok = kelompokkanTagihan(cart);
    let totalKeseluruhan = 0;

    Object.keys(dataKelompok).forEach(namaKelompok => {
        const daftarItem = dataKelompok[namaKelompok];
        let totalPerKelompok = daftarItem.reduce((sum, item) => sum + item.nominal, 0);
        totalKeseluruhan += totalPerKelompok;

        let judulKelompok = namaKelompok === "SPP" ? "SPP Sekolah" : 
                            namaKelompok === "PEMBANGUNAN" ? "Biaya Pembangunan" : 
                            "Biaya Lainnya";

        let rincianHtml = "";
        daftarItem.forEach(item => {
            rincianHtml += `
            <div class="cart-item">
                <div class="cart-item-left">
                    <p>${formatNamaTagihan(item)}</p>
                </div>
                <div class="cart-item-right">
                    <span>${rupiah(item.nominal)}</span>
                    <button class="btn-remove" data-id="${item.id}">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
            `;
        });

        const div = document.createElement("div");
        div.className = "cart-group-card";
        div.innerHTML = `
            <div class="cart-group-header">
                <h4><i data-lucide="book-open"></i> ${judulKelompok}</h4>
            </div>
            <div class="cart-group-body">${rincianHtml}</div>
            <div class="cart-group-footer">
                <span>Total ${judulKelompok}</span>
                <strong>${rupiah(totalPerKelompok)}</strong>
            </div>
        `;

        cartItems.appendChild(div);
    });

    // Update Total Akhir
    cartTotalValue = totalKeseluruhan;
    cartTotal.textContent = rupiah(totalKeseluruhan);
    if(document.getElementById("cart-total-bottom")){
        document.getElementById("cart-total-bottom").textContent = rupiah(totalKeseluruhan);
    }

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
btnCheckout.addEventListener("click", async () => {
    paymentModal.style.display = "flex";
    
    try {
        // ✅ PAKAI ENDPOINT YANG BENAR: /public/cart (bukan get-cart)
        const resCart = await fetch(`/public/cart?siswa_id=${siswaId}`);
        if (!resCart.ok) throw new Error("Gagal ambil data");
        
        const dataCart = await resCart.json();
        
        // ✅ Pastikan nominal berupa angka, lalu jumlahkan
        const totalTerbaru = dataCart.reduce((sum, item) => {
            const nominal = parseInt(item.nominal || 0);
            return sum + nominal;
        }, 0);
        
        // ✅ Perbarui variabel global & tampilan
        cart = dataCart; // Perbarui isi keranjang juga
        cartTotalValue = totalTerbaru;
        modalTotal.textContent = rupiah(totalTerbaru);

        console.log("✅ Total di Modal:", totalTerbaru); // Cek di konsol, pasti ada angkanya

    } catch (e) {
        console.error("Error hitung total:", e);
        // ✅ Jika gagal, pakai data yang sudah ada di memori
        const totalCadangan = cart.reduce((sum, item) => sum + parseInt(item.nominal || 0), 0);
        cartTotalValue = totalCadangan;
        modalTotal.textContent = rupiah(totalCadangan);
    }
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
    } else if (method === "va" || method === "qris") {
        prosesPembayaranOtomatis(method);
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

// ==============================================
// ========== TAMBAHAN FITUR VA & QRIS =========
// ==============================================

let countdownTimer;

// --- FUNGSI UTAMA: PROSES PEMBAYARAN OTOMATIS ---
async function prosesPembayaranOtomatis(metode) {
    const paymentDetailModal = document.getElementById("payment-detail-modal");
    const vaContent = document.getElementById("va-content");
    const qrisContent = document.getElementById("qris-content");
    const detailTitle = document.getElementById("detail-title");

    paymentDetailModal.style.display = "flex";
    vaContent.style.display = "none";
    qrisContent.style.display = "none";

    // ==============================================
    // ✅ PERBAIKAN: MUAT ULANG KERANJANG & PERBAIKI STATUS
    // ==============================================
    try {
        // Ambil data keranjang terbaru langsung dari server sebelum kirim
        const resCart = await fetch(`/public/cart?siswa_id=${siswaId}`);
        const dataCart = await resCart.json();

        // ✅ HANYA ambil barang yang MASIH di keranjang (belum masuk pembayaran lain)
        cart = dataCart.filter(item => item.status === 'CART'); 

        if (cart.length === 0) {
            alert("Tidak ada tagihan baru yang bisa dibayar. Semua tagihan sudah diproses.");
            paymentDetailModal.style.display = "none";
            return;
        }
        
        // Hitung ulang total
        cartTotalValue = cart.reduce((sum, item) => sum + parseInt(item.nominal || 0), 0);
        
        console.log("✅ Data Keranjang Terbaru:", cart);
        console.log("✅ Total Terbaru:", cartTotalValue);

    } catch (e) {
        alert("Gagal mengambil data keranjang terbaru");
        paymentDetailModal.style.display = "none";
        return;
    }

    if (!cart || cart.length === 0 || cartTotalValue <= 0) {
        alert("Keranjang pembayaran kosong atau total tidak valid!");
        paymentDetailModal.style.display = "none";
        return;
    }

    const formData = new FormData();
    formData.append("siswa_id", siswaId);
    formData.append("total", cartTotalValue.toString());
    formData.append("metode", metode.toUpperCase());
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

    try {
        const res = await fetch("/public/generate-pembayaran", {
            method: "POST",
            headers: {
                "X-CSRFToken": csrfToken
            },
            body: formData
        });

        const result = await res.json();

        if (!result.success) {
            alert("Gagal: " + result.error);
            paymentDetailModal.style.display = "none";
            return;
        }

        const data = result.data;

        if (metode === 'va') {
            detailTitle.innerText = 'Nomor Virtual Account';
            document.getElementById('va-number').innerText = data.kode;
            vaContent.style.display = 'block';
            document.getElementById('copy-va').onclick = () => {
                navigator.clipboard.writeText(data.kode);
                alert('Nomor VA disalin!');
            };
            mulaiHitungMundur(data.expired, 'expired-time');

        } else if (metode === 'qris') {
            detailTitle.innerText = 'Kode QRIS Pembayaran';
            document.getElementById('qris-image').src = data.qr_image;
            qrisContent.style.display = 'block';
            mulaiHitungMundur(data.expired, 'qris-expired-time');
        }

        pindahKeTabStatus();

    } catch (err) {
        alert("Terjadi kesalahan koneksi");
        paymentDetailModal.style.display = "none";
        console.error("Error:", err);
    }
}

function mulaiHitungMundur(waktuKadaluarsa, elementId) {
    let waktuAkhir = new Date(waktuKadaluarsa).getTime();

    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
        let sekarang = new Date().getTime();
        let selisih = waktuAkhir - sekarang;

        if (selisih < 0) {
            clearInterval(countdownTimer);
            document.getElementById(elementId).innerText = "Waktu Habis";
            alert("Waktu pembayaran telah habis! Silakan buat ulang transaksi.");
            return;
        }

        let jam = Math.floor((selisih % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let menit = Math.floor((selisih % (1000 * 60 * 60)) / (1000 * 60));
        let detik = Math.floor((selisih % (1000 * 60)) / 1000);

        jam = String(jam).padStart(2, '0');
        menit = String(menit).padStart(2, '0');
        detik = String(detik).padStart(2, '0');

        document.getElementById(elementId).innerText = `${jam}:${menit}:${detik}`;
    }, 1000);
}


function pindahKeTabStatus() {

    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));

    document.querySelector('[data-tab="status"]').classList.add("active");
    document.getElementById("tab-status").classList.add("active");

    // ✅ PANGGIL GANTI NAV KETIKA PINDAH KE SINI
    gantiNavBerdasarkanTab("status");

    loadStatusPembayaranDenganTombol();
    loadRiwayatPembayaran();
    loadCart();
}

function tutupModalVaQris() {
    const paymentDetailModal = document.getElementById("payment-detail-modal");
    paymentDetailModal.style.display = "none";
    if (countdownTimer) clearInterval(countdownTimer);
    loadCart(); 
}

document.addEventListener("DOMContentLoaded", function() {
    const btnCloseDetail = document.getElementById("close-detail-modal");
    const btnBackToMethod = document.getElementById("back-to-method");

    if (btnCloseDetail) btnCloseDetail.addEventListener("click", tutupModalVaQris);
    if (btnBackToMethod) {
        btnBackToMethod.addEventListener("click", () => {
            tutupModalVaQris();
            document.getElementById("payment-modal").style.display = "flex";
        });
    }
});

async function loadStatusPembayaranDenganTombol() {
    const statusList = document.getElementById("status-list");

    try {
        const res = await fetch(`/public/status-pembayaran?siswa_id=${siswaId}`);
        const data = await res.json();

        if (!data.length) {
            statusList.innerHTML = `
                <div class="cart-empty">
                    <i data-lucide="clock-3"></i>
                    <p>Belum Ada Transaksi Pembayaran</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        statusList.innerHTML = data.map(item => {
            let detailHtml = "";
            let adaDetail = false;

            try {

                const details = JSON.parse(item.detail || "[]");
                
                if (details.length > 0) {
                    adaDetail = true;

                    detailHtml = details.map(d => `
                        <div class="status-detail-item">
                            <span>- ${formatNamaTagihan(d)}</span>
                            <span>${rupiah(d.nominal)}</span>
                        </div>
                    `).join("");
                } else {

                    detailHtml = `
                        <div class="status-detail-item text-kosong">
                            <em>Tidak ada rincian tagihan</em>
                        </div>
                    `;
                }

            } catch (e) {
                console.error("Gagal baca detail:", e);
                detailHtml = `
                    <div class="status-detail-item text-kosong">
                        <em>Rincian tidak dapat dibaca</em>
                    </div>
                `;
            }

            let tombolAksi = "";
            if( (item.metode === "VA" || item.metode === "QRIS" || item.metode === "BSI-VA") && item.status === "MENUNGGU PEMBAYARAN" ) {
                tombolAksi = `
                    <button 
                        class="btn-lihat-kode" 
                        data-kode="${item.kode_pembayaran || ''}" 
                        data-jenis="${item.metode}" 
                        data-expired="${item.expired_at || ''}"
                        data-qr="${item.qr_image || ''}">
                        <i data-lucide="eye"></i> Lihat Kode Pembayaran
                    </button>
                `;
            }

            return `
                <div class="status-item">
                    <div class="status-header">
                        <div class="title-status">
                            <strong class="status-title">${item.metode}</strong>
                            <small class="status-date">${item.tanggal}</small>
                        </div>
                        <div class="status-badge ${item.status === 'MENUNGGU PEMBAYARAN' ? 'pending' : 'verified'}">
                            ${item.status}
                        </div>
                    </div>

                    <div class="status-detail">
                        <p class="label-rincian">Rincian Tagihan:</p>
                        ${detailHtml}
                    </div>

                    <div class="status-footer">
                        <div>
                            ${tombolAksi}
                        </div>
                        <div class="total-box">
                            <span>Total Bayar:</span>
                            <strong class="status-price">${rupiah(item.total)}</strong>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        lucide.createIcons();

    } catch (err) {
        console.error("Error load status:", err);
    }
}

document.addEventListener("click", function(e) {
    const btn = e.target.closest(".btn-lihat-kode");
    if(!btn) return;

    const kode = btn.dataset.kode;
    const jenis = btn.dataset.jenis;
    const expired = btn.dataset.expired;
    const qr = btn.dataset.qr;

    const paymentDetailModal = document.getElementById("payment-detail-modal");
    const vaContent = document.getElementById("va-content");
    const qrisContent = document.getElementById("qris-content");
    const detailTitle = document.getElementById("detail-title");
    const qrisImageEl = document.getElementById("qris-image")

    paymentDetailModal.style.display = "flex";
    vaContent.style.display = "none";
    qrisContent.style.display = "none";

    if(jenis === "VA") {
        detailTitle.innerText = 'Nomor Virtual Account';
        document.getElementById('va-number').innerText = kode;
        vaContent.style.display = "block";
        mulaiHitungMundur(expired, 'expired-time');

        document.getElementById('copy-va').onclick = () => {
            navigator.clipboard.writeText(kode);
            alert('Nomor VA disalin!');
        };

    } else if(jenis === "QRIS") {
        detailTitle.innerText = 'Kode QRIS';
        document.getElementById('qris-image').src = qr;
        qrisContent.style.display = "block";
        mulaiHitungMundur(expired, 'qris-expired-time');
    }
});

const btnBottomPay = document.querySelector(".bottom-pay-btn");
if (btnBottomPay && btnCheckout) {
    btnBottomPay.addEventListener("click", function () {
        btnCheckout.click();
    });
}

function gantiNavBerdasarkanTab(tabAktif) {
    if (window.innerWidth > 900) return;
    
    const navBayar = document.getElementById("bottom-nav-checkout"); // Ini yang ada Total & Bayar
    const navRiwayat = document.getElementById("bottom-nav-riwayat"); // Ini nav riwayat

    if (!navBayar || !navRiwayat) return;

    // 🔒 ATURAN UTAMA: CEK DARI MANA KITA DATANG + CEK TAB AKTIF
    const dariMenuRiwayat = sessionStorage.getItem("dari_halaman_payment") === "YA";
    const tabSekarang = tabAktif || "cart";

    // ==============================================
    // 🔒 KUNCI UTAMA:
    // JIKA DARI MENU RIWAYAT ATAU SEDANG DI TAB STATUS/HISTORY → SELALU SEMBUNYIKAN BAYAR
    // ==============================================
    if (dariMenuRiwayat || tabSekarang === "status" || tabSekarang === "history") {
        navBayar.style.setProperty('display', 'none', 'important'); // PAKSA HILANG
        navRiwayat.style.setProperty('display', 'flex', 'important');
        return; // ❗ BERHENTI DI SINI, TIDAK ADA KODE DI BAWAH YANG DIJALANKAN
    }

    // ==============================================
    // JIKA MASUK DARI TAGIHAN SISWA & DI TAB KERANJANG → TAMPILKAN JIKA ADA ISI
    // ==============================================
    navBayar.style.setProperty('display', 'none', 'important');
    navRiwayat.style.setProperty('display', 'none', 'important');

    if (tabSekarang === "cart" && cart.length > 0) {
        navBayar.style.setProperty('display', 'flex', 'important');
    }
}

// ======================================
// TAB CONTROLLER CHECKOUT (AMAN)
// ======================================
document.addEventListener("DOMContentLoaded", () => {

    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get("tab");

    // Simpan tab ke session (biar reload aman)
    if (tabFromUrl) {
        sessionStorage.setItem("checkout_tab", tabFromUrl);
    }

    const activeTab =
        tabFromUrl ||
        sessionStorage.getItem("checkout_tab") ||
        "cart";

    // Reset semua tab
    document.querySelectorAll(".tab-btn").forEach(btn =>
        btn.classList.remove("active")
    );

    document.querySelectorAll(".tab-content").forEach(tab =>
        tab.classList.remove("active")
    );

    // Aktifkan target
    const btn = document.querySelector(
        `.tab-btn[data-tab="${activeTab}"]`
    );
    const content = document.getElementById(
        `tab-${activeTab}`
    );

    if (btn) btn.classList.add("active");
    if (content) content.classList.add("active");
    
    // ✅ Panggil nav saat awal load
    gantiNavBerdasarkanTab(activeTab);

});

document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {

        const tab = btn.dataset.tab;

        sessionStorage.setItem("checkout_tab", tab);

        const params = new URLSearchParams(window.location.search);
        params.set("tab", tab);

        window.history.replaceState(
            null,
            "",
            `${window.location.pathname}?${params.toString()}`
        );

        // aktifkan manual (tanpa reload)
        document.querySelectorAll(".tab-btn").forEach(b =>
            b.classList.remove("active")
        );
        document.querySelectorAll(".tab-content").forEach(t =>
            t.classList.remove("active")
        );

        btn.classList.add("active");
        document.getElementById(`tab-${tab}`)?.classList.add("active");

        // ✅ PANGGIL FUNGSI GANTI NAV SETIAP KALI KLIK TAB
        gantiNavBerdasarkanTab(tab);
    });
});

loadBiodataSiswa();
loadCart();
loadStatusPembayaranDenganTombol();
loadRiwayatPembayaran();