// ======================================
// LUCIDE
// ======================================

lucide.createIcons();

// ======================================
// ELEMENT
// ======================================

const siswaId =
    document.getElementById("siswa-id").value;

const billGrid =
    document.getElementById("bill-grid");

const cartCount =
    document.querySelector(".cart-count");

const toast =
    document.getElementById("toast");

// ======================================
// STATE
// ======================================

let cart = JSON.parse(
    localStorage.getItem("payment_cart") || "[]"
);

// ======================================
// FORMAT
// ======================================

function rupiah(nominal) {

    return "Rp" + Number(nominal)
        .toLocaleString("id-ID");
}

// ======================================
// TOAST
// ======================================

function showToast(message = "Berhasil") {

    toast.querySelector("span").textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// ======================================
// UPDATE TOTAL
// ======================================

function updateCartTotal() {

    let total = 0;

    cart.forEach(item => {
        total += item.nominal;
    });

    cartTotal.textContent = rupiah(total);

    cartCount.textContent = cart.length;
}

// ======================================
// RENDER CART
// ======================================
function renderCart() {

    localStorage.setItem(
        "payment_cart",
        JSON.stringify(cart)
    );

    cartCount.textContent = cart.length;
}

// ======================================
// ADD TO CART
// ======================================
function addToCart(data, cardElement) {

    const exists = cart.find(item => item.id === data.id);

    if (exists) {

        showToast("Tagihan sudah ada");

        return;
    }

    cart.push(data);

    // =========================
    // HILANGKAN CARD
    // =========================

    if (
        data.kategori === "SPP"
    ) {

        cardElement.remove();

        checkEmptyTagihan();
    }

    renderCart();

    showToast("Ditambahkan ke keranjang");
}

// ======================================
// REMOVE CART
// ======================================
document.addEventListener("click", function(e) {

    const btnRemove = e.target.closest(".btn-remove");

    if (!btnRemove) return;

    const index = btnRemove.dataset.index;

    // =========================
    // AMBIL DATA ITEM
    // =========================

    const removedItem = cart[index];

    // =========================
    // HAPUS DARI CART
    // =========================

    cart.splice(index, 1);

    // =========================
    // RESET BUTTON CARD
    // =========================

    lucide.createIcons();

    renderCart();

    showToast("Tagihan dihapus");
});

// ======================================
// LOAD TAGIHAN SPP
// ======================================

async function loadTagihanSPP() {

    billGrid.innerHTML = `
        <div class="loading">
            Memuat tagihan...
        </div>
    `;

    try {

        const res = await fetch(
            `/public/tagihan-spp?siswa_id=${siswaId}`
        );

        const data = await res.json();

        billGrid.innerHTML = "";

        if (!Array.isArray(data)) {
            return;
        }

        data.forEach((t, index) => {

            const tagihanId = `spp-${t.bulan}-${t.tahun}`;

            const existsInCart =
                cart.find(item => item.id === tagihanId);

            if (existsInCart) {
                return;
            }

            const bulanNama = new Date(
                t.tahun,
                t.bulan - 1
            ).toLocaleString("id-ID", {
                month: "long"
            });

            const card = document.createElement("div");

            card.className = "bill-card";

            card.dataset.kategori = "spp";

            card.innerHTML = `
                <div class="bill-top">

                    <span class="bill-category">
                        SPP
                    </span>

                    <span class="bill-status unpaid">

                        Belum Lunas

                    </span>

                </div>

                <h3>
                    SPP ${bulanNama} ${t.tahun}
                </h3>

                <p>
                    Pembayaran SPP bulan
                    ${bulanNama} ${t.tahun}
                </p>

                <div class="bill-meta">

                    <div class="bill-meta-item">

                        <i data-lucide="calendar"></i>

                        <span>
                            Tahun Ajaran
                        </span>

                    </div>

                    <strong>
                        ${t.tahun}
                    </strong>

                </div>

                <div class="bill-footer">

                    <div>

                        <small>
                            Total Tagihan
                        </small>

                        <strong class="bill-price">

                            ${rupiah(t.nominal)}

                        </strong>

                    </div>

                    <button
                        class="btn-add-cart"
                        data-id="spp-${t.bulan}-${t.tahun}"
                        data-nama="SPP ${bulanNama} ${t.tahun}"
                        data-kategori="SPP"
                        data-nominal="${t.nominal}">

                        <i data-lucide="plus"></i>

                        <span>
                            Tambah
                        </span>

                    </button>

                </div>
            `;

            billGrid.appendChild(card);
        });

        lucide.createIcons();

    } catch (err) {

        console.error(err);

        billGrid.innerHTML = `
            <div class="empty-tagihan">
                Gagal memuat tagihan
            </div>
        `;
    }
}

async function loadTagihanPembangunan() {

    try {

        const res = await fetch(
            `/public/tagihan-pembangunan?siswa_id=${siswaId}`
        );

        const data = await res.json();

        if (data.lunas) {
            return;
        }

        const sisa =
            (data.sem1.sisa || 0) +
            (data.sem2.sisa || 0);

        const card =
            document.createElement("div");

        card.className = "bill-card";

        card.dataset.kategori =
            "pembangunan";

        card.innerHTML = `
            <div class="bill-top">

                <span class="bill-category pembangunan">
                    PEMBANGUNAN
                </span>

                <span class="bill-status unpaid">
                    Belum Lunas
                </span>

            </div>

            <h3>
                Biaya Pembangunan
            </h3>

            <p>
                Semester 1:
                ${rupiah(data.sem1.terbayar)}
                / 3.000.000
                <br>
                Semester 2:
                ${rupiah(data.sem2.terbayar)}
                / 2.000.000
            </p>

            <div class="bill-footer">

                <div>

                    <small>
                        Sisa Tagihan
                    </small>

                    <strong class="bill-price">
                        ${rupiah(sisa)}
                    </strong>

                </div>

            </div>

            <div class="bill-input">

                <input
                    type="text"
                    class="input-pembangunan"
                    placeholder="Contoh: Rp 5.000.000">

                <button
                    class="btn-add-pembangunan"
                    data-max="${sisa}">

                    <i data-lucide="plus"></i>

                    <span>
                        Tambah
                    </span>

                </button>

            </div>
        `;

        billGrid.appendChild(card);

        lucide.createIcons();

    } catch (err) {

        console.error(
            "Gagal memuat pembangunan",
            err
        );
    }
}

function checkEmptyTagihan(filter = "all") {

    const cards =
        document.querySelectorAll(".bill-card");

    let visibleCount = 0;

    cards.forEach(card => {

        const kategori =
            card.dataset.kategori;

        if (
            filter === "all" ||
            kategori === filter
        ) {
            visibleCount++;
        }
    });

    const oldEmpty =
        document.querySelector(".empty-tagihan");

    if (oldEmpty) {
        oldEmpty.remove();
    }

    if (visibleCount > 0) {
        return;
    }

    let pesan = "Tidak ada tagihan";

    if (filter === "spp") {
        pesan = "Tidak ada tagihan SPP";
    }

    if (filter === "pembangunan") {
        pesan = "Tidak ada tagihan Pembangunan";
    }

    if (filter === "ekstrakurikuler") {
        pesan = "Tidak ada tagihan Ekstrakurikuler";
    }

    billGrid.insertAdjacentHTML(
        "beforeend",
        `
        <div class="empty-tagihan">
            ${pesan}
        </div>
        `
    );
}

document.addEventListener("input", function(e) {

    const input =
        e.target.closest(".input-pembangunan");

    if (!input) return;

    let value =
        input.value.replace(/\D/g, "");

    if (!value) {

        input.value = "";

        return;
    }

    input.value =
        "Rp " +
        Number(value).toLocaleString("id-ID");
});

document.addEventListener("click", function(e) {

    const btn =
        e.target.closest(".btn-add-pembangunan");

    if (!btn) return;

    const card =
        btn.closest(".bill-card");

    const input =
        card.querySelector(".input-pembangunan");

    const nominal = parseInt(
        input.value.replace(/\D/g, "")
    ) || 0;

    const sisa =
        parseInt(btn.dataset.max);

    if (nominal <= 0) {

        showToast("Masukkan nominal");

        return;
    }

    if (nominal > sisa) {

        showToast(
            "Nominal melebihi sisa tagihan"
        );

        return;
    }

    addToCart({
        id: `pembangunan-${Date.now()}`,
        nama: "Biaya Pembangunan",
        kategori: "PEMBANGUNAN",
        nominal: nominal
    }, card);

    input.value = "";
});

// ======================================
// ADD BUTTON DYNAMIC
// ======================================
document.addEventListener("click", function(e) {

    const btn = e.target.closest(".btn-add-cart");

    if (!btn) return;

    const card =
        btn.closest(".bill-card");

    addToCart({
        id: btn.dataset.id,
        nama: btn.dataset.nama,
        kategori: btn.dataset.kategori,
        nominal: parseInt(btn.dataset.nominal)
    }, card);
});

// ======================================
// SEARCH
// ======================================

const searchInput =
    document.querySelector(".market-search input");

searchInput.addEventListener("input", function() {

    const keyword =
        this.value.toLowerCase();

    const cards =
        document.querySelectorAll(".bill-card");

    cards.forEach(card => {

        const title =
            card.querySelector("h3")
                .textContent
                .toLowerCase();

        if (title.includes(keyword)) {
            card.style.display = "";
        } else {
            card.style.display = "none";
        }
    });
});

// ======================================
// FILTER TAGIHAN
// ======================================

document.addEventListener("click", function(e) {

    const chip =
        e.target.closest(".filter-chip");

    if (!chip) return;

    // aktifkan chip terpilih
    document
        .querySelectorAll(".filter-chip")
        .forEach(btn => {
            btn.classList.remove("active");
        });

    chip.classList.add("active");

    const filter =
        chip.dataset.filter;

    document
        .querySelectorAll(".bill-card")
        .forEach(card => {

            const kategori =
                card.dataset.kategori;

            if (
                filter === "all" ||
                kategori === filter
            ) {

                card.style.display = "";

            } else {

                card.style.display = "none";
            }
        });

    checkEmptyTagihan(filter);
});

// ======================================
// LOAD BIODATA SISWA
// ======================================

async function loadBiodataSiswa() {

    try {

        const res = await fetch(
            `/public/siswa-detail?siswa_id=${siswaId}`
        );

        if (!res.ok) {
            throw new Error("Gagal mengambil data siswa");
        }

        const siswa = await res.json();

        document.getElementById("siswa-nama").textContent =
            siswa.nama || "-";

        document.getElementById("siswa-nisn").textContent =
            `NISN ${siswa.nisn}`;

        document.getElementById("siswa-kelas").textContent =
            `Kelas ${siswa.tingkat || ""}`;

        document.getElementById("siswa-rombel").textContent =
            `Rombel ${siswa.sub_kelas || ""}`;

        const statusEl =
            document.getElementById("siswa-status");

        statusEl.innerHTML = `
            <span class="status-dot"></span>
            ${siswa.status || "Aktif"}
        `;

        lucide.createIcons();

    } catch (err) {

        console.error(
            "Gagal memuat biodata siswa",
            err
        );
    }
}

// ======================================
// INIT
// ======================================
async function init() {

    renderCart();

    await loadBiodataSiswa();

    await loadTagihanSPP();

    await loadTagihanPembangunan();

    checkEmptyTagihan("all");
}

init();