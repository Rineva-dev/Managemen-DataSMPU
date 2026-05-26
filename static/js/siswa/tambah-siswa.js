document.addEventListener("DOMContentLoaded", function () {

    /* ======================================================
       DROPDOWN (punya kamu – aman)
    ====================================================== */
    const dropdowns = document.querySelectorAll(".dropdown");

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector(".dropdown-toggle");

        if (toggle) {
            toggle.addEventListener("click", function (e) {
                e.stopPropagation();

                dropdowns.forEach(d => {
                    if (d !== dropdown) d.classList.remove("active");
                });

                dropdown.classList.toggle("active");
            });
        }
    });

    document.addEventListener("click", function () {
        dropdowns.forEach(d => d.classList.remove("active"));
    });

    /* ======================================================
       FORM STEP + STEPPER
    ====================================================== */
    const steps = document.querySelectorAll(".form-step");
    const stepIndicators = document.querySelectorAll(".step");

    let currentStep = 0;

    function showStep(index) {
        steps.forEach((step, i) => {
            step.classList.toggle("active", i === index);
        });

        stepIndicators.forEach((indicator, i) => {
            indicator.classList.remove("active", "done");

            if (i < index) indicator.classList.add("done");
            if (i === index) indicator.classList.add("active");
        });
    }

    /* ======================================================
       VALIDASI STEP (MERAH JIKA KOSONG)
    ====================================================== */
    function validateStep(stepIndex) {
        let valid = true;

        const fields = steps[stepIndex].querySelectorAll(
            "input[required]:not([type='hidden']), select[required]"
        );

        fields.forEach(field => {
            const formGroup = field.closest(".form-group");
            if (!formGroup) return;

            // reset error
            formGroup.classList.remove("error");
            const oldError = formGroup.querySelector(".error-text");
            if (oldError) oldError.remove();

            // VALIDASI WAJIB
            if (!field.value.trim()) {
                valid = false;
                formGroup.classList.add("error");

                const error = document.createElement("div");
                error.className = "error-text";
                error.innerText = "Field ini wajib diisi";
                formGroup.appendChild(error);
            }

            // VALIDASI KHUSUS NISN
            if (field.name === "nisn" && field.value && field.value.length !== 10) {
                valid = false;
                formGroup.classList.add("error");

                const error = document.createElement("div");
                error.className = "error-text";
                error.innerText = "NISN harus terdiri dari 10 angka";
                formGroup.appendChild(error);
            }

            // VALIDASI TAHUN MASUK
            if (field.name === "tahun_masuk" && field.value) {
                const year = parseInt(field.value);
                const currentYear = new Date().getFullYear();

                if (year < 2000 || year > currentYear + 1) {
                    valid = false;
                    formGroup.classList.add("error");

                    const error = document.createElement("div");
                    error.className = "error-text";
                    error.innerText = "Tahun masuk tidak valid";
                    formGroup.appendChild(error);
                }
            }
        });

        return valid;
    }

    /* ======================================================
       NEXT / BACK BUTTON
    ====================================================== */
    document.addEventListener("click", function (e) {

        // NEXT
        if (e.target.classList.contains("btn-next")) {
            e.preventDefault();

            if (!validateStep(currentStep)) return;

            if (currentStep < steps.length - 1) {
                currentStep++;
                showStep(currentStep);
            }
        }

        // BACK
        if (e.target.classList.contains("btn-prev")) {
            e.preventDefault();

            if (currentStep > 0) {
                currentStep--;
                showStep(currentStep);
            }
        }
    });

    /* ======================================================
       HAPUS ERROR SAAT USER MENGETIK
    ====================================================== */
    document.addEventListener("input", function (e) {
        const field = e.target;

        if (field.matches("input, select")) {
            const formGroup = field.closest(".form-group");
            if (!formGroup) return;

            if (field.value.trim()) {
                formGroup.classList.remove("error");
                const error = formGroup.querySelector(".error-text");
                if (error) error.remove();
            }
        }
    });

    // ================= VALIDASI NISN =================
    const nisnInput = document.querySelector('input[name="nisn"]');

    if (nisnInput) {

        // hanya angka saat diketik
        nisnInput.addEventListener("input", function () {
            this.value = this.value.replace(/\D/g, "");

            const formGroup = this.closest(".form-group");
            if (!formGroup) return;

            formGroup.classList.remove("error");
            const oldError = formGroup.querySelector(".error-text");
            if (oldError) oldError.remove();

            // validasi panjang (jika ada isi)
            if (this.value && this.value.length !== 10) {
                formGroup.classList.add("error");

                const error = document.createElement("div");
                error.className = "error-text";
                error.innerText = "NISN harus terdiri dari 10 angka";

                formGroup.appendChild(error);
            }
        });
    }

    /* ======================================================
    VALIDASI SAAT SUBMIT FINAL
    ====================================================== */
    const form = document.getElementById("formTambahSiswa");
    const modal = document.getElementById("confirmModal");
    const changeList = document.getElementById("changeList");

    if (!form) return;

    // simpan data awal
    const originalData = {};

    form.querySelectorAll("input, textarea, select").forEach(el => {
        if (el.name) {
            originalData[el.name] = el.value;
        }
    });

    const submitBtn = document.getElementById("btnSubmit");

    if (submitBtn) {
        submitBtn.addEventListener("click", function (e) {

            if (!validateStep(currentStep)) {
                e.preventDefault();
                return;
            }

            e.preventDefault();

            const changes = [];

            form.querySelectorAll("input, textarea, select").forEach(el => {

                if (!el.name) return;

                const oldVal = originalData[el.name] || "";
                const newVal = el.value || "";

                if (oldVal !== newVal) {

                    const label =
                        el.closest(".form-group")?.querySelector("label")?.textContent
                        || el.name;

                    changes.push(
                        `<li><b>${label}</b>: "${oldVal}" → "${newVal}"</li>`
                    );
                }

            });

            if (changes.length === 0) {
                form.submit();
                return;
            }

            changeList.innerHTML = changes.join("");
            modal.classList.add("show");

        });
    }

    document.getElementById("cancelSave").onclick = () => {
        modal.classList.remove("show");
    };

    document.getElementById("confirmSave").onclick = () => {
        form.submit();
    };

    /* ======================================================
       INIT
    ====================================================== */
    showStep(currentStep);

});