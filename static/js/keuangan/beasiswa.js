/* =========================
   OPEN CLOSE MODAL
========================= */
function openTambahBeasiswa(){document.getElementById("modalBeasiswa").classList.add("show");}
function closeModalBeasiswa(){document.getElementById("modalBeasiswa").classList.remove("show");}

/* =========================
   BUILD DROPDOWN
========================= */
function buildTargetDropdown(data, mode, placeholder){
    let htmlItems = "";
    data.forEach(item => {
        let label = "";
        let value = "";
        if(mode === "siswa"){
            label = item.nama;
            value = item.id;
        }
        if(mode === "kelas"){
            label = item.tingkat + " " + item.sub_kelas;
            value = item.id;
        }
        if(mode === "angkatan"){
            label = "Angkatan " + item.tahun_masuk;
            value = item.tahun_masuk;
        }
        htmlItems += `
            <label class="item-target">
                <input type="checkbox" name="target_ids" value="${value}"
                    onchange="updateSelected(); sortCheckedItems()">
                ${label}
            </label>
        `;
    });

    const wrapper = document.getElementById("targetWrapper");
    if(!wrapper) return;

    wrapper.innerHTML = `
        <div class="form-group">
            <label>Pilih ${mode}</label>
            <div class="target-search-wrapper">
                <input type="text" id="searchTarget" placeholder="${placeholder}">
                <div class="search-dropdown" id="resultDropdown">
                    ${htmlItems}
                </div>
            </div>
            <small id="selectedText">Belum ada dipilih</small>
        </div>
    `;
    initSearchDropdown();
}

/* =========================
   JUMLAH DIPILIH
========================= */
function updateSelected(){
    const checked = document.querySelectorAll('input[name="target_ids"]:checked');
    const el = document.getElementById("selectedText");
    if(el) el.innerText = checked.length + " dipilih";
}

/* =========================
   SEARCH DROPDOWN
========================= */
function initSearchDropdown(){
    const search = document.getElementById("searchTarget");
    const dropdown = document.getElementById("resultDropdown");
    if(!search || !dropdown) return;

    const items = dropdown.querySelectorAll(".item-target");

    // Hapus event lama agar tidak menumpuk
    search.onfocus = null;
    search.onkeyup = null;

    search.addEventListener("focus", function(e){
        e.stopPropagation();
        sortCheckedItems();
        dropdown.classList.add("show");
    });

    search.addEventListener("keyup", function(){
        const keyword = this.value.toLowerCase();
        items.forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(keyword) ? "block" : "none";
        });
    });
}

/* =========================
   URUTKAN CHECKED
========================= */
function sortCheckedItems(){
    const dropdown = document.getElementById("resultDropdown");
    if(!dropdown) return;

    const items = Array.from(dropdown.querySelectorAll(".item-target"));
    const checked = items.filter(i => i.querySelector("input").checked);
    const unchecked = items.filter(i => !i.querySelector("input").checked);

    dropdown.innerHTML = "";
    checked.forEach(i => dropdown.appendChild(i));
    unchecked.forEach(i => dropdown.appendChild(i));
}

