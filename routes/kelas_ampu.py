from flask import Blueprint, render_template, session, abort, jsonify, request, redirect
from utils.db import db
from datetime import datetime
from sqlite3 import Row

# =========================
# HELPER FUNCTION (⬅ DI SINI)
# =========================
def get_grade(nilai, grade_ranges):
    for g in grade_ranges:
        if nilai >= g["min"]:
            return g
    return {
        "grade": "-",
        "label": "Belum Ada",
        "color": "gray"
    }

kelas_ampu_bp = Blueprint("kelas_ampu", __name__, url_prefix="/kelas-ampu")

# =========================================
# HALAMAN KELAS AMPU GURU
# =========================================
@kelas_ampu_bp.route("/")
def index():

    role = session.get("role", "").lower().strip()

    # =====================================
    # ROLE YANG BOLEH AKSES
    # =====================================
    allowed_roles = [
        "guru",
        "wali_kelas",
        "waka_kurikulum",
        "kepala_sekolah"
    ]

    if role not in allowed_roles:
        abort(403)

    guru_id = session.get("guru_id") or session.get("user_id")

    with db() as d:

        # =====================================
        # GURU / WALI KELAS
        # HANYA LIHAT MILIK SENDIRI
        # =====================================
        if role in ["guru", "wali_kelas"]:

            rows = d.execute("""
                SELECT
                    km.id AS kelas_mapel_id,

                    k.id AS kelas_id,
                    k.tingkat,
                    k.sub_kelas,

                    mp.nama AS mapel,
                    km.jp,

                    kj.hari,
                    kj.jam_mulai,
                    kj.jam_selesai,

                    tp.tahun_pelajaran,
                    tp.semester,

                    (
                        SELECT COUNT(*)
                        FROM kelas_siswa ks
                        WHERE ks.kelas_id = k.id
                    ) AS total_siswa

                FROM kelas_mapel km

                JOIN kelas k
                    ON k.id = km.kelas_id

                JOIN mata_pelajaran mp
                    ON mp.id = km.mapel_id

                JOIN tahun_pelajaran tp
                    ON tp.id = k.tahun_pelajaran_id

                LEFT JOIN kelas_jadwal kj
                    ON kj.kelas_id = km.kelas_id
                    AND kj.mapel_id = km.mapel_id

                WHERE km.guru_id = ?

                ORDER BY
                    k.tingkat ASC,
                    k.sub_kelas ASC,
                    mp.nama ASC

            """, (guru_id,)).fetchall()

            print([dict(x) for x in rows])

        # =====================================
        # WAKA / KEPSEK
        # BISA LIHAT SEMUA
        # =====================================
        else:

            rows = d.execute("""
                SELECT
                    km.id AS kelas_mapel_id,

                    k.id AS kelas_id,
                    k.tingkat,
                    k.sub_kelas,

                    mp.nama AS mapel,
                    km.jp,

                    kj.hari,
                    kj.jam_mulai,
                    kj.jam_selesai,

                    tp.tahun_pelajaran,
                    tp.semester,

                    (
                        SELECT COUNT(*)
                        FROM kelas_siswa ks
                        WHERE ks.kelas_id = k.id
                    ) AS total_siswa

                FROM kelas_mapel km

                JOIN kelas k
                    ON k.id = km.kelas_id

                JOIN mata_pelajaran mp
                    ON mp.id = km.mapel_id

                JOIN tahun_pelajaran tp
                    ON tp.id = k.tahun_pelajaran_id

                LEFT JOIN kelas_jadwal kj
                    ON kj.kelas_id = km.kelas_id
                    AND kj.mapel_id = km.mapel_id

                WHERE km.guru_id = ?

                ORDER BY
                    k.tingkat ASC,
                    k.sub_kelas ASC,
                    mp.nama ASC

            """, (guru_id,)).fetchall()

        kelas_ampu_map = {}

        for r in rows:

            key = f'{r["kelas_mapel_id"]}'

            # =====================================
            # BUAT CARD BARU
            # =====================================
            if key not in kelas_ampu_map:

                kelas_ampu_map[key] = {

                    "kelas_mapel_id": r["kelas_mapel_id"],

                    "kelas": f'{r["tingkat"]} {r["sub_kelas"]}',

                    "mapel": r["mapel"],

                    "jp": r["jp"],

                    "tahun": f'{r["tahun_pelajaran"]} - {r["semester"]}',

                    "total_siswa": r["total_siswa"],

                    "guru_nama": r["guru_nama"]
                        if "guru_nama" in r.keys()
                        else None,

                    # =====================
                    # LIST JADWAL
                    # =====================
                    "jadwal": []

                }

            # =====================================
            # TAMBAH JADWAL
            # =====================================
            if r["hari"]:

                kelas_ampu_map[key]["jadwal"].append({

                    "hari": r["hari"],

                    "jam_mulai": r["jam_mulai"],

                    "jam_selesai": r["jam_selesai"]

                })

        # =====================================
        # CONVERT KE LIST
        # =====================================
        kelas_ampu_list = list(kelas_ampu_map.values())

    return render_template(
        "dashboard.html",
        active_page="kelas_ampu",
        kelas_ampu_list=kelas_ampu_list
    )

