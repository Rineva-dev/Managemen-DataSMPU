document.addEventListener('DOMContentLoaded', () => {
    const photoInput = document.getElementById('upload-photo-input');
    const profilePhoto = document.getElementById('modal-photo');
    

    const cropModal = document.getElementById('crop-modal');
    const cropOverlay = document.getElementById('crop-modal-overlay');
    const cropImage = document.getElementById('cropper-image');
    const cropSaveBtn = document.getElementById('crop-save');
    const cropCancelBtn = document.getElementById('crop-cancel');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const deletePhotoBtn = document.getElementById('delete-photo-btn');
    const changePhotoBtn = document.getElementById('change-photo');
    const photoPreview = document.getElementById('profile-photo-preview');

    let cropper = null;

    let originalPhotoSrc = '';
    let originalProfileData = {};

    function lockFormDataSnapshot() {
        const form = document.getElementById('profile-form');
        if (!form) return;

        window._formSnapshot = {};
        form.querySelectorAll('input[name], textarea[name], select[name]').forEach(el => {
            window._formSnapshot[el.name] = el.value;
        });
    }

    if (photoInput) {
        photoInput.addEventListener('change', function (e) {   
            lockFormDataSnapshot();
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = function (event) {

                // === pastikan elementnya benar ===
                const cropImage = document.getElementById('cropper-image');

                // hancurkan cropper lama
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }

                cropImage.src = event.target.result;

                cropOverlay.style.display = 'block';
                cropModal.style.display = 'block';

                cropper = new Cropper(cropImage, {
                    aspectRatio: 1,
                    viewMode: 0,
                    dragMode: 'move',
                    autoCropArea: 1,
                    background: true,
                    movable: true,
                    zoomable: true,
                    scalable: false,
                    cropBoxResizable: true,
                    cropBoxMovable: true,
                    responsive: true,
                    restore: false,
                    guides: false,
                    center: true,
                    highlight: false,
                    toggleDragModeOnDblclick: false,

                    ready() {
                        const containerData = cropper.getContainerData();

                        cropper.setCropBoxData({
                            left: 0,
                            top: 0,
                            width: containerData.width,
                            height: containerData.height
                        });

                        cropper.setDragMode('move');
                    }
                });

            };

            reader.readAsDataURL(file);
        });
    }

    if (changePhotoBtn && photoInput) {
        changePhotoBtn.addEventListener('click', () => {
            photoInput.value = '';
            photoInput.click();
        });
    }

    // ================================
    // DELETE PHOTO
    // ================================
    if (deletePhotoBtn) {
        deletePhotoBtn.addEventListener("click", () => {

            showConfirm({
                message: "Anda yakin ingin menghapus foto profil?",
                yesText: "Hapus",
                noText: "Batal",
                onYes: async () => {

                    try {
                        const res = await fetch("/api/delete-profile-photo-admin", {
                            method: "DELETE"
                        });

                        if (!res.ok) throw new Error("Server error");

                        const result = await res.json();

                        if (result.status === "success") {

                            updateAvatarUI("");
                            showNotification("Foto berhasil dihapus!", "success");

                        } else {
                            showNotification("Gagal menghapus foto", "error");
                        }

                    } catch (err) {
                        console.error("Delete photo error:", err);
                        showNotification("Terjadi kesalahan server", "error");
                    }

                }
            });

        });
    }


    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (!cropper) return;
            cropper.zoom(0.1);
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (!cropper) return;
            cropper.zoom(-0.1);
        });
    }
    // Cancel crop
    if (cropCancelBtn) {
        cropCancelBtn.addEventListener('click', () => {
            cropOverlay.style.display = 'none';
            cropModal.style.display = 'none';
            if (cropper) { cropper.destroy(); cropper = null; }
            photoInput.value = ''; // reset input
        });
    }

    // Save crop
    if (cropSaveBtn) {
        cropSaveBtn.addEventListener('click', () => {
            if (!cropper) return;

            const canvas = cropper.getCroppedCanvas();

            if (!canvas) {
                showNotification("Crop gagal, coba lagi!", "error");
                return;
            }

            canvas.toBlob(blob => {
                const formData = new FormData();
                formData.append('foto', blob, 'profile.jpg');

                fetch(window.uploadPhotoUrl, {
                    method: 'POST',
                    body: formData
                })

                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {

                        const newPhotoUrl = `/uploads/${data.filename}?timestamp=${Date.now()}`;

                        // =========================
                        // UPDATE FOTO DI MODAL
                        // =========================
                        let modalPhoto = document.getElementById('modal-photo');

                        if (modalPhoto) {
                            if (modalPhoto.tagName === 'IMG') {
                                modalPhoto.src = newPhotoUrl;
                            } else {
                                const newImg = document.createElement('img');
                                newImg.id = 'modal-photo';
                                newImg.className = 'modal-photo-modern';
                                newImg.src = newPhotoUrl;
                                modalPhoto.replaceWith(newImg);
                            }
                        }

                        // =========================
                        // UPDATE FOTO DI HEADER
                        // =========================
                        let headerPhoto = document.getElementById('user-photo');

                        if (headerPhoto) {
                            if (headerPhoto.tagName === 'IMG') {
                                headerPhoto.src = newPhotoUrl;
                            } else {
                                const newImg = document.createElement('img');
                                newImg.id = 'user-photo';
                                newImg.className = 'user-icon';
                                newImg.src = newPhotoUrl;
                                headerPhoto.replaceWith(newImg);
                            }
                        }

                    } else {
                        showNotification('Gagal upload foto: ' + data.message, "error");
                    }

                    cropOverlay.style.display = 'none';
                    cropModal.style.display = 'none';
                    if (cropper) { cropper.destroy(); cropper = null; }
                    photoInput.value = '';
                })

                .catch(err => {
                    console.error(err);
                    showNotification('Terjadi kesalahan saat upload foto.', "error");
                    cropOverlay.style.display = 'none';
                    cropModal.style.display = 'none';
                    if (cropper) { cropper.destroy(); cropper = null; }
                    photoInput.value = '';
                });

            }, 'image/jpeg');
        });
    }


    // Tutup modal profile
    const modalProfile = document.getElementById('modal-profile');
    const modalOverlay = document.getElementById('modal-profile-overlay');
    const closeBtn = document.getElementById('modal-profile-close');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modalProfile.style.display = 'none';
            modalOverlay.style.display = 'none';
        });
    }
});
