
document.addEventListener("DOMContentLoaded", () => {

    const steps = document.querySelectorAll(".form-step");
    const stepIndicators = document.querySelectorAll(".step");
    const nextBtns = document.querySelectorAll(".btn-next");
    const prevBtns = document.querySelectorAll(".btn-prev");
    const progressBar = document.getElementById("progressBar");

    let currentStep = 0;
    let notifShowing = false;

    // ================= AUTO NUMBER STEP =================
    stepIndicators.forEach((step, index) => {
        const circle = step.querySelector(".circle");
        if (circle) {
            circle.textContent = index + 1;
        }
    });

    /* ================= FLASH MESSAGE ================= */
    if (window.flashMessages && window.flashMessages.length) {

        window.flashMessages.forEach(flash => {

            const category = flash[0];
            const message = flash[1];

            showNotification(message, category);

        });

    }

    // ================= UPDATE UI =================
    function updateStepUI() {

        // tampilkan step form
        steps.forEach((step, index) => {
            step.classList.remove("active");
            if (index === currentStep) {
                step.classList.add("active");
            }
        });

        // update stepper atas
        stepIndicators.forEach((step, index) => {

            step.classList.remove("active", "done");

            const circle = step.querySelector(".circle");

            if (index === currentStep) {

                step.classList.add("active");
                circle.textContent = index + 1;

            } else if (index < currentStep) {

                step.classList.add("done");
                circle.textContent = "";

            } else {

                circle.textContent = index + 1;

            }

        });

        // update progress bar
        const progressPercent = ((currentStep) / (steps.length - 1)) * 100;
        progressBar.style.width = progressPercent + "%";

        // auto focus input pertama
        const firstInput = steps[currentStep].querySelector("input, textarea");
        if (firstInput) {
            firstInput.focus();
        }
    }

    // ================= VALIDASI STEP =================
    function validateStep() {

        const currentFields = steps[currentStep].querySelectorAll("input, textarea");
        const dropdowns = steps[currentStep].querySelectorAll(".custom-dropdown input[type='hidden']");

        let valid = true;

        // validasi input biasa
        currentFields.forEach(field => {

            if (field.hasAttribute("required") && !field.value.trim()) {

                field.classList.add("input-error");
                valid = false;

            } else {
                field.classList.remove("input-error");
            }

        });

        // validasi dropdown
        dropdowns.forEach(field => {

            if (field.hasAttribute("required") && !field.value) {

                field.classList.add("input-error");
                valid = false;

            }

        });

        return valid;
    }

    // ================= NEXT BUTTON =================
    nextBtns.forEach(btn => {

        btn.addEventListener("click", (e) => {

            e.preventDefault();

            if (!validateStep()) {

                if(!notifShowing){
                    notifShowing = true;

                    showNotification("Wajib isi semua data", "error");

                    setTimeout(()=>{
                        notifShowing = false;
                    },1500);
                }
                return;
                
            }

            if (currentStep < steps.length - 1) {
                currentStep++;
                updateStepUI();
                window.scrollTo({ top: 0, behavior: "smooth" });
            }

        });

    });

    // ================= PREV BUTTON =================
    prevBtns.forEach(btn => {

        btn.addEventListener("click", () => {

            if (currentStep > 0) {
                currentStep--;
                updateStepUI();
                window.scrollTo({ top: 0, behavior: "smooth" });
            }

        });

    });

    // ================= ENTER KEY NEXT =================
    document.addEventListener("keypress", function(e) {

        if (e.key === "Enter") {

            const activeStep = steps[currentStep];
            const isTextarea = document.activeElement.tagName === "TEXTAREA";

            if (!isTextarea) {
                e.preventDefault();

                if (currentStep < steps.length - 1) {

                    if (validateStep()) {
                        currentStep++;
                        updateStepUI();
                    }

                }
            }

        }

    });

    // ================= REMOVE ERROR SAAT INPUT =================
    document.querySelectorAll("input, textarea").forEach(field => {

        field.addEventListener("input", () => {
            field.classList.remove("input-error");
        });

    });

    const nikInput = document.querySelector("input[name='nik']");
    const nisnInput = document.querySelector("input[name='nisn']");
    const tanggalInput = document.querySelector("#tanggal_lahir");
    const form = document.querySelector("#formTambahSiswa");

    if(!form || !nikInput || !nisnInput || !tanggalInput) return;

    /* ================= NIK ================= */
    if(nikInput){
        nikInput.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "").slice(0,16);
        });
    }

    /* ================= NISN ================= */
    if(nisnInput){
        nisnInput.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "").slice(0,10);
        });
    }

    /* ================= BATAS TANGGAL LAHIR ================= */

    const today = new Date();
    const maxYear = today.getFullYear() - 10;
    const minYear = maxYear - 15;

    const maxDate = new Date(maxYear, today.getMonth(), today.getDate());
    const minDate = new Date(minYear, today.getMonth(), today.getDate());

    function formatDate(date){
        return date.toISOString().split("T")[0];
    }

    tanggalInput.max = formatDate(maxDate);
    tanggalInput.min = formatDate(minDate);


    /* ================= VALIDASI SAAT SUBMIT ================= */

    form.addEventListener("submit", function(e){

        const birthDate = new Date(tanggalInput.value);
        const today = new Date();

        const age = today.getFullYear() - birthDate.getFullYear();

        if(!tanggalInput.value){
            showNotification("Tanggal lahir wajib diisi", "error");
            e.preventDefault();
            return;
        }

        if(age < 10 || age > 25){
            showNotification("Usia siswa tidak valid", "error");
            e.preventDefault();
            return;
        }

        if(nikInput.value.length !== 16){
            showNotification("NIK harus 16 digit angka", "error");
            e.preventDefault();
            return;
        }

        if(nisnInput.value.length !== 10){
            showNotification("NISN harus 10 digit angka", "error");
            e.preventDefault();
            return;
        }

    });

    // ================= INIT =================
    updateStepUI();

    /* ================= SET DROPDOWN VALUE (EDIT MODE) ================= */

    document.querySelectorAll(".custom-dropdown").forEach(dropdown => {

        const hiddenInput = dropdown.querySelector("input[type='hidden']");
        const selectedText = dropdown.querySelector(".selected-text");
        const options = dropdown.querySelectorAll(".dropdown-option");

        if(hiddenInput && hiddenInput.value){

            options.forEach(option => {

                if(option.dataset.value == hiddenInput.value){

                    selectedText.textContent = option.textContent;

                }

            });

        }

    });

});