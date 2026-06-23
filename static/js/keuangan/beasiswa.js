/* =========================
   OPEN CLOSE MODAL
========================= */

function openTambahBeasiswa(){

    document
        .getElementById("modalBeasiswa")
        .classList.add("show");

}

function closeModalBeasiswa(){

    document
        .getElementById("modalBeasiswa")
        .classList.remove("show");

}


/* =========================
   TARGET SELECTOR
========================= */

const beasiswaTarget =
    document.getElementById(
        "beasiswaTargetType"
    );

const wrapper =
    document.getElementById(
        "beasiswaTargetWrapper"
    );


beasiswaTarget.addEventListener(
    "change",

    function(){

        document
            .getElementById("hiddenTargetType")
            .value = this.value;

        let data = [];
        let mode = "";
        let placeholder = "";

        if(this.value === "siswa"){

            data = daftarSiswa;
            mode = "siswa";
            placeholder = "Cari siswa";

        }

        if(this.value === "kelas"){

            data = daftarKelas;
            mode = "kelas";
            placeholder = "Cari kelas";

        }

        if(this.value === "angkatan"){

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

const jenisPembayaran =
    document.getElementById("jenisPembayaranSelect");

const previewPembayaran =
    document.getElementById("selectedJenisPembayaran");


jenisPembayaran.addEventListener("change", function(){

    if(this.value){

        let text =
            this.options[this.selectedIndex].text;

        previewPembayaran.style.display = "inline-block";

        previewPembayaran.innerText =
            "Dipilih : " + text;

    }else{

        previewPembayaran.style.display = "none";
    }

});

const targetSelect =
    document.getElementById("beasiswaTargetType");

const previewPenerima =
    document.getElementById("selectedPenerima");


targetSelect.addEventListener("change", function(){

    if(this.value){

        let text =
            this.options[this.selectedIndex].text;

        previewPenerima.style.display = "inline-block";

        previewPenerima.innerText =
            "Dipilih : " + text;

    }else{

        previewPenerima.style.display = "none";
    }

});

const potongan =
    document.getElementById("jenisPotonganSelect");

const previewPotongan =
    document.getElementById("selectedJenisPotongan");


potongan.addEventListener("change", function(){

    if(this.value){

        let text =
            this.options[this.selectedIndex].text;

        previewPotongan.style.display = "inline-block";

        previewPotongan.innerText =
            "Dipilih : " + text;

    }else{

        previewPotongan.style.display = "none";
    }

});