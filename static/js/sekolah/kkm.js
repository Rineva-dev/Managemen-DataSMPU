// ========================================
// ELEMENT
// ========================================
const kkmSelect =
    document.getElementById('kkmSelect');

const btnEdit =
    document.getElementById('btn-edit-kkm');

const btnSimpan =
    document.getElementById('btn-simpan-kkm');

const btnBatal =
    document.getElementById('btn-batal-kkm');

const kkmInputs =
    document.querySelectorAll('.kkm-input');

const kkmTexts =
    document.querySelectorAll('.kkm-text');

const kkmRows =
    document.querySelectorAll('.kkm-row');


// ========================================
// CUSTOM SELECT
// ========================================

const select =
    document.getElementById('kkmSelect');

const trigger =
    document.getElementById('kkmSelectTrigger');

const selectedText =
    document.getElementById('selectedKelas');

const options =
    document.querySelectorAll('.kkm-option');


// ========================================
// STATE
// ========================================

const STORAGE_EDIT_KEY = 'kkm_edit_mode';
const STORAGE_FILTER_KEY = 'kkm_filter';


// ========================================
// ENABLE EDIT MODE
// ========================================
function enableEditMode() {

    btnEdit.style.display = 'none';

    btnSimpan.style.display = 'inline-flex';

    btnBatal.style.display = 'inline-flex';

    // hide dropdown
    kkmSelect.style.display = 'none';

    kkmInputs.forEach(input => {
        input.style.display = 'inline-block';
    });

    kkmTexts.forEach(text => {
        text.style.display = 'none';
    });

}

// ========================================
// DISABLE EDIT MODE
// ========================================
function disableEditMode() {

    btnEdit.style.display = 'inline-flex';

    btnSimpan.style.display = 'none';

    btnBatal.style.display = 'none';

    // show dropdown
    kkmSelect.style.display = 'block';

    kkmInputs.forEach(input => {
        input.style.display = 'none';
    });

    kkmTexts.forEach(text => {
        text.style.display = 'inline';
    });

    const savedFilter =
        sessionStorage.getItem(STORAGE_FILTER_KEY) || '7';

    filterRows(savedFilter);

}

// ========================================
// MODE EDIT
// ========================================

btnEdit.addEventListener('click', () => {

    enableEditMode();

    sessionStorage.setItem(STORAGE_EDIT_KEY, 'true');

});


// ========================================
// MODE BATAL
// ========================================

btnBatal.addEventListener('click', () => {

    sessionStorage.removeItem(STORAGE_EDIT_KEY);

    location.reload();

});


// ========================================
// FILTER FUNCTION
// ========================================
function filterRows(tingkat) {

    let nomor = 1;

    kkmRows.forEach(row => {

        if (row.dataset.tingkat === tingkat) {

            row.style.display = '';

            const numberCell =
                row.querySelector('.row-number');

            if (numberCell) {

                numberCell.textContent = nomor++;

            }

        } else {

            row.style.display = 'none';

        }

    });

}

// ========================================
// TOGGLE SELECT MENU
// ========================================

trigger.addEventListener('click', () => {

    select.classList.toggle('open');

});


// ========================================
// SELECT OPTION
// ========================================

options.forEach(option => {

    option.addEventListener('click', () => {

        const value = option.dataset.value;

        selectedText.textContent =
            option.textContent.trim();

        options.forEach(o => {
            o.classList.remove('active');
        });

        option.classList.add('active');

        select.classList.remove('open');

        filterRows(value);

        // simpan filter
        sessionStorage.setItem(
            STORAGE_FILTER_KEY,
            value
        );

    });

});


// ========================================
// CLOSE SELECT OUTSIDE
// ========================================

document.addEventListener('click', (e) => {

    if (!select.contains(e.target)) {

        select.classList.remove('open');

    }

});


// ========================================
// SIMPAN
// ========================================
// ========================================
// SIMPAN
// ========================================

btnSimpan.addEventListener('click', async () => {

    const items = [];

    kkmInputs.forEach(input => {

        items.push({

            mapel_id: input.dataset.mapelId,

            tingkat: input.dataset.tingkat,

            kkm: input.value

        });

    });

    try {

        const res = await fetch('/kkm/api/bulk-update', {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
                "X-CSRFToken": csrfToken
            },

            body: JSON.stringify({
                items
            })

        });

        const data = await res.json();

        if (!data.success) {

            showNotification(data.message || 'Gagal simpan', 'error');
            return;

        }

        sessionStorage.removeItem(STORAGE_EDIT_KEY);

        persistNotification('KKM berhasil disimpan', 'success');

        location.reload();

    } catch (err) {

        console.error(err);

        showNotification('Terjadi kesalahan', 'error');

    }

});

// ========================================
// RESTORE FILTER
// ========================================

const savedFilter =
    sessionStorage.getItem(STORAGE_FILTER_KEY) || '7';

filterRows(savedFilter);

options.forEach(option => {

    option.classList.remove('active');

    if (option.dataset.value === savedFilter) {

        option.classList.add('active');

        selectedText.textContent =
            option.textContent.trim();

    }

});


// ========================================
// RESTORE EDIT MODE
// ========================================

const isEditMode =
    sessionStorage.getItem(STORAGE_EDIT_KEY);

if (isEditMode === 'true') {

    enableEditMode();

} else {

    disableEditMode();

}

// ========================================
// RESET SAAT BENAR-BENAR PINDAH HALAMAN
// ========================================

document.querySelectorAll('a').forEach(link => {

    link.addEventListener('click', () => {

        const href =
            link.getAttribute('href') || '';

        // jika pindah keluar dari halaman KKM
        if (!href.includes('/kkm')) {

            sessionStorage.removeItem(STORAGE_FILTER_KEY);

            sessionStorage.removeItem(STORAGE_EDIT_KEY);

        }

    });

});