# ==============================
# GET JADWAL DEFAULT GURU
# ==============================
@kelas_ampu_bp.route("/api/jadwal-default/<int:kelas_mapel_id>")
def get_jadwal_default(kelas_mapel_id):

    with db() as d:

        row = d.execute("""
            SELECT
                km.id AS kelas_mapel_id,

                k.id AS kelas_id,
                k.tingkat,
                k.sub_kelas,

                mp.nama AS mapel,
                km.jp,

                km.hari,
                km.jam_mulai,
                km.jam_selesai,

                tp.tahun_pelajaran,
                tp.semester

            FROM kelas_mapel km

            JOIN kelas k
                ON k.id = km.kelas_id

            JOIN mata_pelajaran mp
                ON mp.id = km.mapel_id
                        
            JOIN tahun_pelajaran tp
                ON tp.id = k.tahun_pelajaran_id

            WHERE km.id = ?
        """, (kelas_mapel_id,)).fetchone()

    if not row:
        return jsonify({
            "success": False,
            "message": "Jadwal tidak ditemukan"
        })

    return jsonify({
        "success": True,
        "data": {
            "hari": row["hari"],
            "jam_mulai": row["jam_mulai"],
            "jam_selesai": row["jam_selesai"],
            "kelas": f'{row["tingkat"]}{row["sub_kelas"]}',
            "mapel": row["mapel"]
        }
    })

@kelas_ampu_bp.route("/api/absensi/<int:absensi_id>")
def api_absensi(absensi_id):

    with db() as d:

        rows = d.execute("""
            SELECT 
                s.id,
                s.nama,
                s.nisn,
                ad.status,
                ad.keterangan
            FROM absensi_mengajar am
            JOIN kelas_mapel km ON km.id = am.kelas_mapel_id
            JOIN kelas_siswa ks ON ks.kelas_id = km.kelas_id
            JOIN siswa s ON s.id = ks.siswa_id
            LEFT JOIN absensi_detail ad 
                ON ad.siswa_id = s.id 
                AND ad.absensi_id = am.id
            WHERE am.id = ?
            ORDER BY s.nama
        """, (absensi_id,)).fetchall()

    return jsonify({
        "data": [dict(r) for r in rows]
    })

from flask import request

@kelas_ampu_bp.route("/start-absensi", methods=["POST"])
def start_absensi():

    role = session.get("role", "").lower().strip()
    if role not in ["guru", "wali_kelas"]:
        return jsonify({
            "success": False,
            "message": "Akses ditolak"
        }), 403

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Payload JSON tidak valid"
        }), 400

    kelas_mapel_id = data.get("kelas_mapel_id")
    tanggal        = data.get("tanggal")
    jam_mulai      = data.get("jam_mulai")
    jam_selesai    = data.get("jam_selesai")
    materi     = data.get("materi")
    indikator  = data.get("indikator")
    kegiatan   = data.get("kegiatan")

    # ==========================
    # VALIDASI SERVER
    # ==========================
    if not kelas_mapel_id:
        return jsonify({"success": False, "message": "kelas_mapel_id wajib"}), 400

    if not tanggal or not jam_mulai or not jam_selesai or not materi or not indikator or not kegiatan:
        return jsonify({"success": False, "message": "Data belum lengkap"}), 400

    try:
        kelas_mapel_id = int(kelas_mapel_id)
    except ValueError:
        return jsonify({"success": False, "message": "kelas_mapel_id tidak valid"}), 400

    with db() as d:

        # =====================================
        # AMBIL PERTEMUAN TERAKHIR
        # =====================================
        last = d.execute("""
            SELECT MAX(pertemuan_ke) as last_pertemuan
            FROM absensi_mengajar
            WHERE kelas_mapel_id = ?
        """, (kelas_mapel_id,)).fetchone()

        pertemuan_ke = (last["last_pertemuan"] or 0) + 1

        # =====================================
        # INSERT ABSENSI
        # =====================================
        row = d.execute("""
            INSERT INTO absensi_mengajar (
                kelas_mapel_id,
                pertemuan_ke,
                tanggal,
                jam_mulai,
                jam_selesai,
                materi,
                indikator,
                kegiatan
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        """, (
            kelas_mapel_id,
            pertemuan_ke,
            tanggal,
            jam_mulai,
            jam_selesai,
            materi,
            indikator,
            kegiatan
        )).fetchone()

        absensi_id = row["id"]

    return jsonify({
        "success": True,
        "absensi_id": absensi_id
    })

