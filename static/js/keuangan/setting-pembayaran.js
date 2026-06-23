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

    }


    if(this.value === "angkatan"){

        wrapper.innerHTML = `

            <div class="form-group">

                <label>Pilih Angkatan</label>

                <div class="target-search-wrapper">

                    <input type="text"
                        id="searchTarget"
                        placeholder="Cari angkatan">

                    <div class="search-dropdown"
                        id="resultDropdown">

                        {% for a in daftar_angkatan %}

                        <label class="item-target">

                            <input type="checkbox"
                                name="target_ids"
                                value="{{ a.tahun_masuk }}"
                                onchange="updateSelected(); sortCheckedItems()">

                            Angkatan {{ a.tahun_masuk }}

                        </label>

                        {% endfor %}

                    </div>

                </div>

                <small id="selectedText">
                    Belum ada dipilih
                </small>

            </div>
        `;

        initSearchDropdown();
    }

    if(this.value === "kelas"){

        wrapper.innerHTML = `

            <div class="form-group">

                <label>Pilih Kelas</label>

                <div class="target-search-wrapper">

                    <input type="text"
                        id="searchTarget"
                        placeholder="Cari kelas">

                    <div class="search-dropdown"
                        id="resultDropdown">

                        {% for k in daftar_kelas %}

                        <label class="item-target">

                            <input type="checkbox"
                                name="target_ids"
                                value="{{ k.id }}"
                                onchange="updateSelected(); sortCheckedItems()">

                            {{ k.tingkat }} {{ k.sub_kelas }}

                        </label>

                        {% endfor %}

                    </div>

                </div>

                <small id="selectedText">
                    Belum ada dipilih
                </small>

            </div>
        `;

        initSearchDropdown();
    }


    if(this.value === "siswa"){

        wrapper.innerHTML = `

            <div class="form-group">

                <label>Pilih Siswa</label>

                <div class="target-search-wrapper">

                    <input type="text"
                        id="searchTarget"
                        placeholder="Ketik nama siswa">

                    <div class="search-dropdown"
                        id="resultDropdown">

                        {% for s in daftar_siswa %}

                        <label class="item-target">

                            <input type="checkbox"
                                name="target_ids"
                                value="{{ s.id }}"
                                onchange="updateSelected(); sortCheckedItems()">

                            {{ s.nama }}

                        </label>

                        {% endfor %}

                    </div>

                </div>

                <small id="selectedText">
                    Belum ada dipilih
                </small>

            </div>
        `;


        initSearchDropdown();
    }

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

    items.sort((a,b)=>{

        const aChecked =
            a.querySelector("input").checked;

        const bChecked =
            b.querySelector("input").checked;

        return bChecked - aChecked;
    });

    items.forEach(item => {

        dropdown.appendChild(item);

    });

}