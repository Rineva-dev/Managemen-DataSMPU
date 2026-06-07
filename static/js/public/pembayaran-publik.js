const input = document.getElementById("search-siswa");
const hasil = document.getElementById("hasil-siswa");

let selectedSiswa = null;

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

            document.getElementById("siswa-badge").textContent =
                siswa.status || "Aktif";

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
        document.getElementById(
            "selected-siswa-id"
        ).value;

    console.log(
        "Ambil tagihan siswa:",
        siswaId
    );

    // nanti fetch ke backend
    /*
    const res = await fetch(
        `/public/tagihan/${siswaId}`
    );

    const data = await res.json();

    renderTagihan(data);
    */
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