@kelas_ampu_bp.route("/absensi/<int:absensi_id>")
def absensi_siswa(absensi_id):

    role = session.get("role", "").lower().strip()
    if role not in ["guru", "wali_kelas"]:
        abort(403)

    mode = request.args.get("mode", "input") 

    with db() as d:
        absensi = d.execute("""
            SELECT
                am.id,
                am.kelas_mapel_id,
                strftime('%d/%m/%Y', am.tanggal) AS tanggal,
                am.jam_mulai,
                am.jam_selesai,
                am.materi,
                am.indikator,
                am.kegiatan,
                am.pertemuan_ke,
                            
                (k.tingkat || ' ' || k.sub_kelas) AS kelas,

                mp.nama AS mapel

            FROM absensi_mengajar am
            JOIN kelas_mapel km ON km.id = am.kelas_mapel_id
            JOIN kelas k ON k.id = km.kelas_id
            JOIN mata_pelajaran mp ON mp.id = km.mapel_id
            WHERE am.id = ?
        """, (absensi_id,)).fetchone()

    if not absensi:
        abort(404)

    return render_template(
        "dashboard.html",
        active_page="kelas_ampu",
        show_absensi_siswa=True,
        absensi=absensi,
        mode=mode
    )

@kelas_ampu_bp.route("/api/absensi/finalize", methods=["POST"])
def finalize_absensi():

    data = request.get_json() or {}
    absensi_id = data.get("absensi_id")

    if not absensi_id:
        return jsonify({"success": False, "message": "absensi_id wajib"}), 400

    with db() as d:

        existing = d.execute("""
            SELECT status_final
            FROM absensi_mengajar
            WHERE id = ?
        """, (absensi_id,)).fetchone()

        if existing and existing["status_final"]:
            return jsonify({
                "success": False,
                "message": "Absensi sudah difinalisasi"
            }), 400

        d.execute("""
            UPDATE absensi_mengajar
            SET status_final = 1,
                finalized_at = ?
            WHERE id = ?
        """, (datetime.now().isoformat(), absensi_id))

    return jsonify({
        "success": True,
        "message": "Absensi berhasil difinalisasi"
    })

@kelas_ampu_bp.route("/api/absensi/set-status", methods=["POST"])
def set_status():

    data = request.get_json()

    absensi_id = data.get("absensi_id")
    siswa_id   = data.get("siswa_id")
    status     = data.get("status")

    if not all([absensi_id, siswa_id, status]):
        return jsonify({"success": False, "message": "data tidak lengkap"}), 400

    with db() as d:

        absensi = d.execute("""
            SELECT status_final
            FROM absensi_mengajar
            WHERE id = ?
        """, (absensi_id,)).fetchone()

        if absensi and absensi["status_final"]:
            return jsonify({
                "success": False,
                "message": "Absensi sudah final (read only)"
            }), 403

        # cek apakah sudah ada
        existing = d.execute("""
            SELECT id FROM absensi_detail
            WHERE absensi_id = ? AND siswa_id = ?
        """, (absensi_id, siswa_id)).fetchone()

        if existing:

            d.execute("""
                UPDATE absensi_detail
                SET status = ?
                WHERE absensi_id = ? AND siswa_id = ?
            """, (status, absensi_id, siswa_id))

        else:

            d.execute("""
                INSERT INTO absensi_detail (absensi_id, siswa_id, status)
                VALUES (?, ?, ?)
            """, (absensi_id, siswa_id, status))

    return jsonify({"success": True})

