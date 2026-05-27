let currentPage = 1;
let perPage = parseInt(document.getElementById("kelas-per-page")?.value) || 10;
let selectedKelas = null;
let mapelKelasCache = [];

const HARI_ORDER = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu"
];

// ===============================
// ELEMENT SELECTOR
// ===============================
const tahunDropdownWrapper = document.getElementById("kelasTahunDropdown");
const addBtn = document.getElementById("add-kelas-btn");
const modal = document.getElementById("kelas-form-container");
const closeBtns = document.querySelectorAll(".modern-close");
const cancelBtn = document.getElementById("kelas-cancel");
const saveBtn = document.getElementById("kelas-save");

const kelasIdInput = document.getElementById("kelas-id");
const tahunIdInput = document.getElementById("kelas-tahun-id");
const tingkatInput = document.getElementById("kelas-tingkat");
const subInput = document.getElementById("kelas-sub");
const waliInput = document.getElementById("kelas-wali");

const rombelModal = document.getElementById("siswa-rombel-modal");
const rombelCloseBtns = document.querySelectorAll(".rombel-close");
const rombelTitleInfo = document.getElementById("rombel-kelas-info");

const siswaKelasList = document.getElementById("siswa-kelas-list");
const siswaAvailableList = document.getElementById("siswa-available-list");

const addToKelasBtn = document.getElementById("add-to-kelas");
const removeFromKelasBtn = document.getElementById("remove-from-kelas");

const saveRombelBtn = document.getElementById("save-rombel");

const kelasPagination = document.getElementById("kelas-pagination");
const kelasTableBody = document.querySelector("#kelas-table tbody");
const kelasPerPageInput = document.getElementById("kelas-per-page");
const perPageUp = document.getElementById("perpage-up");
const perPageDown = document.getElementById("perpage-down");

const editTopBtn   = document.getElementById("edit-kelas-btn");
const siswaTopBtn  = document.getElementById("siswa-kelas-btn");
const mapelTopBtn  = document.getElementById("mapel-kelas-btn");
const deleteTopBtn = document.getElementById("delete-kelas-btn");

const mapelModal = document.getElementById("mapel-kelas-modal");
const mapelBody  = document.getElementById("mapel-kelas-body");

const saveMapelBtn   = document.getElementById("save-mapel-kelas");
const cancelMapelBtn = document.getElementById("cancel-mapel-kelas");

const jadwalTopBtn = document.getElementById("jadwal-kelas-btn");

let currentKelasId = null;
let originalRows = [];

document.addEventListener("DOMContentLoaded", () => {

    const rows = document.querySelectorAll("#kelas-table tbody tr");

    originalRows = Array.from(rows).map(row => row.cloneNode(true));

    renderTable();
});

function enableActionButtons() {
    editTopBtn.disabled   = false;
    siswaTopBtn.disabled  = false;
    mapelTopBtn.disabled  = false;
    jadwalTopBtn.disabled = false;
    deleteTopBtn.disabled = false;
}

function disableActionButtons() {
    editTopBtn.disabled   = true;
    siswaTopBtn.disabled  = true;
    mapelTopBtn.disabled  = true;
    jadwalTopBtn.disabled = true;
    deleteTopBtn.disabled = true;
}


function renderTable() {

    const allRows = originalRows;

    const totalPages = Math.ceil(allRows.length / perPage);

    if (currentPage > totalPages) currentPage = totalPages || 1;

    const start = (currentPage - 1) * perPage;
    const end = start + perPage;

    const pageRows = allRows.slice(start, end);

    kelasTableBody.innerHTML = "";

    pageRows.forEach(row => {
        kelasTableBody.appendChild(row.cloneNode(true));
    });

    document.getElementById("kelas-total-data").textContent = allRows.length;

    renderPagination(totalPages);

    lucide.createIcons();
}

