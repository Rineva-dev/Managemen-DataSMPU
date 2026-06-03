from flask import Blueprint, session, render_template, abort, request, jsonify
from utils.db import db
from utils.decorators import roles_required
from datetime import datetime, timezone, timedelta

WITA = timezone(timedelta(hours=8))

def now_wita():
    return datetime.now(WITA)

dashboard_bp = Blueprint("dashboard", __name__)

def table_exists(db_conn, table_name):
    row = db_conn.execute(
        "SELECT to_regclass(%s) AS name",
        (table_name,)
    ).fetchone()
    return row["name"] is not None

@dashboard_bp.route("/dashboard")
@roles_required("ALL_AUTHENTICATED")
def dashboard():

    role = session.get("role")
    guru_id = session.get("user_id")

    with db() as d:

        if role in ["admin", "kepala_sekolah"]:

            total_guru = d.execute("""
                SELECT COUNT(*) AS total FROM guru
                WHERE role = 'guru'
            """).fetchone()["total"]

            total_jabatan = d.execute("""
                SELECT COUNT(DISTINCT jabatan) AS total
                FROM guru
                WHERE jabatan IS NOT NULL
                AND jabatan != ''
            """).fetchone()["total"]

            total_absensi = d.execute("""
                SELECT COUNT(*) AS total FROM absensi
            """).fetchone()["total"]

            today = now_wita().date().isoformat()
            absensi_hari_ini = d.execute("""
                SELECT COUNT(DISTINCT guru_id) AS total
                FROM absensi
                WHERE tanggal = %s
                AND status IN ('masuk', 'terlambat')
            """, (today,)).fetchone()["total"]

            return render_template(
                "dashboard.html",
                active_page="dashboard",
                role=role,
                total_guru=total_guru,
                total_jabatan=total_jabatan,
                total_absensi=total_absensi,
                absensi_hari_ini=absensi_hari_ini
            )

        elif role == "guru":

            total_absensi_pribadi = d.execute("""
                SELECT COUNT(*) AS total FROM absensi
                WHERE guru_id=%s
            """, (guru_id,)).fetchone()["total"]

            return render_template(
                "dashboard.html",
                active_page="dashboard",
                role=role,
                total_absensi_pribadi=total_absensi_pribadi
            )
        
        elif role == "bendahara":

            total_siswa = d.execute("""
                SELECT COUNT(*) AS total FROM siswa
                WHERE status = 'aktif'
            """).fetchone()["total"]

            sudah_bayar = 0  # nanti aktifkan kalau tabel SPP ada
            total_penerimaan = 0
            total_pengeluaran = 0

            return render_template(
                "dashboard.html",
                active_page="dashboard",
                role=role,
                total_siswa=total_siswa,
                spp_sudah_bayar=sudah_bayar,
                total_penerimaan=total_penerimaan,
                total_pengeluaran=total_pengeluaran
            )
        
        elif role == "wali_kelas":

            # Ambil kelas yang diampu wali kelas
            kelas = d.execute("""
                SELECT id, tingkat, sub_kelas
                FROM kelas
                WHERE wali_kelas_id = %s
                LIMIT 1
            """, (guru_id,)).fetchone()

            if kelas:
                kelas = dict(kelas)

                # ✅ TOTAL SISWA DI ROMBEL
                total_siswa_kelas = d.execute("""
                    SELECT COUNT(*) AS total
                    FROM kelas_siswa
                    WHERE kelas_id = %s
                """, (kelas["id"],)).fetchone()["total"]

            else:
                total_siswa_kelas = 0

            # 🔒 DEFAULT VALUE (WAJIB AGAR HTML AMAN)
            hadir_hari_ini = 0
            tidak_hadir = 0
            belum_absen = total_siswa_kelas  # logis: belum absen semua

            return render_template(
                "dashboard.html",
                active_page="dashboard",
                role=role,
                kelas=kelas,
                total_siswa_kelas=total_siswa_kelas,
                hadir_hari_ini=hadir_hari_ini,
                tidak_hadir=tidak_hadir,
                belum_absen=belum_absen
            )

        else:
            abort(403)