@kelas_ampu_bp.route("/api/absensi/set-keterangan", methods=["POST"])
def set_keterangan():

    data = request.get_json()

    absensi_id = data.get("absensi_id")
    siswa_id   = data.get("siswa_id")
    keterangan = data.get("keterangan")

    if not all([absensi_id, siswa_id]):
        return jsonify({
            "success": False,
            "message": "data tidak lengkap"
        }), 400

    with db() as d:

        absensi = d.execute("""
            SELECT status_final
            FROM absensi_mengajar
            WHERE id = ?
        """, (absensi_id,)).fetchone()

        if absensi and absensi["status_final"]:
            return jsonify({
                "success": False,
                "message": "Absensi sudah final (read only)"
            }), 403

        # cek apakah sudah ada
        existing = d.execute("""
            SELECT id FROM absensi_detail
            WHERE absensi_id = ? AND siswa_id = ?
        """, (absensi_id, siswa_id)).fetchone()

        if existing:

            d.execute("""
                UPDATE absensi_detail
                SET keterangan = ?
                WHERE absensi_id = ? AND siswa_id = ?
            """, (keterangan, absensi_id, siswa_id))

        else:

            d.execute("""
                INSERT INTO absensi_detail (absensi_id, siswa_id, keterangan, status)
                VALUES (?, ?, ?, 'H')
            """, (absensi_id, siswa_id, keterangan))

    return jsonify({"success": True})

@kelas_ampu_bp.route("/<int:kelas_mapel_id>/overview")
def overview(kelas_mapel_id):

    role = session.get("role", "").lower().strip()

    if role not in ["guru", "wali_kelas"]:
        abort(403)

    with db() as d:

        # =========================
        # DATA KELAS
        # =========================
        kelas = d.execute("""
            SELECT
                km.id,

                (k.tingkat || ' ' || k.sub_kelas) AS kelas,

                mp.nama AS mapel,

                (tp.tahun_pelajaran || ' - ' || tp.semester)
                    AS tahun

            FROM kelas_mapel km

            JOIN kelas k
                ON k.id = km.kelas_id

            JOIN mata_pelajaran mp
                ON mp.id = km.mapel_id

            JOIN tahun_pelajaran tp
                ON tp.id = k.tahun_pelajaran_id

            WHERE km.id = ?
        """, (kelas_mapel_id,)).fetchone()

        # =========================
        # JURNAL PEMBELAJARAN
        # =========================
        jurnal_list = d.execute("""
            SELECT
                am.id,
                am.pertemuan_ke,
                am.tanggal AS raw_tanggal,
                strftime('%d/%m/%Y', am.tanggal) AS tanggal,
                am.jam_mulai,
                am.jam_selesai,
                am.materi,
                am.indikator,
                am.kegiatan,
                am.catatan,
                -- TOTAL HADIR
                (
                    SELECT COUNT(*)
                    FROM absensi_detail ad
                    WHERE ad.absensi_id = am.id
                    AND ad.status = 'H'
                ) AS total_hadir,

                -- TOTAL SISWA
                (
                    SELECT COUNT(*)
                    FROM kelas_siswa ks
                    JOIN kelas_mapel km
                        ON km.kelas_id = ks.kelas_id
                    WHERE km.id = am.kelas_mapel_id
                ) AS total_siswa

            FROM absensi_mengajar am
            WHERE am.kelas_mapel_id = ?
            ORDER BY
                am.pertemuan_ke DESC
        """, (kelas_mapel_id,)).fetchall()

    return render_template(
        "dashboard.html",
        active_page="kelas_ampu",
        show_overview=True,
        kelas=kelas,
        jurnal_list=jurnal_list
    )

