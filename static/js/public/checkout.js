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

function rupiah(nominal) {

    return "Rp" + Number(nominal)
        .toLocaleString("id-ID");
}

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

                    <strong>
                        ${item.nama}
                    </strong>

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

renderCart();