function renderPagination(totalPages) {

    kelasPagination.innerHTML = "";

    // PREV
    const prev = document.createElement("button");
    prev.textContent = "Prev";
    prev.disabled = currentPage === 1;

    prev.onclick = () => {
        currentPage--;
        renderTable();
    };

    kelasPagination.appendChild(prev);

    // PAGE NUMBER
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;

        if (i === currentPage) {
            btn.classList.add("active");
        }

        btn.onclick = () => {
            currentPage = i;
            renderTable();
        };

        kelasPagination.appendChild(btn);
    }

    // NEXT
    const next = document.createElement("button");
    next.textContent = "Next";
    next.disabled = currentPage === totalPages;

    next.onclick = () => {
        currentPage++;
        renderTable();
    };

    kelasPagination.appendChild(next);
}

if (kelasPerPageInput) {
    kelasPerPageInput.addEventListener("change", () => {
        perPage = parseInt(kelasPerPageInput.value) || 10;
        currentPage = 1;
        renderTable();
    });
}

perPageUp.addEventListener("click", function () {
    kelasPerPageInput.stepUp();
    perPage = parseInt(kelasPerPageInput.value) || 10;
    currentPage = 1;
    renderTable();
});

perPageDown.addEventListener("click", function () {
    if (kelasPerPageInput.value > 1) {
        kelasPerPageInput.stepDown();
        perPage = parseInt(kelasPerPageInput.value) || 10;
        currentPage = 1;
        renderTable();
    }
});


// ===============================
// GANTI TAHUN (RELOAD CONTEXT)
// ===============================
if (tahunDropdownWrapper) {
    tahunDropdownWrapper.addEventListener("change", function () {

        const tahunId = document.getElementById("kelas-tahun-dropdown").value;

        if (tahunId) {
            window.location.href = `/sekolah/kelas?tahun_id=${tahunId}`;
        }

    });
}

// ===============================
// OPEN MODAL TAMBAH
// ===============================
if (addBtn) {
    addBtn.addEventListener("click", function () {

        unlockTingkat();

        kelasIdInput.value = "";
        tingkatInput.value = "";
        subInput.value = "";
        waliInput.value = "";

        if (tingkatSelectedText) {
            tingkatSelectedText.innerText = "Pilih Tingkat";
        }

        document.querySelector("#kelas-wali")
            .closest(".custom-dropdown")
            .querySelector(".selected-text")
            .innerText = "Pilih Wali Kelas";

        document.getElementById("kelas-form-title").innerText = "Tambah Kelas";
        modal.classList.add("show");
    });
}

// ===============================
// CLOSE MODAL
// ===============================

function closeModal() {
    modal.classList.remove("show");

    // reset lock state
    unlockTingkat();
}

closeBtns.forEach(btn => {
    btn.addEventListener("click", function(){

        const modal =
            btn.closest(".saas-modal-overlay") ||
            btn.closest(".mapel-modal-overlay") ||
            btn.closest(".rombel-overlay");

        if (modal) {
            modal.classList.remove("show");
        }

    });
});

if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

window.addEventListener("click", function (e) {
    if (e.target === modal) {
        closeModal();
    }
});


// ===============================
// SAVE KELAS (ADD / EDIT)
// ===============================

if (saveBtn) {
    saveBtn.addEventListener("click", async function () {

        const id = kelasIdInput.value;
        const tahun_id = tahunIdInput.value;
        const tingkat = tingkatInput.value;
        const sub_kelas = subInput.value.trim();
        const wali_kelas_id = waliInput.value;

        if (!tingkat || !sub_kelas || !wali_kelas_id) {
            showNotification("Semua field wajib diisi!", "warning");
            return;
        }

        const url = id ? `/sekolah/kelas/update/${id}` : "/sekolah/kelas/create";

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                body: JSON.stringify({
                    tahun_id,
                    tingkat,
                    sub_kelas,
                    wali_kelas_id
                }),
            });

            const result = await response.json();

            if (result.success) {
                location.reload();
            } else {
                showNotification(result.message || "Gagal menyimpan data.", "error");
            }

        } catch (error) {
            console.error("Error:", error);
            showNotification("Terjadi kesalahan server.");
        }
    });
}

const tingkatDropdown = document.getElementById('kelasTingkatDropdown');
const tingkatHidden = document.getElementById('kelas-tingkat');
const tingkatSelectedText = tingkatDropdown?.querySelector('.selected-text');

