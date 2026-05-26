let catatanMode = 'add';

/* =========================================================
    SEARCH MATERI
========================================================= */
const jurnalSearchInput =
    document.getElementById('search-jurnal');

jurnalSearchInput?.addEventListener('input', function(){

    const keyword = this.value.toLowerCase();

    document.querySelectorAll('.overview-table tbody tr')
    .forEach(row => {

        const materi = row
            .querySelector('.materi-col')
            ?.textContent
            .toLowerCase();

        const match = materi.includes(keyword);

        row.style.display = match ? '' : 'none';

    });

});

/* =========================================================
    FILTER TANGGAL
========================================================= */
const filterTanggal = document.getElementById('filter-tanggal');

filterTanggal?.addEventListener('change', function () {
    currentPage = 1;
    updatePagination();
});

/* =========================================================
    EDIT JURNAL
========================================================= */
document.querySelectorAll('.btn-table-edit')
.forEach(btn => {

    btn.addEventListener('click', function(){

        const jurnalId = this.dataset.id;

        // sementara redirect dulu
        // nanti bisa modal edit

        window.location.href =
            `/kelas-ampu/jurnal/${jurnalId}/edit`;

    });

});


/* =========================================================
    TAMBAH / EDIT CATATAN
========================================================= */
/* =========================================================
    MODAL CATATAN
========================================================= */

const catatanModal =
    document.getElementById('catatan-modal');

const catatanInput =
    document.getElementById('catatan-input');

const catatanCounter =
    document.getElementById('catatan-counter');

const catatanModalTitle =
    document.getElementById('catatan-modal-title');

const btnCloseCatatan =
    document.getElementById('btn-close-catatan');

const btnCancelCatatan =
    document.getElementById('btn-cancel-catatan');

const btnSaveCatatan =
    document.getElementById('btn-save-catatan');

let activeJurnalId = null;


/* =========================================================
    OPEN MODAL
========================================================= */
function openCatatanModal(jurnalId, catatan = '', mode = 'add') {

    activeJurnalId = jurnalId;
    catatanMode = mode;

    catatanInput.value = catatan;
    catatanCounter.textContent = catatan.length;

    const btnEdit = document.getElementById('btn-edit-catatan');

    if(mode === 'view'){
        catatanModalTitle.textContent = 'Lihat Catatan';
        catatanInput.setAttribute('readonly', true);
        btnSaveCatatan.style.display = 'none';
        btnEdit.style.display = 'inline-flex';
    }
    else if(mode === 'edit'){
        catatanModalTitle.textContent = 'Edit Catatan';
        catatanInput.removeAttribute('readonly');
        btnSaveCatatan.style.display = 'inline-flex';
        btnEdit.style.display = 'none';
    }
    else{
        catatanModalTitle.textContent = 'Tambah Catatan';
        catatanInput.removeAttribute('readonly');
        btnSaveCatatan.style.display = 'inline-flex';
        btnEdit.style.display = 'none';
    }

    catatanModal.classList.add('show');
    document.body.style.overflow = 'hidden';

    setTimeout(() => catatanInput.focus(), 150);
}

/* =========================================================
    CLOSE MODAL
========================================================= */
function closeCatatanModal(){

    catatanModal.classList.remove('show');

    document.body.style.overflow = '';

    activeJurnalId = null;

}


/* =========================================================
    COUNTER
========================================================= */
catatanInput?.addEventListener('input', () => {

    catatanCounter.textContent =
        catatanInput.value.length;

});


/* =========================================================
    SAVE BUTTON
========================================================= */
btnSaveCatatan?.addEventListener('click', async () => {

    if(!activeJurnalId){
        return;
    }

    await saveCatatan(
        activeJurnalId,
        catatanInput.value.trim()
    );

});


/* =========================================================
    CLOSE EVENTS
========================================================= */
btnCloseCatatan?.addEventListener(
    'click',
    closeCatatanModal
);

