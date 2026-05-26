// =======================
// KONFIRMASI CUSTOM (GLOBAL)
// =======================
function showConfirm(
    message = "Anda yakin?",
    yesText = "Ya",
    yesClass = "btn-danger"
) {
    return new Promise((resolve) => {

        const confirmModal = document.getElementById('confirm-modal');
        const confirmMessage = document.getElementById('confirm-message');
        const confirmYes = document.getElementById('confirm-yes');
        const confirmNo = document.getElementById('confirm-no');

        if (!confirmModal || !confirmMessage || !confirmYes || !confirmNo) {
            console.error('Confirm modal element tidak lengkap');
            resolve(false);
            return;
        }

        confirmMessage.innerHTML = message;

        // 🔥 ubah teks tombol
        confirmYes.textContent = yesText;

        // 🔥 ubah warna tombol
        confirmYes.className = "btn " + yesClass;

        confirmModal.classList.add('show');

        if (window.lucide) {
            lucide.createIcons();
        }

        function cleanup() {
            confirmModal.classList.remove('show');
            confirmYes.removeEventListener('click', onYes);
            confirmNo.removeEventListener('click', onNo);
        }

        function onYes() {
            cleanup();
            resolve(true);
        }

        function onNo() {
            cleanup();
            resolve(false);
        }

        confirmYes.addEventListener('click', onYes);
        confirmNo.addEventListener('click', onNo);
    });
}