function lockTingkat() {
    if (!tingkatDropdown) return;
    tingkatDropdown.classList.add('locked');
}

function unlockTingkat() {
    if (!tingkatDropdown) return;
    tingkatDropdown.classList.remove('locked');
}

// ================= KLIK ROW =================
document.addEventListener("click", function(e){

    const row = e.target.closest("#kelas-table tbody tr");
    if (!row) return;

    const kelasId = row.dataset.id;

    if (!kelasId) return;

    const tingkat = row.children[1].innerText.trim();
    const namaKelas = row.children[2].innerText.trim();

    selectedKelas = {
        id: kelasId,
        tingkat,
        nama: namaKelas
    };

    // highlight
    document.querySelectorAll("#kelas-table tbody tr")
        .forEach(r => r.classList.remove("active-row"));

    row.classList.add("active-row");

    // aktifkan toolbar
    enableActionButtons();

    // load panel kanan
    loadDetailSiswa(kelasId, tingkat, namaKelas);
});

editTopBtn.addEventListener("click", () => {
    if (!selectedKelas) return;
    handleEdit(selectedKelas.id);
});

siswaTopBtn.addEventListener("click", () => {
    if (!selectedKelas) return;

    currentKelasId = selectedKelas.id;
    rombelTitleInfo.innerText =
        `${selectedKelas.tingkat} ${selectedKelas.nama}`;

    rombelModal.classList.add("show");
    loadRombelData(selectedKelas.id, selectedKelas.tingkat);
});

deleteTopBtn.addEventListener("click", () => {
    if (!selectedKelas) return;
    handleDelete(selectedKelas.id);
});

mapelTopBtn.addEventListener("click", async () => {
    if (!selectedKelas) return;

    const title = mapelModal.querySelector(".modal-title h3");
    title.innerText = `Manajemen Mata Pelajaran Kelas ${selectedKelas.tingkat}-${selectedKelas.nama}`;

    mapelModal.classList.add("show");

    await loadMapelKelas(selectedKelas.id);
});

async function handleEdit(id) {

    try {
        const response = await fetch(`/sekolah/kelas/detail/${id}`);
        const data = await response.json();

        if (!data.success) {
            showNotification("Data tidak ditemukan", "error");
            return;
        }

        kelasIdInput.value = data.kelas.id;
        tingkatInput.value = data.kelas.tingkat;
        subInput.value = data.kelas.sub_kelas;
        waliInput.value = data.kelas.wali_kelas_id;

        lockTingkat();

        tingkatSelectedText.innerText = data.kelas.tingkat;

        document.querySelector("#kelas-tingkat")
            .closest(".custom-dropdown")
            .querySelector(".selected-text")
            .innerText = data.kelas.tingkat;

        const waliDropdown = document.querySelector("#kelas-wali")
            .closest(".custom-dropdown");

        const waliSelected = waliDropdown.querySelector(".selected-text");

        const waliOption = waliDropdown.querySelector(
            `.dropdown-option[data-value="${data.kelas.wali_kelas_id}"]`
        );

        if (waliOption) {
            waliSelected.innerHTML = "";

            const span = document.createElement("span");
            span.className = "selected-text-inner";
            span.textContent = waliOption.innerText;

            waliSelected.appendChild(span);

            setTimeout(() => {
                span.style.display = "block";
                span.style.lineHeight = "40px";
            }, 0);
        }

        document.getElementById("kelas-form-title").innerText = "Edit Kelas";
        modal.classList.add("show");

    } catch (error) {
        console.error(error);
        showNotification("Gagal mengambil data.", "error");
    }
}

async function handleDelete(id) {

    const confirmed = await showConfirm("Yakin ingin menghapus kelas ini?");
    if (!confirmed) return;

    try {
        const response = await fetch(`/sekolah/kelas/delete/${id}`, {
            method: "POST",
            headers: {
                "X-CSRFToken": csrfToken
            }
        });

        const result = await response.json();

        if (result.success) {
            showNotification("Kelas berhasil dihapus", "success");
            location.reload();
        } else {
            showNotification(result.message, "error");
        }

    } catch (error) {
        console.error(error);
        showNotification("Gagal menghapus kelas.", "error");
    }
}

