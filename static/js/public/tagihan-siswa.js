// ======================================
// LUCIDE
// ======================================

lucide.createIcons();

// ======================================
// ELEMENT
// ======================================

const cartItems = document.querySelector(".cart-items");
const cartEmpty = document.querySelector(".cart-empty");
const cartTotal = document.getElementById("cart-total");
const cartCount = document.querySelector(".cart-count");

const toast = document.getElementById("toast");

const addButtons = document.querySelectorAll(".btn-add-cart");

// ======================================
// STATE
// ======================================

let cart = [];

// ======================================
// FORMAT RUPIAH
// ======================================

function rupiah(nominal) {

    return "Rp" + Number(nominal)
        .toLocaleString("id-ID");
}

// ======================================
// TOAST
// ======================================

function showToast(message = "Berhasil ditambahkan") {

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

    // EMPTY
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

function addToCart(data) {

    // =========================
    // CEK DUPLIKAT
    // =========================

    const exists = cart.find(item => item.id === data.id);

    if (exists) {

        showToast("Tagihan sudah ada di keranjang");

        return;
    }

    cart.push(data);

    renderCart();

    showToast("Tagihan ditambahkan");
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
// ADD BUTTON
// ======================================

addButtons.forEach((btn, index) => {

    btn.addEventListener("click", function() {

        const card = btn.closest(".bill-card");

        const nama = card.querySelector("h3").textContent.trim();

        const kategori =
            card.querySelector(".bill-category")
                .textContent.trim();

        const nominalText =
            card.querySelector(".bill-price")
                .textContent
                .replace(/[^\d]/g, "");

        const nominal = parseInt(nominalText);

        addToCart({
            id: index + 1,
            nama,
            kategori,
            nominal
        });
    });
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

    console.log("DATA CHECKOUT:", cart);

    alert(
        "Checkout berhasil diproses"
    );
});

// ======================================
// FILTER CHIP
// ======================================

const chips = document.querySelectorAll(".filter-chip");

chips.forEach(chip => {

    chip.addEventListener("click", function() {

        chips.forEach(c => {
            c.classList.remove("active");
        });

        chip.classList.add("active");
    });
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