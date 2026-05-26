document.addEventListener("DOMContentLoaded", function () {
    const meta = document.querySelector('meta[name="csrf-token"]');
    csrfToken = meta ? meta.getAttribute("content") : null;

});

let serverTimeOffset = 0;
let serverState = {
    statusHariIni: 'belum_absen',
    absensiHarian: [],
    absensiData: [],
    absensiRaw: [],
};

let isDevReset = false;

let selectedMonth = '';
let selectedYear = '';
let currentAction = null;
let isSubmitting = false;

document.addEventListener('DOMContentLoaded', async () => {
    await syncServerTime();
    selectedYear = getServerNow().getFullYear();
    ['modal-form','modal-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentElement !== document.body) {
            document.body.appendChild(el);
        }
    });

    // =========================
    // ANGRY ANIMATION (TERLAMBAT)
    // =========================
    let angryAnimation = null;

    if (typeof lottie !== 'undefined') {
        const angryContainer = document.getElementById('angry-animation');

        if (angryContainer) {
            angryAnimation = lottie.loadAnimation({
                container: angryContainer,
                renderer: 'svg',
                loop: true,
                autoplay: false,
                path: '/static/icons/angry.json'
            });
        }
    }

    // =========================
    // SOUND
    // =========================
    const warningSound = new Audio('/static/sounds/warning.wav');
    warningSound.preload = 'auto';
    warningSound.loop = true;

    // MODAL SOUND
    const modalSound = new Audio('/static/sounds/modal.wav');
    modalSound.preload = 'auto';

    // ======================
    // ABSENSI HARIAN DOM
    // ======================
    const absensiHarianContent = document.getElementById('absensi-harian-content');
    const modalSubmit = document.getElementById('modal-submit');
    const modalInput  = document.getElementById('modal-input');

    const jamDigital = document.getElementById('jam-digital');
    const tanggalHijriyah = document.getElementById('tanggal-hijriyah');
    const tanggalAbsensi = document.getElementById('tanggal-absensi');

    const btnAbsenMasuk = document.getElementById('btn-absen-masuk');
    const btnAbsenKeluar = document.getElementById('btn-absen-keluar');
    const btnIzin = document.getElementById('btn-izin');
    const absensiBtnContainer = document.querySelector('.absensi-btn');
    if (absensiBtnContainer) {
        absensiBtnContainer.style.visibility = 'hidden';
    }
    const btnResetDev = document.getElementById('btn-reset-dev');
    const izinNotif = document.getElementById('izin-notif');

    const absensiTableBody = document.querySelector('#harian-table tbody');
    const yearOptions = document.getElementById('yearOptions');

    const modalCancel  = document.getElementById('modal-cancel');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalForm    = document.getElementById('modal-form');
    const harianPagination = document.getElementById('harian-pagination');
    const harianPerPageInput = document.getElementById("harian-per-page");

    let harianCurrentPage = 1;
    let harianPerPage = 10;

    function getTodayLocalISO() {
        const now = getServerNow();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    let todayISO = getTodayLocalISO();

    function scheduleMidnightReset() {
        const now = getServerNow();

        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);

        const msUntilMidnight = midnight - now;

        setTimeout(async () => {
            await syncServerTime(); // sync ulang offset
            todayISO = getTodayLocalISO();
            await fetchLatestAbsensi();
            applyUIByState();
            scheduleMidnightReset();
        }, msUntilMidnight);
    }

    scheduleMidnightReset();

    // ======================
    // JAM DIGITAL
    // ======================
    function updateJamAbsensi() {
        if (!absensiHarianContent) return;

        const now = getServerNow();

        // JAM
        if (jamDigital) {
            jamDigital.textContent =
                now.toLocaleTimeString('id-ID', { hour12: false });
        }

        // TANGGAL MASEHI
        if (tanggalAbsensi) {
            tanggalAbsensi.textContent =
                now.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
        }

        // 🔥 TANGGAL HIJRIYAH (INI STEP 4)
        if (tanggalHijriyah) {
            tanggalHijriyah.textContent = getHijriDate(now);
        }
    }

    setInterval(updateJamAbsensi, 1000);
    updateJamAbsensi();

    function getHijriDate(date) {
        const hijri = new Intl.DateTimeFormat('id-TN-u-ca-islamic', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);

        return hijri + "";
    }

    function generateYearOptions() {
        if (!yearOptions) return;

        const currentYear = getServerNow().getFullYear();

        for (let y = currentYear; y >= currentYear - 5; y--) {
            const div = document.createElement('div');
            div.textContent = y;
            div.dataset.value = y;
            yearOptions.appendChild(div);
        }
    }

    generateYearOptions();

    // ======================
    // HANDLE OPTION CLICK
    // ======================
    document.querySelectorAll('.absen-filter-options').forEach(options => {

        options.addEventListener('click', (e) => {

            if (!e.target.dataset.value) return;

            const group = e.target.closest('.absen-filter-group');
            const selected = group.querySelector('.absen-filter-selected');

            const value = e.target.dataset.value;
            const text = e.target.textContent;

            if (group.id === 'absenMonthDropdown') {
                selectedMonth = value;
            }

            if (group.id === 'absenYearDropdown') {
                selectedYear = value;
            }

            selected.innerHTML =
                (value === '' ? 'Semua Bulan' : text)
                + ' <span class="absen-filter-arrow">▾</span>';

            group.classList.remove('active');

            harianCurrentPage = 1;
            renderTable();
        });

    });

    function updateAbsensiButtons() {
        if (!btnAbsenMasuk || !btnAbsenKeluar || !btnIzin) return;

        const status = serverState.statusHariIni;

        btnAbsenMasuk.style.display = 'none';
        btnAbsenKeluar.style.display = 'none';
        btnIzin.style.display = 'none';

        // BELUM ABSEN
        if (!status || status === 'belum_absen') {
            btnAbsenMasuk.style.display = 'inline-block';
            btnIzin.style.display = 'inline-block';
            return;
        }

        // SUDAH MASUK ATAU TERLAMBAT (BELUM PULANG)
        if (status === 'masuk' || status === 'terlambat') {
            btnAbsenKeluar.style.display = 'inline-block';
            return;
        }

        // SUDAH SELESAI ATAU IZIN
        if (status === 'selesai' || status === 'izin_tidak_masuk') {
            showAbsensiSelesai();
        }
    }

    function showAbsensiSelesai(){
        btnAbsenMasuk.style.display = 'none';
        btnIzin.style.display = 'none';
        btnAbsenKeluar.style.display = 'none';

        if(izinNotif){
            izinNotif.style.display = 'block';
            izinNotif.textContent = "You Have Completed Today's Attendance";
        }
    }

    // ======================
    // MODAL SUBMIT
    // ======================
    modalSubmit?.addEventListener('click', async () => {

        if (isSubmitting) return;

        isSubmitting = true;
        modalSubmit.disabled = true;
        warningSound.pause();
        warningSound.currentTime = 0;

        try {

            const val = modalInput.value.trim();

            if (!val) {
                alert('Keterangan wajib diisi!');
                return;
            }

            if (currentAction === 'izin_tidak_masuk') {

                const res = await fetch('/api/absensi/guru', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', "X-CSRF-Token": csrfToken },
                    body: JSON.stringify({
                        status: 'izin_tidak_masuk',
                        alasan: val
                    })
                });

                if (!res.ok) {
                    alert('Server error');
                    return;
                }

                await syncFromServer();
                closeAbsensiModal();
                applyUIByState();
            }

            if (currentAction === 'terlambat') {

            const jamMasuk = getServerNow();

            const res = await fetch('/api/absensi/guru', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', "X-CSRF-Token": csrfToken },
                body: JSON.stringify({
                    status: 'masuk',
                    alasan: val
                })
            });

            if (!res.ok) {
                alert('Server error');
                return;
            }

            await syncFromServer();
            closeAbsensiModal();
            applyUIByState();
            renderTable();
        }

        } catch (err) {
            console.error(err);
            alert('Gagal koneksi');
        } finally {
            isSubmitting = false;
            modalSubmit.disabled = false;
        }
    });


    function closeAbsensiModal(){
        warningSound.pause();
        warningSound.currentTime = 0;

        modalOverlay.style.display = 'none';
        modalForm.style.display = 'none';
        modalInput.value = '';
        currentAction = null;

        const terlambatBanner = document.getElementById('terlambat-banner');
        if (terlambatBanner) {
            terlambatBanner.style.display = 'none';
        }

        const angryWrap = document.getElementById('angry-animation-wrapper');
        angryWrap.style.display = 'none';
        angryWrap.classList.remove('angry-shake','angry-pulse');

        modalForm.classList.remove('warning');

        if (angryAnimation) {
            angryAnimation.stop();
        }

        // =====================
        // STOP SOUND
        // =====================
        warningSound.pause();
        warningSound.currentTime = 0;
    }

    modalCancel?.addEventListener('click', () => {
        warningSound.pause();
        warningSound.currentTime = 0;
        closeAbsensiModal();
        applyUIByState();
        renderTable();
    });

    modalOverlay?.addEventListener('click', () => {
        warningSound.pause();
        warningSound.currentTime = 0;
        closeAbsensiModal();
    });

    function applyUIByState() {
        updateAbsensiButtons();
    }


    function getRowsForTable() {
        const rows = [];

        serverState.absensiHarian.forEach(a => {
            rows.push({
                tanggal: a.tanggal,
                status: a.status,
                jamMasuk: a.jamMasuk,
                jamPulang: a.jamPulang,
                alasan: a.alasan || '-'
            });
        });

        return rows.sort((a,b) =>
            new Date(`${b.tanggal} ${b.jamPulang || b.jamMasuk}`) -
            new Date(`${a.tanggal} ${a.jamPulang || a.jamMasuk}`)
        );
    }

    function renderTableGabungan() {
        absensiTableBody.innerHTML = '';
        let no = 1;

        getRowsForTable().forEach(r => {
            const tr = document.createElement('tr');

            if (r.status === 'terlambat') tr.style.background = '#fff5d8';

            tr.innerHTML = `
                <td>${no++}</td>
                <td>${r.tanggal}</td>
                <td>${r.status.replace('_',' ')}</td>
                <td>${r.jamMasuk}</td>
                <td>${r.jamPulang}</td>
                <td>${r.alasan}</td>
            `;

            absensiTableBody.appendChild(tr);
        });
    }

    function syncStatusHariIni() {
        const todayRow = serverState.absensiData.find(r => r.tanggal === todayISO);

        if (!todayRow) {
            serverState.statusHariIni = 'belum_absen';
            return;
        }

        if (todayRow.status === 'izin_tidak_masuk') {
            serverState.statusHariIni = 'izin_tidak_masuk';
            return;
        }

        if (todayRow.jamPulang) {
            serverState.statusHariIni = 'selesai';
            return;
        }

        serverState.statusHariIni = todayRow.status;
    }

    function formatDate(dateString) {
        if (!dateString) return '-';

        const parts = dateString.split('-');
        const date = new Date(parts[0], parts[1] - 1, parts[2]);

        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    harianPerPageInput?.addEventListener("change", () => {
        harianPerPage = parseInt(harianPerPageInput.value) || 10;
        harianCurrentPage = 1;
        renderTable();
    });

    function renderTable() {
        if (!absensiTableBody) return;

        absensiTableBody.innerHTML = '';

        let semuaData = [...serverState.absensiData];

        // ======================
        // FILTER
        // ======================
        semuaData = semuaData.filter(a => {
            const [year, month] = a.tanggal.split('-');

            if (selectedMonth &&
                month !== selectedMonth.padStart(2, '0')) {
                return false;
            }

            if (selectedYear &&
                year !== String(selectedYear)) {
                return false;
            }

            return true;
        });

        // ======================
        // SORT
        // ======================
        semuaData.sort((a, b) => {
            const timeA = new Date(`${a.tanggal} ${a.jamPulang || a.jamMasuk || '00:00:00'}`);
            const timeB = new Date(`${b.tanggal} ${b.jamPulang || b.jamMasuk || '00:00:00'}`);
            return timeB - timeA;
        });

        // ======================
        // PAGINATION CALC
        // ======================
        const totalData = semuaData.length;
        const totalPages = Math.ceil(totalData / harianPerPage);

        const start = (harianCurrentPage - 1) * harianPerPage;
        const end = start + harianPerPage;

        const pageData = semuaData.slice(start, end);

        // ======================
        // EMPTY
        // ======================
        if (!pageData.length) {
            absensiTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6" class="center">
                        Tidak ada data absensi
                    </td>
                </tr>`;
        }

        // ======================
        // RENDER ROW
        // ======================
        let nomor = start + 1;

        pageData.forEach(a => {

            const tr = document.createElement('tr');

            let statusText = {
                masuk: "Masuk",
                terlambat: "Terlambat",
                izin_tidak_masuk: "Izin Tidak Masuk"
            }[a.status] || "Masuk";

            if (a.status === 'izin_tidak_masuk') {
                tr.style.background = '#f8d7da';
            }
            else if (a.status === 'terlambat') {
                tr.style.background = '#fff5d8';
            }

            tr.innerHTML = `
                <td>${nomor++}</td>
                <td>${formatDate(a.tanggal)}</td>
                <td>${statusText}</td>
                <td>${a.jamMasuk || '-'}</td>
                <td>${a.jamPulang || '-'}</td>
                <td>${a.alasan || '-'}</td>
            `;

            absensiTableBody.appendChild(tr);
        });

        // ======================
        // UPDATE TOTAL INFO
        // ======================
        document.getElementById("harian-total-data").textContent = totalData;

        // ======================
        // RENDER PAGINATION
        // ======================
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {

        harianPagination.innerHTML = '';

        // SELALU tampil walaupun 1 halaman
        if (totalPages <= 0) totalPages = 1;

        let startPage = Math.max(
            1,
            harianCurrentPage - 2
        );

        let endPage = Math.min(
            totalPages,
            startPage + 4
        );

        if (endPage - startPage < 4) {
            startPage = Math.max(
                1,
                endPage - 4
            );
        }

        // PREV
        const prev = document.createElement("button");
        prev.textContent = "Prev";
        prev.disabled = harianCurrentPage === 1;

        prev.onclick = () => {
            harianCurrentPage--;
            renderTable();
        };

        harianPagination.appendChild(prev);

        // PAGE NUMBER
        for (let i = startPage; i <= endPage; i++) {

            const btn = document.createElement("button");

            btn.textContent = i;

            if (i === harianCurrentPage) {
                btn.classList.add("active");
            }

            btn.onclick = () => {
                harianCurrentPage = i;
                renderTable();
            };

            harianPagination.appendChild(btn);
        }

        // NEXT
        const next = document.createElement("button");

        next.textContent = "Next";

        next.disabled =
            harianCurrentPage === totalPages;

        next.onclick = () => {
            harianCurrentPage++;
            renderTable();
        };

        harianPagination.appendChild(next);
    }

    function openModal(title, message, action) {
        currentAction = action;

        modalOverlay.style.display = 'block';
        modalForm.style.display = 'block';

        modalForm.classList.remove('warning');

        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');

        if (modalTitle) modalTitle.textContent = title;
        if (modalMessage) modalMessage.textContent = message;

        modalInput.value = '';
        modalInput.focus();

        // Jika terlambat → tampilkan efek marah
        if (action === 'terlambat') {
            const angryWrap = document.getElementById('angry-animation-wrapper');
            if (angryWrap) {
                angryWrap.style.display = 'block';
                angryWrap.classList.add('angry-shake');
            }

            if (angryAnimation) {
                angryAnimation.play();
            }

            modalForm.classList.add('warning');

            warningSound.currentTime = 0;
            warningSound.play();
        }
    }

    async function syncServerTime() {
        const res = await fetch("/api/server-time");
        const data = await res.json();

        const serverTime = new Date(data.server_time);
        const localTime = new Date();

        serverTimeOffset = serverTime - localTime;
    }

    function getServerNow() {
        return new Date(new Date().getTime() + serverTimeOffset);
    }

    // ======================================
    // MODAL ELEGAN
    // ======================================
    function showElegantModal(message) {
    
        modalSound.currentTime = 0;
        modalSound.play();

        const overlay = document.createElement('div');
        overlay.className = 'saas-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'saas-modal';

        modal.innerHTML = `
            <div class="saas-modal-icon">⚠</div>
            <div class="saas-modal-message">${message}</div>
            <button class="btn saas-modal-btn">OK</button>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        requestAnimationFrame(() => {
            overlay.classList.add('show');
        });

        const close = () => {
            overlay.classList.remove('show');
            modalSound.pause();
            modalSound.currentTime = 0;
            setTimeout(() => overlay.remove(), 300);
        };

        modal.querySelector('.saas-modal-btn')
            .addEventListener('click', close);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    }

    // =========================
    // BUTTON ABSENSI MASUK
    // =========================
    btnAbsenMasuk?.addEventListener('click', async () => {

        if (isSubmitting) return;
        isSubmitting = true;
        btnAbsenMasuk.disabled = true;

        try {
            const response = await fetch('/api/absensi/guru', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', "X-CSRF-Token": csrfToken },
                body: JSON.stringify({
                    status: 'masuk'
                })
            });

            const data = await response.json();

            // 🔥 KUNCI UTAMA ADA DI SINI
            if (!response.ok) {

                // ⚠️ KASUS TERLAMBAT → BUKA MODAL ALASAN
                if (data.need_reason === true) {
                    openModal(
                        'Late Check-In',
                        'Please provide a reason for being late.',
                        'terlambat'
                    );
                    return;
                }

                // ❌ ERROR BIASA
                showElegantModal(data.message || 'Gagal absen');
                return;
            }

            // ✅ SUKSES MASUK
            await syncFromServer();
            applyUIByState();
            renderTable();

        } finally {
            isSubmitting = false;
            btnAbsenMasuk.disabled = false;
        }
    });

    // ==============================
    // BUTTON ABSENSI KELUAR
    // ==============================
    btnAbsenKeluar?.addEventListener('click', async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        const jamKeluar = getServerNow().toLocaleTimeString('id-ID', { hour12: false });

        try {
            const response = await fetch('/api/absensi/guru', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token,
                    "X-CSRF-Token": csrfToken
                },
                body: JSON.stringify({
                    status: 'keluar',
                    jam_keluar: jamKeluar
                })
            });

            const data = await response.json();

            if (!response.ok) {
                showElegantModal(data.message || 'Gagal checkout');
                return;
            }

            // 🔥 TAMBAHKAN INI
            await syncFromServer();
            applyUIByState();
            renderTable();

        } catch (error) {
            console.error(error);
            showElegantModal('Terjadi kesalahan');
        }
    });
    
    // ==========================
    // BUTTON IZIN TIDAK MASUK
    // ==========================
    btnIzin?.addEventListener('click', async (e) => {
        e.preventDefault();

        if (isSubmitting) return;
        const now = getServerNow();
        const jam = now.getHours();

        if (jam >= 11) {
            showElegantModal("Batas waktu izin hari ini sudah lewat (maksimal jam 11.00)");
            return;
        }

        isSubmitting = true;
        btnIzin.disabled = true;

        try {
            openModal(
                'Excused Absence',
                'Reason is required',
                'izin_tidak_masuk'
            );

        } finally {
            isSubmitting = false;
            btnIzin.disabled = false;
        }
    });

    // ======================
    // DEV RESET
    // ======================
    if (btnResetDev) {
        btnResetDev.addEventListener('click', async () => {
            if (!confirm('DEV RESET: Yakin hapus SEMUA data absensi?')) return;

            try {
                isDevReset = true;
                // ========================================================
                // 1. HAPUS DATA DI SERVER
                // ========================================================
                const res = await fetch('/dev-reset-guru', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', "X-CSRF-Token": csrfToken },
                    body: JSON.stringify({})
                });

                const data = await res.json();
                if (!res.ok || data.status !== 'success') {
                    alert('Gagal reset server');
                    return;
                }

                // ========================================================
                // 2. HAPUS LOCALSTORAGE (TOTAL)
                // ========================================================
                const keysToRemove = [];

                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (
                        key.includes('absen') ||
                        key.includes('absensi') ||
                        key.includes('izin') ||
                        key.includes('status_hari_ini')
                    ) {
                        keysToRemove.push(key);
                    }
                }

                keysToRemove.forEach(k => localStorage.removeItem(k));
                localStorage.removeItem(todayISO + '_izin_selesai');

                // ========================================================
                // 3. RESET STATE JAVASCRIPT (INI YANG DIPAKAI UI)
                // ========================================================
                serverState = {
                    statusHariIni: 'belum_absen',
                    absensiHarian: [],
                    absensiData: [],
                    absensiRaw: [],
                };

                // ========================================================
                // 4. RESET UI
                // ========================================================
                resetAllUI();
                updateAbsensiButtons();
                renderTableGabungan?.();
                renderTable?.();
                applyUIByState();

                alert('✅ DEV reset berhasil total');

                localStorage.setItem('dev_reset_done', '1');
                window.location.reload();

            } catch (e) {
                console.error('❌ Reset error:', e);
                alert('Reset DEV gagal');
            }
        });
    }

    function resetAllUI() {
        // ======================
        // HAPUS BANNER IZIN
        // ======================
        const izinBanner = document.getElementById('izin-status-banner');
        if (izinBanner) {
            izinBanner.style.display = 'none';
            izinBanner.textContent = '';
            izinBanner.className = 'izin-status-banner';
        }

        // ======================
        // RESET BUTTON IZIN
        // ======================
        const izinBtn = document.getElementById('izin-submit');
        if (izinBtn) {
            izinBtn.disabled = false;
            izinBtn.style.opacity = 1;
            izinBtn.style.cursor = 'pointer';
        }

        // ======================
        // HAPUS NOTIF ABSENSI SELESAI
        // ======================
        if (izinNotif) {
            izinNotif.style.display = 'none';
            izinNotif.textContent = '';
        }

        // ======================
        // RESET TABEL
        // ======================
        absensiTableBody.innerHTML = '';

        // ======================
        // FORCE STATUS AWAL
        // ======================
        serverState.statusHariIni = 'belum_absen';
    }

    document.querySelectorAll('.absen-filter-group').forEach(group => {
        const selected = group.querySelector('.absen-filter-selected');

        selected.addEventListener('click', () => {

            document.querySelectorAll('.absen-filter-group')
                .forEach(g => {
                    if (g !== group) g.classList.remove('active');
                });

            group.classList.toggle('active');
        });
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.absen-filter-group')) {
            document.querySelectorAll('.absen-filter-group')
                .forEach(g => g.classList.remove('active'));
        }
    });

    // ======================
    // SYNC TERBARU ANTAR DEVICE
    // ======================
    async function fetchLatestAbsensi() {
        try {
            const res = await fetch('/api/absensi');
            const serverData = await res.json();

            let hasil = [];

            serverData.forEach(a => {
                hasil.push({
                    tanggal: a.tanggal,
                    status: a.status,
                    jamMasuk: a.jamMasuk || null,
                    jamPulang: a.jamPulang || null,
                    alasan: a.alasan || ''
                });
            });

            serverState.absensiData = hasil;

            syncStatusHariIni();
            applyUIByState();
            renderTable();

        } catch (err) {
            console.error('❌ Gagal fetch absensi:', err);
        }
    }

    async function syncFromServer() {
        await fetchLatestAbsensi();
    }
    await fetchLatestAbsensi();
    if (absensiBtnContainer) {
        absensiBtnContainer.style.visibility = 'visible';
    }
});
