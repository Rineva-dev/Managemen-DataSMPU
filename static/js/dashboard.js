// ==========================================
// DASHBOARD.JS
// Khusus halaman dashboard saja
// ==========================================

document.addEventListener("DOMContentLoaded", function () {
    const monthText = document.getElementById("monthText");

    const chartCanvas = document.getElementById("absensiChart");
    if (!chartCanvas) return; // 🔥 Stop kalau bukan dashboard

    const activityList = document.getElementById("activity-list");

    let myChart;
    let lastActivityId = null;
    let selectedMonth = null;
    let selectedYear = new Date().getFullYear();

    const yearDropdown = document.getElementById("yearDropdown");
    const yearSelected = document.getElementById("yearSelected");
    const yearOptions = document.getElementById("yearOptions");

    const monthDropdown = document.getElementById("monthDropdown");
    const monthSelected = document.getElementById("monthSelected");
    const monthOptions = document.getElementById("monthOptions");

    // =========================
    // HELPER
    // =========================

    function closeAllFilters() {
        yearOptions?.classList.remove("active");
        yearDropdown?.classList.remove("active");
        monthOptions?.classList.remove("active");
        monthDropdown?.classList.remove("active");
    }

    function animateCounter(element, target, duration = 800) {
        if (!element) return;

        const start = parseInt(element.textContent.replace(/\D/g, "")) || 0;
        const end = parseInt(target) || 0;

        if (start === end) return;

        const startTime = performance.now();

        element.style.transform = "scale(1.08)";
        setTimeout(() => {
            element.style.transform = "scale(1)";
        }, 200);

        function update(currentTime) {
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // 🔥 EaseOutQuart (smooth berhenti)
            const easeOut = 1 - Math.pow(1 - progress, 4);

            const value = Math.floor(start + (end - start) * easeOut);
            element.textContent = value.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    function getStatusColor(jenis) {
        if (jenis === "terlambat") return "#f6c23e";
        if (jenis === "tidak masuk") return "#ef4444";
        if (jenis === "izin_tidak_masuk") return "#ef4444";
        if (jenis === "pulang") return "#36b9cc";
        return "#1cc88a";
    }

    function formatStatus(text) {
        if (!text) return "-";

        if (text.toLowerCase() === "izin_tidak_masuk") {
            return "Tidak Masuk";
        }

        return text
            .replace(/_/g, " ")
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

        li.style.setProperty(
            "--line-gradient",
            `linear-gradient(to bottom, ${statusColor}, ${nextColor})`
        );

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

    // =========================
    // CHART CONFIG
    // =========================
    function getChartConfig() {

        // =========================
        // KHUSUS BENDAHARA
        // =========================
        if (USER_ROLE === "bendahara") {
            return {
                labels: [],
                datasets: [
                    {
                        label: "Pemasukan",
                        data: [],
                        borderColor: "#22c55e",
                        fill: true,
                        tension: 0.3,
                        borderWidth: 1
                    },
                    {
                        label: "Pengeluaran",
                        data: [],
                        borderColor: "#ef4444",
                        fill: true,
                        tension: 0.3,
                        borderWidth: 1
                    }
                ]
            };
        }

        // =========================
        // DEFAULT (SELain BENDAHARA)
        // =========================
        return {
            labels: [],
            datasets: [
                {
                    label: "Masuk",
                    data: [],
                    borderColor: "#3b82f6",
                    fill: true,
                    tension: 0.3,
                    borderWidth: 1
                },
                {
                    label: "Terlambat",
                    data: [],
                    borderColor: "#f59e0b",
                    fill: true,
                    tension: 0.3,
                    borderWidth: 1
                },
                {
                    label: "Tidak Masuk",
                    data: [],
                    borderColor: "#ef4444",
                    fill: true,
                    tension: 0.3,
                    borderWidth: 1
                }
            ]
        };
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

    const drawValueLabels = {
        id: 'drawValueLabels',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            const drawn = {};

            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (!meta || meta.hidden) return;

                meta.data.forEach((point, index) => {
                    const value = dataset.data[index];
                    if (value <= 0) return;

                    const key = `${index}-${value}`;
                    const offsetIndex = drawn[key] || 0;
                    drawn[key] = offsetIndex + 1;

                    const yOffset = 14 * offsetIndex;

                    const text = value.toString();
                    ctx.save();

                    ctx.font = '600 11px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    const paddingX = 6;
                    const paddingY = 3;
                    const textWidth = ctx.measureText(text).width;

                    const x = point.x;
                    const y = point.y - 12 - yOffset;

                    // 🎨 warna badge berdasarkan dataset
                    let bgColor = 'rgba(255, 255, 255, 0.85)';
                    let borderColor = dataset.borderColor;

                    if (dataset.label === 'Masuk') {
                        bgColor = 'rgba(59,130,246,0.18)';
                    } else if (dataset.label === 'Terlambat') {
                        bgColor = 'rgba(245,158,11,0.22)';
                    } else if (dataset.label === 'Tidak Masuk') {
                        bgColor = 'rgba(239,68,68,0.22)';
                    }

                    // 🟦 background badge
                    ctx.fillStyle = bgColor;
                    ctx.beginPath();
                    ctx.roundRect(
                        x - textWidth / 2 - paddingX,
                        y - 7,
                        textWidth + paddingX * 2, 14, 6
                    );
                    ctx.fill();

                    // ✍️ teks angka
                    ctx.fillStyle = borderColor;
                    ctx.fillText(text, x, y);

                    ctx.restore();
                });
            });
        }
    };

    function areaGradient(ctx, chartArea, hexColor) {
        if (!chartArea) return null;

        const gradient = ctx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom
        );

        // ubah hex ke rgba
        const rgb = hexColor.replace("#", "").match(/.{2}/g)
            .map(x => parseInt(x, 16))
            .join(",");

        gradient.addColorStop(0, `rgba(${rgb},0.35)`);
        gradient.addColorStop(1, `rgba(${rgb},0)`);

        return gradient;
    }

    const areaFillPlugin = {
        id: 'areaFillPlugin',
        beforeDatasetsDraw(chart) {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;

            chart.data.datasets.forEach(ds => {
                if (!ds.fill) return;

                ds.backgroundColor = areaGradient(
                    ctx,
                    chartArea,
                    ds.borderColor
                );
            });
        }
    };

    myChart = new Chart(chartCanvas, {
        type: "line",
        data: getChartConfig(),
        options: {
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            },
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 0
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
        plugins: [legendSpacing, drawValueLabels, areaFillPlugin]
    });

    function getDashboardEndpoint() {
        if (typeof USER_ROLE === "undefined") return null;

        if (USER_ROLE === "admin" || USER_ROLE === "kepala_sekolah") {
            return "/api/admin/dashboard";
        }

        if (USER_ROLE === "guru" || USER_ROLE === "wali_kelas") {
            return "/api/guru/dashboard";
        }

        if (USER_ROLE === "bendahara") {
            return "/api/bendahara/dashboard";
        }

        return null;
    }
    // =========================
    // API
    // =========================
    function loadDashboard() {
        const endpoint = getDashboardEndpoint();
        if (!endpoint) return;

        const params = new URLSearchParams({
            year: selectedYear
        });

        if (selectedMonth) {
            params.append("month", selectedMonth);
        }

        fetch(`${endpoint}?${params.toString()}`)
            .then(handleResponse)
            .then(updateUI)
            .catch(err => console.error("Dashboard error:", err.message));
    }

    function refreshDashboard() {
        const endpoint = getDashboardEndpoint();
        if (!endpoint) return;

        const params = new URLSearchParams({
            year: selectedYear
        });

        if (selectedMonth) {
            params.append("month", selectedMonth);
        }

        fetch(`${endpoint}?${params.toString()}`)
            .then(handleResponse)
            .then(updateUI)
            .catch(err => console.error("Refresh error:", err.message));
    }

    function updateUI(data) {

        // =========================
        // UPDATE CARD TOTAL (ALL ROLE SAFE)
        // =========================

        animateCounter(
            document.getElementById("totalGuru"),
            data.total_guru ?? 0
        );

        animateCounter(
            document.getElementById("totalJabatan"),
            data.total_jabatan ?? 0
        );

        animateCounter(
            document.getElementById("totalAbsensi"),
            data.total_absensi ?? data.total_absensi_pribadi ?? 0
        );

        animateCounter(
            document.getElementById("totalKelas"),
            data.total_kelas ?? 0
        );

        animateCounter(
            document.getElementById("totalLog"),
            data.total_log ?? 0
        );

        animateCounter(
            document.getElementById("totalSiswa"),
            data.total_siswa ?? 0
        );

        animateCounter(
            document.getElementById("absensi_hari_ini"),
            data.absen_hari_ini ?? 0
        );

        animateCounter(
            document.getElementById("totalPemasukan"),
            data.total_pemasukan ?? 0
        );

        animateCounter(
            document.getElementById("totalPengeluaran"),
            data.total_pengeluaran ?? 0
        );

        // =========================
        // UPDATE CHART
        // =========================

        if (data.chart) {

            if (selectedMonth) {
                myChart.data.labels = data.chart.labels;
            } else {
                myChart.data.labels = [
                    "Jan","Feb","Mar","Apr","Mei","Jun",
                    "Jul","Agu","Sep","Okt","Nov","Des"
                ];
            }

            if (USER_ROLE === "bendahara") {

                myChart.data.datasets[0].data = data.chart.pemasukan || [];
                myChart.data.datasets[1].data = data.chart.pengeluaran || [];

            } else {

                myChart.data.datasets[0].data = data.chart.masuk || [];
                myChart.data.datasets[1].data = data.chart.terlambat || [];
                myChart.data.datasets[2].data = data.chart.tidak_masuk || [];

            }

            myChart.update();
        }

        // =========================
        // UPDATE ACTIVITY
        // =========================

        if (data.activity?.length) {
            activityList.innerHTML = "";

            data.activity.forEach((item, index) => {
                const nextItem = data.activity[index + 1] || null;
                const li = createActivityItem(item, nextItem);
                activityList.appendChild(li);
            });
        }
    }

    function handleResponse(res) {
        if (!res.ok) {
            return res.text().then(text => {
                throw new Error(text || `HTTP ${res.status}`);
            });
        }
        return res.json();
    }

    // =========================
    // YEAR FILTER (AUTO 5 TAHUN)
    // =========================

    const currentYear = new Date().getFullYear();
    selectedYear = currentYear;

    const yearText = document.getElementById("yearText");
    yearOptions.innerHTML = "";

    // set default text
    yearText.textContent = currentYear;

    // generate 5 tahun terakhir
    for (let i = 0; i < 5; i++) {
        const year = currentYear - i;

        const div = document.createElement("div");
        div.className = "dropdown-option";
        div.dataset.value = year;
        div.textContent = year;

        div.addEventListener("click", () => {
            selectedYear = year;
            yearText.textContent = year;

            closeAllFilters();
            loadDashboard();
        });

        yearOptions.appendChild(div);
    }

    // toggle dropdown
    yearSelected?.addEventListener("click", (e) => {
        e.stopPropagation();

        const isOpen = yearOptions.classList.contains("active");
        closeAllFilters();

        if (!isOpen) {
            yearOptions.classList.add("active");
            yearDropdown.classList.add("active");
        }
    });

    // =========================
    // MONTH FILTER
    // =========================

    monthSelected?.addEventListener("click", (e) => {
        e.stopPropagation();

        const isOpen = monthDropdown.classList.contains("active");

        closeAllFilters();

        if (!isOpen) {
            monthOptions.classList.add("active");
            monthDropdown.classList.add("active");
        }
    });

    monthOptions?.querySelectorAll("div").forEach(opt => {
        opt.addEventListener("click", () => {
            selectedMonth = opt.dataset.value;
            monthText.textContent = opt.textContent;
            closeAllFilters();
            loadDashboard();
        });
    });

    document.addEventListener("click", closeAllFilters);

    // =========================
    // INIT
    // =========================
    loadDashboard();

    setInterval(() => {
        if (!document.hidden) {
            refreshDashboard();
        }
    }, 5000);
});