async function loadRombelData(kelasId, tingkat) {

    try {

        const response = await fetch(`/sekolah/kelas/rombel/${kelasId}?tingkat=${tingkat}`);
        const data = await response.json();

        siswaKelasList.innerHTML = "";
        siswaAvailableList.innerHTML = "";

        // =====================
        // SISWA DI KELAS
        // =====================
        data.siswa_kelas.forEach(s => {
            siswaKelasList.insertAdjacentHTML("beforeend", `
                <label class="siswa-item">
                    <input type="checkbox" value="${s.id}">
                    <span>${s.nama}</span>
                </label>
            `);
        });

        // =====================
        // SISWA BELUM KELAS
        // =====================
        data.siswa_available.forEach(s => {
            siswaAvailableList.insertAdjacentHTML("beforeend", `
                <label class="siswa-item">
                    <input type="checkbox" value="${s.id}">
                    <span>${s.nama}</span>
                </label>
            `);
        });

    } catch (error) {
        console.error(error);
        showNotification("Gagal memuat data siswa", "error");
    }
}

function getMapelNamaById(id) {
    const row = document.querySelector(
        `#mapel-kelas-body tr[data-id="${id}"]`
    );
    return row ? row.children[1].innerText : "";
}

function getGuruIdByMapel(mapelId) {
    const item = mapelKelasCache.find(
        m => String(m.mapel_id) === String(mapelId)
    );
    return item ? item.guru_id : null;
}

async function loadMapelKelas(kelasId) {
    
    try {
        const res = await fetch(`/sekolah/kelas/api/${kelasId}/mapel`);
        const data = await res.json();

        window._mapelMaster = data.mapel;

        mapelBody.innerHTML = "";

        const wajib = data.mapel.filter(m => m.jenis === "wajib");
        const mulok = data.mapel.filter(m => m.jenis === "mulok");

        mapelKelasCache = data.mapel.map(m => {

            const savedItem =
                (data.mapel_kelas || [])
                .find(x => x.mapel_id === m.id);

            return {
                mapel_id: m.id,
                nama: m.nama,
                jenis: m.jenis,
                guru_id: savedItem?.guru_id || null,
                jp: savedItem?.jp || 0
            };
        });

        // ======================
        // RENDER FUNCTION
        // ======================
        const renderRows = (list, startIndex = 1) => {
            return list.map((m, i) => `

                <tr data-id="${m.id}">

                    <td>${startIndex + i}</td>

                    <td>${m.nama}</td>

                    <td>
                        <select class="guru-select" style="width:250px; height:40px; border-radius:5px; padding-top:0!important; padding-bottom:0!important; padding-left:5px;">
                            <option value="">-</option>

                            ${data.guru.map(g => `
                                <option value="${g.id}">
                                    ${g.nama}
                                </option>
                            `).join("")}
                        
                        </select>
                    </td>

                    <td>
                        <input 
                            type="number"
                            class="jp-input"
                            min="0"
                            value="0"
                            style="width:50px; height:40px; padding-left:12px; padding-right:5px; border-radius:5px;">
                    </td>

                    
                </tr>

            `).join("");
        };

        // ======================
        // RENDER WAJIB
        // ======================

        if (wajib.length) {

            mapelBody.insertAdjacentHTML("beforeend", `
                <tr class="group-header" style="background-color:#f0f8ff; height:40px; font-weight:bold;">
                    <td class="group-label" style="padding:10px 5px;">A</td>
                    <td class="group-title" colspan="5" style="padding:10px 5px; font-weight:bold;">
                        Mata Pelajaran Wajib
                    </td>
                </tr>
            `);

            mapelBody.insertAdjacentHTML(
                "beforeend",
                renderRows(wajib, 1)
            );
        }

        // ======================
        // RENDER MULOK
        // ======================

        if (mulok.length) {

            mapelBody.insertAdjacentHTML("beforeend", `
                <tr class="group-header" style="background-color:#ffe4e1; height:40px; font-weight:bold;">
                    <td class="group-label" style="padding:10px 5px;">B</td>
                    <td class="group-title" colspan="5" style="padding:10px 5px; font-weight:bold;">
                        Muatan Lokal
                    </td>
                </tr>
            `);

            mapelBody.insertAdjacentHTML(
                "beforeend",
                renderRows(mulok, 1)
            );
        }

        // ======================
        // 🔥 ISI DATA DARI CACHE
        // ======================

        mapelKelasCache.forEach(item => {

            const row = document.querySelector(
                `tr[data-id="${item.mapel_id}"]`
            );

            if (!row) return;

            if (item.guru_id) {
                row.querySelector(".guru-select").value =
                    item.guru_id;
            }

            row.querySelector(".jp-input").value =
                item.jp || 0;

            // disable guru jika JP 0
            row.querySelector(".guru-select").disabled =
                item.jp <= 0;
        });

        updateHariOptions();

    } catch (err) {

        console.error(err);
        showNotification("Gagal load mapel", "error");

    }

}

