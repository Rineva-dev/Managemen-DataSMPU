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

const cartItems =
    document.querySelector(".cart-items");

const cartEmpty =
    document.querySelector(".cart-empty");

const cartTotal =
    document.getElementById("cart-total");

const cartCount =
    document.querySelector(".cart-count");

const toast =
    document.getElementById("toast");

// ======================================
// STATE
// ======================================

let cart = [];

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

    cartItems.innerHTML = "";

    if (cart.length === 0) {

        cartEmpty.style.display = "flex";

        updateCartTotal();

        return;
    }

    cartEmpty.style.display = "none";

    cart.forEach((item, index) => {

        const div = document.createElement("div");

        div.className = "cart-item";

        div.innerHTML = `
            <div class="cart-item-left">

                <div class="cart-item-icon">

                    <i data-lucide="receipt"></i>

                </div>

                <div>

                    <strong>
                        ${item.nama}
                    </strong>

                    <small>
                        ${item.kategori}
                    </small>

                </div>

            </div>

            <div class="cart-item-right">

                <strong>
                    ${rupiah(item.nominal)}
                </strong>

                <button
                    class="btn-remove"
                    data-index="${index}">

                    <i data-lucide="trash-2"></i>

                </button>

            </div>
        `;

        cartItems.appendChild(div);
    });

    lucide.createIcons();

    updateCartTotal();
}

// ======================================
// ADD TO CART
// ======================================
function addToCart(data, buttonElement) {

    const exists = cart.find(item => item.id === data.id);

    if (exists) {

        showToast("Tagihan sudah ada");

        return;
    }

    cart.push(data);

    // =========================
    // UBAH BUTTON
    // =========================

    buttonElement.classList.add("added");

    buttonElement.disabled = true;

    buttonElement.innerHTML = `
        <i data-lucide="check"></i>

        <span>
            Ditambahkan
        </span>
    `;

    lucide.createIcons();

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

    cart.splice(index, 1);

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

        if (!Array.isArray(data) || data.length === 0) {

            billGrid.innerHTML = `
                <div class="empty-tagihan">
                    Tidak ada tagihan
                </div>
            `;

            return;
        }

        data.forEach((t, index) => {

            const bulanNama = new Date(
                t.tahun,
                t.bulan - 1
            ).toLocaleString("id-ID", {
                month: "long"
            });

            const card = document.createElement("div");

            card.className = "bill-card";

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
                        data-id="${index}"
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

// ======================================
// ADD BUTTON DYNAMIC
// ======================================
document.addEventListener("click", function(e) {

    const btn = e.target.closest(".btn-add-cart");

    if (!btn) return;

    addToCart({
        id: btn.dataset.id,
        nama: btn.dataset.nama,
        kategori: btn.dataset.kategori,
        nominal: parseInt(btn.dataset.nominal)
    }, btn);
});

// ======================================
// CHECKOUT
// ======================================

document.querySelector(".btn-checkout")
.addEventListener("click", function() {

    if (cart.length === 0) {

        alert("Keranjang masih kosong");

        return;
    }

    console.log(cart);

    alert("Checkout berhasil");
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
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
});

// ======================================
// INIT
// ======================================

renderCart();

loadTagihanSPP();