from flask import Blueprint, render_template, request, jsonify
from utils.db import db
from datetime import datetime
from routes.mapel_routes import seed_mapel_kegiatan


kelas_bp = Blueprint("kelas", __name__, url_prefix="/sekolah/kelas")


# ==============================
# HALAMAN UTAMA KELAS
# ==============================
@kelas_bp.route("/")
def index():

    tahun_id = request.args.get("tahun_id")
    today = datetime.now().date()

    with db() as d:
        cek = d.execute("SELECT * FROM kelas_siswa").fetchall()
        print("ISI KELAS_SISWA:", [dict(x) for x in cek])
        # 🔥 Ambil semua tahun pelajaran (TANPA status)
        tahun_list = d.execute("""
            SELECT id, tahun_pelajaran, semester,
                    semester_mulai, semester_akhir
            FROM tahun_pelajaran
            ORDER BY semester_mulai DESC
        """).fetchall()
        
        print("DEBUG TAHUN LIST:", [dict(t) for t in tahun_list])

        # 🔥 Jika tidak ada parameter → ambil yang aktif berdasarkan tanggal
        if not tahun_id:
            aktif = d.execute("""
                SELECT id
                FROM tahun_pelajaran
                WHERE semester_mulai <= ?
                AND semester_akhir >= ?
                LIMIT 1
            """, (today, today)).fetchone()

            tahun_id = aktif["id"] if aktif else None

        # 🔥 Tentukan apakah tahun terpilih aktif
        tahun_aktif = False

        if tahun_id:
            row = d.execute("""
                SELECT semester_mulai, semester_akhir
                FROM tahun_pelajaran
                WHERE id = ?
            """, (tahun_id,)).fetchone()

            if row:
                mulai = datetime.strptime(row["semester_mulai"], "%Y-%m-%d").date()
                akhir = datetime.strptime(row["semester_akhir"], "%Y-%m-%d").date()

                if mulai <= today <= akhir:
                    tahun_aktif = True
                    
                print("TAHUN_ID:", tahun_id)
                print("TAHUN_AKTIF:", tahun_aktif)

        # ==============================
        # DATA KELAS
        # ==============================
        kelas_list = []
        total_data = 0

        if tahun_id:
            kelas_list = d.execute("""
                SELECT 
                    k.id,
                    k.tingkat,
                    k.sub_kelas,
                    g.nama AS wali_nama,

                    (
                        SELECT COUNT(*)
                        FROM kelas_siswa ks
                        WHERE ks.kelas_id = k.id
                    ) AS total_siswa

                FROM kelas k

                LEFT JOIN guru g 
                    ON g.id = k.wali_kelas_id

                WHERE k.tahun_pelajaran_id = ?

                ORDER BY k.tingkat ASC, k.sub_kelas ASC
            """, (tahun_id,)).fetchall()

            kelas_list = [dict(k) for k in kelas_list]

            total_data = len(kelas_list)

        # ==============================
        # DAFTAR WALI KELAS
        # ==============================
        wali_list = d.execute("""
            SELECT g.id, g.nama
            FROM guru g

            LEFT JOIN kelas k
                ON g.id = k.wali_kelas_id
                AND k.tahun_pelajaran_id = ?

            WHERE g.jabatan = 'wali_kelas'
            AND k.id IS NULL

            ORDER BY g.nama ASC
        """, (tahun_id,)).fetchall()

    return render_template(
        "sekolah/kelas.html",
        active_page="kelas",
        tahun_list=tahun_list,
        tahun_terpilih=int(tahun_id) if tahun_id else None,
        tahun_aktif=tahun_aktif,
        kelas_list=kelas_list,
        wali_list=wali_list,
        total_data=total_data
    )

# ==============================
# CREATE
# ==============================
@kelas_bp.route("/create", methods=["POST"])
def create_kelas():

    data = request.get_json()
    today = datetime.now().date()

    tahun_id = data.get("tahun_id")
    tingkat = data.get("tingkat")
    sub_kelas = data.get("sub_kelas")
    wali_kelas_id = data.get("wali_kelas_id")

    with db() as d:

        # 🔥 Validasi tahun aktif berdasarkan tanggal
        cek = d.execute("""
            SELECT semester_mulai, semester_akhir
            FROM tahun_pelajaran
            WHERE id=?
        """, (tahun_id,)).fetchone()

        if not cek:
            return jsonify({"success": False, "message": "Tahun tidak ditemukan."})

        mulai = datetime.strptime(cek["semester_mulai"], "%Y-%m-%d").date()
        akhir = datetime.strptime(cek["semester_akhir"], "%Y-%m-%d").date()

        if not (mulai <= today <= akhir):
            return jsonify({
                "success": False,
                "message": "Tahun pelajaran tidak aktif."
            })

        # 🔥 Cek duplikat
        duplikat = d.execute("""
            SELECT id FROM kelas
            WHERE tingkat=? AND sub_kelas=? AND tahun_pelajaran_id=?
        """, (tingkat, sub_kelas, tahun_id)).fetchone()

        if wali_kelas_id:

            wali_dipakai = d.execute("""
                SELECT id
                FROM kelas
                WHERE wali_kelas_id = ?
                AND tahun_pelajaran_id = ?
            """, (wali_kelas_id, tahun_id)).fetchone()

            if wali_dipakai:
                return jsonify({
                    "success": False,
                    "message": "Guru ini sudah menjadi wali kelas lain."
                })

        if duplikat:
            return jsonify({
                "success": False,
                "message": "Kelas sudah ada."
            })

        # 🔥 Insert
        d.execute("""
            INSERT INTO kelas (tingkat, sub_kelas, tahun_pelajaran_id, wali_kelas_id)
            VALUES (?, ?, ?, ?)
        """, (tingkat, sub_kelas, tahun_id, wali_kelas_id))

        d.commit()

    return jsonify({"success": True})


