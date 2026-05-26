// ================================
// main.js
// Navigation, Sidebar, Dropdown, Logout
// ================================
// ==================================
// SMART GLOBAL LOADER SYSTEM (FIXED)
// ==================================

let loaderTimer = null;
let activeRequests = 0;

function getLoader() {
    return document.getElementById("globalLoader");
}

function showLoader() {
    loaderTimer = setTimeout(() => {
        getLoader()?.classList.remove("hidden");
    }, 300);
}

function hideLoader() {
    clearTimeout(loaderTimer);
    getLoader()?.classList.add("hidden");
}

// ================================
// CSRF GLOBAL TOKEN
// ================================
const csrfMeta = document.querySelector('meta[name="csrf-token"]');
const csrfToken = csrfMeta ? csrfMeta.getAttribute("content") : null;

const originalFetch = window.fetch;

window.fetch = function (url, options = {}) {

    options.headers = options.headers || {};

    if (csrfToken && (!options.method || options.method.toUpperCase() !== "GET")) {
        options.headers["X-CSRFToken"] = csrfToken;
    }

    activeRequests++;

    if (activeRequests === 1) {
        showLoader();
    }

    return originalFetch(url, options)
        .then(response => {

            activeRequests = Math.max(activeRequests - 1, 0);

            if (!response.ok) {
                console.error("Server error:", response.status);
                if (activeRequests === 0) hideLoader();
                return response;
            }

            if (activeRequests === 0) {
                hideLoader();
            }

            return response;
        })
        .catch(error => {

            console.error("Network error:", error);

            if (navigator.onLine) {
                hideLoader();
            }

            return Promise.reject(error);
        });
};

window.addEventListener("offline", () => {
    const loader = getLoader();
    loader?.classList.remove("hidden");

    const text = loader?.querySelector("p");
    if (text) text.textContent = "Koneksi terputus...";
});

window.addEventListener("online", () => {
    const loader = getLoader();
    const text = loader?.querySelector("p");

    if (text) text.textContent = "Memuat data...";

    hideLoader();
});

function closeAllFilters() {
    document.getElementById("yearOptions")?.classList.remove("active");
    document.getElementById("yearDropdown")?.classList.remove("active");

    document.getElementById("monthOptions")?.classList.remove("active");
    document.getElementById("monthDropdown")?.classList.remove("active");
}

document.querySelectorAll(".custom-dropdown").forEach(dropdown => {
    const selected = dropdown.querySelector(".dropdown-selected");
    const options = dropdown.querySelector(".dropdown-options");
    const hiddenInput = dropdown.parentElement.querySelector("input[type='hidden']");

    selected.addEventListener("click", (e) => {
        e.stopPropagation();

        if (dropdown.classList.contains("disabled")) return;

        const isOpen = dropdown.classList.contains("active");

        // 🔥 Tutup SEMUA custom dropdown dulu
        document.querySelectorAll(".custom-dropdown").forEach(d => {
            d.classList.remove("active");
            d.querySelector(".dropdown-options")?.classList.remove("active");
        });

        // 🔥 Kalau tadi tertutup → buka lagi
        if (!isOpen) {
            dropdown.classList.add("active");
            options.classList.add("active");
        }
    });

    options.querySelectorAll(".dropdown-option").forEach(option => {
        option.addEventListener("click", (e) => {
            e.stopPropagation();

            selected.querySelector(".selected-text").textContent =
                option.textContent;

            if (hiddenInput) {
                hiddenInput.value = option.dataset.value;
            }

            dropdown.classList.remove("active");
            options.classList.remove("active");
        });
    });
});

