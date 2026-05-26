// ======================================
// profile.js (FINAL FIXED VERSION)
// Modal Profil, Cropper, Validasi, Batas Tahun
// ======================================

document.addEventListener('DOMContentLoaded', () => {
    // ================================
    // ELEMENT
    // ================================
    const userRole = document.body.dataset.role || "guru";
    const profileModal = document.getElementById('profile-modal');
    const editProfileBtn = document.getElementById('edit-profile');

    const closeProfileBtn = profileModal ? profileModal.querySelector('.close') : null;

    const modalPhoto = document.getElementById('modal-photo');
    const saveProfileBtn = document.getElementById('save-profile');

    const fullnameInput = document.getElementById('fullname');
    const genderInput = document.getElementById('gender');
    const birthplaceInput = document.getElementById('birthplace');
    const birthdateInput = document.getElementById('birthdate');
    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const filterTahunInput = document.getElementById('filter-tahun');

    const userPhotoHeader = document.getElementById('user-photo');
    let originalProfileData = {};
    // ================================
    // CROP ELEMENT
    // ================================
    const cropperModal = document.getElementById('crop-modal');
    const cropperCloseBtn = cropperModal ? cropperModal.querySelector('.close') : null;

    let cropper = null;

    const editModeBtn = document.getElementById('edit-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit');

    const profileInputs = document.querySelectorAll(
        "#profile-modal input:not([type='file']), #profile-modal select"
    );

    const displayFullname = document.getElementById("display-fullname");

    // Saat modal dibuka → set nama sesuai input
    function syncDisplayName() {
        if (!displayFullname) return;
        if (!fullnameInput) return;

        displayFullname.textContent = fullnameInput.value || "user";
    }

    // Panggil saat load
    syncDisplayName();

    // ================================
    // SET BATAS TANGGAL LAHIR (1950 - 10 TAHUN LALU)
    // ================================
    if (birthdateInput) {
        const today = new Date();
        const maxYear = today.getFullYear() - 10;
        const minYear = 1950;

        const maxDate = new Date(maxYear, 11, 31).toISOString().split('T')[0];
        const minDate = new Date(minYear, 0, 1).toISOString().split('T')[0];

        birthdateInput.setAttribute('max', maxDate);
        birthdateInput.setAttribute('min', minDate);
    }

    // ================================
    // OPEN MODAL
    // ================================
    if (editProfileBtn && profileModal) {
        editProfileBtn.addEventListener('click', async () => {
            profileModal.classList.add('show');
            await loadUserProfile();
            setViewMode();
        });
    }

    // ================================
    // CLOSE MODAL
    // ================================
    if (closeProfileBtn && profileModal) {
        closeProfileBtn.addEventListener('click', () => {
            resetPasswordField();
            profileModal.classList.remove('show');
            resetProfileFormError();
        });
    }

    // ================================
    // CLICK OUTSIDE TO CLOSE
    // ================================
    window.addEventListener('click', (e) => {
        if (cropperModal && e.target === cropperModal) {
            closeCropperModal();
        }
    });

    if (cropperCloseBtn) {
        cropperCloseBtn.addEventListener('click', () => {
            closeCropperModal();
        });
    }

    function getShortName(fullname) {
        if (!fullname) return "User";

        const parts = fullname.trim().split(/\s+/);

        if (parts.length === 1) return parts[0];

        if (parts[0].length < 5) {
            return parts[0] + " " + parts[1];
        }

        return parts[0];
    }

    // ================================
    // FORMAT TANGGAL INDONESIA
    // ================================
    function formatTanggalIndonesia(dateString) {
        if (!dateString) return "";

        const bulanIndo = [
            "Januari", "Februari", "Maret", "April",
            "Mei", "Juni", "Juli", "Agustus",
            "September", "Oktober", "November", "Desember"
        ];

        const parts = dateString.split("-");
        const tahun = parts[0];
        const bulan = bulanIndo[parseInt(parts[1]) - 1];
        const hari = parseInt(parts[2]);

        return `${hari} ${bulan} ${tahun}`;
    }

    function setViewMode() {

        // Disable semua input biasa
        profileInputs.forEach(input => {
            input.setAttribute("disabled", true);
        });

        if (userRole !== "admin" && fullnameInput) {
            fullnameInput.setAttribute("disabled", true);
        }

        // ================================
        // DROPDOWN GENDER (FINAL CONTROL)
        // ================================
        const genderDropdown = document.getElementById("genderDropdown");
        const genderOptions = document.getElementById("genderOptions");

        if (genderOptions) {
            genderOptions.classList.remove("active");
        }

        if (genderDropdown) {
            genderDropdown.classList.add("disabled");
        }

        // Format tanggal jadi text
        if (birthdateInput && birthdateInput.value) {
            birthdateInput.type = "text";
            birthdateInput.value = formatTanggalIndonesia(birthdateInput.value);
        }

        // Atur tombol
        if (editModeBtn) editModeBtn.style.display = "inline-block";
        if (saveProfileBtn) saveProfileBtn.style.display = "none";
        if (cancelEditBtn) cancelEditBtn.style.display = "none";
    }

    function setEditMode() {
        profileInputs.forEach(input => {
            input.removeAttribute("disabled");
        });

        if (userRole !== "admin" && fullnameInput) {
            fullnameInput.setAttribute("disabled", true);
        }

        const genderDropdown = document.getElementById("genderDropdown");
        if (genderDropdown) {
            genderDropdown.classList.remove("disabled");
        }

        // 🔥 FIX DI SINI
        if (birthdateInput) {

            // Kembalikan value asli dari originalProfileData
            if (originalProfileData.tahun) {
                if (originalProfileData.tahun.length === 4) {
                    birthdateInput.value = originalProfileData.tahun + "-01-01";
                } else {
                    birthdateInput.value = originalProfileData.tahun;
                }
            } else {
                birthdateInput.value = "";
            }

            birthdateInput.type = "date";
        }

        if (editModeBtn) editModeBtn.style.display = "none";
        if (saveProfileBtn) saveProfileBtn.style.display = "inline-block";
        if (cancelEditBtn) cancelEditBtn.style.display = "inline-block";
    }


    function closeCropperModal() {
        if (cropperModal) cropperModal.classList.remove('show');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }

    // ================================
    // RESET ERROR
    // ================================
    function resetProfileFormError() {
        const fields = [
            fullnameInput,
            genderInput,
            birthplaceInput,
            birthdateInput,
            phoneInput,
            emailInput
        ];

        fields.forEach(el => {
            if (!el) return;
            el.classList.remove('error');
            const msg = el.nextElementSibling;
            if (msg && msg.classList.contains('error-message')) {
                msg.classList.remove('show');
            }
        });
    }

    // ================================
    // REMOVE ERROR ON INPUT
    // ================================
    [
        fullnameInput,
        genderInput,
        birthplaceInput,
        birthdateInput,
        phoneInput,
        emailInput
    ].forEach(el => {
        if (!el) return;
        el.addEventListener('input', () => {
            el.classList.remove('error');
            const msg = el.nextElementSibling;
            if (msg && msg.classList.contains('error-message')) {
                msg.classList.remove('show');
            }
        });
    });

    // ================================
    // BATASI INPUT FILTER TAHUN (MAX 4 DIGIT)
    // ================================
    if (filterTahunInput) {
        filterTahunInput.addEventListener('input', function () {
            let val = this.value;

            val = val.toString().replace(/[^0-9]/g, '');

            if (val.length > 4) {
                val = val.substring(0, 4);
            }

            this.value = val;
        });
    }

    if (editModeBtn) {
        editModeBtn.addEventListener("click", setEditMode);
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", () => {
            restoreProfileData();
            resetPasswordField();
            setViewMode();
        });
    }

    // ================================
    // SAVE PROFILE
    // ================================
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {

            let hasError = false;

            const fields = [
                ...(userRole === "admin"
                    ? [{ el: fullnameInput, name: 'Nama Lengkap' }]
                    : []),
                { el: genderInput, name: 'Jenis Kelamin' },
                { el: birthplaceInput, name: 'Tempat Lahir' },
                { el: birthdateInput, name: 'Tanggal Lahir' },
                { el: phoneInput, name: 'No. HP' },
                { el: emailInput, name: 'Email' }
            ];

            // Reset error
            fields.forEach(f => {
                if (!f.el) return;
                f.el.classList.remove('error');
                const msg = f.el.nextElementSibling;
                if (msg && msg.classList.contains('error-message')) {
                    msg.classList.remove('show');
                }
            });

            // Validasi kosong
            fields.forEach(f => {
                if (!f.el || !f.el.value.trim()) {
                    if (f.el) f.el.classList.add('error');

                    let msg = f.el ? f.el.nextElementSibling : null;
                    if (f.el && (!msg || !msg.classList.contains('error-message'))) {
                        msg = document.createElement('div');
                        msg.classList.add('error-message');
                        f.el.insertAdjacentElement('afterend', msg);
                    }
                    if (msg) {
                        msg.textContent = `${f.name} wajib diisi!`;
                        msg.classList.add('show');
                    }
                    hasError = true;
                }
            });

            if (hasError) {
                if (typeof showNotification === 'function') {
                    showNotification('Harap isi semua data wajib!', 'error');
                }
                return;
            }

            // =========================
            // VALIDASI TAHUN LAHIR
            // =========================
            if (birthdateInput && birthdateInput.value) {
                const birthDate = new Date(birthdateInput.value);
                const year = birthDate.getFullYear();
                const today = new Date();
                const minYear = 1950;
                const maxYear = today.getFullYear() - 10;

                if (year < minYear || year > maxYear) {
                    birthdateInput.classList.add('error');

                    let msg = birthdateInput.nextElementSibling;
                    if (!msg || !msg.classList.contains('error-message')) {
                        msg = document.createElement('div');
                        msg.classList.add('error-message');
                        birthdateInput.insertAdjacentElement('afterend', msg);
                    }
                    msg.textContent = `Tahun lahir harus antara ${minYear} dan ${maxYear}`;
                    msg.classList.add('show');

                    if (typeof showNotification === 'function') {
                        showNotification('Tanggal lahir tidak valid!', 'error');
                    }
                    return;
                }
            }

            // =========================
            // VALIDASI HP
            // =========================
            if (phoneInput && phoneInput.value && !/^\+?[0-9]+$/.test(phoneInput.value.trim())) {
                phoneInput.classList.add('error');

                let msg = phoneInput.nextElementSibling;
                if (!msg || !msg.classList.contains('error-message')) {
                    msg = document.createElement('div');
                    msg.classList.add('error-message');
                    phoneInput.insertAdjacentElement('afterend', msg);
                }
                msg.textContent = 'Nomor HP hanya boleh angka dan + di awal';
                msg.classList.add('show');

                if (typeof showNotification === 'function') {
                    showNotification('Nomor HP tidak valid!', 'error');
                }
                return;
            }

            // =========================
            // VALIDASI EMAIL
            // =========================
            if (emailInput && emailInput.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailInput.value.trim())) {
                    emailInput.classList.add('error');

                    let msg = emailInput.nextElementSibling;
                    if (!msg || !msg.classList.contains('error-message')) {
                        msg = document.createElement('div');
                        msg.classList.add('error-message');
                        emailInput.insertAdjacentElement('afterend', msg);
                    }
                    msg.textContent = 'Format email tidak valid (contoh: nama@email.com)';
                    msg.classList.add('show');

                    if (typeof showNotification === 'function') {
                        showNotification('Email tidak valid!', 'error');
                    }
                    return;
                }
            }

            // =========================
            // KIRIM KE BACKEND
            // =========================
            try {

                const payload = {
                    email: emailInput.value.trim(),
                    hp: phoneInput.value.trim(),
                    tempat: birthplaceInput.value.trim(),
                    tahun: birthdateInput.value,
                    jk: genderInput.value,
                    username: usernameInput ? usernameInput.value.trim() : ""
                };

                if (userRole === "admin") {
                    payload.nama = fullnameInput.value.trim();
                }

                // 🔐 password hanya dikirim kalau diisi
                if (passwordInput && passwordInput.value.trim() !== "") {
                    payload.password = passwordInput.value.trim();
                }

                const updateUrl =
                    userRole === "admin"
                        ? "/api/admin/profile/update"
                        : "/api/profile/update";

                const response = await fetch(updateUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrfToken
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error("Server error");
                }

                const result = await response.json();

                if (result.status === "success") {

                    const newName = fullnameInput.value.trim();

                    // Update header name realtime
                    const headerName = document.querySelector(".user-name");
                    if (headerName) {
                        headerName.textContent = getShortName(fullnameInput.value);
                    }

                    if (displayFullname) {
                        displayFullname.textContent = fullnameInput.value.trim();
                    }

                    resetPasswordField(); // 🔐 bersihkan password

                    setViewMode();

                    showNotification('Profil berhasil diperbarui!', 'success');

                } else {
                    showNotification("Gagal menyimpan profil", "error");
                }

            } catch (err) {
                console.error("Save profile error:", err);
                showNotification("Terjadi kesalahan server", "error");
            }
        });
    }

    // ======================================
    // LOAD DATA PROFILE ADMIN
    // ======================================
    async function loadUserProfile() {
        try {
            const res = await fetch("/api/profile");
            if (!res.ok) return;

            const data = await res.json();
            originalProfileData = { ...data };

            if (fullnameInput) fullnameInput.value = data.nama || "";
            if (genderInput) genderInput.value = data.jk || "";
            // ===== SYNC GENDER DROPDOWN UI =====
            const genderSelected = document.getElementById("genderSelected");

            if (genderSelected) {
                const textSpan = genderSelected.querySelector(".selected-text");

                if (data.jk) {
                    textSpan.textContent = data.jk;
                } else {
                    textSpan.textContent = "Pilih";
                }
            }
            if (birthplaceInput) birthplaceInput.value = data.tempat || "";
            if (birthdateInput) {
                if (data.tahun) {
                    if (data.tahun.length === 4) {
                        birthdateInput.value = data.tahun + "-01-01";
                    } else {
                        birthdateInput.value = data.tahun;
                    }
                } else {
                    birthdateInput.value = "";
                }
            }

            if (phoneInput) phoneInput.value = data.hp || "";
            if (emailInput) emailInput.value = data.email || "";

            if (modalPhoto && data.foto) {
                modalPhoto.src = `/uploads/${data.foto}?t=${Date.now()}`;
            }

            if (userPhotoHeader && data.foto) {
                userPhotoHeader.src = `/uploads/${data.foto}?t=${Date.now()}`;
            }

            // Update header name
            const headerName = document.querySelector(".user-name");
            if (headerName && data.nama && data.nama.trim() !== "") {
                headerName.textContent = getShortName(data.nama);
            }

            // ===== USERNAME & PASSWORD =====
            if (usernameInput) {
                usernameInput.value = data.username || "";
            }

            if (passwordInput) {
                passwordInput.value = "";
                passwordInput.placeholder = "Kosongkan jika tidak ingin mengganti password";
            }

            syncDisplayName();

        } catch (err) {
            console.error("Load profile error:", err);
        }
    }

    function restoreProfileData() {

        if (!originalProfileData) return;

        if (fullnameInput) fullnameInput.value = originalProfileData.nama || "";
        if (genderInput) genderInput.value = originalProfileData.jk || "";

        const genderSelected = document.getElementById("genderSelected");
        if (genderSelected) {
            const textSpan = genderSelected.querySelector(".selected-text");

            if (originalProfileData.jk) {
                textSpan.textContent = originalProfileData.jk;
            } else {
                textSpan.textContent = "Pilih";
            }
        }
        if (birthplaceInput) birthplaceInput.value = originalProfileData.tempat || "";

        if (birthdateInput) {
            if (originalProfileData.tahun) {
                if (originalProfileData.tahun.length === 4) {
                    birthdateInput.value = originalProfileData.tahun + "-01-01";
                } else {
                    birthdateInput.value = originalProfileData.tahun;
                }
            } else {
                birthdateInput.value = "";
            }
        }

        if (phoneInput) phoneInput.value = originalProfileData.hp || "";
        if (emailInput) emailInput.value = originalProfileData.email || "";
        if (usernameInput) usernameInput.value = originalProfileData.username || "";

        if (passwordInput) passwordInput.value = "";

        syncDisplayName();
    }

    function resetPasswordField() {
        if (passwordInput) {
            passwordInput.type = "password";
            passwordInput.value = "";
            passwordInput.placeholder = "Kosongkan jika tidak ingin mengganti password";
        }

        document.querySelectorAll(".password-toggle").forEach(btn => {
            btn.classList.remove("show");
        });
    }
    
    // ================================
    // PASSWORD TOGGLE (ELEGANT ICON)
    // ================================
    document.addEventListener("click", function (e) {
        const btn = e.target.closest(".password-toggle");
        if (!btn) return;

        const inputId = btn.getAttribute("data-target");
        const input = document.getElementById(inputId);
        if (!input) return;

        const isHidden = input.type === "password";

        input.type = isHidden ? "text" : "password";
        btn.classList.toggle("show", isHidden);
    });

    document.addEventListener("click", function (e) {

        const viewer = document.getElementById("photo-viewer");
        const viewerImg = document.getElementById("photo-viewer-img");

        // Klik foto header
        if (e.target && e.target.id === "user-photo") {

            // Kalau bukan IMG (masih huruf)
            if (e.target.tagName !== "IMG") return;

            viewerImg.src = e.target.src;
            viewer.style.display = "block";
        }

        // Klik tombol close
        if (e.target && e.target.id === "photo-viewer-close") {
            viewer.style.display = "none";
        }

        // Klik overlay
        if (e.target && e.target.classList.contains("photo-viewer-overlay")) {
            viewer.style.display = "none";
        }

    });

    // ======================================
    // EDIT & DELETE FOTO PROFILE (DELEGATION)
    // ======================================
    document.addEventListener("click", async function (e) {

        // =========================
        // EDIT FOTO
        // =========================
        if (e.target.closest("#edit-photo-btn")) {
            e.preventDefault();
            const fileInput = document.getElementById("upload-photo-input");
            if (fileInput) fileInput.click();
            return;
        }

        // =========================
        // DELETE FOTO
        // =========================
        if (e.target.closest("#delete-photo-btn")) {
            e.preventDefault();

            const confirmDelete = await showConfirm(
                "Yakin ingin menghapus foto profil?\nFoto akan dihapus dan tidak bisa dikembalikan."
            );

            if (!confirmDelete) return;

            try {
                const res = await fetch('/api/delete-profile-photo-admin', {
                    method: 'DELETE',
                    headers: {
                        "X-CSRFToken": getCSRFToken()
                    }
                });

                const result = await res.json();

                if (!res.ok || result.status !== "success") {
                    throw new Error(result.message || "Delete gagal");
                }

                updateAvatarUI('');
                showNotification('Foto profil berhasil dihapus', 'success');

            } catch (err) {
                console.error(err);
                showNotification('Gagal menghapus foto', 'error');
            }
        }
    });

    // ================================
    // CUSTOM DROPDOWN GENDER TOGGLE
    // ================================
    const genderDropdown = document.getElementById("genderDropdown");
    const genderSelected = document.getElementById("genderSelected");
    const genderOptions = document.getElementById("genderOptions");

    if (genderSelected && genderOptions && genderDropdown) {

        // Klik dropdown → toggle buka/tutup
        genderSelected.addEventListener("click", function (e) {
            e.stopPropagation();

            // Jika mode view (disabled) → jangan buka
            if (genderDropdown.classList.contains("disabled")) return;

            genderOptions.classList.toggle("active");
        });

        // Klik option → pilih & tutup
        genderOptions.querySelectorAll(".dropdown-option").forEach(option => {
            option.addEventListener("click", function () {
                const value = this.dataset.value;

                genderInput.value = value;
                genderSelected.querySelector(".selected-text").textContent = value;

                genderOptions.classList.remove("active");
            });
        });
    }

});