# ==============================
# UPDATE
# ==============================
@kelas_bp.route("/update/<int:id>", methods=["POST"])
def update_kelas(id):

    data = request.get_json()
    today = datetime.now().date()

    tahun_id = data.get("tahun_id")
    tingkat = data.get("tingkat")
    sub_kelas = data.get("sub_kelas")
    wali_kelas_id = data.get("wali_kelas_id")

    with db() as d:

        # 🔥 Validasi tahun aktif (SAMA seperti create)
        cek = d.execute("""
            SELECT semester_mulai, semester_akhir
            FROM tahun_pelajaran
            WHERE id=?
        """, (tahun_id,)).fetchone()

        if not cek:
            return jsonify({"success": False, "message": "Tahun tidak ditemukan."})

        mulai = datetime.strptime(cek["semester_mulai"], "%Y-%m-%d").date()
        akhir = datetime.strptime(cek["semester_akhir"], "%Y-%m-%d").date()

        if not (mulai <= today <= akhir):
            return jsonify({
                "success": False,
                "message": "Tahun pelajaran tidak aktif."
            })
        
        if wali_kelas_id:

            wali_dipakai = d.execute("""
                SELECT id
                FROM kelas
                WHERE wali_kelas_id = ?
                AND tahun_pelajaran_id = ?
                AND id != ?
            """, (wali_kelas_id, tahun_id, id)).fetchone()

            if wali_dipakai:
                return jsonify({
                    "success": False,
                    "message": "Guru ini sudah menjadi wali kelas lain."
                })

        # 🔥 Update
        d.execute("""
            UPDATE kelas
            SET tingkat=?, sub_kelas=?, wali_kelas_id=?
            WHERE id=?
        """, (tingkat, sub_kelas, wali_kelas_id, id))

        d.commit()

    return jsonify({"success": True})

@kelas_bp.route("/delete/<int:id>", methods=["POST"])
def delete_kelas(id):

    with db() as d:
        row = d.execute("PRAGMA database_list").fetchall()
        print("DB PATH:", row)

        cols = d.execute("PRAGMA table_info(kelas_siswa)").fetchall()
        print("STRUKTUR:", [dict(c) for c in cols])

        # 🔥 Cek apakah masih ada siswa
        siswa = d.execute("""
            SELECT 1 FROM kelas_siswa
            WHERE kelas_id = ?
            LIMIT 1
        """, (id,)).fetchone()

        if siswa:
            return jsonify({
                "success": False,
                "message": "Kelas tidak bisa dihapus karena masih memiliki siswa."
            })

        d.execute("DELETE FROM kelas WHERE id = ?", (id,))
        d.commit()

    return jsonify({"success": True})

# ==============================
# DETAIL
# ==============================
@kelas_bp.route("/detail/<int:id>")
def detail_kelas(id):

    with db() as d:
        kelas = d.execute("""
            SELECT id, tingkat, sub_kelas, wali_kelas_id
            FROM kelas
            WHERE id=?
        """, (id,)).fetchone()

    if not kelas:
        return jsonify({"success": False})

    return jsonify({
        "success": True,
        "kelas": {
            "id": kelas["id"],
            "tingkat": kelas["tingkat"],
            "sub_kelas": kelas["sub_kelas"],
            "wali_kelas_id": kelas["wali_kelas_id"]
        }
    })

