/* =========================================================
    SEARCH FILTER
========================================================= */
const searchInput = document.getElementById('search-kelas-ampu');

if(searchInput){
    searchInput.addEventListener('input', function(){
        const keyword = this.value.toLowerCase();

        document.querySelectorAll('.kelas-ampu-card')
        .forEach(card => {
            const kelas = card.dataset.kelas.toLowerCase();
            const mapel = card.dataset.mapel.toLowerCase();
            const match =
                kelas.includes(keyword) ||
                mapel.includes(keyword);
            card.style.display = match ? 'block' : 'none';
        });
    
    });
}


/* =========================================================
    MODAL ELEMENT
========================================================= */
const modal = document.getElementById('mulai-mengajar-modal');
const closeBtn = modal?.querySelector('.modern-close');
const cancelBtn = document.getElementById('cancel-mulai-mengajar');
const kelasInfo = document.getElementById('mengajar-kelas-info');
const kelasMapelIdInput = document.getElementById('kelas-mapel-id');
const tanggalInput = document.getElementById('mengajar-tanggal');
const jamMulaiInput = document.getElementById('mengajar-jam-mulai');
const jamSelesaiInput = document.getElementById('mengajar-jam-selesai');
const materiInput = document.getElementById('mengajar-materi');
const indikatorInput = document.getElementById('mengajar-indikator');
const kegiatanInput = document.getElementById('mengajar-kegiatan');
const startBtn = document.getElementById('start-absensi-btn');


/* =========================================================
    SET DEFAULT DATE
========================================================= */
if(tanggalInput){
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    tanggalInput.value = `${yyyy}-${mm}-${dd}`;
}

/* =========================================================
    OPEN MODAL
========================================================= */

document.querySelectorAll('.btn-mulai-mengajar')
.forEach(btn => {
    btn.addEventListener('click', async function(){
        const kelasMapelId = this.dataset.kelasMapel;
        const kelas = this.dataset.kelas;
        const mapel = this.dataset.mapel;

        // ======================
        // SET INFO
        // ======================
        kelasInfo.textContent =
            `${kelas} • ${mapel}`;
        kelasMapelIdInput.value =
            kelasMapelId;

        // ======================
        // RESET FIELD
        // ======================
        materiInput.value = '';
        indikatorInput.value = '';
        kegiatanInput.value = '';

        jamMulaiInput.value = '';
        jamSelesaiInput.value = '';

        // ======================
        // AMBIL JADWAL DEFAULT
        // ======================
        try{
            const res = await fetch(
                `/kelas-ampu/api/jadwal-default/${kelasMapelId}`
            );
            const text = await res.text();
            let result;

            try {
                result = JSON.parse(text);
            } catch {
                console.error('Response bukan JSON:', text);
                alert('Server error');
                return;
            }

            if(result.success){
                const data = result.data;
                jamMulaiInput.value =
                    data.jam_mulai || '';
                jamSelesaiInput.value =
                    data.jam_selesai || '';
            }

        }
        catch(err){
            console.error(
                'Gagal ambil jadwal default',
                err
            );
        }

        // ======================
        // OPEN MODAL
        // ======================
        modal.classList.add('show');

    });
});


/* =========================================================
    CLOSE MODAL
========================================================= */
function closeMengajarModal(){
    modal.classList.remove('show');
}

closeBtn?.addEventListener('click', closeMengajarModal);
cancelBtn?.addEventListener('click', closeMengajarModal);

modal?.addEventListener('click', function(e){
    if(e.target === modal){
        closeMengajarModal();
    }
});

const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute('content');

/* =========================================================
    START ABSENSI
========================================================= */
startBtn?.addEventListener('click', async function(){
    const payload = {
        kelas_mapel_id : kelasMapelIdInput.value,
        tanggal : tanggalInput.value,
        jam_mulai : jamMulaiInput.value,
        jam_selesai : jamSelesaiInput.value,
        materi : materiInput.value,
        indikator : indikatorInput.value,
        kegiatan : kegiatanInput.value
    };

    // ======================
    // VALIDASI
    // ======================
    if(!payload.tanggal){
        alert('Tanggal wajib diisi');
        return;
    }

    if(!payload.jam_mulai){
        alert('Jam mulai wajib diisi');
        return;
    }

    if(!payload.jam_selesai){
        alert('Jam selesai wajib diisi');
        return;
    }

    if(!payload.materi){
        alert('Materi pembelajaran wajib diisi');
        return;
    }

    if(!payload.indikator){
        alert('Indikator capaian wajib diisi');
        return;
    }

    if(!payload.kegiatan){
        alert('Kegiatan pembelajaran wajib diisi');
        return;
    }

    try{
        startBtn.disabled = true;
        startBtn.innerHTML = `
            <i data-lucide="loader-circle"></i>
            Menyimpan...
        `;

        if(window.lucide){
            lucide.createIcons();
        }

        // ======================
        // SAVE SESSION MENGAJAR
        // ======================

        const res = await fetch('/kelas-ampu/start-absensi', {
            method : 'POST',
            headers : {
                'Content-Type': 'application/json',
                "X-CSRFToken": csrfToken
            },
            body : JSON.stringify(payload)
        });

        const result = await res.json();
        if(result.success){
            closeMengajarModal();
            window.location.href = `/kelas-ampu/absensi/${result.absensi_id}`;
        }

    }
    catch(err){
        console.error(err);
        alert('Terjadi kesalahan');
    }

    finally{
        startBtn.disabled = false;
        startBtn.innerHTML = `
            <i data-lucide="clipboard-check"></i>
            Mulai Absensi
        `;

        if(window.lucide){
            lucide.createIcons();
        }
    }
});

/* =========================================================
    INIT ICON
========================================================= */
if(window.lucide){
    lucide.createIcons();
}