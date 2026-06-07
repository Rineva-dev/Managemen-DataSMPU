const input = document.getElementById("search-siswa");
const hasil = document.getElementById("hasil-siswa");

let selectedSiswa = null;
const cardTagihan = document.getElementById("card-tagihan");
const tagihanList = document.getElementById("tagihan-list");
const tagihanCount = document.getElementById("tagihan-count");

const statusMap = {
    aktif: "Aktif",
    lulus: "Lulus",
    pindah: "Pindah",
    "non aktif": "Non Aktif",
    nonaktif: "Non Aktif",
    non_aktif: "Non Aktif"
};

function formatStatus(status) {
    if (!status) return "Non Aktif";

    const s = status.toLowerCase();

    if (s === "aktif") return "Aktif";
    if (s === "lulus") return "Lulus";
    if (s === "pindah") return "Pindah";
    if (s === "non aktif" || s === "nonaktif") return "Non Aktif";

    return status;
}

function badgeClass(status) {
    const s = (status || "").toLowerCase().trim();

    if (s === "aktif") return "success";
    if (s === "lulus") return "primary";
    if (s === "pindah") return "warning";
    if (s === "non aktif" || s === "nonaktif") return "danger";

    return "secondary";
}

const displayInput = document.getElementById("nominal_display");
const hiddenInput  = document.getElementById("nominal_value");

displayInput.addEventListener("input", function () {
    let angka = this.value.replace(/[^0-9]/g, "");

    hiddenInput.value = angka;
    this.value = formatRupiah(angka);
});

function formatRupiah(angka) {
    if (!angka) return "";
    return "Rp " + angka
        .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

input.addEventListener("input", async () => {

    const q = input.value.trim();

    if (q.length < 2) {
        hasil.style.display = "none";
        return;
    }

    const res = await fetch(
        `/public/search-siswa?q=${encodeURIComponent(q)}`
    );

    const data = await res.json();

    hasil.innerHTML = "";

    if (!data.length) {
        hasil.style.display = "none";
        return;
    }

    data.forEach(siswa => {

        const item = document.createElement("div");

        item.className = "siswa-option";

        item.innerHTML = `
            <div class="nama">
                ${siswa.nama}
            </div>

            <div class="nisn">
                ${siswa.nisn}
            </div>
        `;

        item.onclick = () => {

            selectedSiswa = siswa;

            document.getElementById(
                "selected-siswa-id"
            ).value = siswa.id;

            input.value =
                `${siswa.nisn} - ${siswa.nama}`;

            hasil.style.display = "none";

            document.getElementById("siswa-nama").textContent =
                siswa.nama;

            document.getElementById("siswa-nisn").textContent =
                `NISN : ${siswa.nisn}`;

            document.getElementById("siswa-kelas").textContent =
                siswa.tingkat || "-";

            document.getElementById("siswa-rombel").textContent =
                siswa.sub_kelas || "-";

            document.getElementById("siswa-orangtua").textContent =
                siswa.nama_ayah?.trim() ||
                siswa.nama_ibu?.trim() ||
                "-";

            const statusRaw = (siswa.status || "").toLowerCase().trim();

            const badge = document.getElementById("siswa-badge");

            badge.textContent = statusMap[statusRaw] || "Aktif";
            badge.className = "student-badge " + badgeClass(statusRaw);

            // tampilkan data siswa
            document.getElementById(
                "student-card"
            ).style.display = "block";

            // tampilkan tombol
            document.getElementById(
                "btn-cari"
            ).style.display = "block";
        };

        hasil.appendChild(item);
    });

    hasil.style.display = "block";
});

document.getElementById("btn-cari")
.addEventListener("click", async () => {

    if (!selectedSiswa) {
        alert("Pilih siswa terlebih dahulu");
        return;
    }

    const siswaId =
        document.getElementById("selected-siswa-id").value;

    cardTagihan.style.display = "block";
    tagihanList.innerHTML = "Memuat tagihan...";

    const res = await fetch(
        `/public/tagihan-spp?siswa_id=${siswaId}`
    );

    const data = await res.json();

    if (!Array.isArray(data)) {
        console.error("Tagihan error:", data);
        tagihanList.innerHTML = "<p>Gagal memuat tagihan.</p>";
        return;
    }

    tagihanList.innerHTML = "";
    tagihanCount.textContent = `${data.length} Tagihan`;

    if (data.length === 0) {
        tagihanList.innerHTML = "<p>Tidak ada tagihan.</p>";
        return;
    }

    data.forEach(t => {

        const bulanNama = new Date(
            t.tahun,
            t.bulan - 1
        ).toLocaleString("id-ID", { month: "long" });

        tagihanList.innerHTML += `
            <label class="tagihan-row">
                <input type="checkbox"
                       class="tagihan-checkbox"
                       data-nominal="${t.nominal}">
                <div class="tagihan-detail">
                    <strong>SPP ${bulanNama} ${t.tahun}</strong>
                    <small>${t.status}</small>
                </div>
                <span class="nominal">
                    Rp${t.nominal.toLocaleString("id-ID")}
                </span>
            </label>
        `;
    });

    // ===============================
    // LOAD TAGIHAN PEMBANGUNAN
    // ===============================
    try {
        const resP = await fetch(
            `/public/tagihan-pembangunan?siswa_id=${siswaId}`
        );

        const pembangunan = await resP.json();

        if (pembangunan && typeof pembangunan === "object") {
            renderPembangunan(pembangunan);
        }

    } catch (err) {
        console.error("Gagal load pembangunan:", err);
    }

    hitungTotal();
});

input.addEventListener("input", async () => {

    selectedSiswa = null;

    document.getElementById(
        "student-card"
    ).style.display = "none";

    document.getElementById(
        "btn-cari"
    ).style.display = "none";

    // kode pencarian yang sudah ada...
});

function hitungTotal() {

    let total = 0;

    document
        .querySelectorAll(".tagihan-checkbox:checked")
        .forEach(cb => {
            total += parseInt(cb.dataset.nominal);
        });

    document.getElementById("grand-total").textContent =
        "Rp" + total.toLocaleString("id-ID");
}

document.addEventListener("change", e => {
    if (e.target.classList.contains("tagihan-checkbox")) {
        hitungTotal();
    }
});

function renderPembangunan(data) {

    const card = document.getElementById("card-pembangunan");
    const content = document.getElementById("pembangunan-content");

    card.style.display = "block";

    if (data.lunas) {
        document.getElementById("pembangunan-status").textContent = "Lunas";
    } else {
        document.getElementById("pembangunan-status").textContent = "Belum Lunas";
    }

    content.innerHTML = `
        <div class="cicilan-grid">
            <div class="info-box">
                <span>Target</span>
                <strong>Rp${data.total.toLocaleString("id-ID")}</strong>
            </div>
            <div class="info-box">
                <span>Sudah Dibayar</span>
                <strong>Rp${(data.sem1.terbayar + data.sem2.terbayar)
                    .toLocaleString("id-ID")}</strong>
            </div>
            <div class="info-box">
                <span>Sisa</span>
                <strong>Rp${(data.sem1.sisa + data.sem2.sisa)
                    .toLocaleString("id-ID")}</strong>
            </div>
        </div>

        <div class="custom-payment">
            <label>Nominal Pembayaran</label>
            <input type="text" id="nominal_display" placeholder="Rp 0">
            <input type="hidden" id="nominal_value" name="nominal">
        </div>
    `;
}