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
        };

        hasil.appendChild(item);
    });

    hasil.style.display = "block";
});