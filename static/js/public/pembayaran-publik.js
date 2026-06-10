const input = document.getElementById("search-siswa");
const hasil = document.getElementById("hasil-siswa");

let selectedSiswa = null;
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

input.addEventListener("input", async () => {

    const q = input.value.trim();

    if (q.length < 1) {
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

            document.getElementById("siswa-nama").textContent = siswa.nama;

            document.getElementById("siswa-nisn").textContent = `NISN : ${siswa.nisn}`;

            document.getElementById("siswa-kelas").textContent = siswa.tingkat || "-";

            document.getElementById("siswa-rombel").textContent = siswa.sub_kelas || "-";

            document.getElementById("siswa-orangtua").textContent =
                siswa.nama_ayah?.trim() ||
                siswa.nama_ibu?.trim() ||
                "-";

            const statusRaw = (siswa.status || "").toLowerCase().trim();

            const badge = document.getElementById("siswa-badge");

            badge.textContent = statusMap[statusRaw] || "Aktif";
            badge.className = "student-badge " + badgeClass(statusRaw);

            document.getElementById("student-card").style.display = "block";
            document.getElementById("btn-cari").style.display = "block";
        };

        hasil.appendChild(item);
    });

    hasil.style.display = "block";
});

document.getElementById("btn-cari")
.addEventListener("click", () => {

    if (!selectedSiswa) {
        alert("Pilih siswa terlebih dahulu");
        return;
    }

    const siswaId =
        document.getElementById("selected-siswa-id").value;

    // redirect ke halaman tagihan siswa
    window.location.href =
        `/public/tagihan-siswa?siswa_id=${siswaId}`;
});

// ======================================
// HERO SCROLL SMOOTH PREMIUM
// ======================================

const btnHeroSearch =
    document.getElementById("btn-hero-search");

const cariSiswaSection =
    document.getElementById("cari-siswa");

if(btnHeroSearch && cariSiswaSection){

    btnHeroSearch.addEventListener("click", function(e){

        e.preventDefault();

        const targetPosition =
            cariSiswaSection.offsetTop - 100;

        const startPosition =
            window.pageYOffset;

        const distance =
            targetPosition - startPosition;

        const duration = 1800;

        let start = null;

        function animation(currentTime){

            if(start === null){
                start = currentTime;
            }

            const timeElapsed =
                currentTime - start;

            const progress =
                Math.min(timeElapsed / duration, 1);

            // easing super smooth
            const ease =
                1 - Math.pow(1 - progress, 4);

            window.scrollTo(
                0,
                startPosition + distance * ease
            );

            if(timeElapsed < duration){
                requestAnimationFrame(animation);
            }
        }

        requestAnimationFrame(animation);

    });

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

const menuToggle = document.getElementById('menuToggle');
const menuClose = document.getElementById('menuClose');
const menuOverlay = document.getElementById('menuOverlay');
const topbarMenu = document.getElementById('topbarMenu');

// Buka Menu
menuToggle.addEventListener('click', () => {
    topbarMenu.classList.add('active');
    menuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Kunci layar
});

// Tutup Menu
function closeMenu() {
    topbarMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
    document.body.style.overflow = 'auto'; // Buka layar
}

menuClose.addEventListener('click', closeMenu);
menuOverlay.addEventListener('click', closeMenu);