document.addEventListener("input", function (e) {

    if (!e.target.classList.contains("jp-input")) return;

    const row = e.target.closest("tr");
    const mapelId = parseInt(row.dataset.id);
    const jp = parseInt(e.target.value) || 0;

    // 🔥 PASTI ADA DI CACHE SEKARANG
    const item = mapelKelasCache.find(
        m => m.mapel_id === mapelId
    );

    if (item) {
        item.jp = jp;
    }

    row.querySelector(".guru-select").disabled = jp === 0;

    refreshMapelDropdowns();
});

function refreshMapelDropdowns() {

    document.querySelectorAll(".mapel-select").forEach(select => {

        const current = select.value;

        select.innerHTML = `
            <option value="">Pilih Mapel</option>
            ${getMapelOptions()}
        `;

        // restore jika masih valid
        if (
            current &&
            mapelKelasCache.some(m => String(m.mapel_id) === current && m.jp > 0)
        ) {
            select.value = current;
        }
    });
}

// ==============================
// HARI HANYA BOLEH 1x
// ==============================

document.addEventListener("change", function(e){

    if (!e.target.classList.contains("hari-select")) return;

    updateHariOptions();

});

function updateHariOptions() {

    const selects =
        document.querySelectorAll(".hari-select");

    if (!selects.length) return;

    const usedHari = [];

    // ambil hari dipakai
    selects.forEach(sel => {

        if (sel.value) {
            usedHari.push(sel.value);
        }

    });

    // update dropdown
    selects.forEach(sel => {

        const currentValue = sel.value;

        Array.from(sel.options).forEach(opt => {

            if (!opt.value) return;

            if (
                usedHari.includes(opt.value) &&
                opt.value !== currentValue
            ) {

                opt.disabled = true;

            } else {

                opt.disabled = false;

            }

        });

    });

}
saveMapelBtn.addEventListener("click", async () => {

    const rows = document.querySelectorAll("#mapel-kelas-body tr:not(.group-header)");

    const payload = [];

    rows.forEach(row => {

        const mapel_id   = row.dataset.id;
        const guru_id    = row.querySelector(".guru-select").value;
        const jp         = parseInt(row.querySelector(".jp-input").value) || 0;

        // 🔥 RULE UTAMA
        if (jp > 0) {
            payload.push({
                mapel_id,
                guru_id,
                jp
            });
        }
    });

    try {

        const res = await fetch("/sekolah/kelas/api/mapel/save", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({
                kelas_id: selectedKelas.id,
                data: payload
            })
        });

        const result = await res.json();

        if (result.success) {
            showNotification("Berhasil simpan mapel", "success");
            mapelModal.classList.remove("show");
        }

    } catch (err) {
        console.error(err);
        showNotification("Gagal simpan", "error");
    }

    // =============================
    // VALIDASI FRONTEND
    // =============================

    const usedSlots = [];

    for (const row of rows) {

        const hari = row.querySelector(".hari-select")?.value;
        const mulai = row.querySelector(".jam-mulai")?.value;
        const selesai = row.querySelector(".jam-selesai")?.value;

        if (!hari || !mulai || !selesai) continue;

        const slot = `${hari}-${mulai}-${selesai}`;

        if (usedSlots.includes(slot)) {
            showNotification(
                "Jam bentrok di hari yang sama!",
                "warning"
            );
            return;
        }

        usedSlots.push(slot);
    }
});

