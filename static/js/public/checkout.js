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
loadBiodataSiswa();
renderCart();