# =========================================
# DELETE JURNAL
# =========================================
@kelas_ampu_bp.route("/delete-jurnal", methods=["POST"])
def delete_jurnal():

    role = session.get("role", "").lower().strip()

    if role not in ["guru", "wali_kelas"]:
        return jsonify({
            "success": False,
            "message": "Akses ditolak"
        }), 403

    data = request.get_json() or {}

    jurnal_id = data.get("jurnal_id")

    if not jurnal_id:
        return jsonify({
            "success": False,
            "message": "jurnal_id wajib"
        }), 400

    with db() as d:

        # =========================
        # CEK DATA
        # =========================
        jurnal = d.execute("""
            SELECT id
            FROM absensi_mengajar
            WHERE id = ?
        """, (jurnal_id,)).fetchone()

        if not jurnal:
            return jsonify({
                "success": False,
                "message": "Jurnal tidak ditemukan"
            }), 404

        # =========================
        # HAPUS DETAIL ABSENSI
        # =========================
        d.execute("""
            DELETE FROM absensi_detail
            WHERE absensi_id = ?
        """, (jurnal_id,))

        # =========================
        # HAPUS JURNAL
        # =========================
        d.execute("""
            DELETE FROM absensi_mengajar
            WHERE id = ?
        """, (jurnal_id,))

    return jsonify({
        "success": True,
        "message": "Jurnal berhasil dihapus"
    })

# =========================================
# UPDATE CATATAN JURNAL
# =========================================
@kelas_ampu_bp.route("/update-catatan", methods=["POST"])
def update_catatan():

    role = session.get("role", "").lower().strip()

    if role not in ["guru", "wali_kelas"]:
        return jsonify({
            "success": False,
            "message": "Akses ditolak"
        }), 403

    data = request.get_json() or {}

    jurnal_id = data.get("jurnal_id")
    catatan = data.get("catatan", "").strip()

    if not jurnal_id:
        return jsonify({
            "success": False,
            "message": "jurnal_id wajib"
        }), 400

    with db() as d:

        # =========================
        # CEK JURNAL
        # =========================
        jurnal = d.execute("""
            SELECT id
            FROM absensi_mengajar
            WHERE id = ?
        """, (jurnal_id,)).fetchone()

        if not jurnal:
            return jsonify({
                "success": False,
                "message": "Jurnal tidak ditemukan"
            }), 404

        # =========================
        # UPDATE CATATAN
        # =========================
        d.execute("""
            UPDATE absensi_mengajar
            SET catatan = ?
            WHERE id = ?
        """, (
            catatan,
            jurnal_id
        ))

    return jsonify({
        "success": True,
        "message": "Catatan berhasil disimpan"
    })

# =========================================
# HALAMAN EDIT JURNAL
# =========================================
@kelas_ampu_bp.route("/jurnal/<int:jurnal_id>/edit")
def edit_jurnal(jurnal_id):

    role = session.get("role", "").lower().strip()

    if role not in ["guru", "wali_kelas"]:
        abort(403)

    with db() as d:

        # =====================================
        # DATA JURNAL
        # =====================================
        jurnal = d.execute("""
            SELECT
                am.id,
                am.kelas_mapel_id,
                am.pertemuan_ke,
                am.tanggal,
                am.jam_mulai,
                am.jam_selesai,
                am.materi,
                am.indikator,
                am.kegiatan,

                (k.tingkat || ' ' || k.sub_kelas)
                    AS kelas,

                mp.nama AS mapel

            FROM absensi_mengajar am

            JOIN kelas_mapel km
                ON km.id = am.kelas_mapel_id

            JOIN kelas k
                ON k.id = km.kelas_id

            JOIN mata_pelajaran mp
                ON mp.id = km.mapel_id

            WHERE am.id = ?
        """, (jurnal_id,)).fetchone()

        # =====================================
        # DATA ABSENSI SISWA
        # =====================================
        siswa_list = d.execute("""
            SELECT
                s.id AS siswa_id,
                s.nama,
                s.nisn,

                COALESCE(ad.status, 'H')
                    AS status,

                COALESCE(ad.keterangan, '')
                    AS keterangan

            FROM absensi_mengajar am

            JOIN kelas_mapel km
                ON km.id = am.kelas_mapel_id

            JOIN kelas_siswa ks
                ON ks.kelas_id = km.kelas_id

            JOIN siswa s
                ON s.id = ks.siswa_id

            LEFT JOIN absensi_detail ad
                ON ad.absensi_id = am.id
                AND ad.siswa_id = s.id

            WHERE am.id = ?

            ORDER BY s.nama ASC
        """, (jurnal_id,)).fetchall()

    if not jurnal:
        abort(404)

    return render_template(
        "dashboard.html",
        active_page="kelas_ampu",
        show_edit_jurnal=True,
        jurnal=jurnal,
        siswa_list=siswa_list
    )

