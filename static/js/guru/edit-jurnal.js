// ========================================
// ELEMENT
// ========================================

const totalSiswaEl =
    document.getElementById('total-siswa');

const totalHadirEl =
    document.getElementById('total-hadir');

const totalIzinEl =
    document.getElementById('total-izin');

const totalSakitEl =
    document.getElementById('total-sakit');

const totalAlphaEl =
    document.getElementById('total-alpha');


// ========================================
// UPDATE STATS
// ========================================

function updateStats(){

    const inputs =
        document.querySelectorAll(
            '.status-input'
        );

    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpha = 0;

    inputs.forEach(input => {

        const value = input.value;

        if(value === 'H') hadir++;
        if(value === 'I') izin++;
        if(value === 'S') sakit++;
        if(value === 'A') alpha++;

    });

    if(totalSiswaEl){
        totalSiswaEl.textContent = inputs.length;
    }

    if(totalHadirEl){
        totalHadirEl.textContent = hadir;
    }

    if(totalIzinEl){
        totalIzinEl.textContent = izin;
    }

    if(totalSakitEl){
        totalSakitEl.textContent = sakit;
    }

    if(totalAlphaEl){
        totalAlphaEl.textContent = alpha;
    }

}

// ========================================
// STATUS BUTTON
// ========================================
document.querySelectorAll('.hisa-group')
.forEach(group => {

    const buttons = group.querySelectorAll('.hisa-btn');
    const input = group.querySelector('.status-input');

    buttons.forEach(btn => {

        btn.addEventListener('click', () => {

            // reset active
            buttons.forEach(b => b.classList.remove('active'));

            // set active
            btn.classList.add('active');

            // update value hidden input
            input.value = btn.dataset.value;

            // update statistik
            updateStats();
        });

    });

});

// ========================================
// LISTENER
// ========================================

document.querySelectorAll('.status-select')
.forEach(select => {

    select.addEventListener(
        'change',
        updateStats
    );

});


// ========================================
// INIT
// ========================================

updateStats();

if(window.lucide){
    lucide.createIcons();
}