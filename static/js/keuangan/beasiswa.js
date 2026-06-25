/* =========================
   OPEN CLOSE MODAL
========================= */
function openTambahBeasiswa(){document.getElementById("modalBeasiswa").classList.add("show");}
function closeModalBeasiswa(){document.getElementById("modalBeasiswa").classList.remove("show");}

/* =========================
   BUILD DROPDOWN
========================= */
function buildTargetDropdown(
    data,
    mode,
    placeholder
){

    let htmlItems = "";

    data.forEach(item=>{

        let label = "";
        let value = "";

        if(mode === "siswa"){

            label = item.nama;
            value = item.id;

        }

        if(mode === "kelas"){

            label =
                item.tingkat +
                " " +
                item.sub_kelas;

            value = item.id;

        }

        if(mode === "angkatan"){

            label =
                "Angkatan " +
                item.tahun_masuk;

            value =
                item.tahun_masuk;

        }

        htmlItems += `

            <label class="item-target">

                <input
                    type="checkbox"
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

                <input
                    type="text"
                    id="searchTarget"
                    placeholder="${placeholder}">

                <div
                    class="search-dropdown"
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

}



/* =========================
   JUMLAH DIPILIH
========================= */

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



/* =========================
   SEARCH DROPDOWN
========================= */

function initSearchDropdown(){

    const search =
        document.getElementById(
            "searchTarget"
        );

    const dropdown =
        document.getElementById(
            "resultDropdown"
        );

    const items =
        document.querySelectorAll(
            ".item-target"
        );


    search.addEventListener(
        "focus",

        function(){

            sortCheckedItems();

            dropdown
                .classList
                .add("show");

        }
    );


    search.addEventListener(
        "keyup",

        function(){

            let keyword =
                this.value
                    .toLowerCase();

            items.forEach(item=>{

                if(

                    item.textContent
                        .toLowerCase()
                        .includes(keyword)

                ){

                    item.style.display =
                        "block";

                }

                else{

                    item.style.display =
                        "none";

                }

            });

        }
    );


    document.addEventListener(
        "click",

        function(e){

            if(

                !search.parentElement
                    .contains(e.target)

            ){

                dropdown
                    .classList
                    .remove("show");

            }

        }

    );

}



/* =========================
   URUTKAN CHECKED
========================= */

function sortCheckedItems(){

    const dropdown =
        document.getElementById(
            "resultDropdown"
        );

    if(!dropdown) return;


    const items =
        Array.from(

            dropdown.querySelectorAll(
                ".item-target"
            )

        );


    const checkedItems =
        items.filter(item=>

            item.querySelector(
                "input"
            ).checked

        );


    const uncheckedItems =
        items.filter(item=>

            !item.querySelector(
                "input"
            ).checked

        );


    dropdown.innerHTML = "";


    checkedItems.forEach(item=>

        dropdown.appendChild(item)

    );


    uncheckedItems.forEach(item=>

        dropdown.appendChild(item)

    );

}

/* =========================
   MODAL PENERIMA
========================= */
function openPenerimaBeasiswa(id){

    fetch(
        `/get-penerima-beasiswa/${id}`
    )

    .then(res => res.json())

    .then(data => {

        let html = `

            <table>

                <thead>

                    <tr>

                        <th>NISN</th>
                        <th>Nama</th>
                        <th>Kelas</th>
                        <th>Alamat</th>

                    </tr>

                </thead>

                <tbody>

        `;


        data.forEach(item=>{

            html += `

                <tr>

                    <td>${item.nisn}</td>

                    <td>${item.nama}</td>

                    <td>

                        ${item.tingkat}
                        ${item.sub_kelas}

                    </td>

                    <td>${item.alamat}</td>

                </tr>

            `;

        });


        html += `

                </tbody>

            </table>

        `;


        document
            .getElementById(
                "listPenerimaBeasiswa"
            )
            .innerHTML = html;


        document
            .getElementById(
                "modalPenerimaBeasiswa"
            )
            .classList.add("show");

    });

}



function closePenerimaBeasiswa(){

    document
        .getElementById(
            "modalPenerimaBeasiswa"
        )
        .classList.remove("show");

}

/* =========================
   PREVIEW JENIS PEMBAYARAN
========================= */
const previewPembayaran = document.getElementById("selectedJenisPembayaran");

/* =========================
   PREVIEW PENERIMA
========================= */
const previewPenerima = document.getElementById("selectedPenerima");

/* =========================
   PREVIEW JENIS POTONGAN
========================= */
const previewPotongan = document.getElementById("selectedJenisPotongan");


initCustomDropdown(
    "jenisPembayaranDropdown",
    "jenisPembayaranValue"
);

initCustomDropdown(
    "targetDropdown",
    "beasiswaTargetType",

    function(value){

        let data = [];
        let mode = "";
        let placeholder = "";

        if(value === "siswa"){

            data = daftarSiswa;
            mode = "siswa";
            placeholder = "Cari siswa";

        }

        if(value === "kelas"){

            data = daftarKelas;
            mode = "kelas";
            placeholder = "Cari kelas";

        }

        if(value === "angkatan"){

            data = daftarAngkatan;
            mode = "angkatan";
            placeholder = "Cari angkatan";

        }

        buildTargetDropdown(
            data,
            mode,
            placeholder
        );

    }
);

initCustomDropdown(
    "potonganDropdown",
    "jenisPotonganValue"
);

function initCustomDropdown(
    dropdownId,
    hiddenInputId,
    callback = null
){

    const dropdown =
        document.getElementById(dropdownId);

    if(!dropdown) return;

    const selected =
        dropdown.querySelector(
            ".dropdown-selected"
        );

    const options =
        dropdown.querySelectorAll(
            ".dropdown-option"
        );

    const hiddenInput =
        document.getElementById(
            hiddenInputId
        );

    let currentIndex = -1;


    /* CLICK OPEN */
    selected.addEventListener("click", function(e){
        console.log("CLICK JALAN");

        e.stopPropagation();

        dropdown.classList.toggle("active");

        console.log(dropdown.className);

        if(dropdown.classList.contains("active")){

            currentIndex = 0;
            highlightOption();

        }

    });


    /* CLICK OPTION */

    options.forEach((option,index)=>{

        option.addEventListener("click", function(e){

            e.stopPropagation();

            pilihOption(index);

        });

    });


    /* KEYBOARD */
    selected.addEventListener("keydown", function(e){

            // bawah
            if(e.key === "ArrowDown"){

                e.preventDefault();

                if(!dropdown.classList.contains("active")){

                    dropdown.classList.add("active");
                    currentIndex = 0;

                }

                else{

                    if(currentIndex < options.length - 1){

                        currentIndex++;

                    }

                }

                highlightOption();
                updateSelection(currentIndex);

            }


            // atas
            if(e.key === "ArrowUp"){

                e.preventDefault();

                if(!dropdown.classList.contains("active")){

                    dropdown.classList.add("active");
                    currentIndex = options.length - 1;

                }

                else{

                    if(currentIndex > 0){

                        currentIndex--;

                    }

                }

                highlightOption();
                updateSelection(currentIndex);

            }

            // enter
            if(e.key === "Enter"){

                e.preventDefault();

                if(currentIndex >= 0){

                    pilihOption(currentIndex);

                }

            }


            // escape
            if(e.key === "Escape"){

                dropdown.classList.remove("active");

            }

            // TAB → tutup lalu lanjut ke field berikutnya
            if(e.key === "Tab"){

                dropdown.classList.remove("active");

            }

        }
    );


    function highlightOption(){

        options.forEach(opt=>{

            opt.classList.remove("active");

        });


        if(options[currentIndex]){

            options[currentIndex]
                .classList.add("active");

            options[currentIndex]
                .scrollIntoView({

                    block: "nearest"

                });

        }

    }

    function pilihOption(index){

        updateSelection(index);

        dropdown.classList.remove("active");

        selected.focus();

        if(callback){

            callback(hiddenInput.value);
        }
    }

    function updateSelection(index){

        const option = options[index];
        const text = option.textContent.trim();
        const value = option.dataset.value;

        selected.querySelector(
            ".selected-text"
        ).innerText = text;

        hiddenInput.value = value;
        currentIndex = index;
    }


 

}