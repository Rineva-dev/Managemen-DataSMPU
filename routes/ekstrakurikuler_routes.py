from flask import Blueprint, render_template, request, jsonify
from utils.db import db
from datetime import datetime

ekskul_bp = Blueprint(
    "ekstrakurikuler",
    __name__,
    url_prefix="/sekolah/ekstrakurikuler"
)

@ekskul_bp.route("/")
def index():

    tahun_id = request.args.get("tahun_id")
    today = datetime.now().date()

    with db() as d:

        # ======================
        # TAHUN PELAJARAN
        # ======================
        tahun_list = d.execute("""
            SELECT id, tahun_pelajaran, semester,
                    semester_mulai, semester_akhir
            FROM tahun_pelajaran
            ORDER BY semester_mulai DESC
        """).fetchall()

        if not tahun_id:
            aktif = d.execute("""
                SELECT id
                FROM tahun_pelajaran
                WHERE CAST(semester_mulai AS DATE) <= %s
                AND CAST(semester_akhir AS DATE) >= %s
                LIMIT 1
            """, (today, today)).fetchone()
            tahun_id = aktif["id"] if aktif else None

        tahun_aktif = False
        mulai = None
        akhir = None
        if tahun_id:
            row = d.execute("""
                SELECT semester_mulai, semester_akhir
                FROM tahun_pelajaran
                WHERE id = ?
            """, (tahun_id,)).fetchone()

            if row:
                mulai = row["semester_mulai"]
                akhir = row["semester_akhir"]

                if isinstance(mulai, str):
                    mulai = datetime.strptime(mulai, "%Y-%m-%d").date()

                if isinstance(akhir, str):
                    akhir = datetime.strptime(akhir, "%Y-%m-%d").date()

                tahun_aktif = mulai <= today <= akhir

        # ======================
        # DATA EKSTRAKURIKULER
        # ======================
        ekskul_list = []

        if tahun_id:
            ekskul_list = d.execute("""
                SELECT
                    e.id,
                    e.nama,
                    e.hari,
                    g.nama AS pembina_nama,
                    (
                        SELECT COUNT(*)
                        FROM ekskul_anggota ea
                        WHERE ea.ekskul_id = e.id
                    ) AS total_anggota
                FROM ekstrakurikuler e
                LEFT JOIN guru g ON g.id = e.pembina_id
                WHERE e.tahun_pelajaran_id = ?
                ORDER BY e.nama ASC
            """, (tahun_id,)).fetchall()

        guru_list = d.execute("""
            SELECT id, nama
            FROM guru
            ORDER BY nama ASC
        """).fetchall()

    return render_template(
        "dashboard.html",
        active_page="ekstrakurikuler",
        tahun_list=tahun_list,
        tahun_terpilih=int(tahun_id) if tahun_id else None,
        tahun_aktif=tahun_aktif,
        ekskul_list=[dict(x) for x in ekskul_list],
        guru_list=[dict(g) for g in guru_list]
    )

@ekskul_bp.route("/create", methods=["POST"])
def create_ekskul():

    data = request.get_json()
    today = datetime.now().date()

    nama = data.get("nama")
    pembina_id = data.get("pembina_id")
    hari = data.get("hari")
    tahun_id = data.get("tahun_id")

    with db() as d:

        # validasi tahun aktif
        cek = d.execute("""
            SELECT semester_mulai, semester_akhir
            FROM tahun_pelajaran
            WHERE id = ?
        """, (tahun_id,)).fetchone()

        mulai = cek["semester_mulai"]
        akhir = cek["semester_akhir"]

        if isinstance(mulai, str):
            mulai = datetime.strptime(
                mulai,
                "%Y-%m-%d"
            ).date()

        if isinstance(akhir, str):
            akhir = datetime.strptime(
                akhir,
                "%Y-%m-%d"
            ).date()

        if not (mulai <= today <= akhir):
            return jsonify({
                "success": False,
                "message": "Tahun pelajaran tidak aktif"
            })

        d.execute("""
            INSERT INTO ekstrakurikuler
            (nama, pembina_id, hari, tahun_pelajaran_id)
            VALUES (?, ?, ?, ?)
        """, (nama, pembina_id, hari, tahun_id))

        d.commit()

    return jsonify({"success": True})