@dashboard_bp.route("/api/admin/dashboard", methods=["GET"])
@roles_required("ADMIN_LEADERSHIP")
def api_admin_dashboard():
    tahun_request = request.args.get("year")
    bulan_request = request.args.get("month")

    tahun_sekarang = int(tahun_request) if tahun_request else now_wita().year
    bulan_pilih = int(bulan_request) if bulan_request and bulan_request.isdigit() else None

    with db() as d:

        # =========================
        # 1️⃣ DATA CHART PER STATUS
        # =========================
        import calendar

        labels = []
        masuk = []
        terlambat = []
        tidak_masuk = []

        # =========================
        # MODE BULAN DIPILIH → HARIAN
        # =========================
        if bulan_pilih:

            jumlah_hari = calendar.monthrange(tahun_sekarang, bulan_pilih)[1]

            for hari in range(1, jumlah_hari + 1):
                tgl = f"{tahun_sekarang}-{str(bulan_pilih).zfill(2)}-{str(hari).zfill(2)}"

                jml_masuk = d.execute("""
                    SELECT COUNT(*) AS total FROM absensi
                    WHERE tanggal = %s
                    AND status = 'masuk'
                """, (tgl,)).fetchone()["total"]

                jml_terlambat = d.execute("""
                    SELECT COUNT(*) AS total FROM absensi
                    WHERE tanggal = %s
                    AND status = 'terlambat'
                """, (tgl,)).fetchone()["total"]

                jml_tidak = d.execute("""
                    SELECT COUNT(*) AS total FROM absensi
                    WHERE tanggal = %s
                    AND status = 'izin_tidak_masuk'
                """, (tgl,)).fetchone()["total"]

                labels.append(str(hari))
                masuk.append(jml_masuk)
                terlambat.append(jml_terlambat)
                tidak_masuk.append(jml_tidak)

        # =========================
        # MODE TAHUNAN → BULANAN
        # =========================
        else:
            for bulan in range(1, 13):
                m = str(bulan).zfill(2)

                jml_masuk = d.execute("""
                    SELECT COUNT(*) AS total FROM absensi
                    WHERE EXTRACT(YEAR FROM tanggal) = %s
                    AND EXTRACT(MONTH FROM tanggal) = %s
                    AND status = 'masuk'
                """, (tahun_sekarang, bulan)).fetchone()["total"]

                jml_terlambat = d.execute("""
                    SELECT COUNT(*) AS total FROM absensi
                    WHERE EXTRACT(YEAR FROM tanggal) = %s
                    AND EXTRACT(MONTH FROM tanggal) = %s
                    AND status = 'terlambat'
                """, (tahun_sekarang, bulan)).fetchone()["total"]

                jml_tidak = d.execute("""
                    SELECT COUNT(*) AS total FROM absensi
                    WHERE EXTRACT(YEAR FROM tanggal) = %s
                    AND EXTRACT(MONTH FROM tanggal) = %s
                    AND status = 'izin_tidak_masuk'
                """, (tahun_sekarang, bulan)).fetchone()["total"]

                labels.append(str(bulan))
                masuk.append(jml_masuk)
                terlambat.append(jml_terlambat)
                tidak_masuk.append(jml_tidak)

        # =========================
        # 2️⃣ AKTIVITAS TERBARU
        # =========================
        latest = d.execute("""
            SELECT 
                g.nama,
                a.tanggal,
                a.status,
                a.jam_masuk,
                a.jam_keluar,
                a.id,
                a.updated_at
            FROM absensi a
            JOIN guru g ON a.guru_id = g.id
            ORDER BY a.updated_at DESC
            LIMIT 50
        """).fetchall()


        # =========================
        # 3️⃣ ABSENSI HARI INI
        # =========================
        today = now_wita().date().isoformat()

        absen_hari_ini = d.execute("""
            SELECT COUNT(DISTINCT guru_id) AS total
            FROM absensi
            WHERE tanggal = %s
            AND status IN ('masuk', 'terlambat')
        """, (today,)).fetchone()["total"]

        activity = []

        for r in latest:

            # =========================
            # EVENT MASUK
            # =========================
            if r["jam_masuk"]:
                try:
                    dt_masuk = datetime.strptime(
                        f"{r['tanggal']} {r['jam_masuk']}",
                        "%Y-%m-%d %H:%M:%S"
                    ).replace(tzinfo=WITA)
                except ValueError:
                    dt_masuk = datetime.strptime(
                        f"{r['tanggal']} {r['jam_masuk'][:5]}",
                        "%Y-%m-%d %H:%M"
                    ).replace(tzinfo=WITA)

                activity.append({
                    "id": f"{r['id']}-masuk",
                    "nama": r["nama"],
                    "tanggal": r["tanggal"],
                    "jenis": r["status"],
                    "jam": r["jam_masuk"],
                    "datetime": dt_masuk
                })

            # =========================
            # EVENT PULANG (BARIS BARU)
            # =========================
            if r["jam_keluar"]:
                try:
                    dt_keluar = datetime.strptime(
                        f"{r['tanggal']} {r['jam_keluar']}",
                        "%Y-%m-%d %H:%M:%S"
                    ).replace(tzinfo=WITA)
                except ValueError:
                    dt_keluar = datetime.strptime(
                        f"{r['tanggal']} {r['jam_keluar'][:5]}",
                        "%Y-%m-%d %H:%M"
                    ).replace(tzinfo=WITA)

                activity.append({
                    "id": f"{r['id']}-pulang",
                    "nama": r["nama"],
                    "tanggal": r["tanggal"],
                    "jenis": "pulang",
                    "jam": r["jam_keluar"],
                    "datetime": dt_keluar
                })

            # =========================
            # IZIN TIDAK MASUK
            # =========================
            if r["status"] == "izin_tidak_masuk" and r["updated_at"]:
                try:
                    dt_izin = datetime.fromisoformat(r["updated_at"])
                    if dt_izin.tzinfo is None:
                        dt_izin = dt_izin.replace(tzinfo=WITA)
                except:
                    continue

                activity.append({
                    "id": f"{r['id']}-izin",
                    "nama": r["nama"],
                    "tanggal": r["tanggal"],
                    "jenis": "tidak masuk",
                    "jam": "-",
                    "datetime": dt_izin
                })
                
        activity.sort(key=lambda x: x["datetime"], reverse=True)

        # Hapus field datetime sebelum dikirim ke frontend
        for a in activity:
            del a["datetime"]

        activity = activity[:7]

        # =========================
        # 4️⃣ TOTAL GURU
        # =========================
        total_guru = d.execute("""
            SELECT COUNT(*) AS total FROM guru
            WHERE role = 'guru'
        """).fetchone()["total"]

        # =========================
        # 5️⃣ TOTAL JABATAN (UNIK)
        # =========================
        total_jabatan = d.execute("""
            SELECT COUNT(DISTINCT jabatan) AS total
            FROM guru
            WHERE jabatan IS NOT NULL
            AND jabatan != ''
        """).fetchone()["total"]

        # =========================
        # 6️⃣ TOTAL ABSENSI (SEMUA DATA)
        # =========================
        total_absensi = d.execute("""
            SELECT COUNT(*) AS total FROM absensi
        """).fetchone()["total"]

        return jsonify({
            "chart": {
                "labels": labels,
                "masuk": masuk,
                "terlambat": terlambat,
                "tidak_masuk": tidak_masuk
            },
            "activity": activity,
            "absen_hari_ini": absen_hari_ini,
            "total_guru": total_guru,
            "total_jabatan": total_jabatan,
            "total_absensi": total_absensi
        })

