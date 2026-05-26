window.showToast = function(message, type = 'success', duration = 1500) {

    const styles = {
        success: {
            icon: '✔',
            bg: 'linear-gradient(135deg, #4cff8e, #47d17a)',
            text: '#ffffff'
        },
        error: {
            icon: '✖',
            bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
            text: '#ffffff'
        },
        warning: {
            icon: '⚠',
            bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
            text: '#ffffff'
        }
    };

    const config = styles[type] || styles.success;

    // ======================
    // OVERLAY
    // ======================
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0)';
    overlay.style.backdropFilter = 'blur(0px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '100099';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    document.body.appendChild(overlay);

    // ======================
    // CONTAINER
    // ======================
    const container = document.createElement('div');
    container.style.background = config.bg;
    container.style.borderRadius = '22px';
    container.style.padding = '15px 50px';
    container.style.minWidth = '320px';
    container.style.textAlign = 'center';
    container.style.boxShadow = '0 30px 60px rgba(0,0,0,0.2)';
    container.style.transform = 'translateY(30px) scale(0.9)';
    container.style.opacity = '0';
    container.style.transition = 'all 0.4s cubic-bezier(.22,1,.36,1)';
    container.style.fontFamily = 'Segoe UI, sans-serif';
    overlay.appendChild(container);

    // ======================
    // ICON
    // ======================
    const icon = document.createElement('div');
    icon.textContent = config.icon;
    icon.style.fontSize = '52px';
    icon.style.color = config.text;
    icon.style.marginBottom = '16px';
    icon.style.transform = 'scale(0.4) rotate(-15deg)';
    icon.style.opacity = '0';
    icon.style.transition = 'all 0.5s cubic-bezier(.22,1,.36,1)';
    container.appendChild(icon);

    // ======================
    // TEXT
    // ======================
    const text = document.createElement('div');
    text.innerHTML = message;
    text.style.fontSize = '16px';
    text.style.fontWeight = '600';
    text.style.color = config.text;
    text.style.letterSpacing = '0.3px';
    container.appendChild(text);

    // ======================
    // PROGRESS BAR
    // ======================
    const progress = document.createElement('div');
    progress.style.height = '4px';
    progress.style.marginTop = '22px';
    progress.style.borderRadius = '10px';
    progress.style.background = 'rgba(255,255,255,0.7)';
    progress.style.width = '100%';
    progress.style.transition = `width ${duration}ms linear`;
    container.appendChild(progress);

    // ======================
    // ANIMATE IN
    // ======================
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0) scale(1)';
        icon.style.transform = 'scale(1) rotate(0deg)';
        icon.style.opacity = '1';
        progress.style.width = '0%';
    });

    // ======================
    // ANIMATE OUT
    // ======================
    setTimeout(() => {
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px) scale(0.95)';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }, duration);
};