cancelMapelBtn.addEventListener("click", () => {
    mapelModal.classList.remove("show");
});

mapelModal.querySelector(".modern-close")
.addEventListener("click", () => {
    mapelModal.classList.remove("show");
});

document.addEventListener("input", function(e){

    if (!e.target.classList.contains("jp-input")) return;

    const row = e.target.closest("tr");
    const jp = parseInt(e.target.value) || 0;

    const inputs = row.querySelectorAll(
        ".guru-select"
    );

    inputs.forEach(el => {
        el.disabled = jp === 0;
    });
});

addToKelasBtn.addEventListener("click", function(){
    const selected = siswaAvailableList.querySelectorAll("input:checked");
    selected.forEach(cb=>{
        const item = cb.closest(".siswa-item");
        cb.checked = false;
        siswaKelasList.appendChild(item);
    });
});

removeFromKelasBtn.addEventListener("click", function(){
    const selected = siswaKelasList.querySelectorAll("input:checked");
    selected.forEach(cb=>{
        const item = cb.closest(".siswa-item");
        cb.checked = false;
        siswaAvailableList.appendChild(item);
    });
});

saveRombelBtn.addEventListener("click", async function(){

    const siswaIds = [];

    siswaKelasList.querySelectorAll("input").forEach(cb=>{
        const id = cb.value;

        if(id){
            siswaIds.push(parseInt(id));
        }
    });

    try {

        const response = await fetch("/sekolah/kelas/update-rombel", {
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({
                kelas_id: currentKelasId,
                siswa_ids: siswaIds
            })
        });

        const result = await response.json();

        if(result.success){
            location.reload();
        } else {
            showNotification(result.message, "error");
        }

    } catch(err){
        console.error(err);
        showNotification("Gagal menyimpan rombel", "error");
    }

});

rombelCloseBtns.forEach(btn=>{
    btn.addEventListener("click", function(){
        rombelModal.classList.remove("show");
        rombelTitleInfo.innerText = "";
    });
});

// ===============================
// RENDER LIST SISWA
// ===============================

function renderSiswa(container, siswaList){

    container.innerHTML = "";

    siswaList.forEach(siswa => {

        const item = document.createElement("label");
        item.className = "siswa-item";

        item.innerHTML = `
            <input type="checkbox" value="${siswa.id}">
            <span>${siswa.nama}</span>
        `;
        container.appendChild(item);
    });
}