@dashboard_bp.route("/api/bendahara/dashboard")
@roles_required("bendahara")
def api_bendahara_dashboard():

    year = request.args.get("year")
    month = request.args.get("month")

    if not year:
        year = str(now_wita().year)

    labels = []
    pemasukan = []
    pengeluaran = []

    import calendar

    with db() as d:

        # =========================
        # MODE BULAN DIPILIH → HARIAN
        # =========================
        if month:
            jumlah_hari = calendar.monthrange(int(year), int(month))[1]

            for hari in range(1, jumlah_hari + 1):
                tgl = f"{year}-{str(month).zfill(2)}-{str(hari).zfill(2)}"

                masuk = d.execute("""
                    SELECT COALESCE(SUM(jumlah), 0) AS total
                    FROM penerimaan
                    WHERE tanggal = %s
                """, (tgl,)).fetchone()["total"] if table_exists(d, "penerimaan") else 0

                keluar = d.execute("""
                    SELECT COALESCE(SUM(jumlah), 0) AS total
                    FROM pengeluaran
                    WHERE tanggal = %s
                """, (tgl,)).fetchone()["total"] if table_exists(d, "pengeluaran") else 0

                labels.append(str(hari))
                pemasukan.append(masuk)
                pengeluaran.append(keluar)

        # =========================
        # MODE TAHUNAN → BULANAN
        # =========================
        else:
            for bulan in range(1, 13):
                m = str(bulan).zfill(2)

                masuk = d.execute("""
                    SELECT COALESCE(SUM(jumlah), 0) AS total
                    FROM penerimaan
                    WHERE EXTRACT(YEAR FROM tanggal) = %s
                    AND EXTRACT(MONTH FROM tanggal) = %s
                """, (int(year), bulan)).fetchone()["total"] if table_exists(d, "penerimaan") else 0

                keluar = d.execute("""
                    SELECT COALESCE(SUM(jumlah), 0) AS total
                    FROM pengeluaran
                    WHERE EXTRACT(YEAR FROM tanggal) = %s
                    AND EXTRACT(MONTH FROM tanggal) = %s
                """, (int(year), bulan)).fetchone()["total"] if table_exists(d, "pengeluaran") else 0

                labels.append(str(bulan))
                pemasukan.append(masuk)
                pengeluaran.append(keluar)

    return jsonify({
        "chart": {
            "labels": labels,
            "pemasukan": pemasukan,
            "pengeluaran": pengeluaran
        }
    })