function updateAvatarUI(imageUrl) {

    const fullnameInput = document.getElementById("fullname");
    const initial = fullnameInput?.value
        ? fullnameInput.value.charAt(0).toUpperCase()
        : "A";

    // =========================
    // HEADER
    // =========================
    const headerPhoto = document.getElementById("user-photo");

    if (headerPhoto) {

        if (!imageUrl) {

            // Ubah jadi div style avatar
            if (headerPhoto.tagName === "IMG") {
                const div = document.createElement("div");
                div.id = "user-photo";
                div.className = "user-avatar-initial";
                div.textContent = initial;
                headerPhoto.replaceWith(div);
            } else {
                headerPhoto.textContent = initial;
                headerPhoto.className = "user-avatar-initial";
            }

        } else {

            if (headerPhoto.tagName === "DIV") {
                const img = document.createElement("img");
                img.id = "user-photo";
                img.className = "user-icon";
                img.src = imageUrl;
                headerPhoto.replaceWith(img);
            } else {
                headerPhoto.src = imageUrl;
            }
        }
    }

    // =========================
    // MODAL
    // =========================
    const modalPhoto = document.getElementById("modal-photo");

    if (modalPhoto) {

        if (!imageUrl) {

            if (modalPhoto.tagName === "IMG") {
                const div = document.createElement("div");
                div.id = "modal-photo";
                div.className = "modal-avatar-initial";
                div.textContent = initial;
                modalPhoto.replaceWith(div);
            } else {
                modalPhoto.textContent = initial;
                modalPhoto.className = "modal-avatar-initial";
            }

        } else {

            if (modalPhoto.tagName === "DIV") {
                const img = document.createElement("img");
                img.id = "modal-photo";
                img.className = "modal-photo-modern";
                img.src = imageUrl;
                modalPhoto.replaceWith(img);
            } else {
                modalPhoto.src = imageUrl;
            }
        }
    }
}