function checkEmptyTable(){

    const tbody = document.querySelector(".siswa-table tbody");

    if (!tbody) return;

    const rows = tbody.querySelectorAll("tr:not(.empty-row)");

    if(rows.length === 0){

        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="10" style="text-align:center;">
                    Belum ada data siswa
                </td>
            </tr>
        `;
    }
}

// ===============================
// LOAD DETAIL SISWA (PANEL KANAN)
// ===============================

async function loadDetailSiswa(kelasId, tingkat, namaKelas) {

    const title = document.getElementById("detail-title");
    const tbody = document.getElementById("detail-siswa-body");

    title.innerText = `Kelas ${tingkat} - ${namaKelas}`;

    // loading state
    tbody.innerHTML = `
        <tr>
            <td colspan="4" class="empty">Loading...</td>
        </tr>
    `;

    try {

        const response = await fetch(`/sekolah/kelas/${kelasId}/siswa`);
        const data = await response.json();

        tbody.innerHTML = "";

        if (!data.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty">
                        Tidak ada siswa
                    </td>
                </tr>
            `;
            return;
        }

        data.forEach((s, i) => {
            tbody.insertAdjacentHTML("beforeend", `
                <tr>
                    <td>${i + 1}</td>
                    <td>${s.nisn || '-'}</td>
                    <td>${s.nama}</td>
                    <td>${renderStatusBadge(s.status_masuk)}</td>
                </tr>
            `);
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="empty">
                    Gagal memuat data
                </td>
            </tr>
        `;
    }
}

function renderStatusBadge(status) {

    if (!status) return '-';

    const s = status.toLowerCase();

    if (s === "baru") {
        return `<span class="badge-baru">Baru</span>`;
    }

    if (s === "pindahan") {
        return `<span class="badge-pindahan">Pindahan</span>`;
    }

    return status;
}

const jadwalModal = document.getElementById("jadwal-kelas-modal");

document
  .querySelector("#jadwal-kelas-modal .modern-close")
  .addEventListener("click", () => {
      jadwalModal.classList.remove("show");
  });

document
  .getElementById("cancel-jadwal")
  .addEventListener("click", () => {
      jadwalModal.classList.remove("show");
  });

// ===============================
// JADWAL BUILDER
// ===============================

const jadwalGrid  = document.getElementById("jadwal-grid");
const addHariBtn  = document.getElementById("add-hari-btn");
const hariSelect  = document.getElementById("hari-select");

// simpan hari yang sudah ditambahkan
const hariMap = {}; // { Senin: HTMLElement }

addHariBtn.addEventListener("click", () => {

    const hari = hariSelect.value;
    if (!hari) {
        showNotification("Pilih hari terlebih dahulu", "warning");
        return;
    }

    if (hariMap[hari]) {
        showNotification("Hari sudah ditambahkan", "warning");
        return;
    }

    const card = document.createElement("div");
    card.className = "hari-card";
    card.dataset.hari = hari;

    card.innerHTML = `
        <div class="hari-title">${hari}</div>
        <div class="jam-container"></div>
        <button type="button" class="add-jam-btn">
            + Tambah Jam
        </button>
    `;

    hariMap[hari] = card;

    // auto 1 jam pertama
    addJamRow(card);

    // tombol tambah jam
    card.querySelector(".add-jam-btn")
        .addEventListener("click", () => addJamRow(card));

    // 🔥 INI KUNCINYA
    renderHariCards();

    hariSelect.value = "";
});

function renderHariCards() {

    jadwalGrid.innerHTML = "";

    HARI_ORDER.forEach(hari => {

        if (hariMap[hari]) {
            jadwalGrid.appendChild(hariMap[hari]);
        }

    });
}

function addJamRow(card) {

    const container = card.querySelector(".jam-container");

    const row = document.createElement("div");
    row.className = "jam-row";

    row.innerHTML = `
        <input type="text" class="jam-mulai time-input" placeholder="HH:MM" maxlength="5" style="width:80px">
        <span>-</span>
        <input type="text" class="jam-selesai time-input" placeholder="HH:MM" maxlength="5" style="width:80px">

        <select class="mapel-select" style="width:250px; height:30px; border-radius:5px; padding-top:0!important; padding-bottom:0!important; padding-left:5px;">
            <option value="">Pilih Mapel</option>
            ${getMapelOptions()}
        </select>

        <button type="button" class="remove-jam-btn" title="Hapus jam">
            <svg class="lucide lucide-minus"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        </button>
    `;

    row.querySelector(".remove-jam-btn").addEventListener("click", () => {
        row.remove();
    });

    container.appendChild(row);
    lucide.createIcons();

    return row;
}

document.addEventListener("input", function (e) {

    if (!e.target.classList.contains("time-input")) return;

    let v = e.target.value.replace(/\D/g, "");

    if (v.length >= 3) {
        v = v.slice(0, 2) + ":" + v.slice(2, 4);
    }

    e.target.value = v;
});

document.addEventListener("blur", function (e) {

    if (!e.target.classList.contains("time-input")) return;

    const [h, m] = e.target.value.split(":").map(Number);

    if (
        isNaN(h) || isNaN(m) ||
        h < 0 || h > 23 ||
        m < 0 || m > 59
    ) {
        e.target.value = "";
        showNotification("Format jam harus 00:00 – 23:59", "warning");
    }

}, true);

// ===============================
// AMBIL MAPEL DARI MODAL MAPEL
// ===============================
function getMapelOptions() {
    let options = "";

    mapelKelasCache.forEach(item => {

        // wajib & mulok harus punya JP
        if (item.jp <= 0 && item.jenis !== "kegiatan") return;

        // 🔥 ambil nama LANGSUNG dari DB result
        if (!item.nama) return;

        options += `
            <option value="${item.mapel_id}">
                ${item.nama}
            </option>
        `;
    });

    return options;
}

function createHariCard(hari) {

    const card = document.createElement("div");
    card.className = "hari-card";
    card.dataset.hari = hari;

    card.innerHTML = `
        <div class="hari-title">${hari}</div>
        <div class="jam-container"></div>
        <button type="button" class="add-jam-btn">
            + Tambah Jam
        </button>
    `;

    card.querySelector(".add-jam-btn")
        .addEventListener("click", () => addJamRow(card));

    hariMap[hari] = card;

    return card;
}

jadwalTopBtn.addEventListener("click", async () => {
    if (!selectedKelas) return;

    // pastikan mapel cache terisi
    if (!mapelKelasCache.length) {
        await loadMapelKelas(selectedKelas.id);
    }

    const hasJP = mapelKelasCache.some(m => m.jp > 0);
    if (!hasJP) {
        showNotification(
            "Atur JP mata pelajaran terlebih dahulu",
            "warning"
        );
        return;
    }

    const title = jadwalModal.querySelector(".modal-title h3");
    title.innerText =
        `Manajemen Jadwal Kelas ${selectedKelas.tingkat} - ${selectedKelas.nama}`;

    resetJadwalBuilder();

    // 🔥 LOAD JADWAL DARI BACKEND
    const res = await fetch(`/sekolah/kelas/api/${selectedKelas.id}/jadwal`);
    const jadwal = await res.json();

    jadwal.forEach(item => {

        let card = hariMap[item.hari];
        if (!card) {
            card = createHariCard(item.hari);
        }

        const row = addJamRow(card);
        row.querySelector(".jam-mulai").value   = item.jam_mulai;
        row.querySelector(".jam-selesai").value = item.jam_selesai;
        row.querySelector(".mapel-select").value = item.mapel_id;
    });

    renderHariCards();
    jadwalModal.classList.add("show");
});

function resetJadwalBuilder() {
    jadwalGrid.innerHTML = "";
    Object.keys(hariMap).forEach(k => delete hariMap[k]);
}

document.querySelector("#jadwal-kelas-modal .modern-close") .addEventListener("click", () => {
    jadwalModal.classList.remove("show");
    resetJadwalBuilder();
});

document.getElementById("cancel-jadwal").addEventListener("click", () => {
    jadwalModal.classList.remove("show");
    resetJadwalBuilder();
});

document.getElementById("save-jadwal").addEventListener("click", async () => {

    const payload = [];

    Object.values(hariMap).forEach(card => {

        const hari = card.dataset.hari;

        card.querySelectorAll(".jam-row").forEach(row => {

            const mulai   = row.querySelector(".jam-mulai").value;
            const selesai = row.querySelector(".jam-selesai").value;
            const mapelId = row.querySelector(".mapel-select").value;

            if (!mulai || !selesai || !mapelId) return;

            const guruId = getGuruIdByMapel(mapelId);

            if (!guruId) {
                showNotification(
                    "Guru untuk mapel belum ditentukan",
                    "warning"
                );
                return;
            }

            payload.push({
                hari,
                jam_mulai: mulai,
                jam_selesai: selesai,
                mapel_id: mapelId,
                guru_id: guruId
            });
        });
    });

    if (!payload.length) {
        showNotification("Jadwal masih kosong", "warning");
        return;
    }

    try {
        const res = await fetch("/sekolah/kelas/api/jadwal/save", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({
                kelas_id: selectedKelas.id,
                jadwal: payload
            })
        });

        const result = await res.json();

        if (result.success) {
            showNotification("Jadwal berhasil disimpan", "success");
            jadwalModal.classList.remove("show");
        } else {
            showNotification(result.message, "error");
        }

    } catch (err) {
        console.error(err);
        showNotification("Gagal menyimpan jadwal", "error");
    }
});