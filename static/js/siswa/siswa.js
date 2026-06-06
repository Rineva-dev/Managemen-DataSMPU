document.addEventListener("DOMContentLoaded", function () {
    const siswaPagination = document.getElementById('siswa-pagination');
    const siswaTableBody = document.querySelector("#siswa-table tbody");
    const siswaPerPageInput = document.getElementById("siswa-per-page");
    const dropdowns = document.querySelectorAll(".dropdown");
    const perPageUp = document.getElementById("perpage-up");
    const perPageDown = document.getElementById("perpage-down");

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector(".dropdown-toggle");
        const menu = dropdown.querySelector(".dropdown-menu");

        if (!toggle || !menu) return;

        toggle.addEventListener("click", function (e) {
            e.stopPropagation();

            // tutup dropdown lain
            dropdowns.forEach(d => {
                if (d !== dropdown) d.classList.remove("open");
            });

            dropdown.classList.toggle("open");

            // reset posisi
            menu.style.left = "";
            menu.style.right = "";

            // hitung setelah tampil
            requestAnimationFrame(() => {
                const rect = menu.getBoundingClientRect();

                if (rect.right > window.innerWidth) {
                    menu.style.right = "0";
                    menu.style.left = "auto";
                } else {
                    menu.style.left = "0";
                    menu.style.right = "auto";
                }
            });
        });
    });

    // klik luar → tutup
    document.addEventListener("click", function () {
        dropdowns.forEach(d => d.classList.remove("open"));
    });

    document.getElementById("check-all")?.addEventListener("change", function() {
        document.querySelectorAll("input[name='selected']")
            .forEach(cb => cb.checked = this.checked);
    });

    document.getElementById('btnNaikKelas')?.addEventListener('click', function (e) {
        e.preventDefault();
            window.location.href = '/naikkan-kelas';
    });

        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector(".dropdown-toggle");

            if (toggle) {
                toggle.addEventListener("click", function (e) {
                    e.stopPropagation();

                    // Tutup dropdown lain
                    dropdowns.forEach(d => {
                        if (d !== dropdown) {
                            d.classList.remove("open");
                        }
                    });

                    // Toggle dropdown ini
                    dropdown.classList.toggle("open");
                });
            }
        });

        // Klik luar → tutup semua
        document.addEventListener("click", function () {
            dropdowns.forEach(d => d.classList.remove("open"));
        });

        // CHECK ALL
        document.getElementById("check-all")?.addEventListener("change", function() {
            document.querySelectorAll("input[name='selected']")
                .forEach(cb => cb.checked = this.checked);
        });

        // NAIKKAN KELAS
        document.getElementById('btnNaikKelas')?.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = '/naikkan-kelas';
        });


    /* ===============================
        DROPDOWN AKSI FLOATING FIX
    ================================ */
    let activeMenu = null;
    let activeWrap = null;

    document.addEventListener("click", function(e){

        const target = e.target instanceof Element ? e.target : null;
        const btn = target ? target.closest(".aksi-btn") : null;

        // klik luar → tutup menu
        if(!btn && !(target && target.closest(".aksi-menu"))){
            closeMenu();
            return;
        }

        // jika bukan klik tombol aksi → stop
        if(!btn) return;

        e.stopPropagation();

        const wrap = btn.closest(".aksi-wrap");
        const menu = wrap.querySelector(".aksi-menu") || activeMenu;

        if(!menu) return;

        // jika klik tombol yang sama → toggle
        if(activeMenu === menu){
            closeMenu();
            return;
        }

        closeMenu();

        const rect = btn.getBoundingClientRect();

        // simpan asal
        activeWrap = wrap;

        // pindahkan menu ke body
        document.body.appendChild(menu);

        menu.style.display = "block";
        menu.style.position = "fixed";
        menu.style.visibility = "hidden";

        const menuWidth = menu.offsetWidth;
        const menuHeight = menu.offsetHeight;

        let left = rect.right - menuWidth;
        let top = rect.bottom + 6;

        if(left + menuWidth > window.innerWidth){
            left = window.innerWidth - menuWidth - 10;
        }

        if(top + menuHeight > window.innerHeight){
            top = rect.top - menuHeight - 6;
        }

        menu.style.left = left + "px";
        menu.style.top = top + "px";
        menu.style.visibility = "visible";
        menu.style.zIndex = "999";

        activeMenu = menu;
    });


    function closeMenu(){
        if(!activeMenu) return;

        activeMenu.style.display = "none";

        // kembalikan ke tempat asal
        if(activeWrap){
            activeWrap.appendChild(activeMenu);
        }

        activeMenu = null;
        activeWrap = null;
    }

    document.querySelectorAll(".delete-btn").forEach(btn => {

        btn.addEventListener("click", async function(){

            const siswaId = this.dataset.id
            const nama = this.dataset.nama

            const confirm = await showConfirm(
                `Yakin ingin menghapus siswa <br><strong>${nama}</strong>?`,
                "Hapus",
                "btn-danger"
            )

            if(!confirm) return

            fetch(`/students/delete/${siswaId}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-CSRFToken": csrfToken
                }
            })
            .then(res => res.json())
            .then(data => {

                if(data.success){

                    showNotification("Siswa berhasil dihapus", "success")

                    const row = btn.closest("tr")

                    row.style.transition = "all .25s ease"
                    row.style.opacity = "0"
                    row.style.transform = "scale(.98)"

                    setTimeout(() => {
                        row.remove()

                        originalRows = Array.from(
                            siswaTableBody.querySelectorAll("tr")
                        );

                        renderTable();
                        checkEmptyTable();
                    }, 250)

                }else{
                    showNotification(data.message, "error")
                }

            })

        })

    })

    const tbody = document.querySelector(".siswa-table tbody")

    if(tbody.children.length === 0){
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center">
                    Belum ada data siswa
                </td>
            </tr>
        `
    }

    document.addEventListener("click", async function(e){

        const btn = e.target.closest(".btn-status")
        if(!btn) return

        e.preventDefault()
        closeMenu()

        const id = btn.dataset.id
        const status = btn.dataset.status
        const nama = btn.dataset.nama

        let pesan = ""
        let tombol = ""
        let warna = ""

        if(status === "nonaktif"){
            pesan = `Yakin ingin <b>menonaktifkan</b> siswa <br><strong>${nama}</strong> ?`
            tombol = "Nonaktifkan"
            warna = "btn-warning"
        }else{
            pesan = `Yakin ingin <b>mengaktifkan</b> kembali siswa <br><strong>${nama}</strong> ?`
            tombol = "Aktifkan"
            warna = "btn-success"
        }

        const confirm = await showConfirm(pesan, tombol, warna)

        if(!confirm) return

        fetch("/students/ubah-status", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({
                id: id,
                status: status
            })
        })
        .then(res => res.json())
        .then(res => {

            if(res.success){
                showNotification(res.message, "success")
                updateStatusUI(btn, status)
            }else{
                showNotification(res.message, "error")
            }

        })

    })

    function updateStatusUI(btn, status){

        const row = btn.closest("tr")
        const badge = row.querySelector(".status-badge")
        const menu = row.querySelector(".aksi-menu")
        const detailUrl = row.dataset.detail

        const page = document
            .getElementById("siswa-page")
            ?.dataset.page

        // =========================
        // JIKA HALAMAN SISWA AKTIF
        // =========================
        if(page === "siswa" && status === "nonaktif"){

            row.style.transition = "all .25s ease"
            row.style.opacity = "0"
            row.style.transform = "scale(.98)"

            setTimeout(()=>{
                row.remove()
                checkEmptyTable();
            },250)

            return
        }

        // =========================
        // JIKA HALAMAN ARSIP
        // =========================
        if(page === "siswa_arsip" && status === "aktif"){

            row.style.transition = "all .25s ease"
            row.style.opacity = "0"
            row.style.transform = "scale(.98)"

            setTimeout(()=>{
                row.remove()
                checkEmptyTable();
            },250)

            return
        }

        // =========================
        // UPDATE UI NORMAL
        // =========================
        if(status === "nonaktif"){

            badge.textContent = "Nonaktif"
            badge.classList.remove("badge-success")
            badge.classList.add("badge-danger")

            menu.innerHTML = `
                <a href="${detailUrl}">Detail</a>

                <div class="aksi-divider"></div>

                <a href="#" class="aksi-success btn-status"
                    data-id="${btn.dataset.id}"
                    data-status="aktif"
                    data-nama="${btn.dataset.nama}">
                    Aktifkan
                </a>
            `

        }else{

            badge.textContent = "Aktif"
            badge.classList.remove("badge-danger")
            badge.classList.add("badge-success")

            menu.innerHTML = `
                <a href="${detailUrl}">Detail</a>

                <div class="aksi-divider"></div>

                <a href="#" class="aksi-danger btn-status"
                    data-id="${btn.dataset.id}"
                    data-status="nonaktif"
                    data-nama="${btn.dataset.nama}">
                    Nonaktifkan
                </a>
            `
        }
    }

    // =======================
    // MODAL PINDAH SISWA BARU
    // =======================

    const modalPindah = document.getElementById("modalPindahSiswa")

    const pindahId = document.getElementById("pindah-id")
    const pindahNama = document.getElementById("pindah-nama")
    const pindahNisn = document.getElementById("pindah-nisn")
    const pindahSekolah = document.getElementById("pindah-sekolah")
    const pindahAlasan = document.getElementById("pindah-alasan")

    document.addEventListener("click", function(e){

        const btn = e.target.closest(".btn-pindah")
        if(!btn) return

        e.preventDefault()
        closeMenu()

        // isi data siswa
        pindahId.value = btn.dataset.id
        pindahNama.value = btn.dataset.nama
        pindahNisn.value = btn.dataset.nisn

        // reset form
        pindahSekolah.value = ""
        pindahAlasan.value = ""

        modalPindah.classList.add("show")
    })

    function closePindahModal(){
        modalPindah.classList.remove("show")
    }

    document.querySelector(".modal-close")
    ?.addEventListener("click", closePindahModal)

    document.getElementById("btnBatalPindah")
    ?.addEventListener("click", closePindahModal)

    document.getElementById("btnSimpanPindah")
    ?.addEventListener("click", function(){

        const sekolah = pindahSekolah.value.trim()
        const alasan = pindahAlasan.value.trim()

        if(!sekolah){
            showNotification("Sekolah tujuan harus diisi","warning")
            return
        }

        fetch("/students/pindah",{

            method:"POST",

            headers:{
                "Content-Type":"application/json",
                "X-CSRFToken": csrfToken
            },

            body: JSON.stringify({
                id: pindahId.value,
                sekolah: sekolah,
                alasan: alasan
            })

        })
        .then(res=>res.json())
        .then(res=>{

            if(res.success){

                showNotification("Siswa berhasil dipindahkan","success")
                modalPindah.classList.remove("show")

                const row = document.querySelector(`tr[data-id="${pindahId.value}"]`)

                if(row){

                    row.style.transition = "all .25s ease"
                    row.style.opacity = "0"
                    row.style.transform = "scale(.98)"

                    setTimeout(()=>{
                        row.remove()
                        checkEmptyTable()
                    },250)

                }

            }else{
                showNotification(res.message,"error")
            }

        })

    })

    function checkEmptyTable() {
        const tbody = document.querySelector(".siswa-table tbody");
        if (!tbody) return;

        // Cek apakah masih ada <tr> selain row kosong
        const rows = tbody.querySelectorAll("tr:not(.empty-row)");
        if(rows.length === 0){
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="10" style="text-align:center">
                        Belum ada data siswa
                    </td>
                </tr>
            `;
        }
    }

    /* ===============================
    MODAL DOWNLOAD & IMPORT
    =============================== */

    const modalDownload = document.getElementById("modalDownloadData");
    const modalImport = document.getElementById("modalImportData");

    // OPEN MODAL
    document.addEventListener("click", function(e){

        const btnDownload = e.target.closest("#btnOpenDownload");
        const btnImport = e.target.closest("#btnOpenImport");

        if(btnDownload){
            e.preventDefault();
            e.stopPropagation();

            modalDownload?.classList.add("show");
        }

        if(btnImport){
            e.preventDefault();
            e.stopPropagation();

            modalImport?.classList.add("show");
        }

    });

    // CLOSE MODAL
    document.querySelectorAll(".close").forEach(btn=>{
        btn.addEventListener("click", function(){

            modalDownload?.classList.remove("show");
            modalImport?.classList.remove("show");

        });
    });

    // =======================
    // DOWNLOAD DATA SISWA
    // =======================
    document.getElementById("btnDownloadData")?.addEventListener("click", function () {

        const typeSelect = document.getElementById("downloadType");
        const type = typeSelect?.value;

        if (!type) {
            showNotification("Pilih jenis data terlebih dahulu", "warning");
            return;
        }

        // tutup modal dulu
        modalDownload?.classList.remove("show");

        // redirect download (browser handle file)
        window.location.href = `/students/export?type=${type}`;

    });

    // IMPORT DATA
    document.getElementById("btnImportData")?.addEventListener("click", function(){

        const type = document.getElementById("importType").value; // "baru" / "pindahan"
        const file = document.getElementById("importFile").files[0];

        if(!type){
            showNotification("Pilih jenis import terlebih dahulu","warning");
            return;
        }

        if(!file){
            showNotification("Pilih file terlebih dahulu","warning");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        fetch(`/students/import/${type}`,{
            method:"POST",
            headers:{
                "X-CSRFToken": csrfToken
            },
            body: formData,
        })
        .then(r => r.json())
        .then(res => {

            if(res.success){
                showNotification(res.message || "Import berhasil","success");
                modalImport?.classList.remove("show");
                setTimeout(()=>location.reload(),1000);
            }else{
                showNotification(res.message || "Terjadi kesalahan","error");
            }

        })
        .catch(()=>{
            showNotification("Upload gagal","error");
        });

    });

    const chooseBtn = document.getElementById("btnChooseFile");
    const fileInput = document.getElementById("importFile");
    const fileName = document.getElementById("fileName");

    if (chooseBtn && fileInput) {

        chooseBtn.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener("change", () => {

            if(fileInput.files.length > 0){
                fileName.textContent = fileInput.files[0].name;
            }else{
                fileName.textContent = "Belum ada file dipilih";
            }

        });

    }

    document.querySelectorAll(".btn-cancel").forEach(btn => {
        btn.addEventListener("click", function () {
            const modal = this.closest(".saas-modal-overlay");
            if(modal){
                modal.classList.remove("show");
            }
        });
    });

    /* ===============================
    SEARCH SISWA (NAMA / NISN)
    ================================ */
    const searchInput = document.querySelector(".filter-input");

    function getOrCreateEmptyRow() {
        let row = tbody.querySelector(".empty-row");

        if (!row) {
            row = document.createElement("tr");
            row.classList.add("empty-row");
            row.innerHTML = `
                <td colspan="11" style="text-align:center;">
                    Data tidak ditemukan
                </td>
            `;
            row.style.display = "none";
            tbody.appendChild(row);
        }

        return row;
    }

    if (searchInput && tbody) {

        searchInput.addEventListener("input", function () {

            const keyword =
                this.value.toLowerCase().trim();

            filteredRows =
                originalRows.filter(row => {

                    const nisn =
                        row.children[2]?.innerText
                        .toLowerCase() || "";

                    const nama =
                        row.children[3]?.innerText
                        .toLowerCase() || "";

                    return (
                        nisn.includes(keyword) ||
                        nama.includes(keyword)
                    );

                });

            currentPage = 1;

            renderTable();

        });

    }

    const importTypeInput = document.getElementById("importType");

    document.getElementById("downloadTemplateCSV").addEventListener("click", function (e) {
        e.preventDefault();

        const jenis = importTypeInput.value;
        if (!jenis) {
            showNotification("Pilih jenis import terlebih dahulu", "warning");
            return;
        }

        window.location.href = `/students/template/${jenis}/csv`;
    });

    function renderTable() {

        if (!siswaTableBody) return;

        const allRows = filteredRows;

        const totalPages =
            Math.ceil(allRows.length / perPage);

        if (currentPage > totalPages) {
            currentPage = totalPages || 1;
        }

        const start =
            (currentPage - 1) * perPage;

        const end =
            start + perPage;

        const pageRows =
            allRows.slice(start, end);

        siswaTableBody.innerHTML = "";

        if (pageRows.length === 0) {

            siswaTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="11"
                        style="text-align:center;">
                        Data tidak ditemukan
                    </td>
                </tr>
            `;

            if (siswaPagination) {
                siswaPagination.innerHTML = "";
            }
            return;
        }

        pageRows.forEach(row => {
            siswaTableBody.appendChild(
                row.cloneNode(true)
            );
        });

        document.getElementById(
            "siswa-total-data"
        ).textContent = allRows.length;

        renderPagination(totalPages);
        lucide.createIcons();
    }

    function renderPagination(totalPages) {

        if (!siswaPagination) return;

        siswaPagination.innerHTML = "";

        const maxVisible = 5;

        // ======================
        // PREV BUTTON
        // ======================
        const prev = document.createElement("button");
        prev.textContent = "Prev";

        prev.disabled = currentPage === 1;

        prev.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        };

        siswaPagination.appendChild(prev);

        // ======================
        // JIKA TOTAL PAGE 0 → SET 1
        // ======================
        if (totalPages === 0) {
            totalPages = 1;
        }

        // ======================
        // HITUNG RANGE PAGE
        // ======================

        let startPage = Math.max(
            1,
            currentPage - Math.floor(maxVisible / 2)
        );

        let endPage = startPage + maxVisible - 1;

        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(
                1,
                endPage - maxVisible + 1
            );
        }

        // ======================
        // PAGE BUTTONS
        // ======================

        for (let i = startPage; i <= endPage; i++) {

            const btn = document.createElement("button");

            btn.textContent = i;

            if (i === currentPage) {
                btn.classList.add("active");
            }

            btn.onclick = () => {
                currentPage = i;
                renderTable();
            };

            siswaPagination.appendChild(btn);
        }

        // ======================
        // NEXT BUTTON
        // ======================

        const next = document.createElement("button");
        next.textContent = "Next";

        next.disabled = currentPage === totalPages;

        next.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        };

        siswaPagination.appendChild(next);
    }

    if (siswaPerPageInput) {
        siswaPerPageInput.addEventListener("change", () => {
            perPage = parseInt(siswaPerPageInput.value) || 10;
            currentPage = 1;
            renderTable();
        });
    }

    perPageUp.addEventListener("click", function () {
        siswaPerPageInput.stepUp();
        perPage = parseInt(siswaPerPageInput.value) || 10;
        currentPage = 1;
        renderTable();
    });

    perPageDown.addEventListener("click", function () {
        if (siswaPerPageInput.value > 1) {
            siswaPerPageInput.stepDown();
            perPage = parseInt(siswaPerPageInput.value) || 10;
            currentPage = 1;
            renderTable();
        }
    });

    /* ===============================
    INIT PAGINATION SISWA
    ================================ */

    let currentPage = 1;

    let perPage = parseInt(
        document.getElementById("siswa-per-page")?.value
    ) || 10;

    // ambil semua row asli
    let originalRows = [];
    let filteredRows = [];

    if (siswaTableBody) {

        // ambil semua <tr> asli
        originalRows = Array.from(
            siswaTableBody.querySelectorAll("tr")
        );

        // default = semua data
        filteredRows = [...originalRows];

        // render pertama
        renderTable();

    }

});