document.addEventListener("DOMContentLoaded", function () {
    // ================================
    // ELEMENT
    // ================================
    const sidebarLinks = document.querySelectorAll('.sidebar a, .bottom-nav a');
    const dropbtn = document.querySelector('.dropbtn');
    const userDropdown = document.querySelector('.user-dropdown');
    const dropdownContent = document.querySelector('.dropdown-content');

    const logoutBtn = document.querySelector('.logout');
    const sidebarLogoutBtn = document.getElementById('sidebar-logout');

    const yearDropdown = document.getElementById("yearDropdown");
    const yearSelected = document.getElementById("yearSelected");
    const yearOptions = document.getElementById("yearOptions");

    const chartCanvas = document.getElementById("absensiChart");
    const activityList = document.getElementById("activity-list");
    
    let myChart;
    let lastActivityId = null;
    let selectedMonth = "";
    if (!chartCanvas) {
        // =========================
        // BUAT CHART SEKALI SAJA
        // =========================
        myChart = new Chart(chartCanvas, {
            type: "line",
            data: {
                labels: [
                    "Jan","Feb","Mar","Apr","Mei","Jun",
                    "Jul","Agu","Sep","Okt","Nov","Des"
                ],
                datasets: [
                {
                    label: "Masuk",
                    data: Array(12).fill(0),
                    borderColor: "#3b82f6",
                    fill: true,
                    tension: 0.3,
                    borderWidth: 1,
                    backgroundColor: function(context) {
                        const {ctx, chartArea} = context.chart;
                        if (!chartArea) return null;

                        const gradient = ctx.createLinearGradient(
                            0,
                            chartArea.bottom,
                            0,
                            chartArea.top
                        );

                        gradient.addColorStop(0, "rgba(255,255,255,0.05)");
                        gradient.addColorStop(1, "rgba(59,130,246,0.25)");

                        return gradient;
                    }
                },
                {
                    label: "Terlambat",
                    data: Array(12).fill(0),
                    borderColor: "#f59e0b",
                    fill: true,
                    tension: 0.3,
                    borderWidth: 1,
                    backgroundColor: function(context) {
                        const {ctx, chartArea} = context.chart;
                        if (!chartArea) return null;

                        const gradient = ctx.createLinearGradient(
                            0,
                            chartArea.bottom,
                            0,
                            chartArea.top
                        );

                        gradient.addColorStop(0, "rgba(255,255,255,0.05)");
                        gradient.addColorStop(1, "rgba(245,158,11,0.25)");

                        return gradient;
                    }
                },
                {
                    label: "Tidak Masuk",
                    data: Array(12).fill(0),
                    borderColor: "#ef4444",
                    fill: true,
                    tension: 0.3,
                    borderWidth: 1,
                    backgroundColor: function(context) {
                        const {ctx, chartArea} = context.chart;
                        if (!chartArea) return null;

                        const gradient = ctx.createLinearGradient(
                            0,
                            chartArea.bottom,
                            0,
                            chartArea.top
                        );

                        gradient.addColorStop(0, "rgba(255,255,255,0.05)");
                        gradient.addColorStop(1, "rgba(239,68,68,0.25)");

                        return gradient;
                    }
                }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 0   // tambah jarak antara legend dan grafik
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            padding: 25,
                            boxWidth: 8,
                            boxHeight: 8,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: true },
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 20
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { display: false },
                        border: { display: true },
                        suggestedMax: 5,
                        ticks: {
                            precision: 0,
                            maxTicksLimit: 5,
                            callback: function(value) {
                                if (Number.isInteger(value)) {
                                    return value;
                                }
                            }
                        }
                    }
                }
            },
            plugins: [legendSpacing, drawValueLabels]
        });
    }

    const legendSpacing = {
        id: 'legendSpacing',
        beforeInit(chart) {
            const originalFit = chart.legend.fit;
            chart.legend.fit = function fit() {
                originalFit.bind(chart.legend)();
                this.height += 35;
            }
        }
    };

    let selectedYear = new Date().getFullYear();
    if (yearSelected) {
        yearSelected.childNodes[0].nodeValue = selectedYear;
    }

    const monthDropdown = document.getElementById("monthDropdown");
    const monthSelected = document.getElementById("monthSelected");
    const monthOptions = document.getElementById("monthOptions");

    monthSelected.addEventListener("click", (e) => {
        e.stopPropagation();

        const isOpen = monthDropdown.classList.contains("active");

        closeAllFilters();

        if (!isOpen) {
            monthOptions.classList.add("active");
            monthDropdown.classList.add("active");
        }
    });

    monthOptions.querySelectorAll("div").forEach(opt => {
        opt.addEventListener("click", (e) => {
            e.stopPropagation();
            selectedMonth = opt.dataset.value;
            monthSelected.childNodes[0].nodeValue = opt.textContent;

            monthOptions.classList.remove("active");
            monthDropdown.classList.remove("active");

            closeAllFilters();
            loadDashboard(); // 🔥 refresh chart
        });
    });

    document.addEventListener("click", (e) => {

        // Tutup custom dropdown kalau klik di luar
        if (!e.target.closest(".custom-dropdown")) {
            document.querySelectorAll(".custom-dropdown").forEach(d => {
                d.classList.remove("active");
                d.querySelector(".dropdown-options")?.classList.remove("active");
            });
        }

        // Tutup year/month dashboard kalau klik di luar
        if (!e.target.closest("#yearDropdown") &&
            !e.target.closest("#monthDropdown")) {
            closeAllFilters();
        }
    });

    const drawValueLabels = {
        id: 'drawValueLabels',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            const points = [];

            // 1️⃣ Ambil semua titik > 0
            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (!meta || meta.hidden) return;

                meta.data.forEach((point, index) => {
                    const value = dataset.data[index];
                    if (value <= 0) return;

                    points.push({
                        x: point.x,
                        y: point.y,
                        value,
                        color: dataset.borderColor
                    });
                });
            });

            // 2️⃣ Grouping berdasarkan X & Y
            const groups = [];
            const THRESHOLD_X = 12; // px (tanggal sama)
            const THRESHOLD_Y = 6;  // px (tinggi hampir sama)

            points.forEach(p => {
                let group = groups.find(g =>
                    Math.abs(g[0].x - p.x) <= THRESHOLD_X &&
                    Math.abs(g[0].y - p.y) <= THRESHOLD_Y
                );

                if (group) group.push(p);
                else groups.push([p]);
            });

            // 3️⃣ Render badge
            groups.forEach(group => {
                const spacingX = 6;
                const spacingY = 20;

                group.forEach((p, index) => {
                    const text = `${p.value}`;
                    ctx.save();
                    ctx.font = '600 11px Inter, system-ui, sans-serif';

                    const paddingX = 8;
                    const boxHeight = 18;
                    const textWidth = ctx.measureText(text).width;
                    const boxWidth = textWidth + paddingX * 2;

                    // ⬅️➡️ Berdampingan kecil
                    const offsetX =
                        (index - (group.length - 1) / 2) * (boxWidth + spacingX);

                    // ⬇️ Kalau masih banyak, turun baris
                    const row = Math.floor(index / 3);
                    const offsetY = row * spacingY;

                    const x = p.x + offsetX;
                    const y = p.y - 1 + offsetY;

                    // Shadow
                    ctx.shadowColor = 'rgba(0,0,0,0.08)';
                    ctx.shadowBlur = 3;
                    ctx.shadowOffsetY = 1;

                    // Background
                    ctx.fillStyle = 'rgba(255,255,255,0.9)';
                    ctx.beginPath();
                    ctx.roundRect(
                        x - boxWidth / 2,
                        y - boxHeight,
                        boxWidth,
                        boxHeight,
                        8
                    );
                    ctx.fill();

                    // Border
                    ctx.shadowColor = 'transparent';
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    // Text
                    ctx.fillStyle = p.color;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(text, x, y - boxHeight / 2);

                    ctx.restore();
                });
            });
        }
    };

    let resizeTimeout;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (myChart) myChart.resize();
        }, 150);
    });

    loadDashboard();
        setInterval(() => {
        if (!document.hidden) {
            refreshDashboard();
        }
    }, 5000);

    function animateCounter(element, target) {
        let current = parseInt(element.textContent) || 0;
        if (current === target) return;

        const step = target > current ? 1 : -1;

        const interval = setInterval(() => {
            current += step;
            element.textContent = current;

            if (current === target) clearInterval(interval);
        }, 20);
    }

    function getStatusColor(jenis) {
        if (jenis === "terlambat") return "#f6c23e";
        if (jenis === "tidak masuk") return "#ef4444";
        if (jenis === "pulang") return "#36b9cc";
        return "#1cc88a"; // masuk default
    }

    function formatStatus(text) {
        return text
            .toLowerCase()
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    function createActivityItem(item, nextItem = null, animate = false) {

        const statusColor = getStatusColor(item.jenis);
        const nextColor = nextItem ? getStatusColor(nextItem.jenis) : statusColor;

        const li = document.createElement("li");

        li.className = `activity-item ${animate ? "fade-in" : ""}`;

        // SET GRADIENT LINE
        li.style.setProperty(
            "--line-gradient",
            `linear-gradient(to bottom, ${statusColor}, ${nextColor})`
        );

        // SET DOT COLOR
        li.style.setProperty("--dot-color", statusColor);
        li.innerHTML = `
            <div class="activity-content">
                <div class="activity-name">
                    ${item.nama} • 
                    <span style="color:${statusColor}">
                        ${formatStatus(item.jenis)}
                    </span>
                </div>
                <div class="activity-detail">
                    ${item.tanggal} • ${item.jam}
                </div>
            </div>
        `;
        return li;
    }

    function loadDashboard() {
        fetch(`/api/admin/dashboard?year=${selectedYear}&month=${selectedMonth}`)
            .then(res => res.json())
            .then(updateUI)
            .catch(err => console.error("Dashboard error:", err));
    }

    function refreshDashboard() {
        fetch(`/api/admin/dashboard?year=${selectedYear}&month=${selectedMonth}`)
            .then(res => res.json())
            .then(updateUI)
            .catch(err => console.error("Refresh error:", err));
    }
    
    function updateUI(data) {
        const absenHariIniEl = document.getElementById("absen-hari-ini");
        if (absenHariIniEl) {
            animateCounter(absenHariIniEl, data.absen_hari_ini);
        }

        // 🔥 SET LABEL DINAMIS
        if (selectedMonth) {
            // MODE BULAN → HARIAN
            myChart.data.labels = data.chart.labels; // ["1","2","3",...]
        } else {
            // MODE TAHUNAN
            myChart.data.labels = [
                "Jan","Feb","Mar","Apr","Mei","Jun",
                "Jul","Agu","Sep","Okt","Nov","Des"
            ];
        }

        // 🔥 RESET DATASET TOTAL
        myChart.data.datasets[0].data = data.chart.masuk;
        myChart.data.datasets[1].data = data.chart.terlambat;
        myChart.data.datasets[2].data = data.chart.tidak_masuk;

        myChart.update();

        if (selectedMonth) {
            myChart.options.scales.x.title = {
                display: true,
                text: "Tanggal"
            };
        } else {
            myChart.options.scales.x.title = {
                display: false
            };
        }

        // ===== ACTIVITY (TETAP) =====
        if (data.activity.length > 0) {
            const newest = data.activity[0];

            if (!lastActivityId) {
                activityList.innerHTML = "";

                data.activity.forEach((item, index) => {
                    const nextItem = data.activity[index + 1] || null;
                    const li = createActivityItem(item, nextItem);
                    activityList.appendChild(li);
                });

                lastActivityId = String(newest.id);
            } else if (String(newest.id) !== String(lastActivityId)) {

                lastActivityId = String(newest.id);

                const second = data.activity[1] || null;
                const li = createActivityItem(newest, second, true);
                activityList.prepend(li);

                if (activityList.children.length > 10) {
                    activityList.removeChild(activityList.lastChild);
                }
            }
        }
    }

    const currentYear = new Date().getFullYear();

    // generate 5 tahun terakhir
    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;

        const div = document.createElement("div");
        div.className = "year-option";
        div.textContent = year;

        div.addEventListener("click", () => {
            selectedYear = year;

            yearSelected.childNodes[0].nodeValue = year;

            yearOptions.classList.remove("active");
            yearDropdown.classList.remove("active");

            closeAllFilters();
            lastActivityId = null;

            loadDashboard();
        });

        yearOptions.appendChild(div);
    }

    // toggle dropdown
    yearSelected.addEventListener("click", (e) => {
        e.stopPropagation();

        const isOpen = yearDropdown.classList.contains("active");

        closeAllFilters();

        if (!isOpen) {
            yearOptions.classList.add("active");
            yearDropdown.classList.add("active");
        }
    });

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && activeRequests === 0) {
            hideLoader();
        }
    });

    // ================================
    // DROPDOWN USER
    // ================================
    if (dropbtn && dropdownContent) {
        dropbtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownContent.classList.toggle('show');
        });
    }

    if (dropdownContent) {
        dropdownContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Tutup dropdown jika klik di luar
    window.addEventListener('click', (e) => {
        if (userDropdown && !userDropdown.contains(e.target)) {
            dropdownContent?.classList.remove('show');
        }
    });

    // ================================
    // LOGOUT DROPDOWN
    // ================================
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('activeMenu');
            window.location.href = '/logout';
        });
    }

    // ================================
    // LOGOUT SIDEBAR
    // ================================
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('activeMenu');
            window.location.href = '/logout';
        });
    }

    const hamburger = document.querySelector(".hamburger");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebar-overlay");

    // Toggle sidebar
    hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("active");
        overlay.classList.toggle("active");
    });

    // Klik di luar sidebar
    overlay.addEventListener("click", () => {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    });

    let touchStartX = 0;
    let touchEndX = 0;

    // Saat mulai sentuh
    sidebar.addEventListener("touchstart", e => {
        touchStartX = e.changedTouches[0].screenX;
    });

    // Saat selesai sentuh
    sidebar.addEventListener("touchend", e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        const swipeDistance = touchStartX - touchEndX;

        // swipe kiri minimal 80px
        if (swipeDistance > 80) {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        }
    }

    overlay.addEventListener("click", () => {
        console.log("OVERLAY CLICKED");
    });

});

function showConfirm({ message, onYes, yesText = "Yes", noText = "Cancel" }) {

    // Hapus modal lama kalau ada
    const oldModal = document.querySelector('.confirm-modal');
    if (oldModal) oldModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal show';

    const box = document.createElement('div');
    box.className = 'confirm-box';

    box.innerHTML = `
        <p>${message}</p>
        <div class="confirm-actions">
            <button class="btn-modern confirm-yes danger">${yesText}</button>
            <button class="btn-modern confirm-no">${noText}</button>
        </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();

    box.querySelector('.confirm-yes').addEventListener('click', () => {
        closeModal();
        if (onYes) onYes();
    });

    box.querySelector('.confirm-no').addEventListener('click', closeModal);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    const escHandler = (e) => {
        if (e.key === "Escape") {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };

    document.addEventListener('keydown', escHandler);
}