# =========================================
# UPDATE JURNAL
# =========================================
@kelas_ampu_bp.route("/jurnal/<int:jurnal_id>/update", methods=["POST"])
def update_jurnal(jurnal_id):

    role = session.get("role", "").lower().strip()
    if role not in ["guru", "wali_kelas"]:
        abort(403)

    form_data = request.form.to_dict()

    tanggal = form_data.get("tanggal")
    jam_mulai = form_data.get("jam_mulai")
    jam_selesai = form_data.get("jam_selesai")
    materi = form_data.get("materi")
    indikator = form_data.get("indikator")
    kegiatan = form_data.get("kegiatan")

    with db() as d:

        d.execute("""
            UPDATE absensi_mengajar
            SET tanggal = ?,
                jam_mulai = ?,
                jam_selesai = ?,
                materi = ?,
                indikator = ?,
                kegiatan = ?
            WHERE id = ?
        """, (
            tanggal,
            jam_mulai,
            jam_selesai,
            materi,
            indikator,
            kegiatan,
            jurnal_id
        ))

        for key, value in form_data.items():
            if key.startswith("status_"):
                siswa_id = key.replace("status_", "")
                status = value
                keterangan = form_data.get(f"keterangan_{siswa_id}")

                existing = d.execute("""
                    SELECT id FROM absensi_detail
                    WHERE absensi_id = ? AND siswa_id = ?
                """, (jurnal_id, siswa_id)).fetchone()

                if existing:
                    d.execute("""
                        UPDATE absensi_detail
                        SET status = ?, keterangan = ?
                        WHERE absensi_id = ? AND siswa_id = ?
                    """, (status, keterangan, jurnal_id, siswa_id))
                else:
                    d.execute("""
                        INSERT INTO absensi_detail
                        (absensi_id, siswa_id, status, keterangan)
                        VALUES (?, ?, ?, ?)
                    """, (jurnal_id, siswa_id, status, keterangan))

    return redirect(
        f"/kelas-ampu/{request.form.get('kelas_mapel_id')}/overview"
    )

