// ======================================
// akun_guru.js - FINAL STABIL + API FLASK
// ======================================
document.addEventListener('DOMContentLoaded', () => {

    // ================================
    // ELEMENT
    // ================================
    const akunGuruDropdown = document.getElementById('akunGuruDropdown');
    if (!akunGuruDropdown) return; // stop kalau bukan halaman akun guru


    const addAkunBtn = document.getElementById('add-akun-btn');
    const akunFormContainer = document.getElementById('akun-form-container');
    const akunFormTitle = document.getElementById('akun-form-title');
    const akunSaveBtn = document.getElementById('akun-save');
    const akunCancelBtn = document.getElementById('akun-cancel');

    const akunGuruHidden = document.getElementById('akun-guru');

    const akunGuruSelectedText = akunGuruDropdown.querySelector('.selected-text');
    const akunGuruOptions = akunGuruDropdown.querySelector('.dropdown-options');
    const akunUsername = document.getElementById('akun-username');
    const akunPassword = document.getElementById('akun-password');
    const akunRole = document.getElementById('akun-role');
    const togglePasswordBtn = document.querySelector('.emoji-btn');

    const akunTableBody = document.querySelector('#akun-table tbody');
    const akunTotalData = document.getElementById('akun-total-data');
    const akunPagination = document.getElementById('akun-pagination');
    const akunPerPageInput = document.getElementById('akun-per-page');

    const akunSearchInput = document.getElementById('akun-search-input');
    const akunSearchBtn = document.getElementById('akun-search-btn');
    const roleDropdown = document.querySelector('#roleOptions').closest('.custom-dropdown');
    const roleSelectedText = roleDropdown.querySelector('.selected-text');

    // ================================
    // STATE
    // ================================
    let akunData = [];
    let guruData = [];
    let editId = null;
    let currentPage = 1;
    let perPage = parseInt(document.getElementById('akun-per-page')?.value) || 5;

    // ================================
    // MODAL CLOSE (Modern)
    // ================================
    document.querySelectorAll(".modern-close").forEach(btn => {
        btn.addEventListener("click", () => {
            const modal = btn.closest(".saas-modal-overlay");

            if (modal.id === "akun-form-container") {
                closeForm();
            } else {
                modal.classList.remove("show");
            }
        });
    });

    // ================================
    // LOAD GURU DAN AKUN DARI API
    // ================================
    function loadGuruData() {
        return fetch('/api/guru')
            .then(res => res.json())
            .then(data => {
                guruData = data;
                renderGuruSelect();
            });
    }

    function loadAkunData() {
        fetch('/api/akun')
            .then(res => res.json())
            .then(data => {
                akunData = data;
                renderTable();
            });
    }

    function renderGuruSelect() {

        akunGuruOptions.innerHTML = '';

        // Default text
        akunGuruSelectedText.textContent = 'Pilih Guru';
        akunGuruHidden.value = '';

        guruData.forEach(g => {

            const option = document.createElement('div');
            option.classList.add('dropdown-option');
            option.textContent = g.nama;
            option.dataset.value = g.id;

            option.addEventListener('click', (e) => {
                e.stopPropagation();

                akunGuruSelectedText.textContent = g.nama;
                akunGuruHidden.value = g.id;

                akunGuruDropdown.classList.remove('active');
            });

            akunGuruOptions.appendChild(option);
        });
    }

    loadGuruData().then(() => loadAkunData());

    // ================================
    // OPEN / CLOSE FORM
    // ================================
    addAkunBtn.addEventListener('click', openForm);
    akunCancelBtn.addEventListener('click', closeForm);

    function openForm() {
        akunFormContainer.addEventListener('transitionend', () => {
            akunRole.blur();
        });
        akunFormContainer.classList.add('show');
        akunFormTitle.textContent = 'Buat Akun Guru';
        akunSaveBtn.textContent = 'Buat Akun';
        clearForm();
        editId = null;
    }

    function closeForm() {
        akunFormContainer.classList.remove('show');
        clearForm();
        clearErrors();
        editId = null;
    }

    function clearForm() {

        // reset guru
        akunGuruHidden.value = '';
        akunGuruSelectedText.textContent = 'Pilih Guru';
        akunUsername.value = '';
        akunPassword.value = '';
        akunRole.value = '';
        roleSelectedText.textContent = 'Pilih Role';

    }

    // ================================
    // TOGGLE PASSWORD
    // ================================
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', () => {
            if (akunPassword.type === 'password') {
                akunPassword.type = 'text';
                togglePasswordBtn.textContent = '🙈';
            } else {
                akunPassword.type = 'password';
                togglePasswordBtn.textContent = '🫣';
            }
        });
    }

    // ================================
    // HILANGKAN ERROR SAAT DIKETIK
    // ================================
    [akunGuruHidden, akunUsername, akunPassword].forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('error');
            const msg = input.parentElement.querySelector('.error-message');
            if (msg) msg.remove();
        });
    });

    // ================================
    // SIMPAN AKUN (POST / PUT)
    // ================================
    akunSaveBtn.addEventListener('click', saveAkun);

    function saveAkun() {
        clearErrors();
        let hasError = false;

        if (!akunGuruHidden.value) {
            showError(akunGuruDropdown, 'Guru wajib dipilih');
            hasError = true;
        }

        if (!akunUsername.value.trim()) {
            showError(akunUsername, 'Username wajib diisi');
            hasError = true;
        } else if (akunUsername.value.trim().length < 5) {
            showError(akunUsername, 'Username minimal 5 karakter');
            hasError = true;
        }

        if (editId === null) {
            // hanya saat BUAT akun
            if (!akunPassword.value.trim()) {
                showError(akunPassword, 'Password wajib diisi');
                hasError = true;
            } else if (akunPassword.value.trim().length < 5) {
                showError(akunPassword, 'Password minimal 5 karakter');
                hasError = true;
            }
        } else {
            // saat EDIT
            if (akunPassword.value.trim() && akunPassword.value.trim().length < 5) {
                showError(akunPassword, 'Password minimal 5 karakter');
                hasError = true;
            }
        }

        // cek guru sudah punya akun
        const guruExist = akunData.some(a => a.guru_id == akunGuruHidden.value && (editId === null || a.id != editId));
        if (guruExist) {
            showError(akunGuruDropdown, 'Guru ini sudah memiliki akun');
            hasError = true;
        }

        if (hasError) {
            showNotification('Periksa kembali data akun!', 'error');
            return;
        }

        const payload = {
            guru_id: akunGuruHidden.value,
            username: akunUsername.value.trim(),
            password: akunPassword.value.trim(),
            role: akunRole.value
        };

        let url = '/api/akun/add';
        let method = 'POST';

        if (editId !== null) {
            url = `/api/akun/update/${editId}`;
            method = 'PUT';
        }

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                showNotification(res.message, 'success');
                closeForm();
                loadAkunData();
            } else {
                showNotification(res.message, 'error');
            }
        })
        .catch(err => {
            console.error(err);
            showNotification('Terjadi error server', 'error');
        });
    }

    // ================================
    // RENDER TABLE
    // ================================
    function renderTable(data = akunData) {
        akunTableBody.innerHTML = '';
        const totalPages = Math.ceil(data.length / perPage);
        if (currentPage > totalPages) currentPage = totalPages || 1;

        const start = (currentPage - 1) * perPage;
        const end = start + perPage;
        const pageData = data.slice(start, end);

        pageData.forEach((akun, index) => {
            const realIndex = start + index;
            const guru = guruData.find(g => g.id == akun.guru_id)?.nama || '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${realIndex + 1}</td>
                <td>${guru}</td>
                <td>${akun.username}</td>
                <td>
                    <span class="role-badge role-${akun.role}">
                        ${formatRole(akun.role)}
                    </span>
                </td>
                <td>
                    <span class="password-text">••••••</span>
                    <span class="toggle-table-password" style="cursor:pointer; margin-left:6px;">👁</span>
                </td>
                <td class="action-cell">
                    <button class="action-btn edit-btn" title="Edit">
                        <i data-lucide="pencil"></i>
                    </button>

                    <button class="action-btn delete-btn" title="Hapus">
                        <i data-lucide="trash-2"></i>
                    </button>
                </td>
            `;

            // toggle password
            const pwdText = tr.querySelector('.password-text');
            const togglePwd = tr.querySelector('.toggle-table-password');
            let visible = false;
            togglePwd.addEventListener('click', () => {
                if (!visible) {
                    pwdText.textContent = akun.password;
                    togglePwd.textContent = '🙈';
                } else {
                    pwdText.textContent = '••••••';
                    togglePwd.textContent = '👁';
                }
                visible = !visible;
            });

            // edit akun
            tr.querySelector('.edit-btn').addEventListener('click', () => {
                akunFormContainer.classList.add('show');
                akunFormTitle.textContent = 'Edit Akun Guru';
                akunSaveBtn.textContent = 'Simpan Perubahan';

                const guruDipilih = guruData.find(g => g.id == akun.guru_id);
                if (guruDipilih) {
                    akunGuruHidden.value = guruDipilih.id;
                    akunGuruSelectedText.textContent = guruDipilih.nama;
                }
                akunUsername.value = akun.username;
                akunPassword.value = "";
                akunRole.value = akun.role;

                const roleOption = roleDropdown.querySelector(
                    `.dropdown-option[data-value="${akun.role}"]`
                );

                if (roleOption) {
                    roleSelectedText.textContent = roleOption.textContent;
                }

                editId = akun.id;
            });

            // delete akun
            tr.querySelector('.delete-btn').addEventListener('click', () => {
                showConfirm({
                    message: `Anda yakin menghapus akun <b>${guru}</b>?`,
                    yesText: "Yes",
                    noText: "Cancel",
                    onYes: () => {
                        fetch(`/api/akun/delete/${akun.id}`, { method: 'DELETE', headers: {'X-CSRFToken': csrfToken} })
                            .then(res => res.json())
                            .then(res => {
                                if (res.status === 'success') {
                                    showNotification(res.message, 'success');
                                    loadAkunData();
                                } else {
                                    showNotification(res.message, 'error');
                                }
                            })
                            .catch(() => {
                                showNotification('Terjadi error server', 'error');
                            });
                    }
                });
            });


            akunTableBody.appendChild(tr);
        });
        lucide.createIcons();
        akunTotalData.textContent = data.length;
        renderPagination(totalPages);
    }

    function formatRole(role) {
        return role
            .replace(/_/g, ' ')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }

    akunPerPageInput.addEventListener('change', () => {
        perPage = parseInt(akunPerPageInput.value) || 5;
        currentPage = 1; // reset ke halaman pertama
        renderTable();
    });

    // ================================
    // PAGINATION
    // ================================
    function renderPagination(totalPages) {
        akunPagination.innerHTML = '';

        // PREV
        const prev = document.createElement('button');
        prev.textContent = 'Prev';
        prev.disabled = currentPage === 1;
        prev.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderTable();
            }
        });
        akunPagination.appendChild(prev);

        // NOMOR HALAMAN
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            btn.className = i === currentPage ? 'active' : '';
            btn.addEventListener('click', () => {
                currentPage = i;
                renderTable();
            });
            akunPagination.appendChild(btn);
        }

        // NEXT
        const next = document.createElement('button');
        next.textContent = 'Next';
        next.disabled = currentPage === totalPages;
        next.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderTable();
            }
        });
        akunPagination.appendChild(next);
    }

    // ================================
    // SEARCH
    // ================================
    akunSearchBtn.addEventListener('click', doSearch);
    akunSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            doSearch();
        }
    });

    function doSearch() {
        const keyword = akunSearchInput.value.toLowerCase().trim();
        if (!keyword) {
            renderTable();
            return;
        }

        const result = akunData.filter(a => {
            const guru = guruData.find(g => g.id == a.guru_id)?.nama.toLowerCase() || '';
            return guru.includes(keyword) || a.username.toLowerCase().includes(keyword);
        });

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

        let parent = input.closest('.form-group') || input.parentElement;

        let msg = parent.querySelector('.error-message');

        if (!msg) {
            msg = document.createElement('div');
            msg.className = 'error-message';
            parent.appendChild(msg);
        }

        msg.textContent = message;
    }

    function clearErrors() {
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('.error-message').forEach(el => el.remove());
    }
// agar bisa diakses dari main.js
window.loadGuruData = loadGuruData;
window.loadAkunData = loadAkunData;
});
    