@dashboard_bp.route("/api/guru/dashboard")
@roles_required("guru", "wali_kelas")
def api_guru_dashboard():
    guru_id = session["user_id"]
    year = request.args.get("year")
    month = request.args.get("month")

    if not year:
        year = str(now_wita().year)

    with db() as d:

        # ======================
        # TOTAL ABSENSI PRIBADI
        # ======================
        query_total = """
            SELECT COUNT(*) AS total FROM absensi
            WHERE guru_id = %s
            AND EXTRACT(YEAR FROM tanggal::date) = %s
        """
        params = [guru_id, int(year)]

        if month:
            query_total += " AND EXTRACT(MONTH FROM tanggal::date) = %s"
            params.append(int(month))

        total_absensi = d.execute(query_total, tuple(params)).fetchone()["total"]


        # ======================
        # CHART DATA (HARIAN)
        # ======================
        import calendar

        labels = []
        masuk = []
        terlambat = []
        tidak_masuk = []

        # =========================
        # MODE BULAN DIPILIH → HARIAN
        # =========================
        if month:

            jumlah_hari = calendar.monthrange(int(year), int(month))[1]

            for hari in range(1, jumlah_hari + 1):
                tgl = f"{year}-{str(month).zfill(2)}-{str(hari).zfill(2)}"

                jml_masuk = d.execute("""
                    SELECT COUNT(*) AS total FROM absensi
                    WHERE guru_id=%s AND tanggal=%s AND status='masuk'
                """, (guru_id, tgl)).fetchone()["total"]

                jml_terlambat = d.execute("""
                    SELECT COUNT(*) AS total FROM absensi
                    WHERE guru_id=%s AND tanggal=%s AND status='terlambat'
                """, (guru_id, tgl)).fetchone()["total"]

                jml_tidak = d.execute("""
                    SELECT COUNT(*) AS total FROM absensi
                    WHERE guru_id=%s AND tanggal=%s AND status='izin_tidak_masuk'
                """, (guru_id, tgl)).fetchone()["total"]

                labels.append(str(hari))
                masuk.append(jml_masuk)
                terlambat.append(jml_terlambat)
                tidak_masuk.append(jml_tidak)

        # =========================
        # MODE TAHUNAN → BULANAN
        # =========================
        else:

            for bulan in range(1, 13):
                m = str(bulan).zfill(2)

                jml_masuk = d.execute("""
                    SELECT COUNT(*) AS total FROM absensi
                    WHERE guru_id=%s
                    AND EXTRACT(YEAR FROM tanggal::date)=%s
                    AND EXTRACT(MONTH FROM tanggal::date)=%s
                    AND status='masuk'
                """, (guru_id, int(year), bulan)).fetchone()["total"]

                jml_terlambat = d.execute("""
                    SELECT COUNT(*) AS total FROM absensi
                    WHERE guru_id=%s
                    AND EXTRACT(YEAR FROM tanggal::date)=%s
                    AND EXTRACT(MONTH FROM tanggal::date)=%s
                    AND status='terlambat'
                """, (guru_id, int(year), bulan)).fetchone()["total"]

                jml_tidak = d.execute("""
                    SELECT COUNT(*) AS total FROM absensi
                    WHERE guru_id=%s
                    AND EXTRACT(YEAR FROM tanggal::date)=%s
                    AND EXTRACT(MONTH FROM tanggal::date)=%s
                    AND status='izin_tidak_masuk'
                """, (guru_id, int(year), bulan)).fetchone()["total"]

                labels.append(str(bulan))
                masuk.append(jml_masuk)
                terlambat.append(jml_terlambat)
                tidak_masuk.append(jml_tidak)

        # ======================
        # ACTIVITY TERBARU (GURU)
        # ======================
        activity_rows = d.execute("""
            SELECT tanggal, status, jam_masuk, jam_keluar, updated_at, id
            FROM absensi
            WHERE guru_id = %s
            ORDER BY updated_at DESC
            LIMIT 50
        """, (guru_id,)).fetchall()

        activity = []

        for a in activity_rows:

            # =========================
            # EVENT MASUK / TERLAMBAT
            # =========================
            if a["jam_masuk"]:
                try:
                    dt_masuk = datetime.strptime(
                        f"{a['tanggal']} {a['jam_masuk']}",
                        "%Y-%m-%d %H:%M:%S"
                    ).replace(tzinfo=WITA)
                except ValueError:
                    dt_masuk = datetime.strptime(
                        f"{a['tanggal']} {a['jam_masuk'][:5]}",
                        "%Y-%m-%d %H:%M"
                    ).replace(tzinfo=WITA)

                activity.append({
                    "id": f"{a['id']}-masuk",
                    "nama": session.get("nama", "Saya"),
                    "tanggal": a["tanggal"],
                    "jenis": a["status"],  # masuk / terlambat
                    "jam": a["jam_masuk"],
                    "datetime": dt_masuk
                })

            # =========================
            # EVENT PULANG
            # =========================
            if a["jam_keluar"]:
                try:
                    dt_keluar = datetime.strptime(
                        f"{a['tanggal']} {a['jam_keluar']}",
                        "%Y-%m-%d %H:%M:%S"
                    ).replace(tzinfo=WITA)
                except ValueError:
                    dt_keluar = datetime.strptime(
                        f"{a['tanggal']} {a['jam_keluar'][:5]}",
                        "%Y-%m-%d %H:%M"
                    ).replace(tzinfo=WITA)

                activity.append({
                    "id": f"{a['id']}-pulang",
                    "nama": session.get("nama", "Saya"),
                    "tanggal": a["tanggal"],
                    "jenis": "pulang",
                    "jam": a["jam_keluar"],
                    "datetime": dt_keluar
                })

            # =========================
            # IZIN TIDAK MASUK
            # =========================
            if a["status"] == "izin_tidak_masuk" and a["updated_at"]:
                try:
                    dt_izin = datetime.fromisoformat(a["updated_at"])
                    if dt_izin.tzinfo is None:
                        dt_izin = dt_izin.replace(tzinfo=WITA)
                except:
                    continue

                activity.append({
                    "id": f"{a['id']}-izin",
                    "nama": session.get("nama", "Saya"),
                    "tanggal": a["tanggal"],
                    "jenis": "tidak masuk",
                    "jam": "-",
                    "datetime": dt_izin
                })

        # =========================
        # SORT & LIMIT (KUNCI!)
        # =========================
        activity.sort(key=lambda x: x["datetime"], reverse=True)

        for a in activity:
            del a["datetime"]

        activity = activity[:7]

    return jsonify({
        "total_kelas": 0,
        "total_log": 0,
        "total_absensi_pribadi": total_absensi,
        "total_siswa": 0,
        "absen_hari_ini": 0,
        "chart": {
            "labels": labels,
            "masuk": masuk,
            "terlambat": terlambat,
            "tidak_masuk": tidak_masuk
        },
        "activity": activity
    })
