// ======================================
// LUCIDE
// ======================================

lucide.createIcons();
const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content");

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

const profileButton =
    document.querySelector(".profile-button");

const profileDropdown =
    document.getElementById("profile-dropdown");

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
    cartCount.textContent = cart.length;
}

// ======================================
// ADD TO CART
// ======================================
async function addToCart(data, cardElement) {

    try {

        const res = await fetch("/public/add-cart", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },

            body: JSON.stringify({
                siswa_id: siswaId,
                jenis: data.kategori,
                bulan: data.bulan || null,
                tahun: data.tahun || null,
                nominal: data.nominal,
                detail: data
            })
        });

        if (!res.ok) {
            const text = await res.text();
            console.error(text);
            throw new Error("Request gagal");
        }

        const result = await res.json();

        if (!result.success) {

            showToast(result.error || "Gagal tambah cart");
            return;
        }

        // reload cart dari backend
        await loadCart();

        // hilangkan card SPP
        if (data.kategori === "SPP") {

            cardElement.remove();
            checkEmptyTagihan();
        }

        showToast("Ditambahkan ke keranjang");

    } catch(err) {

        console.error(err);
        showToast("Terjadi kesalahan");
    }
}

async function loadCart() {

    try {

        const res = await fetch(
            `/public/cart?siswa_id=${siswaId}`
        );

        const data = await res.json();

        cart = data || [];

        renderCart();

    } catch(err) {

        console.error(err);
    }
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
// PROFILE DROPDOWN
// ======================================

profileButton?.addEventListener(
    "click",
    function(e) {

        e.stopPropagation();

        profileDropdown.classList.toggle(
            "show"
        );
    }
);

document.addEventListener(
    "click",
    function() {

        profileDropdown?.classList.remove(
            "show"
        );
    }
);

profileDropdown?.addEventListener(
    "click",
    function(e) {

        e.stopPropagation();
    }
);

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
                        data-bulan="${t.bulan}"
                        data-tahun="${t.tahun}"
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
        bulan: parseInt(btn.dataset.bulan),
        tahun: parseInt(btn.dataset.tahun),
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
// FORMAT TANGGAL (YYYY-MM-DD → DD-MM-YYYY)
// ======================================
function formatTanggal(isoDate, separator = "-") {

    if (!isoDate) return "-";

    const parts = isoDate.split("-");

    if (parts.length !== 3) return isoDate;

    const [year, month, day] = parts;

    return `${day}${separator}${month}${separator}${year}`;
}

// ======================================
// PROFILE STATUS HELPER (DROPDOWN ONLY)
// ======================================
function setProfileStatus(statusRaw) {

    const el =
        document.getElementById("profile-status");

    if (!el) return;

    const key =
        (statusRaw || "")
            .toString()
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "");

    let text = "Aktif";
    let cls = "aktif";

    if (key === "nonaktif") {
        text = "Nonaktif";
        cls = "nonaktif";
    }
    else if (key === "lulus") {
        text = "Lulus";
        cls = "lulus";
    }

    el.textContent = text;
    el.className = cls;
}

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

        // =========================
        // PROFILE DROPDOWN DATA
        // =========================

        document.getElementById(
            "profile-nama"
        ).textContent =
            siswa.nama || "-";

        document.getElementById(
            "profile-nisn"
        ).textContent =
            `NISN: ${siswa.nisn || "-"}`;

        document.getElementById(
            "profile-kelas"
        ).textContent =
            `${siswa.tingkat || "-"} - ${siswa.sub_kelas || ""}`;

        setProfileStatus(siswa.status);

        document.getElementById(
            "profile-ttl"
        ).textContent =
            siswa.tempat_lahir && siswa.tanggal_lahir
                ? `${siswa.tempat_lahir}, ${formatTanggal(siswa.tanggal_lahir)}`
                : "-";

        document.getElementById(
            "profile-orangtua"
        ).textContent =
            `${
                siswa.nama_ayah ||
                siswa.nama_ibu ||
                "-"
            }`;

        document.getElementById(
            "profile-alamat"
        ).textContent =
            siswa.alamat || "-";

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

        const status =
            (siswa.status || "AKTIF").toUpperCase();

        let dotClass = "status-active";

        if (status === "NONAKTIF") {
            dotClass = "status-inactive";
        }
        else if (status === "LULUS") {
            dotClass = "status-graduate";
        }

        statusEl.innerHTML = `
            <span class="status-dot ${dotClass}"></span>
            ${status.charAt(0) + status.slice(1).toLowerCase()}
        `;

        lucide.createIcons();

    } catch (err) {

        console.error(
            "Gagal memuat biodata siswa",
            err
        );
    }
}

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