/* =========================
   MODAL PENERIMA
========================= */
function openPenerimaBeasiswa(id){
    fetch(`/get-penerima-beasiswa/${id}`)
    .then(res => res.json())
    .then(data => {
        let html = `
            <table>
                <thead><tr><th>NISN</th><th>Nama</th><th>Kelas</th><th>Alamat</th></tr></thead>
                <tbody>
        `;
        data.forEach(item => {
            html += `
                <tr>
                    <td>${item.nisn}</td>
                    <td>${item.nama}</td>
                    <td>${item.tingkat} ${item.sub_kelas}</td>
                    <td>${item.alamat}</td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        document.getElementById("listPenerimaBeasiswa").innerHTML = html;
        document.getElementById("modalPenerimaBeasiswa").classList.add("show");
    });
}

function closePenerimaBeasiswa(){
    document.getElementById("modalPenerimaBeasiswa").classList.remove("show");
}

/* =========================
   PREVIEW
========================= */
const previewPembayaran = document.getElementById("selectedJenisPembayaran");
const previewPenerima = document.getElementById("selectedPenerima");
const previewPotongan = document.getElementById("selectedJenisPotongan");

// Jalankan inisialisasi saat modal selesai dibuka
document.addEventListener("DOMContentLoaded", function(){
    initCustomDropdown("jenisPembayaranDropdown", "jenisPembayaranValue");
    initCustomDropdown("targetDropdown", "beasiswaTargetType", function(value){
        let data = [], mode = "", placeholder = "";
        if(value === "siswa") { data = daftarSiswa; mode = "siswa"; placeholder = "Cari siswa"; }
        if(value === "kelas") { data = daftarKelas; mode = "kelas"; placeholder = "Cari kelas"; }
        if(value === "angkatan") { data = daftarAngkatan; mode = "angkatan"; placeholder = "Cari angkatan"; }
        buildTargetDropdown(data, mode, placeholder);
    });
    initCustomDropdown("potonganDropdown", "jenisPotonganValue");
});

// Inisialisasi ulang setiap kali modal dibuka
const originalOpenTambah = openTambahBeasiswa;
openTambahBeasiswa = function(){
    originalOpenTambah();
    // Beri jeda sebentar agar elemen sudah terlihat
    setTimeout(() => {
        initCustomDropdown("jenisPembayaranDropdown", "jenisPembayaranValue");
        initCustomDropdown("targetDropdown", "beasiswaTargetType", function(value){
            let data = [], mode = "", placeholder = "";
            if(value === "siswa") { data = daftarSiswa; mode = "siswa"; placeholder = "Cari siswa"; }
            if(value === "kelas") { data = daftarKelas; mode = "kelas"; placeholder = "Cari kelas"; }
            if(value === "angkatan") { data = daftarAngkatan; mode = "angkatan"; placeholder = "Cari angkatan"; }
            buildTargetDropdown(data, mode, placeholder);
        });
        initCustomDropdown("potonganDropdown", "jenisPotonganValue");
    }, 50);
};

/* =========================
   CUSTOM DROPDOWN UTAMA
========================= */
function initCustomDropdown(dropdownId, hiddenInputId, callback = null){
    const dropdown = document.getElementById(dropdownId);
    if(!dropdown) return;

    const selected = dropdown.querySelector(".dropdown-selected");
    const options = dropdown.querySelectorAll(".dropdown-option");
    const hiddenInput = document.getElementById(hiddenInputId);
    let currentIndex = -1;

    // Hapus event lama agar tidak menumpuk
    selected.onclick = null;
    selected.onkeydown = null;
    options.forEach(opt => opt.onclick = null);

    // Buka/Tutup
    selected.addEventListener("click", function(e){
        e.stopPropagation();
        e.preventDefault();
        dropdown.classList.toggle("active");
        if(dropdown.classList.contains("active")){
            currentIndex = 0;
            highlightOption();
        } else {
            currentIndex = -1;
        }
    });

    // Pilih opsi
    options.forEach((option, index) => {
        option.addEventListener("click", function(e){
            e.stopPropagation();
            pilihOption(index);
        });
    });

    // Navigasi keyboard
    selected.addEventListener("keydown", function(e){
        if(e.key === "ArrowDown"){
            e.preventDefault();
            if(!dropdown.classList.contains("active")){
                dropdown.classList.add("active");
                currentIndex = 0;
            } else {
                if(currentIndex < options.length - 1) currentIndex++;
            }
            highlightOption();
        }
        if(e.key === "ArrowUp"){
            e.preventDefault();
            if(!dropdown.classList.contains("active")){
                dropdown.classList.add("active");
                currentIndex = options.length - 1;
            } else {
                if(currentIndex > 0) currentIndex--;
            }
            highlightOption();
        }
        if(e.key === "Enter"){
            e.preventDefault();
            if(currentIndex >= 0) pilihOption(currentIndex);
        }
        if(e.key === "Escape" || e.key === "Tab"){
            dropdown.classList.remove("active");
            selected.focus();
            currentIndex = -1;
        }
    });

    function highlightOption(){
        options.forEach(opt => opt.classList.remove("active"));
        if(options[currentIndex]){
            options[currentIndex].classList.add("active");
            options[currentIndex].scrollIntoView({ block: "nearest" });
        }
    }

    function pilihOption(index){
        updateSelection(index);
        dropdown.classList.remove("active");
        selected.focus();
        currentIndex = -1;
        if(callback) callback(hiddenInput.value);
    }

    function updateSelection(index){
        const option = options[index];
        const text = option.textContent.trim();
        const value = option.dataset.value;
        selected.querySelector(".selected-text").innerText = text;
        hiddenInput.value = value;
    }
}

/* =========================
   PENUTUP KLIK LUAR (SATU KALI SAJA)
========================= */
document.addEventListener("click", function(e){
    // Tutup semua dropdown jika klik di luar
    document.querySelectorAll(".custom-dropdown.active").forEach(drop => {
        if(!drop.contains(e.target)){
            drop.classList.remove("active");
        }
    });

    // Tutup search dropdown
    const searchDropdown = document.getElementById("resultDropdown");
    const searchInput = document.getElementById("searchTarget");
    if(searchDropdown && searchInput && !searchInput.parentElement.contains(e.target)){
        searchDropdown.classList.remove("show");
    }
});