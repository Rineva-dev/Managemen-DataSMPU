// ======================================
// master_guru.js - FINAL STABIL + POLISH
// ======================================

const csrfToken =
    document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");

document.addEventListener('DOMContentLoaded', () => {

    // ================================
    // ELEMENT
    // ================================
    const guruPerPageInput = document.getElementById('guru-per-page');
    const addGuruBtn = document.getElementById('add-guru-btn');
    const guruFormContainer = document.getElementById('guru-form-container');
    const guruFormTitle = document.getElementById('guru-form-title');
    const guruSaveBtn = document.getElementById('guru-save');
    const guruCancelBtn = document.getElementById('guru-cancel');

    const guruNama = document.getElementById('guru-nama');
    const guruJabatan = document.getElementById('guru-jabatan');
    const guruTempat = document.getElementById('guru-tempat');
    const guruTanggal = document.getElementById('guru-tanggal');
    const guruJk = document.getElementById('guru-jk');
    const guruStatus = document.getElementById('guru-status');
    const guruHp = document.getElementById('guru-hp');
    const guruAlamat = document.getElementById('guru-alamat');
    const guruEmail = document.getElementById('guru-email');

    const guruTableBody = document.querySelector('#guru-table tbody');
    const guruTotalData = document.getElementById('guru-total-data');
    const guruPagination = document.getElementById('guru-pagination');

    const guruSearchInput = document.getElementById('guru-search-input');
    const guruSearchBtn = document.getElementById('guru-search-btn');

    // ================================
    // STATE
    // ================================
    let guruData = [];

    let editIndex = null;
    let currentPage = 1;
    let perPage = 10;

    function loadGuruFromAPI() {
        fetch("/api/guru")
            .then(res => res.json())
            .then(data => {
                guruData = data;
                renderTable();
            });
    }

    if (document.getElementById("guru-table")) {
        loadGuruFromAPI();
    }

    // ================================
    // HELPER TEXT
    // ================================
    function addHelperText(input, text) {
        let helper = input.nextElementSibling;
        if (!helper || !helper.classList.contains('helper-text')) {
            helper = document.createElement('div');
            helper.className = 'helper-text';
            input.insertAdjacentElement('afterend', helper);
        }
        helper.textContent = text;
    }

    // ================================
    // PER PAGE CONTROL (Tampilkan X data)
    // ================================
    if (guruPerPageInput) {
        guruPerPageInput.addEventListener('input', () => {
            let val = parseInt(guruPerPageInput.value);

            if (isNaN(val) || val < 1) {
                perPage = 1;
            } else {
                perPage = val;
            }

            currentPage = 1; // reset ke halaman pertama
            renderTable();
        });
    }

    // ================================
    // OPEN / CLOSE FORM
    // ================================
    if (addGuruBtn) {
        addGuruBtn.addEventListener('click', () => openForm());
    }

    if (guruCancelBtn) {
        guruCancelBtn.addEventListener('click', closeForm);
    }

    function openForm(edit = false) {
        guruFormContainer.classList.add('show');

        if (edit) {
            guruFormTitle.textContent = 'Edit Guru';
            guruSaveBtn.textContent = 'Save Change';
            guruSaveBtn.classList.remove('btn-add-modern');
            guruSaveBtn.classList.add('btn-update-modern');
        } else {
            guruFormTitle.textContent = 'Tambah Guru';
            guruSaveBtn.textContent = 'Add';
            guruSaveBtn.classList.remove('btn-update-modern');
            guruSaveBtn.classList.add('btn-add-modern');
        }

        setTimeout(() => guruNama.focus(), 100);
    }

    function closeForm() {
        guruFormContainer.classList.remove('show');
        clearForm();
        clearErrors();
        resetCustomDropdowns();
        editIndex = null;
    }

    function clearForm() {
        guruNama.value = '';
        guruJabatan.value = '';
        guruTempat.value = '';
        guruTanggal.value = '';
        guruJk.value = '';
        guruStatus.value = '';
        guruHp.value = '';
        guruAlamat.value = '';
        guruEmail.value = '';
    }

    function closeAllDropdowns(except = null) {
        document.querySelectorAll(".custom-dropdown.active").forEach(dd => {
            if (dd !== except) {
                dd.classList.remove("active");
                dd.querySelector(".dropdown-options")?.classList.remove("active");
            }
        });
    }

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".custom-dropdown")) {
            closeAllDropdowns();
        }
    });

    document.querySelectorAll(".custom-dropdown").forEach(dropdown => {

        const selected =
            dropdown.querySelector(".dropdown-selected") ||
            dropdown.querySelector(".selected-text");

        const options = dropdown.querySelector(".dropdown-options");

        if (!selected || !options) return;

        selected.addEventListener("click", (e) => {
            e.stopPropagation();

            const alreadyOpen = dropdown.classList.contains("active");

            closeAllDropdowns();

            if (!alreadyOpen) {
                dropdown.classList.add("active");
                options.classList.add("active");
            }
        });

        const optionEls = options.querySelectorAll(".dropdown-option");
        if (!optionEls.length) return;

        optionEls.forEach(opt => {
            opt.addEventListener("click", (e) => {
                e.stopPropagation();

                const value = opt.dataset.value || "";
                const text = opt.textContent.trim();

                const textEl = dropdown.querySelector(".selected-text");
                if (textEl) textEl.textContent = text;

                const hiddenInput =
                    dropdown.parentElement?.querySelector("input[type='hidden']");
                if (hiddenInput) hiddenInput.value = value;

                dropdown.classList.remove("active");
                options.classList.remove("active");
            });
        });

    });

    function resetCustomDropdowns() {
        document.querySelectorAll(".custom-dropdown").forEach(dropdown => {

            const selectedText = dropdown.querySelector(".selected-text");
            const hiddenInput = dropdown.parentElement.querySelector("input[type='hidden']");

            if (selectedText) {
                if (dropdown.id === "genderOption") {
                    selectedText.textContent = "Pilih Jenis Kelamin";
                } else if (dropdown.id === "statusOption") {
                    selectedText.textContent = "Pilih Status Perkawinan";
                } else {
                    selectedText.textContent = "Pilih Jabatan";
                }
            }

            if (hiddenInput) {
                hiddenInput.value = "";
            }

            dropdown.classList.remove("active");
            dropdown.querySelector(".dropdown-options")?.classList.remove("active");
        });
    }

    function setDropdownByHiddenInput(hiddenInputId, value) {
        if (!value) return;

        const hiddenInput = document.getElementById(hiddenInputId);
        if (!hiddenInput) return;

        const dropdown = hiddenInput.parentElement.querySelector(".custom-dropdown");
        if (!dropdown) return;

        const option = dropdown.querySelector(`.dropdown-option[data-value="${value}"]`);
        const textEl = dropdown.querySelector(".selected-text");

        if (option && textEl) {
            textEl.textContent = option.textContent.trim();
            hiddenInput.value = value;
        }
    }
    // ================================
    // INPUT RESTRICTIONS
    // ================================
    if (guruHp) {
        guruHp.addEventListener('input', () => {
            let val = guruHp.value;
            val = val.replace(/[^0-9+]/g, '');

            if (val.indexOf('+') > 0) {
                val = val.replace(/\+/g, '');
            }

            let numeric = val.replace('+', '');
            if (numeric.length > 13) {
                numeric = numeric.slice(0, 13);
                val = val.startsWith('+') ? '+' + numeric : numeric;
            }

            guruHp.value = val;
        });
    }

    if (guruTanggal) {
        guruTanggal.addEventListener('input', () => {
            if (!guruTanggal.value) return;

            const parts = guruTanggal.value.split('-');
            if (parts[0].length > 4) {
                parts[0] = parts[0].slice(-4);
                guruTanggal.value = parts.join('-');
            }
        });
    }

    // ================================
    // HILANGKAN ERROR SAAT DIKETIK
    // ================================
    [
        guruNama, guruJabatan, guruTempat, guruTanggal,
        guruJk, guruStatus, guruHp, guruAlamat, guruEmail
    ].forEach(input => {

        if (!input) return;

        input.addEventListener('input', () => {
            input.classList.remove('error');
            const msg = input.nextElementSibling;
            if (msg && msg.classList.contains('error-message')) {
                msg.remove();
            }
        });
    });

    if (guruSaveBtn) {
        guruSaveBtn.addEventListener('click', saveGuru);
    }

    // ================================
    // SAVE DATA
    // ================================
    function saveGuru() {
        clearErrors();

        const fields = [
            { el: guruNama, name: 'Nama' },
            { el: guruJabatan, name: 'Jabatan' },
            { el: guruTempat, name: 'Tempat Lahir' },
            { el: guruTanggal, name: 'Tahun Lahir' },
            { el: guruJk, name: 'Jenis Kelamin' },
            { el: guruStatus, name: 'Status' },
            { el: guruHp, name: 'No. HP' },
            { el: guruAlamat, name: 'Alamat' },
            { el: guruEmail, name: 'Email' }
        ];

        let hasError = false;

        fields.forEach(f => {
            if (!f.el || !f.el.value || !f.el.value.trim()) {
                showError(f.el, `${f.name} wajib diisi`);
                hasError = true;
            }
        });

        // Validasi tahun
        const year = parseInt(guruTanggal.value);
        const nowYear = new Date().getFullYear();
        if (year < 1950 || year > nowYear - 10) {
            showError(guruTanggal, `Tahun harus antara 1950 - ${nowYear - 10}`);
            hasError = true;
        }

        // Validasi HP
        const hpNumeric = guruHp.value.replace('+', '');
        if (hpNumeric.length < 8 || hpNumeric.length > 13) {
            showError(guruHp, 'No. HP harus 8–13 digit. Contoh: 08123456789 atau +628123456789');
            hasError = true;
        }

        // Validasi email (strict: tidak boleh ....com)
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?$/;
        if (!emailRegex.test(guruEmail.value.trim())) {
            showError(guruEmail, 'Format salah. Contoh: nama@email.com atau nama@email.co.id');
            hasError = true;
        }

        if (hasError) {
            showNotification('Periksa kembali data!', 'error');
            return;
        }

        const data = {
            nama: guruNama.value.trim(),
            jabatan: guruJabatan.value.trim(),
            tempat: guruTempat.value.trim(),
            tahun: guruTanggal.value.trim(),
            jk: guruJk.value,
            status: guruStatus.value,
            hp: guruHp.value.trim(),
            alamat: guruAlamat.value.trim(),
            email: guruEmail.value.trim()
        };

        let url, method;
        if (editIndex !== null) {
            url = `/api/guru/update/${guruData[editIndex].id}`;
            method = "PUT";
        } else {
            url = "/api/guru/add";
            method = "POST";
        }

        fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken
            },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(res => {
            if(res.status === "success") {
                showNotification(res.message || "Berhasil!", "success");
                loadGuruFromAPI();
                closeForm();
            } else {
                showNotification(res.message || "Terjadi error", "error");
            }
        })
        .catch(err => {
            console.error(err);
            showNotification("Terjadi error server", "error");
        });

    }

    function formatJabatan(jabatan) {
        if (!jabatan) return '';
        return jabatan
            .replace(/_/g, ' ')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }

    // ================================
    // MODAL CLOSE (Modern)
    // ================================
    document.querySelectorAll(".modern-close").forEach(btn => {
        btn.addEventListener("click", () => {
            const modal = btn.closest(".modal");
            if (modal) modal.classList.remove("show");
        });
    });


    // ================================
    // RENDER TABLE + PAGINATION
    // ================================
    function renderTable(data = guruData) {
        if (!guruTableBody) return;

        guruTableBody.innerHTML = '';

        const totalPages = Math.ceil(data.length / perPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;

        const start = (currentPage - 1) * perPage;
        const end = start + perPage;
        const pageData = data.slice(start, end);

        pageData.forEach((guru, index) => {
            const realIndex = start + index;
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>${realIndex + 1}</td>
                <td>${guru.nama}</td>
                <td>${formatJabatan(guru.jabatan)}</td>
                <td>${guru.hp}</td>
                <td>${guru.email}</td>
                <td class="action-cell">
                    <button class="action-btn edit-btn" title="Edit">
                        <i data-lucide="pencil"></i>
                    </button>

                    <button class="action-btn delete-btn" title="Hapus">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            `;

            tr.querySelector('.edit-btn').addEventListener('click', () => {
                loadToForm(guru, realIndex);
            });

            tr.querySelector('.delete-btn').addEventListener('click', async () => {

                const confirmed = await showConfirm(
                    `Anda yakin menghapus data <b>${guru.nama}</b>?`
                );

                if (!confirmed) return;

                fetch(`/api/guru/delete/${guru.id}`, {
                    method: "DELETE",
                    headers: {
                        "X-CSRFToken": csrfToken
                    }
                })
                .then(res => res.json())
                .then(res => {
                    if (res.status === 'success') {
                        showNotification(res.message, 'success');
                        loadGuruFromAPI();
                    } else {
                        showNotification(res.message, 'error');
                    }
                })
                .catch(() => {
                    showNotification('Terjadi error server', 'error');
                });
            });

            guruTableBody.appendChild(tr);
        });
        lucide.createIcons();
        guruTotalData.textContent = data.length;
        renderPagination(totalPages);
    }

    function renderPagination(totalPages) {
        guruPagination.innerHTML = '';

        const prev = document.createElement('button');
        prev.textContent = 'Prev';
        prev.disabled = currentPage === 1;
        prev.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
        guruPagination.appendChild(prev);

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = i === currentPage ? 'active' : '';
            btn.addEventListener('click', () => {
                currentPage = i;
                renderTable();
            });
            guruPagination.appendChild(btn);
        }

        const next = document.createElement('button');
        next.textContent = 'Next';
        next.disabled = currentPage === totalPages;
        next.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
        guruPagination.appendChild(next);
    }

    // ================================
    // LOAD TO FORM
    // ================================
    function loadToForm(guru, index) {
        editIndex = index;

        guruNama.value = guru.nama;
        guruTempat.value = guru.tempat || '';
        guruTanggal.value = guru.tahun || '';
        guruHp.value = guru.hp || '';
        guruAlamat.value = guru.alamat || '';
        guruEmail.value = guru.email || '';

        // SET DROPDOWN (pakai hidden input id)
        setDropdownByHiddenInput("guru-jabatan", guru.jabatan);
        setDropdownByHiddenInput("guru-jk", guru.jk);
        setDropdownByHiddenInput("guru-status", guru.status);

        openForm(true);
    }

    // ================================
    // SEARCH
    // ================================
    if (guruSearchBtn && guruSearchInput) {
        guruSearchBtn.addEventListener('click', doSearch);

        guruSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doSearch();
            }
        });
    }

    function doSearch() {
        const keyword = guruSearchInput.value.toLowerCase().trim();
        if (!keyword) {
            renderTable();
            return;
        }

        const result = guruData.filter(g => g.nama.toLowerCase().includes(keyword));

        if (result.length === 0) {
            showNotification('Data tidak ditemukan', 'error');
            renderTable();
        } else {
            renderTable(result);
        }
    }

    // ================================
    // ERROR HANDLER
    // ================================
    function showError(input, message) {
        input.classList.add('error');

        let msg = input.nextElementSibling;
        if (!msg || !msg.classList.contains('error-message')) {
            msg = document.createElement('div');
            msg.className = 'error-message';
            input.insertAdjacentElement('afterend', msg);
        }

        msg.textContent = message;
        msg.style.display = 'block';
    }

    function clearErrors() {
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('.error-message').forEach(el => el.remove());
    }

});
