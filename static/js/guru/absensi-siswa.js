const wrapper = document.querySelector('.absensi-wrapper');
const absensiId = wrapper?.dataset.absensiId;
const mode = wrapper?.dataset.mode || 'input';

const isDetailMode = mode === 'detail';
/* =========================================================
   STATE
========================================================= */
let absensiState = {}; 
let currentAbsensiId = null;

/* =========================================================
   LOAD ABSENSI
========================================================= */
async function loadAbsensi(absensiId) {

    const res = await fetch(`/kelas-ampu/api/absensi/${absensiId}`);
    const result = await res.json();

    absensiState = {}; // reset state

    const container = document.getElementById('absensi-list');
    container.innerHTML = '';

    (result.data || []).forEach((siswa, index) => {

        absensiState[siswa.id] = {
            nisn: siswa.nisn,
            nama: siswa.nama,
            status: siswa.status || '',
            keterangan: siswa.keterangan || ''
        };

        const row = document.createElement('div');
        row.className = 'absensi-row';
        row.dataset.id = siswa.id;

        row.innerHTML = `
            <div class="col-no">${index + 1}</div>
            <div class="col-nisn">${siswa.nisn}</div>
            <div class="col-nama">${siswa.nama}</div>

            <div class="col-hisa">
                ${
                    isDetailMode
                    ? `<span class="status-text ${mapStatusClass(siswa.status)}">
                            ${mapStatusText(siswa.status)}
                    </span>`
                    : `<div class="hisa-group">
                            ${renderHisaBtn(siswa.id,'H',siswa.status)}
                            ${renderHisaBtn(siswa.id,'I',siswa.status)}
                            ${renderHisaBtn(siswa.id,'S',siswa.status)}
                            ${renderHisaBtn(siswa.id,'A',siswa.status)}
                    </div>`
                }
            </div>

            <div class="col-ket">
                ${
                    isDetailMode
                    ? `<span class="ket-text">${siswa.keterangan || '-'}</span>`
                    : `<input type="text"
                            value="${siswa.keterangan || ''}"
                            oninput="saveKeterangan(${siswa.id}, this.value)">`
                }
            </div>
        `;

        container.appendChild(row);
    });

    document.getElementById('total-siswa').textContent =
        Object.keys(absensiState).length;

    updateRekap();
}

function mapStatusText(status) {
    switch (status) {
        case 'H': return 'Hadir';
        case 'I': return 'Izin';
        case 'S': return 'Sakit';
        case 'A': return 'Alpha';
        default: return '-';
    }
}

function mapStatusClass(status) {
    switch (status) {
        case 'H': return 'hadir';
        case 'I': return 'izin';
        case 'S': return 'sakit';
        case 'A': return 'alpha';
        default: '';
    }
}

/* =========================================================
   RENDER BUTTON HISA
========================================================= */

function renderHisaBtn(siswaId, kode, current) {
    const map = {
        H: 'hadir',
        I: 'izin',
        S: 'sakit',
        A: 'alpha'
    };

    const active = current === kode ? 'active' : '';

    return `
        <button
            class="hisa-btn ${map[kode]} ${active}"
            onclick="setStatus(${siswaId}, '${kode}', this)">
            ${kode}
        </button>
    `;
}

function updateRekap() {

    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpha = 0;

    Object.values(absensiState).forEach(s => {

        if (s.status === 'H') hadir++;
        if (s.status === 'I') izin++;
        if (s.status === 'S') sakit++;
        if (s.status === 'A') alpha++;
    });

    document.getElementById('total-hadir').textContent = hadir;
    document.getElementById('total-izin').textContent = izin;
    document.getElementById('total-sakit').textContent = sakit;
    document.getElementById('total-alpha').textContent = alpha;
}

/* =========================================================
   SET STATUS HISA
========================================================= */
async function setStatus(siswaId, status, el) {
    if (isDetailMode) return;

    const row = document.querySelector(`[data-id="${siswaId}"]`);

    absensiState[siswaId].status = status;

    // update UI tombol saja (NO reload row)
    row.querySelectorAll('.hisa-btn')
        .forEach(btn => btn.classList.remove('active'));

    el.classList.add('active');

    // backend
    await fetch('/kelas-ampu/api/absensi/set-status', {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json',
                "X-CSRFToken": csrfToken
        },
        body: JSON.stringify({
            absensi_id: currentAbsensiId,
            siswa_id: siswaId,
            status
        })
    });

    updateRekap();
}

/* =========================================================
   SAVE KETERANGAN
========================================================= */
let ketTimeout = {};

function saveKeterangan(siswaId, value) {
    if (isDetailMode) return;
    absensiState[siswaId].keterangan = value;

    clearTimeout(ketTimeout[siswaId]);

    ketTimeout[siswaId] = setTimeout(() => {

        fetch('/kelas-ampu/api/absensi/set-keterangan', {
            method: 'POST',
            headers: {
                    'Content-Type': 'application/json',
                    "X-CSRFToken": csrfToken
            },
            body: JSON.stringify({
                absensi_id: currentAbsensiId,
                siswa_id: siswaId,
                keterangan: value
            })
        });

    }, 400);
}

const btnSimpan = document.getElementById('btn-simpan');

if (btnSimpan) {
    btnSimpan.addEventListener('click', async () => {

        btnSimpan.disabled = true;
        btnSimpan.textContent = 'Menyimpan...';

        try {
            const res = await fetch('/kelas-ampu/api/absensi/finalize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "X-CSRFToken": csrfToken
                },
                body: JSON.stringify({
                    absensi_id: currentAbsensiId
                })
            });

            const result = await res.json();

            if (result.success) {
                btnSimpan.textContent = '✔ Tersimpan';
            } else {
                btnSimpan.textContent = 'Gagal';
            }

        } catch (err) {
            console.error(err);
            btnSimpan.textContent = 'Error';
        }

        setTimeout(() => {
            btnSimpan.disabled = false;
            btnSimpan.textContent = 'Simpan';
        }, 2000);
    });
}

if (isDetailMode) {
    const footer = document.querySelector('.absensi-footer');
    if (footer) footer.style.display = 'none';
}

/* =========================================================
   INIT
========================================================= */

document.addEventListener('DOMContentLoaded', () => {

    const wrapper = document.querySelector('.absensi-wrapper');

    currentAbsensiId = wrapper?.dataset?.absensiId;

    if (!currentAbsensiId) {
        console.error('Absensi ID tidak ditemukan');
        return;
    }

    loadAbsensi(currentAbsensiId);

    if (isDetailMode) return; // ⛔ STOP di sini
});