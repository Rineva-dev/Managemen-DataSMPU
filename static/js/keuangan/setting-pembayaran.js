function openTambahAturan() {
    document
        .getElementById("modalAturanPembayaran")
        .classList.add("show");
}

function closeModal() {
    document
        .getElementById("modalAturanPembayaran")
        .classList.remove("show");
}

/* format nominal */
const nominal = document.getElementById("nominal");

nominal.addEventListener("input", function () {

    let angka = this.value.replace(/\D/g, "");

    this.value = new Intl.NumberFormat("id-ID")
        .format(angka);
});



/* cicilan */

const periode = document.getElementById("periodePembayaran");

const cicilan = document.getElementById("cicilanWrapper");


periode.addEventListener("change", function () {

    if (this.value === "cicilan") {

        cicilan.style.display = "block";

    } else {

        cicilan.style.display = "none";
    }

});

const targetType = document.getElementById("targetType");
const wrapper = document.getElementById("targetWrapper");

function toggleDropdown(id){

    document
        .getElementById(id)
        .classList.toggle("show");

}

function updateSelected(){

    const checked =
        document.querySelectorAll(
            'input[name="target_ids"]:checked'
        );

    document
        .getElementById("selectedText")
        .innerText =
        checked.length + " dipilih";
}

targetType.addEventListener("change", function(){

    if(this.value === "all"){
        wrapper.innerHTML = "";
        return;
    }

    let data = [];
    let placeholder = "";
    let mode = "";

    if(this.value === "angkatan"){
        data = daftarAngkatan;
        placeholder = "Cari angkatan";
        mode = "angkatan";
    }

    if(this.value === "kelas"){
        data = daftarKelas;
        placeholder = "Cari kelas";
        mode = "kelas";
    }

    if(this.value === "siswa"){
        data = daftarSiswa;
        placeholder = "Ketik nama siswa";
        mode = "siswa";
    }

    let htmlItems = "";

    data.forEach(item => {

        let label = "";

        if(mode === "siswa"){
            label = item.nama;
        }

        if(mode === "kelas"){
            label = item.tingkat + " " + item.sub_kelas;
        }

        if(mode === "angkatan"){
            label = "Angkatan " + item.tahun_masuk;
        }

        let value =
            mode === "siswa"
                ? item.id
                : mode === "kelas"
                ? item.id
                : item.tahun_masuk;

        htmlItems += `

            <label class="item-target">

                <input type="checkbox"
                    name="target_ids"
                    value="${value}"
                    onchange="updateSelected(); sortCheckedItems()">

                ${label}

            </label>

        `;
    });

    wrapper.innerHTML = `

        <div class="form-group">

            <label>Pilih ${mode}</label>

            <div class="target-search-wrapper">

                <input type="text"
                    id="searchTarget"
                    placeholder="${placeholder}">

                <div class="search-dropdown"
                    id="resultDropdown">

                    ${htmlItems}

                </div>

            </div>

            <small id="selectedText">
                Belum ada dipilih
            </small>

        </div>

    `;

    initSearchDropdown();

});

document.addEventListener("click", function(e){

    const multi =
        document.querySelector(".custom-multi-select");

    if(multi && !multi.contains(e.target)){

        document
            .querySelectorAll(".dropdown-panel")
            .forEach(item => {

                item.classList.remove("show");

            });

    }

});

function initSearchDropdown(){

    const search =
        document.getElementById("searchTarget");

    const dropdown =
        document.getElementById("resultDropdown");

    const items =
        document.querySelectorAll(".item-target");


    /* saat focus tampil */
    search.addEventListener("focus", function(){
        sortCheckedItems();
        dropdown.classList.add("show");

    });


    /* filter */
    search.addEventListener("keyup", function(){

        let keyword =
            this.value.toLowerCase();

        items.forEach(item=>{

            if(item.textContent
                .toLowerCase()
                .includes(keyword)){

                item.style.display = "block";

            }else{

                item.style.display = "none";

            }

        });

    });


    /* klik luar tutup */
    document.addEventListener("click", function(e){

        if(!search.parentElement.contains(e.target)){

            dropdown.classList.remove("show");

        }

    });

}

function sortCheckedItems(){

    const dropdown =
        document.getElementById("resultDropdown");

    if(!dropdown) return;

    const items =
        Array.from(
            dropdown.querySelectorAll(".item-target")
        );

    const checkedItems =
        items.filter(item =>
            item.querySelector("input").checked
        );

    const uncheckedItems =
        items.filter(item =>
            !item.querySelector("input").checked
        );

    dropdown.innerHTML = "";

    checkedItems.forEach(item =>
        dropdown.appendChild(item)
    );

    uncheckedItems.forEach(item =>
        dropdown.appendChild(item)
    );
}