btnCancelCatatan?.addEventListener(
    'click',
    closeCatatanModal
);

catatanModal?.addEventListener('click', e => {

    if(e.target === catatanModal){
        closeCatatanModal();
    }

});

document.addEventListener('keydown', e => {

    if(
        e.key === 'Escape' &&
        catatanModal.classList.contains('show')
    ){
        closeCatatanModal();
    }

});

/* =========================================================
    BTN ADD CATATAN
========================================================= */
document.querySelectorAll('.btn-add-catatan')
.forEach(btn => {
    btn.addEventListener('click', function(){
        openCatatanModal(
            this.dataset.id,
            '',
            'add'
        );
    });
});

document.querySelectorAll('.btn-catatan-view')
.forEach(btn => {
    btn.addEventListener('click', function(){
        openCatatanModal(
            this.dataset.id,
            this.dataset.catatan,
            'view'
        );
    });
});


/* =========================================================
    BTN EDIT CATATAN
========================================================= */
document.getElementById('btn-edit-catatan')
?.addEventListener('click', () => {

    catatanMode = 'edit';

    catatanModalTitle.textContent = 'Edit Catatan';
    catatanInput.removeAttribute('readonly');
    btnSaveCatatan.style.display = 'inline-flex';
    document.getElementById('btn-edit-catatan').style.display = 'none';

    catatanInput.focus();
});

/* =========================================================
    SAVE CATATAN
========================================================= */
async function saveCatatan(jurnalId, catatan){

    try{

        const res = await fetch(
            '/kelas-ampu/update-catatan',
            {
                method : 'POST',
                headers : {
                    'Content-Type': 'application/json',
                    "X-CSRFToken": csrfToken
                },
                body : JSON.stringify({
                    jurnal_id : jurnalId,
                    catatan : catatan
                })
            }
        );

        const result = await res.json();

        if(result.success){
            showNotification('Catatan berhasil disimpan', 'success');
            closeCatatanModal();
            window.location.reload();

        }else{
            showNotification(result.message || 'Gagal', 'error');
        }

    }
    catch(err){
        console.error(err);
        showNotification('Terjadi kesalahan', 'error');

    }

}


/* =========================================================
    DELETE JURNAL
========================================================= */
document.querySelectorAll('.btn-table-delete')
.forEach(btn => {

    btn.addEventListener('click', async function(){

        const jurnalId = this.dataset.id;

        const confirmDelete = confirm(
            'Hapus jurnal ini?'
        );

        if(!confirmDelete){
            return;
        }

        try{
            const res = await fetch(
                '/kelas-ampu/delete-jurnal',
                {
                    method : 'POST',
                    headers : {
                        'Content-Type': 'application/json',
                        "X-CSRFToken": csrfToken
                    },
                    body : JSON.stringify({
                        jurnal_id : jurnalId
                    })
                }
            );

            const result = await res.json();

            if(result.success){

                showNotification('Jurnal berhasil dihapus', 'success');

                window.location.reload();

            }else{

                showNotification(
                    result.message ||
                    'Gagal menghapus', 'error'
                );

            }

        }
        catch(err){

            console.error(err);

            showNotification('Terjadi kesalahan', 'error');

        }

    });

});

// ========================================
// PAGINATION
// ========================================

const tableRows = document.querySelectorAll(
    ".overview-table tbody tr"
);

const paginationPages =
    document.getElementById("pagination-pages");

const paginationTotal =
    document.getElementById("pagination-total");

const paginationPrev =
    document.getElementById("pagination-prev");

const paginationNext =
    document.getElementById("pagination-next");

const limitSelect =
    document.getElementById("pagination-limit");

const paginationInfo =
    document.querySelector(".pagination-info");

let rowsPerPage = parseInt(limitSelect.value);

let currentPage = 1;