@ekskul_bp.route("/update/<int:id>", methods=["POST"])
def update_ekskul(id):

    data = request.get_json()

    with db() as d:
        d.execute("""
            UPDATE ekstrakurikuler
            SET nama=?, pembina_id=?, hari=?
            WHERE id=?
        """, (
            data.get("nama"),
            data.get("pembina_id"),
            data.get("hari"),
            id
        ))
        d.commit()

    return jsonify({"success": True})

@ekskul_bp.route("/delete/<int:id>", methods=["POST"])
def delete_ekskul(id):

    with db() as d:

        cek = d.execute("""
            SELECT 1 FROM ekskul_anggota
            WHERE ekskul_id = ?
            LIMIT 1
        """, (id,)).fetchone()

        if cek:
            return jsonify({
                "success": False,
                "message": "Ekskul masih memiliki anggota"
            })

        d.execute("DELETE FROM ekstrakurikuler WHERE id=?", (id,))
        d.commit()

    return jsonify({"success": True})

@ekskul_bp.route("/detail/<int:id>")
def detail_ekskul(id):

    with db() as d:
        row = d.execute("""
            SELECT
                e.id,
                e.nama,
                e.pembina_id,
                e.hari,
                g.nama AS pembina_nama
            FROM ekstrakurikuler e
            LEFT JOIN guru g
                ON g.id = e.pembina_id
            WHERE e.id = ?
        """, (id,)).fetchone()

    if not row:
        return jsonify({"success": False})

    return jsonify({"success": True, "ekskul": dict(row)})

@ekskul_bp.route("/anggota/<int:ekskul_id>")
def anggota_ekskul(ekskul_id):

    with db() as d:

        anggota = d.execute("""
            SELECT s.id, s.nama, s.nisn
            FROM siswa s
            JOIN ekskul_anggota ea ON ea.siswa_id = s.id
            WHERE ea.ekskul_id = ?
            ORDER BY s.nama ASC
        """, (ekskul_id,)).fetchall()

        siswa_available = d.execute("""
            SELECT id, nama, nisn
            FROM siswa
            WHERE status = 'aktif'
            AND id NOT IN (
                SELECT siswa_id
                FROM ekskul_anggota
                WHERE ekskul_id = ?
            )
            ORDER BY nama ASC
        """, (ekskul_id,)).fetchall()

    return jsonify({
        "success": True,
        "anggota": [dict(x) for x in anggota],
        "available": [dict(x) for x in siswa_available]
    })

@ekskul_bp.route("/update-anggota", methods=["POST"])
def update_anggota():

    data = request.get_json()
    ekskul_id = data.get("ekskul_id")
    siswa_ids = data.get("siswa_ids", [])

    with db() as d:

        d.execute("""
            DELETE FROM ekskul_anggota
            WHERE ekskul_id = ?
        """, (ekskul_id,))

        for sid in siswa_ids:
            d.execute("""
                INSERT INTO ekskul_anggota (ekskul_id, siswa_id)
                VALUES (?, ?)
            """, (ekskul_id, sid))

        d.commit()

    return jsonify({"success": True})

@ekskul_bp.route("/<int:ekskul_id>/siswa")
def panel_anggota(ekskul_id):

    with db() as d:

        rows = d.execute("""
            SELECT
                s.id,
                s.nisn,
                s.nama,
                k.tingkat,
                k.sub_kelas
            FROM ekskul_anggota ea
            JOIN siswa s
                ON s.id = ea.siswa_id
            LEFT JOIN kelas_siswa ks
                ON ks.siswa_id = s.id
            LEFT JOIN kelas k
                ON k.id = ks.kelas_id
            WHERE ea.ekskul_id = ?
            ORDER BY s.nama
        """, (ekskul_id,)).fetchall()

    return jsonify([
        {
            "id": r["id"],
            "nisn": r["nisn"],
            "nama": r["nama"],
            "kelas": f"{r['tingkat'] or ''} {r['sub_kelas'] or ''}".strip()
        }
        for r in rows
    ])