document.addEventListener('DOMContentLoaded', () => {

    // ======================
    // ELEMENTS ABSENSI
    // ======================
    let absensiData = []; // data akan diambil dari API nanti

    const tableBody = document.querySelector('#absensi-table tbody');
    const tampilInput = document.getElementById('absensi-per-page');
    const totalDataSpan = document.getElementById('absensi-total-data');
    const absensiPagination = document.getElementById('absensi-pagination');

    const filterNamaSelected  = document.getElementById('filterNamaSelected');
    const filterNamaOptions   = document.getElementById('filterNamaOptions');

    const filterBulanSelected = document.getElementById('filterBulanSelected');
    const filterBulanOptions  = document.getElementById('filterBulanOptions');

    bindDropdownOptions(filterBulanOptions, filterBulanSelected, 'bulan');

    const filterTahunSelected = document.getElementById('filterTahunSelected');
    const filterTahunOptions  = document.getElementById('filterTahunOptions');

    let currentPage = 1;

    function loadTahunDropdownCustom() {
        filterTahunOptions.innerHTML = '';

        const now = new Date().getFullYear();

        const all = document.createElement('div');
        all.className = 'dropdown-option';
        all.dataset.value = '';
        all.textContent = 'Semua Tahun';
        filterTahunOptions.appendChild(all);

        for (let i = 0; i < 5; i++) {
            const div = document.createElement('div');
            div.className = 'dropdown-option';
            div.dataset.value = now - i;
            div.textContent = now - i;
            filterTahunOptions.appendChild(div);
        }

        bindDropdownOptions(filterTahunOptions, filterTahunSelected, 'tahun');
        reinitDropdown(document.getElementById('filterTahunDropdown'));
    }

    loadTahunDropdownCustom();

    // ======================
    // AMBIL DATA GURU UNTUK DROPDOWN NAMA
    // ======================
    function loadGuruToDropdownCustom() {
        fetch('/api/guru/absensi')
            .then(res => res.json())
            .then(data => {
                filterNamaOptions.innerHTML = '';

                const all = document.createElement('div');
                all.className = 'dropdown-option';
                all.dataset.value = '';
                all.textContent = 'Semua Guru';
                filterNamaOptions.appendChild(all);

                data.forEach(g => {
                    const div = document.createElement('div');
                    div.className = 'dropdown-option';
                    div.dataset.value = g.id;
                    div.textContent = g.nama;
                    filterNamaOptions.appendChild(div);
                });

                bindDropdownOptions(filterNamaOptions, filterNamaSelected, 'nama');
                reinitDropdown(document.getElementById('filterNamaDropdown'));
            });
    }

    loadGuruToDropdownCustom();

    // ======================
    // AMBIL DATA ABSENSI DARI SERVER
    // ======================
    function loadAbsensiData() {
        fetch('/api/admin/absensi', {
            credentials: "include"
        })
        .then(res => {
            if (!res.ok) {
                console.log("Response error:", res.status);
                return [];
            }
            return res.json();
        })
        .then(data => {
            absensiData = data;
            renderAbsensiTable();
        })
        .catch(err => console.error("Fetch error:", err));
    }

    loadAbsensiData();

    // ======================
    // STATE FILTER (GANTI SELECT)
    // ======================
    let filterState = {
        nama: "",
        bulan: "",
        tahun: ""
    };

    // ======================
    // FILTER DATA
    // ======================
    function getFilteredData() {
        return absensiData.filter(item => {

            if (filterState.nama && item.guru_id != filterState.nama) return false;

            if (filterState.bulan) {
                const bulanItem = new Date(item.tanggal).getMonth() + 1;
                if (parseInt(filterState.bulan) !== bulanItem) return false;
            }

            if (filterState.tahun) {
                const tahunItem = new Date(item.tanggal).getFullYear();
                if (parseInt(filterState.tahun) !== tahunItem) return false;
            }

            return true;
        });
    }

    function bindDropdownOptions(optionsEl, selectedEl, key) {
        optionsEl.querySelectorAll('.dropdown-option').forEach(opt => {
            opt.addEventListener('click', (e) => {

                e.stopPropagation(); // penting

                filterState[key] = opt.dataset.value;
                selectedEl.childNodes[0].textContent = opt.textContent + ' ';

                optionsEl.parentElement.classList.remove('active');

                currentPage = 1;
                renderAbsensiTable();
            });
        });
    }

    function formatTanggalIndonesia(tanggal) {
        if (!tanggal) return '-';

        const date = new Date(tanggal);

        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    // ======================
    // RENDER TABEL ABSENSI
    // ======================
    function renderAbsensiTable() {
        if (!tableBody) return;

        tableBody.innerHTML = '';

        const filteredData = getFilteredData();

        const limit = tampilInput 
            ? parseInt(tampilInput.value) || filteredData.length 
            : filteredData.length;

        // HITUNG TOTAL HALAMAN
        let totalPages = Math.ceil(filteredData.length / limit);
        if (currentPage > totalPages) currentPage = 1;

        if (totalDataSpan) {
            totalDataSpan.textContent = filteredData.length;
        }

        if (filteredData.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td colspan="7" class="center">
                    Tidak ada data absensi
                </td>
            `;
            tableBody.appendChild(tr);
            absensiPagination.innerHTML = '';
            return;
        }

        // PAGINATION SLICE
        const start = (currentPage - 1) * limit;
        const end = start + limit;
        const paginatedData = filteredData.slice(start, end);

        paginatedData.forEach((item, index) => {
            const tr = document.createElement('tr');

            let statusClass = '';
            const normalizedStatus = item.status
                ?.toLowerCase()
                .replaceAll(" ", "_");

            switch(normalizedStatus) {
                case 'masuk':
                    statusClass = 'status-tepat';
                    break;
                case 'terlambat':
                    statusClass = 'status-terlambat';
                    break;
                case 'izin_tidak_masuk':
                    statusClass = 'status-izin';
                    break;
            }

            tr.innerHTML = `
                <td class="center">${start + index + 1}</td>
                <td class="left col-nama">${item.nama || '-'}</td>
                <td class="center col-tanggal">${formatTanggalIndonesia(item.tanggal)}</td>
                <td class="left">
                    <span class="status-badge ${statusClass}">
                        ${item.status || '-'}
                    </span>
                </td>
                <td class="center col-jam">${item.jam_masuk || '-'}</td>
                <td class="center col-jam">${item.jam_keluar || '-'}</td>
                <td class="left col-keterangan">${item.alasan || '-'}</td>
            `;

            tableBody.appendChild(tr);
        });

        renderPagination(totalPages);
    }


    function renderPagination(totalPages) {
        absensiPagination.innerHTML = '';

        const prev = document.createElement('button');
        prev.textContent = 'Prev';
        prev.disabled = currentPage === 1;
        prev.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderAbsensiTable();
            }
        });
        absensiPagination.appendChild(prev);

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = i === currentPage ? 'active' : '';
            btn.addEventListener('click', () => {
                currentPage = i;
                renderAbsensiTable();
            });
            absensiPagination.appendChild(btn);
        }

        const next = document.createElement('button');
        next.textContent = 'Next';
        next.disabled = currentPage === totalPages;
        next.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderAbsensiTable();
            }
        });
        absensiPagination.appendChild(next);
    }

    document.querySelectorAll('.table-wrapper').forEach(wrapper => {

        let isDown = false;
        let startX;
        let scrollLeft;

        wrapper.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.clientX;
            scrollLeft = wrapper.scrollLeft;
            wrapper.classList.add('dragging');
        });

        wrapper.addEventListener('mouseleave', () => {
            isDown = false;
            wrapper.classList.remove('dragging');
        });

        wrapper.addEventListener('mouseup', () => {
            isDown = false;
            wrapper.classList.remove('dragging');
        });

        wrapper.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const walk = (e.clientX - startX) * 1.2;
            wrapper.scrollLeft = scrollLeft - walk;
        });

    });

    // ======================
    // RESET FILTER
    // ======================
    const resetBtn = document.getElementById('filter-reset');

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {

            filterState = { nama: "", bulan: "", tahun: "" };

            filterNamaSelected.childNodes[0].textContent = 'Semua Guru ';
            filterBulanSelected.childNodes[0].textContent = 'Bulan ';
            filterTahunSelected.childNodes[0].textContent = 'Tahun ';

            currentPage = 1;
            renderAbsensiTable();
        });
    }

    function reinitDropdown(dropdown) {

        const selected = dropdown.querySelector('.dropdown-selected');
        const options = dropdown.querySelectorAll('.dropdown-option');

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.remove('active');
            });
        });

    }

window.loadAbsensiData = loadAbsensiData;
window.loadGuruToDropdown = loadGuruToDropdownCustom;
});