// ========================================
// GET FILTERED ROWS
// ========================================
function getFilteredRows(){

    const keyword =
        jurnalSearchInput?.value.toLowerCase() || "";

    const selectedDate =
        filterTanggal?.value || "";

    return [...tableRows].filter(row => {

        const materi = row
            .querySelector(".materi-col")
            ?.textContent
            .toLowerCase();

        const tanggal = row
            .querySelector("[data-raw-date]")
            ?.dataset.rawDate || "";

        const matchKeyword =
            materi.includes(keyword);

        const matchTanggal =
            !selectedDate || tanggal === selectedDate;

        return matchKeyword && matchTanggal;

    });

}

// ========================================
// TOTAL PAGE
// ========================================

function getTotalPages(filteredRows){

    return Math.ceil(
        filteredRows.length / rowsPerPage
    );

}


// ========================================
// RENDER TABLE
// ========================================

function renderTable(){

    const filteredRows = getFilteredRows();

    const start =
        (currentPage - 1) * rowsPerPage;

    const end = start + rowsPerPage;

    // hide all
    tableRows.forEach(row => {
        row.style.display = "none";
    });

    // show selected
    filteredRows
    .slice(start, end)
    .forEach(row => {
        row.style.display = "";
    });

    const totalData = filteredRows.length;

    paginationTotal.textContent = totalData;

}


// ========================================
// RENDER PAGINATION
// ========================================

function renderPagination(){

    paginationPages.innerHTML = "";

    const filteredRows = getFilteredRows();

    const totalPages =
        getTotalPages(filteredRows);

    // =========================
    // PREV
    // =========================

    paginationPrev.disabled =
        currentPage === 1;

    // =========================
    // NEXT
    // =========================

    paginationNext.disabled =
        currentPage === totalPages ||
        totalPages === 0;

    // =========================
    // PAGE RANGE
    // =========================

    let startPage =
        Math.max(currentPage - 2, 1);

    let endPage =
        startPage + 4;

    if(endPage > totalPages){

        endPage = totalPages;

        startPage =
            Math.max(endPage - 4, 1);

    }

    // =========================
    // PAGE BUTTON
    // =========================

    for(let i = startPage; i <= endPage; i++){

        const btn =
            document.createElement("button");

        btn.className = "pagination-page";

        if(i === currentPage){
            btn.classList.add("active");
        }

        btn.textContent = i;

        btn.addEventListener("click", () => {

            currentPage = i;

            updatePagination();

        });

        paginationPages.appendChild(btn);

    }

}


// ========================================
// UPDATE PAGINATION
// ========================================

function updatePagination(){

    const filteredRows = getFilteredRows();

    const totalPages =
        getTotalPages(filteredRows);

    if(currentPage > totalPages){
        currentPage = 1;
    }

    renderTable();

    renderPagination();

}


// ========================================
// PREV BUTTON
// ========================================

paginationPrev?.addEventListener("click", () => {

    if(currentPage > 1){

        currentPage--;

        updatePagination();

    }

});


// ========================================
// NEXT BUTTON
// ========================================

paginationNext?.addEventListener("click", () => {

    const totalPages =
        getTotalPages(getFilteredRows());

    if(currentPage < totalPages){

        currentPage++;

        updatePagination();

    }

});


// ========================================
// LIMIT CHANGE
// ========================================

limitSelect?.addEventListener("change", () => {

    rowsPerPage =
        parseInt(limitSelect.value);

    currentPage = 1;

    updatePagination();

});


// ========================================
// SEARCH
// ========================================

jurnalSearchInput?.addEventListener("input", () => {

    currentPage = 1;

    updatePagination();

});


// ========================================
// FILTER TANGGAL
// ========================================

filterTanggal?.addEventListener("change", () => {

    currentPage = 1;

    updatePagination();

});


// ========================================
// INIT
// ========================================

updatePagination();

/* =========================================================
    INIT ICON
========================================================= */
if(window.lucide){
    lucide.createIcons();
}