# ==============================
# DATA ROMBEL SISWA
# ==============================
@kelas_bp.route("/rombel/<int:kelas_id>")
def rombel_data(kelas_id):

    with db() as d:

        # ======================
        # 1. AMBIL DATA KELAS
        # ======================
        kelas = d.execute("""
            SELECT tingkat, tahun_pelajaran_id
            FROM kelas
            WHERE id = ?
        """, (kelas_id,)).fetchone()

        if not kelas:
            return jsonify({
                "success": False,
                "message": "Kelas tidak ditemukan"
            })

        tingkat = kelas["tingkat"]
        tahun_id = kelas["tahun_pelajaran_id"]

        # ======================
        # 2. SISWA DALAM KELAS
        # ======================
        siswa_kelas = d.execute("""
            SELECT s.id, s.nama, s.nis
            FROM siswa s
            JOIN kelas_siswa ks ON ks.siswa_id = s.id
            WHERE ks.kelas_id = ?
            ORDER BY s.nama ASC
        """, (kelas_id,)).fetchall()

        # ======================
        # 3. SISWA AVAILABLE (FILTER TINGKAT)
        # ======================
        siswa_available = d.execute("""
            SELECT s.id, s.nama, s.nis
            FROM siswa s
            WHERE s.status = 'aktif'
            AND s.tingkat_default = ?
            AND s.id NOT IN (
                SELECT ks.siswa_id
                FROM kelas_siswa ks
                JOIN kelas k ON k.id = ks.kelas_id
                WHERE k.tahun_pelajaran_id = ?
            )
            ORDER BY s.nama ASC
        """, (tingkat, tahun_id)).fetchall()

    return jsonify({
        "success": True,
        "siswa_kelas": [dict(x) for x in siswa_kelas],
        "siswa_available": [dict(x) for x in siswa_available]
    })

# ==============================
# UPDATE ROMBEL SISWA
# ==============================
@kelas_bp.route("/update-rombel", methods=["POST"])
def update_rombel():

    data = request.get_json()

    kelas_id = data.get("kelas_id")
    siswa_ids = data.get("siswa_ids", [])

    with db() as d:

        # hapus siswa lama dari kelas ini
        d.execute("""
            DELETE FROM kelas_siswa
            WHERE kelas_id = ?
        """, (kelas_id,))

        # insert ulang
        for siswa_id in siswa_ids:

            d.execute("""
                INSERT INTO kelas_siswa (kelas_id, siswa_id)
                VALUES (?, ?)
            """, (kelas_id, siswa_id))

        d.commit()

    return jsonify({"success": True})

# ==============================
# GET SISWA DALAM KELAS (PANEL KANAN)
# ==============================
@kelas_bp.route("/<int:kelas_id>/siswa")
def get_siswa_kelas(kelas_id):

    with db() as d:

        rows = d.execute("""
            SELECT 
                s.id,
                s.nama,
                s.nisn,
                s.status_masuk
            FROM kelas_siswa ks
            JOIN siswa s ON s.id = ks.siswa_id
            WHERE ks.kelas_id = ?
            ORDER BY s.nama ASC
        """, (kelas_id,)).fetchall()

    return jsonify([dict(r) for r in rows])

# ==============================
# GET MAPEL PER KELAS
# ==============================
@kelas_bp.route("/api/<int:kelas_id>/mapel")
def get_mapel_kelas(kelas_id):

    seed_mapel_kegiatan()

    with db() as d:

        # daftar mapel
        mapel = d.execute("""
            SELECT id, nama, jenis
            FROM mata_pelajaran
            WHERE jenis IN ('wajib', 'mulok', 'kegiatan')
            ORDER BY nama ASC
        """).fetchall()
        

        # daftar guru
        guru = d.execute("""
            SELECT id, nama
            FROM guru
            ORDER BY nama ASC
        """).fetchall()

        # 🔥 ambil data mapel kelas yang sudah disimpan
        mapel_kelas = d.execute("""
            SELECT
                mapel_id,
                guru_id,
                jp,
                hari,
                jam_mulai,
                jam_selesai
            FROM kelas_mapel
            WHERE kelas_id = ?
        """, (kelas_id,)).fetchall()

    return jsonify({
        "mapel": [dict(m) for m in mapel],
        "guru": [dict(g) for g in guru],
        "mapel_kelas": [dict(mk) for mk in mapel_kelas]
    })

