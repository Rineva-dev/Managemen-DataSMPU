let serverState = {
    statusHariIni: null,
    absensiHarian: [],
    absensiData: [],
    absensiRaw: [],
    izinKeluar: [],
    izinStatus: null
};

const csrfToken =
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");

let isDevReset = false;

const PEMBELAJARAN_DROPDOWN_KEY = 'sidebar_pembelajaran_open';

document.addEventListener('DOMContentLoaded', async () => {
    function on(el, event, handler) {
        if (el) el.addEventListener(event, handler);
    }
    const devResetDone = localStorage.getItem('dev_reset_done') === '1';

    if (devResetDone) {
        serverState.izinKeluar = [];
        localStorage.removeItem('dev_reset_done');
    }

    if (localStorage.getItem('dev_reset_done') === '1') {
        serverState.izinKeluar = [];
        izinTableBody.innerHTML = '';
        localStorage.removeItem('dev_reset_done');
    }
    
    function getCurrentTime() {
        const d = new Date();
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }

    const pembelajaranDropdown = document.querySelector('.sidebar-dropdown');

    if (pembelajaranDropdown) {
        const isOpen = localStorage.getItem(PEMBELAJARAN_DROPDOWN_KEY) === '1';

        if (isOpen) {
            pembelajaranDropdown.classList.add('open');
        }
    }

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
    // ELEMENTS
    // ======================
    const dashboardContent = document.getElementById('dashboard-content');
    const absensiContent = document.getElementById('absensi-content');
    const izinKeluarContent = document.getElementById('izin-keluar-content');

    const jamDigital = document.getElementById('jam-digital');
    const jamIzin = document.getElementById('jam-izin');
    const tanggalIzin = document.getElementById('tanggal-izin');

    const btnAbsenMasuk = document.getElementById('btn-absen-masuk');
    const btnAbsenKeluar = document.getElementById('btn-absen-keluar');
    const btnIzin = document.getElementById('btn-izin');
    const izinNotif = document.getElementById('izin-notif');
    const btnResetDev = document.getElementById('btn-reset-dev');

    const izinSubmitBtn = document.getElementById('izin-submit');
    const izinTimeWrapper = document.getElementById('izin-time-wrapper');
    const modalJamMulai = document.getElementById('modal-jam-mulai');
    const modalJamSelesai = document.getElementById('modal-jam-selesai');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalForm = document.getElementById('modal-form');
    const modalTitle = document.getElementById('modal-title');
    const modalInput = document.getElementById('modal-input');
    const modalSubmit = document.getElementById('modal-submit');
    const modalCancel = document.getElementById('modal-cancel');
    const terlambatBanner = document.getElementById('terlambat-banner');

    const absensiTableBody = document.querySelector('#absensi-table tbody');
    const izinTableBody = document.querySelector('#izin-keluar-table tbody');
    const dashboardChartCanvas = document.getElementById('grafik-absensi');

    let dashboardChart = null;

    ['modal-photo', 'modal-photo-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentElement !== document.body) {
            document.body.appendChild(el);
        }
    });

    ['crop-modal', 'crop-modal-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentElement !== document.body) {
            document.body.appendChild(el);
        }
    });

    ['modal-profile', 'modal-profile-overlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentElement !== document.body) {
            document.body.appendChild(el);
        }
    });

    // ======================
    // GLOBAL VARIABLES
    // ======================
    const todayISO = getTodayLocalISO();
    const todayKey = 'absen_' + todayISO;

    serverState.statusHariIni = null;
    serverState.izinKeluar = [];

    serverState.absensiEvent =
        JSON.parse(localStorage.getItem('absensi_event') || '[]');

    applyUIByState();
    updateAbsensiButtons();

    let currentAction = null;

    // ======================
    // Helper format 24 jam
    // ======================
    function getTodayLocalISO() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // ======================
    // FILTER BULAN DASHBOARD
    // ======================
    const filterBulan = document.getElementById('filter-bulan-dashboard');
    let currentFilterStatus = 'all';

    on(filterBulan, 'change', () => {
        currentFilterStatus = filterBulan.value || 'all';
        updateDashboardChart();
    });

    // ======================
    // FILTER TAHUN DASHBOARD
    // ======================
    const filterTahunDashboard = document.getElementById('filter-tahun-dashboard');

    if (filterTahunDashboard) {
        const tahunSekarang = new Date().getFullYear();
        filterTahunDashboard.innerHTML = '<option value="">Years</option>';

        for (let i = tahunSekarang; i >= tahunSekarang - 5; i--) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            filterTahunDashboard.appendChild(opt);
        }
    }

    let currentFilterTahun = 'all';

    if(filterTahunDashboard){
        filterTahunDashboard.addEventListener('change', () => {
            currentFilterTahun = filterTahunDashboard.value || 'all';
            updateDashboardChart();
        });
    }
    
    // ======================
    // FILTER BULAN ABSENSI
    // ======================
    const filterBulanAbsensi = document.getElementById('filter-bulan-absensi');
    const filterTahunAbsensi = document.getElementById('filter-tahun-absensi');

        if (filterTahunAbsensi) {
            const currentYear = new Date().getFullYear();
            filterTahunAbsensi.innerHTML = '<option value="">Years</option>';

            for (let y = currentYear; y >= currentYear - 5; y--) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                filterTahunAbsensi.appendChild(opt);
            }
        }

    // ======================
    // FILTER FUNCTION ABSENSI (TABLE)
    // ======================
    function applyFilterAbsensi() {
        if (!filterBulanAbsensi || !filterTahunAbsensi || !absensiTableBody) return;

        const bulan = filterBulanAbsensi.value;
        const tahun = filterTahunAbsensi.value;

        const rows = absensiTableBody.querySelectorAll('tr');

        rows.forEach(row => {
            const tanggalCell = row.children[1]; // kolom tanggal (index 1 karena: 0 = No, 1 = Tanggal)
            if (!tanggalCell) return;

            const tanggalText = tanggalCell.textContent.trim();
            let show = true;

            if (tanggalText) {
                const parts = tanggalText.split('/');
                const rowMonth = parts[1];
                const rowYear = parts[2];

                if (bulan && rowMonth !== bulan) show = false;
                if (tahun && rowYear !== tahun) show = false;
            }

            row.style.display = show ? '' : 'none';
        });
    }

    // ======================
    // EVENT FILTER ABSENSI (TABLE)
    // ======================
    if (filterBulanAbsensi) {
        filterBulanAbsensi.addEventListener('change', applyFilterAbsensi);
    }

    if (filterTahunAbsensi) {
        filterTahunAbsensi.addEventListener('change', applyFilterAbsensi);
    }

    // ======================
    // FILTER BULAN IZIN KELUAR
    // ======================
    const filterBulanIzin = document.getElementById('filter-bulan-izin');
    const filterTahunIzin = document.getElementById('filter-tahun-izin');

        if (filterTahunIzin) {
            const currentYear = new Date().getFullYear();
            filterTahunIzin.innerHTML = '<option value="">Years</option>';

            for (let y = currentYear; y >= currentYear - 5; y--) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                filterTahunIzin.appendChild(opt);
            }
        }

    // ======================
    // FILTER FUNCTION ABSENSI (TABLE)
    // ======================
    function applyFilterIzin() {
        if (!filterBulanIzin || !filterTahunIzin || !izinTableBody) return;

        const bulan = filterBulanIzin.value;
        const tahun = filterTahunIzin.value;

        const rows = izinTableBody.querySelectorAll('tr');

        rows.forEach(row => {
            const tanggalCell = row.children[1];
            if (!tanggalCell) return;

            const tanggalText = tanggalCell.textContent.trim();
            let show = true;

            if (tanggalText) {
                const parts = tanggalText.split('/');
                const rowYear = parts[2];
                const rowMonth = parts[1];

                if (bulan && rowMonth !== bulan) show = false;
                if (tahun && rowYear !== tahun) show = false;
            }

            row.style.display = show ? '' : 'none';
        });
    }

    // ======================
    // EVENT FILTER IZIN KELUAR (TABLE)
    // ======================
    if (filterBulanIzin) {
        filterBulanIzin.addEventListener('change', applyFilterIzin);
    }

    if (filterTahunIzin) {
        filterTahunIzin.addEventListener('change', applyFilterIzin);
    }

    function updateIzinKeluarUI(){
        const banner = document.getElementById('izin-status-banner');
        const btn = document.getElementById('izin-submit');
        
        if (!banner || !btn) return;

        if(serverState.izinStatus === null){
            banner.style.display = 'none';
            btn.disabled = true;
            return;
        }

        banner.style.display = 'block';

        const statusHariIni = serverState.statusHariIni;
        const izinStatus = serverState.izinStatus;

        // ================================
        // 1. SUDAH ABSEN KELUAR / PULANG
        // ================================
        if (statusHariIni === 'sudah_keluar') {
            banner.className = 'izin-status-banner error';
            banner.textContent = 'Anda telah absen keluar. Izin keluar tidak tersedia.';
            btn.disabled = true;
            btn.style.opacity = 0.5;
            btn.style.cursor = 'not-allowed';
            return;
        }

        // ================================
        // 3. SEDANG IZIN KELUAR (COUNTDOWN)
        // ================================
        if (izinStatus && izinStatus.active) {
            // banner di-handle oleh countdown
            btn.disabled = true;
            btn.style.opacity = 0.5;
            btn.style.cursor = 'not-allowed';
            return;
        }

        // ================================
        // 4. IZIN SUDAH BERAKHIR
        // ================================
        if (
            serverState.izinKeluar.length > 0 &&
            izinStatus &&
            !izinStatus.active &&
            !izinStatus.not_started &&
            izinStatus.remaining === 0
        ) {
            banner.className = 'izin-status-banner error';
            banner.textContent =
                '⚠️ Izin keluar telah berakhir. Pastikan Anda sudah kembali.';
            btn.disabled = true;
            return;
        }

        // ================================
        // 5. SUDAH ABSEN MASUK / TERLAMBAT
        // ================================
        if (statusHariIni === 'sudah_masuk' || statusHariIni === 'terlambat') {
            banner.className = 'izin-status-banner success';
            banner.textContent = '✅ Anda sudah absen, silakan ajukan izin keluar.';
            btn.disabled = false;
            btn.style.opacity = 1;
            btn.style.cursor = 'pointer';
            return;
        }

        // ================================
        // 6. IZIN TIDAK MASUK
        // ================================
        if (statusHariIni === 'izin_tidak_masuk') {
            banner.className = 'izin-status-banner error';
            banner.textContent =
                '❌ Anda izin tidak masuk hari ini, tidak bisa izin keluar.';
            btn.disabled = true;
            btn.style.opacity = 0.5;
            btn.style.cursor = 'not-allowed';
            return;
        }

        // ================================
        // 7. BELUM ABSEN APA-APA
        // ================================
        banner.className = 'izin-status-banner warning';
        banner.textContent = '⚠️ Anda belum absen masuk';
        btn.disabled = true;
        btn.style.opacity = 0.5;
        btn.style.cursor = 'not-allowed';
    }

    on(filterBulan, 'change', () => {
        currentFilterStatus = filterBulan.value || 'all';
        updateDashboardChart();
    });

    async function handleIzinKeluarSubmit(){
        if (serverState.izinKeluar && serverState.izinKeluar.length > 0) {
            alert('Izin keluar hanya boleh 1 kali dalam sehari.');
            return;
        }
        const statusHariIni = serverState.statusHariIni;
        const jamKeluar = statusHariIni === 'sudah_keluar';

        if(jamKeluar){
            alert('Absensi hari ini sudah selesai. Tidak bisa mengajukan izin keluar.');
            return;
        }

        if(statusHariIni !== 'sudah_masuk' && statusHariIni !== 'terlambat'){
            alert('Anda belum absen masuk.');
            return;
        }

        const jamMulai = document.getElementById('izin-jam-mulai').value;
        const jamSelesai = document.getElementById('izin-jam-selesai').value;
        const alasan = document.getElementById('izin-alasan').value.trim();

        if(!jamMulai || !jamSelesai || !alasan){
            alert('Jam mulai, jam selesai, dan alasan wajib diisi!');
            return;
        }

        if(jamSelesai <= jamMulai){
            alert('Jam selesai harus lebih besar dari jam mulai!');
            return;
        }

        try {
            const res = await fetch('/api/izin-keluar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tanggal: todayISO,
                    jam_mulai: jamMulai,
                    jam_selesai: jamSelesai,
                    alasan
                })
            });

            if (!res.ok) {
                alert('Gagal menyimpan izin keluar');
                return;
            }

            // 🔥 AMBIL ULANG DARI SERVER
            await fetchIzinKeluarFromServer();
            await syncIzinStatusFromServer();

            renderIzinTable();
            updateIzinKeluarUI();

        } catch (err) {
            console.error(err);
            alert('Koneksi ke server gagal');
        }

       // reset form
        document.getElementById('izin-jam-mulai').value = '';
        document.getElementById('izin-jam-selesai').value = '';
        document.getElementById('izin-alasan').value = '';
    }

    // ======================
    // JAM DIGITAL
    // ======================
    function updateJam() {
        const now = new Date();
        const jamDash = document.getElementById('jam-dashboard');
        const tanggalDash = document.getElementById('tanggal-dashboard');
        if (jamDash && tanggalDash) {
            jamDash.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
            tanggalDash.textContent = now.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
            });
        }
        if (jamDigital) {
            jamDigital.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
            document.getElementById('tanggal-absensi').textContent = now.toLocaleDateString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
            });
        }
    }
    setInterval(updateJam, 1000);
    updateJam();

    function updateJamIzin() {
        const now = new Date();
        if(jamIzin && tanggalIzin){
            jamIzin.textContent = now.toLocaleTimeString('id-ID', {hour12:false});
            tanggalIzin.textContent = now.toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
        }
    }
    setInterval(updateJamIzin, 1000);
    updateJamIzin();

    // ======================
    // MODAL
    // ======================
    function openModal(title, placeholder, action){
        modalTitle.textContent = title;
        modalInput.placeholder = placeholder;
        modalInput.value = '';
        currentAction = action;

        // === BANNER & ANIMASI TERLAMBAT ===
        if(action === 'terlambat'){
            terlambatBanner.style.display = 'block';

            const angryWrap = document.getElementById('angry-animation-wrapper');
            angryWrap.style.display = 'block';

            angryWrap.classList.remove('angry-shake','angry-pulse');
            void angryWrap.offsetWidth;
            angryWrap.classList.add('angry-shake','angry-pulse');

            modalForm.classList.add('warning');

            angryAnimation.goToAndPlay(0, true);
        } else {
            terlambatBanner.style.display = 'none';

            // sembunyikan animasi
            document.getElementById('angry-animation-wrapper').style.display = 'none';
            angryAnimation.stop();
        }

        if(izinTimeWrapper){
            izinTimeWrapper.style.display = (action === 'izin_keluar') ? 'flex' : 'none';
            modalJamMulai.value = '';
            modalJamSelesai.value = '';
        }

        modalOverlay.style.display = 'block';
        modalForm.style.display = 'block';
        modalForm.getBoundingClientRect();
    }

    function closeAbsensiModal(){
        warningSound.pause();
        warningSound.currentTime = 0;

        modalOverlay.style.display = 'none';
        modalForm.style.display = 'none';
        modalInput.value = '';
        currentAction = null;

        terlambatBanner.style.display = 'none';

        const angryWrap = document.getElementById('angry-animation-wrapper');
        angryWrap.style.display = 'none';
        angryWrap.classList.remove('angry-shake','angry-pulse');

        modalForm.classList.remove('warning');

        angryAnimation.stop();

        // =====================
        // STOP SOUND
        // =====================
        warningSound.pause();
        warningSound.currentTime = 0;
    }

    on(modalCancel, 'click', () => {
        warningSound.pause();
        warningSound.currentTime = 0;
        closeAbsensiModal();
        applyUIByState();
        renderTable();
    });

    on(modalOverlay, 'click', () => {
        warningSound.pause();
        warningSound.currentTime = 0;
        closeAbsensiModal();
    });

    // ======================
    // IZIN KELUAR TABLE
    // ======================
    function renderIzinTable() {
        if (!izinTableBody) return;
        izinTableBody.innerHTML = '';

        if (!Array.isArray(serverState.izinKeluar)) return;

        serverState.izinKeluar.forEach((row, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td>${row.tanggal ? formatDate(row.tanggal) : '-'}</td>
                <td>${row.jamMulai || '-'}</td>
                <td>${row.jamSelesai || '-'}</td>
                <td>${row.alasan || '-'}</td>
            `;
            izinTableBody.appendChild(tr);
        });
    }

    function applyUIByState() {
        updateAbsensiButtons();
        updateIzinKeluarUI();
    }

    let izinCountdownInterval = null;
    let izinStartInterval = null;

    function startIzinStartCountdown(seconds) {
        clearInterval(izinStartInterval);

        const banner = document.getElementById('izin-status-banner');
        if (!banner) return;

        izinStartInterval = setInterval(() => {
            if (seconds <= 0) {
                clearInterval(izinStartInterval);
                izinStartInterval = null;

                // 🔥 AMBIL STATUS BARU → HARUSNYA ACTIVE
                syncIzinStatusFromServer();
                return;
            }

            const menit = Math.floor(seconds / 60);
            const detik = seconds % 60;

            banner.className = 'izin-status-banner info';
            banner.textContent =
                `🕒 Izin keluar akan dimulai dalam ${menit} menit ${detik} detik`;

            seconds--;
        }, 1000);
    }
    
    function startIzinCountdown(seconds) {
        clearInterval(izinCountdownInterval);

        const banner = document.getElementById('izin-status-banner');
        if (!banner) return;

        izinCountdownInterval = setInterval(async () => {
            if (seconds <= 0) {
                clearInterval(izinCountdownInterval);
                izinCountdownInterval = null;

                await syncIzinStatusFromServer();
                updateIzinKeluarUI();
                return;
            }

            const jam = Math.floor(seconds / 3600);
            const menit = Math.floor((seconds % 3600) / 60);
            const detik = seconds % 60;

            banner.className = 'izin-status-banner warning';
            banner.textContent =
                `⏳ Anda sedang izin keluar. Sisa waktu: ${jam} jam ${menit} menit ${detik} detik`;

            seconds--;
        }, 1000);
    }

    function stopIzinCountdown() {
        if (izinCountdownInterval) {
            clearInterval(izinCountdownInterval);
            izinCountdownInterval = null;
        }
    }

    // ======================
    // ABSENSI BUTTONS
    // ======================
    function updateAbsensiButtons() {
        if (!btnAbsenMasuk || !btnAbsenKeluar || !btnIzin) {
            return;
        }

        const status = serverState.statusHariIni;

        btnAbsenMasuk.style.display = 'none';
        btnAbsenKeluar.style.display = 'none';
        btnIzin.style.display = 'none';

        // ===============================
        // BELUM ABSEN
        // ===============================
        if (!status || status === 'belum_absen') {
            btnAbsenMasuk.style.display = 'inline-block';
            btnAbsenMasuk.disabled = false;
            btnAbsenMasuk.style.opacity = bolehAbsenMasuk() ? 100 : 100;
            btnAbsenMasuk.style.cursor = 'pointer';
            btnIzin.style.display = 'inline-block';
            return;
        }

        // ===============================
        // SUDAH MASUK / TERLAMBAT
        // ===============================
        if (status === 'sudah_masuk' || status === 'terlambat') {
            btnAbsenKeluar.style.display = 'inline-block';
            return;
        }

        // ===============================
        // SUDAH SELESAI
        // ===============================
        if (status === 'sudah_keluar' || status === 'izin_tidak_masuk') {
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
    on(modalSubmit, 'click', async () => {
        warningSound.pause();
        warningSound.currentTime = 0;

        const val = modalInput.value.trim();
        if(!val && currentAction !== 'izin_keluar'){ alert('Keterangan wajib diisi!'); return; }

        if (currentAction === 'izin_tidak_masuk') {
            const alasanIzin = modalInput.value.trim();
            if (!alasanIzin) {
                alert('Keterangan wajib diisi!');
                return;
            }

            try {
                const res = await fetch('/api/absensi/guru', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tanggal: todayISO,
                        status: 'izin_tidak_masuk',
                        alasan: alasanIzin
                    })
                });

                if (!res.ok) {
                    const text = await res.text();
                    console.error('SERVER ERROR:', text);
                    alert('Server error saat mengirim izin tidak masuk');
                    return;
                }

                // 🔥 AMBIL ULANG DARI SERVER
                await syncFromServer();

                closeAbsensiModal();
                applyUIByState();

            } catch (err) {
                console.error(err);
                alert('Gagal koneksi ke server');
            }
        }

        if (currentAction === 'terlambat') {
            const jamMasuk = getCurrentTime();
            const alasanTerlambat = val;

            try {
                const res = await fetch('/api/absensi/guru', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        tanggal: todayISO,
                        status: 'terlambat',
                        jam_masuk: jamMasuk,
                        jam_keluar: null,
                        alasan: alasanTerlambat
                    })
                });

                const data = await res.json();
                if (!res.ok) {
                    alert(data.message);
                    return;
                }

                serverState.statusHariIni = 'terlambat';

                const absensiBaru = {
                    tanggal: todayISO,
                    status: 'terlambat',
                    jamMasuk: jamMasuk,
                    jamPulang: null,
                    alasan: alasanTerlambat
                };
                serverState.absensiData.push(absensiBaru);

                applyUIByState();
                syncFromServer();
                closeAbsensiModal();

            } catch (err) {
                console.error(err);
                alert('Gagal koneksi ke server');
            }
        }
    });

    function showSection(menu) {
        const section = document.getElementById(menu + '-content');
        if (!section) return; // ⬅️ WAJIB

        document.querySelectorAll('.content-section')
            .forEach(s => s.style.display = 'none');

        section.style.display = 'block';
    }

    const path = window.location.pathname;
    const isServerPage =
        path.startsWith('/log-pembelajaran') ||
        path.startsWith('/penilaian');
    
    // ===============================
    // SERVER PAGE (NON SPA)
    // ===============================
    if (isServerPage) {
        document.querySelectorAll('.sidebar a')
            .forEach(a => a.classList.remove('active'));
    }
    // ===============================
    // SPA PAGE
    // ===============================
    if (!isServerPage) {
        const params = new URLSearchParams(window.location.search);
        const menu = params.get('menu') || 'dashboard';

        showSection(menu);
        setActiveMenu(menu);
    }

    document.querySelectorAll('.sidebar-dropdown > a').forEach(trigger => {
        trigger.addEventListener('click', e => {
            e.preventDefault();

            const parent = trigger.closest('.sidebar-dropdown');
            const isOpen = parent.classList.contains('open');

            if (isOpen) {
                parent.classList.remove('open');
                localStorage.setItem(PEMBELAJARAN_DROPDOWN_KEY, '0');
            } else {
                parent.classList.add('open');
                localStorage.setItem(PEMBELAJARAN_DROPDOWN_KEY, '1');
            }
        });
    });

    // ======================
    // NAVIGATION
    // ======================
    function setActiveMenu(menu) {
        if (isServerPage) return;

        document.querySelectorAll('.sidebar a')
            .forEach(a => a.classList.remove('active'));

        if (menu === 'pembelajaran') return;

        document
            .querySelectorAll(`[data-icon="${menu}"]`)
            .forEach(a => a.classList.add('active'));

        // ======================
        // HIDE CONTENT
        // ======================
        if(dashboardContent) dashboardContent.style.display = 'none';
        if(absensiContent) absensiContent.style.display = 'none';
        if(izinKeluarContent) izinKeluarContent.style.display = 'none';

        if(menu === 'dashboard') {
            if(dashboardContent) {
                dashboardContent.style.display = 'block';
                updateDashboardChart();
            }
        }
        else if(menu === 'absensi') {
            if(absensiContent) {
                absensiContent.style.display = 'block';
                updateAbsensiButtons();
            }
        }
        else if(menu === 'izin-keluar') {
            if(izinKeluarContent) {
                izinKeluarContent.style.display = 'block';

                fetchIzinKeluarFromServer().then(() => {
                    renderIzinTable();
                    syncIzinStatusFromServer();
                    updateIzinKeluarUI();
                });

                updateJamIzin();
            }
        }

        // ======================
        // SET ACTIVE (SIDEBAR + BOTTOM)
        // ======================
        document
            .querySelectorAll(`[data-icon="${menu}"]`)
            .forEach(a => a.classList.add('active'));

        // ======================
        // SAVE STATE
        // ======================
        localStorage.setItem('activeMenu', menu);
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

        applyFilterAbsensi();
    }

    function syncStatusHariIni() {
        const today = todayISO;
        const todayRow = serverState.absensiData.find(r => r.tanggal === today);

        if (!todayRow) {
            serverState.statusHariIni = 'belum_absen';
            return;
        }
        if (todayRow.status === 'izin_tidak_masuk') {
            serverState.statusHariIni = 'izin_tidak_masuk';
            return;
        }
        if (todayRow.jamPulang) {
            serverState.statusHariIni = 'sudah_keluar';
            return;
        }
        if (todayRow.jamMasuk) {
            serverState.statusHariIni = 'sudah_masuk';
            return;
        }
        serverState.statusHariIni = 'belum_absen';
    }

    function renderTable() {
        if (!absensiTableBody) return;

        absensiTableBody.innerHTML = '';
        let nomor = 1;

        const semuaData = [...serverState.absensiData];

        // urutkan terbaru
        semuaData.sort((a, b) => {
            const timeA = new Date(`${a.tanggal} ${a.jamPulang || a.jamMasuk || '00:00:00'}`);
            const timeB = new Date(`${b.tanggal} ${b.jamPulang || b.jamMasuk || '00:00:00'}`);
            return timeB - timeA;
        });

        semuaData.forEach(a => {
            const tr = document.createElement('tr');

            let statusText = a.status;
            if (a.status === 'sudah_masuk') statusText = 'Masuk';
            if (a.status === 'terlambat') statusText = 'Terlambat';
            if (a.status === 'izin_tidak_masuk') statusText = 'Izin Tidak Masuk';

            if (a.status === 'izin_tidak_masuk') {
                tr.style.background = '#f8d7da';
            } else if (a.status === 'terlambat') {
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

        applyFilterAbsensi();
    }

    function bolehAbsenMasuk() {
        const now = new Date();
        const jam = now.getHours();
        const menit = now.getMinutes();

        // BOLEH hanya sampai 11:00 tepat
        return !(jam > 20 || (jam === 20 && menit > 0));
    }

    // =========================
    // ABSENSI BUTTONS
    // =========================
    btnAbsenMasuk?.addEventListener('click', async () => {
        try {
            // Ambil IP publik user
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            const userIP = data.ip;

            // Cek IP publik sementara untuk percobaan
            const ipSekolah = '203.78.114.45';
            if (userIP !== ipSekolah) {
                showElegantModal("Absensi wajib koneksi dengan internet sekolah (IP: 203.78.114.45)!");
                return;
            }
        } catch (err) {
            console.error(err);
            showElegantModal("❌ Tidak dapat mendeteksi IP publik. Pastikan koneksi internet aktif!");
            return;
        }

        await syncFromServer();

        if (serverState.statusHariIni === 'izin_tidak_masuk') {
            showElegantModal(
                'You have already submitted an excused absence today.',
                3000
            );
            applyUIByState();
            return;
        }

        if (serverState.statusHariIni !== 'belum_absen') {
            showElegantModal(
                'You have already checked in today.',
                3000
            );
            applyUIByState();
            return;
        }

        if (!bolehAbsenMasuk()) {
            showElegantModal(
                "Check-in is only allowed until 11:00 AM",
                3000
            );
            return;
        }
        
        const now = new Date();
        const jam = now.getHours();
        const menit = now.getMinutes();

        const jamMasuk = getCurrentTime();
        const batasJam = 7;
        const batasMenit = 30;
        const terlambat = jam > batasJam || (jam === batasJam && menit > batasMenit);
        const status = terlambat ? 'terlambat' : 'masuk';

        if (terlambat) {
            warningSound.play();
            openModal(
                "You’re Late", 
                'Enter Your Reason for Being Late', 
                'terlambat'
            );
            return;
        }

        try {
            const res = await fetch('/api/absensi/guru', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tanggal: todayISO,
                    status: status,
                    jam_masuk: jamMasuk,
                    jam_keluar: null,
                    alasan: null
                })
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.message || 'Gagal absen masuk');
                return;
            }

            await syncFromServer();

        } catch (err) {
            console.error(err);
            alert('Gagal koneksi ke server');
        }
    });

    function showElegantModal(message) {
        modalSound.currentTime = 0;
        modalSound.play();

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.5)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = 9999;
        overlay.style.opacity = 0;
        overlay.style.transition = 'opacity 0.4s ease';
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.style.opacity = 1);

        const modal = document.createElement('div');
        modal.style.background = 'linear-gradient(135deg, #ffdddd 0%, #ffd6d6 100%)';
        modal.style.width = '400px';
        modal.style.padding = '30px 40px';
        modal.style.borderRadius = '20px';
        modal.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
        modal.style.maxWidth = '400px';
        modal.style.textAlign = 'center';
        modal.style.fontFamily = 'Segoe UI, sans-serif';
        modal.style.color = '#1a1a1a';
        modal.style.fontSize = '16px';
        modal.style.fontWeight = '500';
        modal.style.transform = 'scale(0.8)';
        modal.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        modal.style.opacity = 0;
        overlay.appendChild(modal);

        // ⚠️ icon besar di atas
        const icon = document.createElement('div');
        icon.textContent = "⚠️";
        icon.style.fontSize = '50px';
        icon.style.marginBottom = '15px';
        icon.style.display = 'inline-block';
        icon.style.animation = 'pulse 1.2s infinite';
        modal.appendChild(icon);

        const style = document.createElement('style');
        style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.3); }
            100% { transform: scale(1); }
        }
        `;
        document.head.appendChild(style);

        const msg = document.createElement('div');
        msg.innerHTML = message;
        msg.style.marginBottom = '20px';
        msg.style.fontWeight = '600';
        modal.appendChild(msg);

        const okBtn = document.createElement('button');
        okBtn.textContent = 'OK';
        okBtn.style.background = '#ffffff';
        okBtn.style.color = '#1a1a1a';
        okBtn.style.border = 'none';
        okBtn.style.padding = '10px 20px';
        okBtn.style.borderRadius = '12px';
        okBtn.style.fontWeight = '600';
        okBtn.style.cursor = 'pointer';
        okBtn.style.transition = 'transform 0.2s ease, background 0.2s ease';
        okBtn.onmouseover = () => { okBtn.style.transform = 'scale(1.05)'; okBtn.style.background = '#f0f0f0'; };
        okBtn.onmouseout = () => { okBtn.style.transform = 'scale(1)'; okBtn.style.background = '#ffffff'; };
        modal.appendChild(okBtn);

        requestAnimationFrame(() => {
            modal.style.transform = 'scale(1)';
            modal.style.opacity = 1;
        });

        function closeModal() {
            modal.style.transform = 'scale(0.8)';
            modal.style.opacity = 0;
            overlay.style.opacity = 0;
            modalSound.pause();
            modalSound.currentTime = 0;
            setTimeout(() => overlay.remove(), 400);
        }

        okBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    }

    function bolehAbsenKeluar() {
        const now = new Date();
        const jam = now.getHours();
        const menit = now.getMinutes();

        return (jam > 15) || (jam === 15 && menit >= 0);
    }

    btnAbsenKeluar?.addEventListener('click', async () => {
        try {
            // Ambil IP publik user
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            const userIP = data.ip;

            // Cek IP publik sementara untuk percobaan
            const ipSekolah = '112.215.219.226';
            if (userIP !== ipSekolah) {
                showElegantModal("Absensi wajib koneksi dengan internet sekolah (IP: 112.215.219.226)!");
                return;
            }
        } catch (err) {
            console.error(err);
            showElegantModal("❌ Tidak dapat mendeteksi IP publik. Pastikan koneksi internet aktif!");
            return;
        }
        
        await syncFromServer();
        if (serverState.statusHariIni === 'sudah_keluar') {
            showElegantModal(
                'You have already checked out today.',
                3000
            );
            applyUIByState();
            return;
        }

        if (!bolehAbsenKeluar()) {
            showElegantModal(
                'Check-out is only available from <b>15:00</b> onward',
                3000
            );
            applyUIByState();
            return;
        }

        const jamKeluar = getCurrentTime();

        try {
            const response = await fetch('/api/absensi/guru', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tanggal: todayISO,
                    status: 'keluar',
                    jam_keluar: jamKeluar 
                })
            });

            if (!response.ok) {
                alert('Gagal menyimpan jam keluar.');
                return;
            }

            await syncFromServer();

            applyUIByState();
            renderTable();

        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan saat mengirim data ke server.');
        }
    });

    // ==========================
    // TOMBOL IZIN TIDAK MASUK
    // ==========================
    btnIzin?.addEventListener('click', async (e) => {
        e.preventDefault()
        
        try {
            // ✅ PASTIKAN STATE TERBARU
            await syncFromServer();

            const now = new Date();
            const jam = now.getHours();
            const menit = now.getMinutes();

            // ⏰ BATAS JAM IZIN
            if (jam > 11 || (jam === 11 && menit > 0)) {
                showElegantModal(
                    'Excused absence requests must be submitted before 11:00 PM',
                    3000
                );
                return;
            }

            const status = serverState.statusHariIni;

            // 🚫 SUDAH IZIN
            if (status === 'izin_tidak_masuk') {
                showElegantModal(
                    'You have already submitted an excused absence today.',
                    3000
                );
                return;
            }

            // 🚫 SUDAH ABSEN MASUK / TERLAMBAT
            if (status === 'sudah_masuk' || status === 'terlambat') {
                showElegantModal(
                    'You have already checked in today. Excused absence is not allowed.',
                    3000
                );
                return;
            }

            // 🚫 SUDAH KELUAR
            if (status === 'sudah_keluar') {
                showElegantModal(
                    'You have already checked out today.',
                    3000
                );
                return;
            }

            // ✅ BOLEH IZIN
            openModal(
                'Excused Absence',
                'Reason is required',
                'izin_tidak_masuk'
            );

        } catch (err) {
            console.error(err);
            showElegantModal(
                'Failed to process excused absence.',
                3000
            );
        }
    });


    async function cekIPSekolah() {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            const userIP = data.ip;

            const ipSekolah = '140.213.150.154';

            if (userIP !== ipSekolah) {
                showElegantModal(
                    "❌ Izin keluar wajib menggunakan internet sekolah (IP: 140.213.150.154)!"
                );
                return false;
            }
            return true;
        } catch (err) {
            console.error(err);
            showElegantModal(
                "❌ Tidak dapat memverifikasi jaringan. Pastikan internet aktif!"
            );
            return false;
        }
    }

    // ==========================
    // SUBMIT IZIN KELUAR
    // ==========================
    izinSubmitBtn?.addEventListener('click', async () => {
        const allowed = await cekIPSekolah();
        if (!allowed) return;
        if(serverState.statusHariIni !== 'sudah_masuk' && serverState.statusHariIni !== 'terlambat'){
            showElegantModal('Anda belum absen masuk, tidak bisa mengajukan izin keluar.');
            return;
        }
        handleIzinKeluarSubmit();
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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ guru_id: 13 })
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
                localStorage.removeItem(todayKey + '_izin_selesai');

                // ========================================================
                // 3. RESET STATE JAVASCRIPT (INI YANG DIPAKAI UI)
                // ========================================================
                serverState.statusHariIni = null;
                serverState.absensiData = [];
                serverState.absensiEvent = [];
                serverState.izinKeluar = [];

                // ========================================================
                // 4. RESET UI
                // ========================================================
                resetAllUI();
                updateAbsensiButtons();
                updateIzinKeluarUI();
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
        // STOP TIMER IZIN
        // ======================
        if (izinCountdownInterval) {
            clearInterval(izinCountdownInterval);
            izinCountdownInterval = null;
        }

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
        izinTableBody.innerHTML = '';

        // ======================
        // FORCE STATUS AWAL
        // ======================
        serverState.statusHariIni = 'belum_absen';
    }

    // ======================
    // SYNC TERBARU ANTAR DEVICE
    // ======================
    async function fetchLatestAbsensi() {
        try {
            const res = await fetch('/api/absensi');
            const json = await res.json();

            const serverData = Array.isArray(json)
                ? json
                : (json.data || []);

            serverState.absensiRaw = serverData;

            let hasil = [];

            serverData.forEach(a => {

                // ============================
                // 1️⃣ IZIN TIDAK MASUK (EVENT)
                // ============================
                if (a.status === 'izin_tidak_masuk') {
                    hasil.push({
                        tanggal: a.tanggal,
                        status: 'izin_tidak_masuk',
                        jamMasuk: null,
                        jamPulang: null,
                        alasan: a.alasan || ''
                    });
                    return;
                }

                // ============================
                // 3️⃣ MASUK / TERLAMBAT
                // ============================
                if (a.jamMasuk) {
                    let finalStatus = a.status;

                    if (finalStatus === 'masuk') {
                        finalStatus = 'sudah_masuk';
                    }

                    hasil.push({
                        tanggal: a.tanggal,
                        status: finalStatus,
                        jamMasuk: a.jamMasuk || null,
                        jamPulang: a.jamKeluar || a.jamPulang || null,
                        alasan: a.alasan || ''
                    });
                }
            });

            serverState.absensiData = hasil;
            syncStatusHariIni();
            applyUIByState();

            renderTable();

        } catch (err) {
            console.error('❌ Gagal fetch absensi:', err);
        }
        syncStatusHariIni();
        applyUIByState();
    }

    async function fetchIzinKeluarFromServer() {
        if (localStorage.getItem('dev_reset_done') === '1') {
            serverState.izinKeluar = [];
            return;
        }
        
        try {
            const res = await fetch(`/api/izin-keluar?tanggal=${todayISO}`);
            if (!res.ok) {
                const text = await res.text();
                console.error('SERVER ERROR:', text);
                serverState.izinKeluar = [];
                return;
            }
            
            const data = await res.json();

            serverState.izinKeluar = Array.isArray(data)
                ? data.map(d => ({
                    tanggal: d.tanggal || todayISO,
                    jamMulai: d.jamMulai || d.jam_mulai,
                    jamSelesai: d.jamSelesai || d.jam_selesai,
                    alasan: d.alasan || ''
                }))
                : [];

        } catch (err) {
            console.error('❌ Gagal fetch izin keluar:', err);
            serverState.izinKeluar = [];
        }
    }

    async function syncIzinStatusFromServer() {
        try {
            const res = await fetch('/api/izin-keluar/status');
            const data = await res.json();

            serverState.izinStatus = data;

            // 🕒 IZIN DIAJUKAN, BELUM MULAI
            if (data.not_started) {
                stopIzinCountdown();
                startIzinStartCountdown(data.remaining);
                return;
            }

            // ⏱️ IZIN SEDANG BERJALAN
            if (data.active) {
                if (izinStartInterval) {
                clearInterval(izinStartInterval);
                izinStartInterval = null;
            }

            startIzinCountdown(data.remaining);
            return;
            }

            // ❌ IZIN SUDAH BERAKHIR / TIDAK ADA
            stopIzinCountdown();
            if (izinStartInterval) {
                clearInterval(izinStartInterval);
                izinStartInterval = null;
            }
            updateIzinKeluarUI();

        } catch (err) {
            console.error('❌ Gagal sync izin status:', err);
        }
    }


    async function fetchServerState() {
        return;
    }

    async function syncFromServer() {
        await fetchLatestAbsensi();
        await fetchIzinKeluarFromServer();
        await syncIzinStatusFromServer();
        syncStatusHariIni();
        applyUIByState();
        renderTable();
    }


    // ======================
    // DASHBOARD CHART UPDATE
    // ======================
    function updateDashboardChart() {
        if (!dashboardChartCanvas) return;

        if (dashboardChart) {
            dashboardChart.destroy();
            dashboardChart = null;
        }

        let masuk = 0;
        let terlambat = 0;
        let izinTidakMasuk = 0;

        serverState.absensiRaw.forEach(a => {
            if (!a.tanggal || !a.status) return;

            const [year, month] = a.tanggal.split('-');

            if (currentFilterStatus !== 'all' && Number(month) !== Number(currentFilterStatus) ) return;
            if (currentFilterTahun !== 'all' && Number(year) !== Number(currentFilterTahun)) return;

            if (a.status === 'masuk') masuk++;
            else if (a.status === 'terlambat') {
                terlambat++;
                masuk++;
            }
            else if (a.status === 'izin_tidak_masuk') izinTidakMasuk++;
        });

        const data = [
            { label: 'Masuk', value: masuk, color: '#4caf50' },
            { label: 'Terlambat', value: terlambat, color: '#ff9800' },
            { label: 'Izin Tidak Masuk', value: izinTidakMasuk, color: '#f44336' }
        ].filter(d => d.value > 0);

        if (!data.length) return;

        dashboardChart = new Chart(dashboardChartCanvas, {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    data: data.map(d => d.value),
                    backgroundColor: data.map(d => d.color),
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        border: {
                            display: true
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            display: false
                        },
                        border: {
                            display: true
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // ======================
    // LOGOUT
    // ======================
    const btnLogoutSidebar = document.getElementById('sidebar-logout');
    const btnLogoutBottom = document.getElementById('bottom-logout');
    const dropdownLogout = document.querySelector('.dropdown-item.logout');

    [btnLogoutSidebar, btnLogoutBottom, dropdownLogout].forEach(btn => {
        btn?.addEventListener('click', () => {
            localStorage.removeItem('activeMenu');
            window.location.href = '/logout';
        });
    })

    // DROPDOWN HEADER USER
    const userDropdown = document.querySelector('.user-dropdown');
    const dropbtn = userDropdown.querySelector('.dropbtn');

    dropbtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        userDropdown.classList.remove('show');
    });

    document.querySelector('.dropdown-item.logout').addEventListener('click', () => {
        window.location.href = '/logout';
    });

    function formatDate(dateString) {
        if (!dateString) return '-'; // Handle null atau undefined

        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    const userPhoto = document.getElementById('user-photo');
    const modalPhoto = document.getElementById('modal-photo');
    const modalPhotoOverlay = document.getElementById('modal-photo-overlay');
    const modalPhotoImg = document.getElementById('modal-photo-img');
    const zoomInBtn = document.getElementById('zoom-in-photo');
    const zoomOutBtn = document.getElementById('zoom-out-photo');
    const closeBtn = document.getElementById('close-photo');

    let currentScale = 1;
    let isDragging = false;
    let startX, startY;
    let currentX = 0, currentY = 0;

    userPhoto?.addEventListener('click', () => {
        modalPhotoImg.src = userPhoto.src;
        modalPhoto.style.display = 'block';
        modalPhotoOverlay.style.display = 'block';

        currentScale = 1;
        currentX = 0;
        currentY = 0;
        modalPhotoImg.style.transform = `scale(1)`;

        setTimeout(() => modalPhoto.classList.add('show'), 10);
    });

    modalPhotoOverlay?.addEventListener('click', () => {
        modalPhoto.style.display = 'none';
        modalPhotoOverlay.style.display = 'none';
    });

    modalPhotoImg?.addEventListener('mousedown', (e) => {
        if(currentScale <= 1) return; // hanya bisa drag kalau zoom > 1

        isDragging = true;
        startX = e.clientX - currentX;
        startY = e.clientY - currentY;

        // agar kursor terlihat sedang drag
        modalPhotoImg.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if(!isDragging) return;

        currentX = e.clientX - startX;
        currentY = e.clientY - startY;

        modalPhotoImg.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;

        if (modalPhotoImg) {
            modalPhotoImg.style.cursor = 'grab';
        }
    });

    modalPhotoImg?.addEventListener('touchstart', (e) => {
        if(currentScale <= 1) return;
        isDragging = true;
        const touch = e.touches[0];
        startX = touch.clientX - currentX;
        startY = touch.clientY - currentY;
    });

    modalPhotoImg?.addEventListener('touchmove', (e) => {
        if(!isDragging) return;
        e.preventDefault(); // supaya scroll halaman tidak ikut
        const touch = e.touches[0];
        currentX = touch.clientX - startX;
        currentY = touch.clientY - startY;
        modalPhotoImg.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
    }, { passive: false });

    modalPhotoImg?.addEventListener('touchend', () => {
        isDragging = false;
    });

    closeBtn?.addEventListener('click', () => {
        modalPhoto.style.display = 'none';
        modalPhotoOverlay.style.display = 'none';
    });

    // Zoom
    zoomInBtn?.addEventListener('click', () => {
        if(currentScale < 3) {
            currentScale += 0.1;
            modalPhotoImg.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
        }
    });

    zoomOutBtn?.addEventListener('click', () => {
        if(currentScale > 1) { // biar minimal 1
            currentScale -= 0.1;
            modalPhotoImg.style.transform = `scale(${currentScale}) translate(${currentX}px, ${currentY}px)`;
        } else {
            // reset posisi kalau zoom balik ke 1
            currentX = 0;
            currentY = 0;
            modalPhotoImg.style.transform = `scale(${currentScale}) translate(0px, 0px)`;
        }
    });

    function closePhotoModal() {
        modalPhoto.classList.remove('show');
        setTimeout(() => {
            modalPhoto.style.display = 'none';
            modalPhotoOverlay.style.display = 'none';
        }, 300); // sesuai durasi transition
    }

    if (modalPhotoOverlay) {
        modalPhotoOverlay.addEventListener('click', closePhotoModal);
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closePhotoModal);
    }

    document.querySelectorAll('.sidebar a').forEach(link => {
        link.addEventListener('click', e => {

            const href = link.getAttribute('href');
            const menu = link.dataset.icon;
            const isPage = link.dataset.page === 'true';

            if (!href || href === '#' || href.startsWith('javascript')) {
                return;
            }

            // ============================
            // 1️⃣ LINK SERVER → BIARKAN RELOAD
            // ============================
            if (isPage) {
                return; // ❗ JANGAN preventDefault
            }

            // ============================
            // 2️⃣ JIKA SEDANG DI SERVER PAGE
            // ============================
            if (isServerPage) {
                window.location.href = href; // 🔥 FORCE reload
                return;
            }

            // ============================
            // 3️⃣ SPA MODE NORMAL
            // ============================
            e.preventDefault();

            history.pushState({}, '', href);

            showSection(menu);
            setActiveMenu(menu);
        });
    });

    [btnLogoutSidebar, btnLogoutBottom, dropdownLogout].forEach(btn => {
        btn?.addEventListener('click', () => {
            localStorage.removeItem(PEMBELAJARAN_DROPDOWN_KEY);
            localStorage.removeItem('activeMenu');
            window.location.href = '/logout';
        });
    });

    // ======================
    // INIT
    // ======================
    await fetchLatestAbsensi();
    await fetchServerState();
    await syncIzinStatusFromServer();

    applyUIByState();

    const activeMenu = localStorage.getItem('activeMenu') || 'dashboard';
    setActiveMenu(activeMenu);
    const currentPath = window.location.pathname;

    document.querySelectorAll('.sidebar-submenu a').forEach(link => {
        const href = link.getAttribute('href');

        if (href && currentPath === href) {
            link.classList.add('active');

            const dropdown = link.closest('.sidebar-dropdown');
            if (dropdown) {
                dropdown.classList.add('open');
            }
        }
    });
    renderIzinTable();
    updateIzinKeluarUI();

    applyUIByState();

});