function formatJabatan(text) {
    if (!text) return '-';

    return text
        .replace(/_/g, ' ')
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

document.addEventListener('DOMContentLoaded', () => {
    // ELEMENT
    const lihatProfileLink = document.getElementById('Lihat-profile');
    const modal = document.getElementById('modal-profile');
    const overlay = document.getElementById('modal-profile-overlay');
    const closeBtn = document.getElementById('modal-profile-close');
    const profileContent = document.getElementById('profile-content');
    const photoPreview = document.getElementById('profile-photo-preview');
    const editPhotoBtn = document.getElementById('edit-photo-btn');

    window.originalPhotoSrc = '';
    window.originalProfileData = {};


    // Format tanggal Indonesia
    function formatTanggalIndo(dateStr) {
        if (!dateStr) return '-';
        if (dateStr.includes(' ')) dateStr = dateStr.split(' ')[0];
        const bulan = [
            'Januari','Februari','Maret','April','Mei','Juni',
            'Juli','Agustus','September','Oktober','November','Desember'
        ];
        const parts = dateStr.split('-'); // yyyy-mm-dd
        if (parts.length !== 3) return dateStr;
        const y = parts[0], m = parseInt(parts[1],10)-1, d = parts[2];
        return `${parseInt(d)} ${bulan[m]} ${y}`;
    }

    // OPEN PROFILE MODAL
    lihatProfileLink.addEventListener('click', async (e) => {
        e.preventDefault();
        profileContent.innerHTML = `<p class="loading">Loading...</p>`;
        overlay.style.display = 'block';
        modal.style.display = 'block';
        editPhotoBtn.style.display = 'none';

        try {
            const res = await fetch('/api/profile-guru');
            if (!res.ok) throw new Error('Gagal mengambil data profil');
            const data = await res.json();
            originalProfileData = {...data};

            // Set foto profil
            photoPreview.src = (data.foto && data.foto !== '') ? `/uploads/${data.foto}?timestamp=${Date.now()}` : '/static/icons/admin.png';

            originalPhotoSrc = photoPreview.src;
            
            // Render form
            profileContent.innerHTML = `
                <form class="profile-form two-columns" id="profile-form">
                    <div class="column">
                        <div class="form-group">
                            <label for="nama">Nama</label>
                            <input type="text" name="nama" id="nama" autocomplete="name" value="${data.nama || ''}">
                        </div>
                        <div class="form-group">
                            <label for="jabatan">Jabatan</label>
                            <input type="text" name="jabatan" id="jabatan" value="${formatJabatan(data.jabatan)}" readonly>
                        </div>
                        <div class="form-group">
                            <label for="tempat">Tempat Lahir</label>
                            <input type="text" name="tempat" id="tempat" value="${data.tempat || ''}">
                        </div>
                        <div class="form-group">
                            <label for="tahun-input">Tanggal Lahir</label>
                            <div class="fake-input" id="tahun-view">${formatTanggalIndo(data.tahun)}</div>
                            <input type="date" name="tahun" id="tahun-input" value="${data.tahun || ''}" style="display:none;">
                        </div>
                        <div class="form-group">
                            <label for="jk">Jenis Kelamin</label>
                            <select name="jk" id="jk">
                                <option value="Laki-laki" ${data.jk==='Laki-laki'?'selected':''}>Laki-laki</option>
                                <option value="Perempuan" ${data.jk==='Perempuan'?'selected':''}>Perempuan</option>
                            </select>
                        </div>
                    </div>

                    <div class="column">
                        <div class="form-group">
                            <label for="status">Status</label>
                            <select name="status" id="status">
                                <option value="Menikah" ${data.status==='Menikah'?'selected':''}>Menikah</option>
                                <option value="Belum Menikah" ${data.status==='Belum Menikah'?'selected':''}>Belum Menikah</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="hp">Telepon</label>
                            <input type="text" name="hp" id="hp" value="${data.hp || data.telp || data.telepon || data.no_hp || ''}">
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="text" name="email" id="email" autocomplete="email" value="${data.email || ''}">
                        </div>
                        <div class="form-group">
                            <label for="alamat">Alamat</label>
                            <textarea name="alamat" id="alamat">${data.alamat || ''}</textarea>
                        </div>
                    </div>
                    <hr style="margin: 5px 0 1px 0; border:none; border-top:1px solid #eee;">

                    <div class="column" style="grid-column:1 / -1;">
                        <h4 style="margin-bottom:15px;">🔐 Pengaturan Akun</h4>

                        <div class="form-group">
                            <label for="username">Username</label>
                            <input type="text" name="username" id="username" value="${data.username || ''}">
                        </div>

                        <div class="form-group">
                            <label for="password">Password Baru</label>
                            <div class="password-wrapper">
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    placeholder="Kosongkan jika tidak ingin mengubah"
                                >

                                <span class="toggle-password" data-target="password">
                                    <svg class="eye-open" viewBox="0 0 24 24">
                                        <path d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7 11-7 11-7-3.367-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
                                    </svg>

                                    <svg class="eye-closed" viewBox="0 0 24 24" style="display:none">
                                        <path d="M1 4.27L2.28 3 21 21.72 19.73 23l-3.1-3.1A11.53 11.53 0 0 1 12 19c-7.63 0-11-7-11-7z"/>
                                        <path d="M12 7a5 5 0 0 1 5 5c0 .64-.13 1.25-.36 1.82l-6.46-6.46z"/>
                                    </svg>
                                </span>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="confirm_password">Konfirmasi Password</label>
                            <div class="password-wrapper">
                                <input
                                    type="password"
                                    id="confirm_password"
                                    name="confirm_password"
                                >

                                <span class="toggle-password" data-target="confirm_password">
                                    <svg class="eye-open" viewBox="0 0 24 24">
                                        <path d="M12 5c-7.633 0-11 7-11 7s3.367 7 11 7 11-7 11-7-3.367-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
                                    </svg>

                                    <svg class="eye-closed" viewBox="0 0 24 24" style="display:none">
                                        <path d="M1 4.27L2.28 3 21 21.72 19.73 23l-3.1-3.1A11.53 11.53 0 0 1 12 19c-7.63 0-11-7-11-7z"/>
                                        <path d="M12 7a5 5 0 0 1 5 5c0 .64-.13 1.25-.36 1.82l-6.46-6.46z"/>
                                    </svg>
                                </span>
                            </div>
                        </div>
                    </div>
                </form>
                <div style="margin-top:15px; text-align:right;">
                    <button type="button" id="edit-profile-btn">Edit</button>
                </div>
            `;

            // ======================
            // TOGGLE PASSWORD (SVG VERSION)
            // ======================
            document.querySelectorAll('.toggle-password').forEach(toggle => {

                toggle.addEventListener('click', function () {

                    const targetId = this.getAttribute('data-target');
                    const input = document.getElementById(targetId);

                    const eyeOpen = this.querySelector('.eye-open');
                    const eyeClosed = this.querySelector('.eye-closed');

                    if (input.type === 'password') {
                        input.type = 'text';
                        eyeOpen.style.display = 'none';
                        eyeClosed.style.display = 'block';
                    } else {
                        input.type = 'password';
                        eyeOpen.style.display = 'block';
                        eyeClosed.style.display = 'none';
                    }

                });

            });

            const editBtn = document.getElementById('edit-profile-btn');
            const form = document.getElementById('profile-form');
            const fields = form.querySelectorAll('input[name], textarea[name], select[name]');

            // ============================
            // FILTER INPUT NOMOR HP REAL-TIME
            // ============================
            const hpInput = document.getElementById('hp');

            if (hpInput) {

                hpInput.addEventListener('input', function () {

                    let value = this.value;

                    // Hapus semua karakter kecuali angka dan +
                    value = value.replace(/[^0-9+]/g, '');

                    // Pastikan + hanya di awal
                    if (value.includes('+')) {
                        value = '+' + value.replace(/\+/g, '').replace(/^\+/, '');
                    }

                    // Batasi maksimal 13 digit angka (tidak termasuk +)
                    const digitsOnly = value.replace('+', '');

                    if (digitsOnly.length > 13) {
                        value = value.substring(0, value.startsWith('+') ? 14 : 13);
                    }

                    this.value = value;
                });

            }
            
            // Lock fields awal
            fields.forEach(el => {
                if (el.tagName === 'SELECT') el.disabled = true;
                else el.readOnly = true;
                el.style.backgroundColor = '#f0f0f0';
            });

            function showFieldError(el, message) {
                clearError(el);

                el.style.borderColor = '#ef4444';
                el.style.backgroundColor = '#fff5f5';

                const error = document.createElement('div');
                error.className = 'error-message';
                error.style.color = '#ef4444';
                error.style.fontSize = '12px';
                error.style.marginTop = '4px';
                error.textContent = message;

                el.parentElement.appendChild(error);
            }

            function clearError(el) {
                el.style.borderColor = '#1976d2';
                el.style.backgroundColor = '#fff';

                const oldError = el.parentElement.querySelector('.error-message');
                if (oldError) oldError.remove();
            }

            function validateProfileForm(fields) {
                let valid = true;

                // regex
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const hpRegex = /^\+?\d{1,13}$/; // boleh + di depan, maksimal 13 digit angka

                fields.forEach(el => {

                    if (!['tempat','tahun','jk','status','hp','email','alamat'].includes(el.name)) {
                        return;
                    }

                    const value = el.value.trim();

                    // hapus pesan error lama
                    const oldError = el.parentElement.querySelector('.error-message');
                    if (oldError) oldError.remove();

                    el.style.borderColor = '';
                    el.style.backgroundColor = '#fff';

                    // =====================
                    // VALIDASI KOSONG
                    // =====================
                    if (value === '' || value === '-') {
                        showFieldError(el, 'Field ini wajib diisi');
                        valid = false;
                        return;
                    }

                    // =====================
                    // VALIDASI EMAIL
                    // =====================
                    if (el.name === 'email' && !emailRegex.test(value)) {
                        showFieldError(el, 'Format email tidak valid (contoh: nama@email.com)');
                        valid = false;
                        return;
                    }

                    // =====================
                    // VALIDASI HP
                    // =====================
                    if (el.name === 'hp' && !hpRegex.test(value)) {
                        showFieldError(el, 'Nomor HP hanya boleh angka dan + (maksimal 13 digit)');
                        valid = false;
                        return;
                    }
                });

                // =====================
                // VALIDASI PASSWORD
                // =====================
                const password = document.getElementById('password').value.trim();
                const confirmPassword = document.getElementById('confirm_password').value.trim();

                if (password !== '' || confirmPassword !== '') {

                    if (password.length < 6) {
                        showFieldError(document.getElementById('password'), 'Password minimal 6 karakter');
                        valid = false;
                    }

                    if (password !== confirmPassword) {
                        showFieldError(document.getElementById('confirm_password'), 'Konfirmasi password tidak sama');
                        valid = false;
                    }
                }

                // =====================
                // VALIDASI USERNAME
                // =====================
                const usernameInput = document.getElementById('username');
                if (usernameInput) {
                    const usernameValue = usernameInput.value.trim();
                    if (usernameValue === '') {
                        showFieldError(usernameInput, 'Username wajib diisi');
                        valid = false;
                    }
                }

                return valid;
            }


            // Edit / Simpan
            editBtn.addEventListener('click', async () => {
                if (editBtn.textContent === 'Edit') {

                    fields.forEach(el=>{
                        if (['tempat','tahun','jk','status','hp','email','alamat','username','password','confirm_password'].includes(el.name)){
                            el.tagName==='SELECT'? el.disabled=false : el.readOnly=false;
                            el.style.backgroundColor='#fff';
                            el.style.borderColor='#1976d2';
                        }
                    });

                    document.getElementById('tahun-view').style.display='none';
                    document.getElementById('tahun-input').style.display='block';
                    editPhotoBtn.style.display='block';
                    editBtn.textContent='Simpan';

                } else {

                    // =========================
                    // VALIDASI WAJIB ISI
                    // =========================
                    const isValid = validateProfileForm(fields);

                    if (!isValid) {
                        showToast('Periksa kembali data isian anda', 'warning');
                        return; // STOP di sini, tidak lanjut simpan
                    }

                    const formData = new FormData();
                    fields.forEach(el=>{
                        if(!el.name) return;

                        if (el.name === 'password' || el.name === 'confirm_password') {
                            if (el.value.trim() !== '') {
                                formData.append(el.name, el.value);
                            }
                        } else {
                            formData.append(el.name, el.value);
                        }
                    });

                    if (window.croppedBlob) {
                        formData.append('foto', window.croppedBlob, 'profile.jpg');
                    }

                    try {
                        const resUpdate = await fetch('/api/update-profile-guru', {method:'POST', body:formData});
                        if(!resUpdate.ok) throw new Error('Gagal menyimpan data');

                        showToast('Profil berhasil diperbarui', 'success');

                        originalProfileData = {};
                        fields.forEach(el => {
                            if (el.name) {
                                originalProfileData[el.name] = el.value;
                            }
                        });
                        originalPhotoSrc = photoPreview.src;

                        // Update foto header dropdown
                        const headerPhoto = document.getElementById('user-photo');
                        if (headerPhoto) {
                            const res = await fetch('/api/profile-guru');
                            const data = await res.json();
                            headerPhoto.src = data.foto && data.foto !== ''
                                ? `/uploads/${data.foto}?timestamp=${Date.now()}`
                                : '/static/icons/admin.png';
                            originalProfileData = {...data};
                        }

                        // Lock lagi
                        fields.forEach(el=>{
                            if(el.tagName==='SELECT') el.disabled=true;
                            else el.readOnly=true;
                            el.style.backgroundColor='#f0f0f0';
                            el.style.borderColor='';
                        });

                        const tahunInput = document.getElementById('tahun-input');
                        const tahunView = document.getElementById('tahun-view');
                        tahunView.innerText = formatTanggalIndo(tahunInput.value);
                        tahunView.style.display='block';
                        tahunInput.style.display='none';

                        editPhotoBtn.style.display='none';
                        editBtn.textContent='Edit';

                    } catch(err){
                        showToast('Terjadi kesalahan: ' + err.message);
                    }
                }
            });

        } catch(err){
            profileContent.innerHTML = `<p class="error">${err.message}</p>`;
        }
    });

    // ================================
    // GANTI DENGAN INI: RESET MODAL SAAT TUTUP
    // ================================
    const closeModal = () => {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        editPhotoBtn.style.display = 'none';

        // Reset foto ke original
        photoPreview.src = originalPhotoSrc;

        // Reset form fields
        const form = document.getElementById('profile-form');
        if (window._formSnapshot) {
                const form = document.getElementById('profile-form');
                if (window._formSnapshot && form) {
                    form.querySelectorAll('input[name], textarea[name], select[name]').forEach(el => {
                        if (el.name in window._formSnapshot) {
                            el.value = window._formSnapshot[el.name];
                        }
                    });
                }
            }
        if (form) {
            form.querySelectorAll('input[name], textarea[name], select[name]').forEach(el => {
                const name = el.name;
                if (!name) return;
                if (name in originalProfileData) {
                    if (el.tagName === 'SELECT') {
                        el.value = originalProfileData[name];
                        el.disabled = true;
                    } else {
                        el.value = originalProfileData[name];
                        el.readOnly = true;
                    }
                    el.style.backgroundColor = '#f0f0f0';
                    el.style.borderColor = '';
                }
            });

            // reset tahun view/input
            const tahunInput = document.getElementById('tahun-input');
            const tahunView = document.getElementById('tahun-view');
            if (tahunInput && tahunView) {
                tahunInput.value = originalProfileData.tahun || '';
                tahunView.innerText = formatTanggalIndo(originalProfileData.tahun);
                tahunView.style.display = 'block';
                tahunInput.style.display = 'none';
            }
        }

        // reset input file
        document.getElementById('photo-input').value = "";

        // reset tombol edit
        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) editBtn.textContent = 'Edit';
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
});