@kelas_bp.route("/api/mapel/save", methods=["POST"])
def save_mapel_kelas():

    data = request.json
    kelas_id = data["kelas_id"]
    items = data["data"]

    with db() as d:
        d.execute("""
                DELETE FROM kelas_mapel
                WHERE kelas_id = ?
            """, (kelas_id,))

        for item in items:

            mapel_id = item.get("mapel_id")
            guru_id = item.get("guru_id") or None
            jp = item.get("jp") or 0
            hari = item.get("hari") or None
            jam_mulai = item.get("jam_mulai") or None
            jam_selesai = item.get("jam_selesai") or None

            # 🔥 VALIDASI BARU
            if jp > 0 and not guru_id:
                return jsonify({
                    "success": False,
                    "message": "Jika JP diisi, guru wajib dipilih."
                })

            # ==========================
            # CEK BENTROK HANYA JIKA LENGKAP
            # ==========================
            if hari and jam_mulai and jam_selesai:

                # Bentrok kelas
                konflik_kelas = d.execute("""
                    SELECT 1
                    FROM kelas_mapel
                    WHERE kelas_id = ?
                    AND hari = ?
                    AND (
                        ? < jam_selesai
                        AND ? > jam_mulai
                    )
                """, (
                    kelas_id,
                    hari,
                    jam_mulai,
                    jam_selesai
                )).fetchone()

                if konflik_kelas:
                    return jsonify({
                        "success": False,
                        "message": f"Bentrok jadwal kelas di {hari}"
                    })

                # Bentrok guru (jika ada guru)
                if guru_id:

                    konflik_guru = d.execute("""
                        SELECT 1
                        FROM kelas_mapel
                        WHERE guru_id = ?
                        AND hari = ?
                        AND kelas_id != ?
                        AND (
                            ? < jam_selesai
                            AND ? > jam_mulai
                        )
                    """, (
                        guru_id,
                        hari,
                        kelas_id,
                        jam_mulai,
                        jam_selesai
                    )).fetchone()

                    if konflik_guru:
                        return jsonify({
                            "success": False,
                            "message": f"Guru bentrok di {hari}"
                        })
                        

            # ==========================
            # INSERT DATA (BOLEH KOSONG)
            # ==========================
            d.execute("""
                INSERT INTO kelas_mapel (
                    kelas_id,
                    mapel_id,
                    guru_id,
                    jp,
                    hari,
                    jam_mulai,
                    jam_selesai
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                kelas_id,
                mapel_id,
                guru_id,
                jp,
                hari,
                jam_mulai,
                jam_selesai
            ))

        # ==========================
        # AUTO INSERT KKM
        # ==========================
        d.execute("""
            INSERT OR IGNORE INTO kkm (mapel_id, tingkat, kkm)
            SELECT
                km.mapel_id,
                k.tingkat,
                75
            FROM kelas_mapel km
            JOIN kelas k ON k.id = km.kelas_id
            WHERE km.kelas_id = ?
        """, (kelas_id,))

        d.commit()

    return jsonify({
        "success": True
    })

@kelas_bp.route("/api/jadwal/save", methods=["POST"])
def save_jadwal():

    data = request.get_json(silent=True)
    kelas_id = data.get("kelas_id")
    jadwal = data.get("jadwal", [])

    if not kelas_id or not jadwal:
        return jsonify(success=False, message="Data tidak lengkap"), 400

    with db() as d:

        d.execute("DELETE FROM kelas_jadwal WHERE kelas_id = ?", (kelas_id,))

        for item in jadwal:
            hari       = item.get("hari")
            mulai      = item.get("jam_mulai")
            selesai    = item.get("jam_selesai")
            mapel_id   = item.get("mapel_id")
            guru_id    = item.get("guru_id")   # 🔥 WAJIB

            # ===== VALIDASI =====
            if not all([hari, mulai, selesai, mapel_id, guru_id]):
                return jsonify(
                    success=False,
                    message="Hari, jam, mapel, dan guru wajib diisi"
                ), 400

            # ===== CEK BENTROK KELAS =====
            konflik = d.execute("""
                SELECT 1
                FROM kelas_jadwal
                WHERE kelas_id = ?
                AND hari = ?
                AND (? < jam_selesai AND ? > jam_mulai)
            """, (kelas_id, hari, mulai, selesai)).fetchone()

            if konflik:
                return jsonify(
                    success=False,
                    message=f"Jadwal bentrok di hari {hari}"
                ), 400

            # ===== INSERT LENGKAP =====
            d.execute("""
                INSERT INTO kelas_jadwal (
                    kelas_id,
                    hari,
                    jam_mulai,
                    jam_selesai,
                    mapel_id,
                    guru_id
                )
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                kelas_id,
                hari,
                mulai,
                selesai,
                mapel_id,
                guru_id
            ))

        d.commit()

    return jsonify(success=True)

@kelas_bp.route("/api/<int:kelas_id>/jadwal")
def get_jadwal(kelas_id):

    with db() as d:
        rows = d.execute("""
            SELECT hari, jam_mulai, jam_selesai, mapel_id
            FROM kelas_jadwal
            WHERE kelas_id = ?
            ORDER BY
                CASE hari
                    WHEN 'Senin' THEN 1
                    WHEN 'Selasa' THEN 2
                    WHEN 'Rabu' THEN 3
                    WHEN 'Kamis' THEN 4
                    WHEN 'Jumat' THEN 5
                    WHEN 'Sabtu' THEN 6
                END,
                jam_mulai ASC
        """, (kelas_id,)).fetchall()

    return jsonify([dict(r) for r in rows])