@kelas_ampu_bp.route("/<int:kelas_mapel_id>/nilai")
def nilai_kelas(kelas_mapel_id):

    role = session.get("role", "").lower().strip()

    if role not in ["guru", "wali_kelas"]:
        abort(403)

    with db() as d:

        # =========================
        # INFO KELAS
        # =========================
        info = d.execute("""
            SELECT
                (k.tingkat || ' ' || k.sub_kelas) AS kelas,

                k.tingkat,

                mp.nama AS mapel,

                COALESCE(kkm.kkm, 75) AS kkm

            FROM kelas_mapel km

            JOIN kelas k
                ON k.id = km.kelas_id

            JOIN mata_pelajaran mp
                ON mp.id = km.mapel_id

            LEFT JOIN kkm
                ON kkm.tingkat = k.tingkat
                AND kkm.mapel_id = km.mapel_id

            WHERE km.id = ?
        """, (kelas_mapel_id,)).fetchone()

        # =========================
        # DATA NILAI
        # =========================
        rows = d.execute("""
            SELECT
                s.id,
                s.nisn,
                s.nama,

                -- ===================================
                -- NILAI KEHADIRAN OTOMATIS
                -- H = 100
                -- S = 75
                -- I = 50
                -- A = 0
                -- ===================================
                CAST(
                    ROUND(
                        COALESCE(

                            (
                                SELECT
                                    (
                                        SUM(
                                            CASE ad.status
                                                WHEN 'H' THEN 100
                                                WHEN 'S' THEN 75
                                                WHEN 'I' THEN 50
                                                ELSE 0
                                            END
                                        ) * 1.0
                                    )
                                    /
                                    COUNT(*)

                                FROM absensi_detail ad

                                JOIN absensi_mengajar am
                                    ON am.id = ad.absensi_id

                                WHERE ad.siswa_id = s.id
                                AND am.kelas_mapel_id = km.id

                            ),

                        0)
                    )
                AS INTEGER) AS nilai_kehadiran,

                COALESCE(n.keaktifan, 0) AS nilai_keaktifan,
                COALESCE(n.harian, 0) AS nilai_harian,
                COALESCE(n.uas, 0) AS nilai_uas

            FROM kelas_siswa ks

            JOIN siswa s
                ON s.id = ks.siswa_id

            JOIN kelas_mapel km
                ON km.id = ?

            LEFT JOIN nilai_siswa n
                ON n.siswa_id = s.id
                AND n.kelas_mapel_id = km.id

            WHERE ks.kelas_id = km.kelas_id

            ORDER BY s.nama ASC
        """, (kelas_mapel_id,)).fetchall()

        # =========================
        # RANGE GRADE DINAMIS
        # =========================
        kkm = info["kkm"] or 75

        # interval pembagian grade
        interval = round((100 - kkm) / 3)

        # batas grade
        batas_c = kkm + interval - 1
        batas_b = batas_c + interval

        grade_ranges = [
            {
                "grade": "A",
                "label": "Sangat Baik",
                "min": batas_b + 1,
                "color": "green"
            },
            {
                "grade": "B",
                "label": "Baik",
                "min": batas_c + 1,
                "color": "blue"
            },
            {
                "grade": "C",
                "label": "Cukup",
                "min": kkm,
                "color": "yellow"
            },
            {
                "grade": "D",
                "label": "Kurang",
                "min": 0,
                "color": "red"
            }
        ]
        # =========================
        # HITUNG SUMMARY
        # =========================

        nilai_akhir_list = []

        siswa_list = []

        for r in rows:

            nilai_akhir = int(
                (r["nilai_kehadiran"] or 0) * 0.10 +
                (r["nilai_keaktifan"] or 0) * 0.20 +
                (r["nilai_harian"] or 0) * 0.30 +
                (r["nilai_uas"] or 0) * 0.40
            )

            grade_info = get_grade(nilai_akhir, grade_ranges)

            siswa = dict(r)
            siswa["nilai_akhir"] = nilai_akhir
            siswa["grade"] = grade_info["grade"]
            siswa["grade_label"] = grade_info["label"]
            siswa["grade_color"] = grade_info["color"]

            siswa_list.append(siswa)
            nilai_akhir_list.append(nilai_akhir)

        total_siswa = len(nilai_akhir_list)

        rata_kelas = (
            round(sum(nilai_akhir_list) / total_siswa, 2)
            if total_siswa > 0 else 0
        )

        total_tuntas = sum(
            1 for n in nilai_akhir_list
            if n >= kkm
        )

        total_belum_tuntas = sum(
            1 for n in nilai_akhir_list
            if n < kkm
        )

    return render_template(
        "dashboard.html",
        active_page="kelas_ampu",
        show_nilai=True,
        kelas_mapel_id=kelas_mapel_id,
        kelas=info["kelas"],
        mapel=info["mapel"],
        kkm=kkm,
        grade_ranges=grade_ranges,
        siswa_list=siswa_list,

        total_siswa=total_siswa,
        rata_kelas=rata_kelas,
        total_tuntas=total_tuntas,
        total_belum_tuntas=total_belum_tuntas
    )

@kelas_ampu_bp.route("/api/nilai/update", methods=["POST"])
def update_nilai_bulk():

    role = session.get("role", "").lower().strip()
    if role not in ["guru", "wali_kelas"]:
        return jsonify({"success": False}), 403

    data = request.get_json() or {}
    kelas_mapel_id = data.get("kelas_mapel_id")
    nilai_list = data.get("nilai")

    if not kelas_mapel_id or not nilai_list:
        return jsonify({
            "success": False,
            "message": "Data tidak lengkap"
        }), 400

    with db() as d:

        for item in nilai_list:

            siswa_id = item.get("siswa_id")
            tipe     = item.get("type")
            nilai    = item.get("nilai")

            if tipe not in ["keaktifan", "harian", "uas"]:
                continue

            if nilai is not None and (nilai < 0 or nilai > 100):
                return jsonify({
                    "success": False,
                    "message": "Nilai harus 0–100"
                }), 400

            existing = d.execute("""
                SELECT id FROM nilai_siswa
                WHERE kelas_mapel_id = ? AND siswa_id = ?
            """, (kelas_mapel_id, siswa_id)).fetchone()

            if existing:
                d.execute(f"""
                    UPDATE nilai_siswa
                    SET {tipe} = ?
                    WHERE kelas_mapel_id = ? AND siswa_id = ?
                """, (nilai, kelas_mapel_id, siswa_id))
            else:
                d.execute(f"""
                    INSERT INTO nilai_siswa
                    (kelas_mapel_id, siswa_id, {tipe})
                    VALUES (?, ?, ?)
                """, (kelas_mapel_id, siswa_id, nilai))

    return jsonify({
        "success": True,
        "message": "Nilai berhasil disimpan"
    })