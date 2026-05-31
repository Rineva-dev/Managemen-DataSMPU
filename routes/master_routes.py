from flask import Blueprint, render_template, request, jsonify
from utils.db import db
from utils.decorators import roles_required
from werkzeug.security import generate_password_hash
from datetime import datetime
from flask import request, render_template

master_bp = Blueprint("master", __name__)

@master_bp.route("/master-data")
@roles_required("ADMIN_LEADERSHIP")
def master_data():
    return render_template(
        "dashboard.html",
        active_page="master_data"
    )

@master_bp.route("/akun-guru")
@roles_required("ADMIN_LEADERSHIP")
def akun_guru():
    return render_template(
        "dashboard.html",
        active_page="akun_guru"
    )

@master_bp.route("/rekap-absensi")
@roles_required("ADMIN_LEADERSHIP")
def rekap_absensi():
    return render_template(
        "dashboard.html",
        active_page="rekap_absensi"
    )

@master_bp.route("/tahun-pelajaran")
@roles_required("ADMIN_LEADERSHIP")
def menu_tahun_pelajaran():
    return render_template(
        "dashboard.html",
        active_page="tahun_pelajaran"
    )

@master_bp.route("/sekolah/kelas/")
@roles_required("ADMIN_LEADERSHIP")
def menu_kelas():

    today = datetime.now().date()
    tahun_id = request.args.get("tahun_id")

    with db() as d:

        # =========================
        # Ambil daftar tahun pelajaran
        # =========================
        tahun_list = d.execute("""
            SELECT id, tahun_pelajaran, semester,
                   semester_mulai, semester_akhir
            FROM tahun_pelajaran
            ORDER BY semester_mulai DESC
        """).fetchall()

        # =========================
        # Tentukan tahun aktif otomatis
        # =========================
        if not tahun_id:
            aktif = d.execute("""
                SELECT id
                FROM tahun_pelajaran
                WHERE semester_mulai::date <= %s
                AND semester_akhir::date >= %s
                LIMIT 1
            """, (today, today)).fetchone()

            tahun_id = aktif["id"] if aktif else None

        tahun_aktif = False

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

                if mulai <= today <= akhir:
                    tahun_aktif = True

        # =========================
        # Ambil data kelas sesuai tahun
        # =========================
        kelas_list = []

        if tahun_id:
            kelas_list = d.execute("""
                SELECT 
                    k.id,
                    k.tingkat,
                    k.sub_kelas,
                    k.tahun_pelajaran_id,
                    g.nama AS wali_nama,

                    (
                        SELECT COUNT(*)
                        FROM kelas_siswa ks
                        WHERE ks.kelas_id = k.id
                    ) AS total_siswa

                FROM kelas k
                LEFT JOIN guru g ON k.wali_kelas_id = g.id

                WHERE k.tahun_pelajaran_id = ?

                ORDER BY k.tingkat ASC, k.sub_kelas ASC
            """, (tahun_id,)).fetchall()

        # =========================
        # Ambil daftar wali kelas dari tabel guru
        # =========================
        wali_list = d.execute("""
            SELECT id, nama
            FROM guru
            WHERE LOWER(jabatan) = 'wali_kelas'
               OR LOWER(jabatan) = 'wali kelas'
            ORDER BY nama ASC
        """).fetchall()

    return render_template(
        "dashboard.html",
        active_page="kelas",
        tahun_list=tahun_list,
        tahun_terpilih=int(tahun_id) if tahun_id else None,
        tahun_aktif=tahun_aktif,
        kelas_list=kelas_list,
        wali_list=wali_list
    )

@master_bp.route("/api/guru", methods=["GET"])
@roles_required("ADMIN_LEADERSHIP")
def api_get_guru():
    with db() as d:
        data = d.execute("SELECT * FROM guru WHERE role='guru'").fetchall()
    return jsonify([dict(row) for row in data])

@master_bp.route("/api/guru/absensi", methods=["GET"])
@roles_required("ADMIN_LEADERSHIP")
def api_guru_absensi():
    with db() as d:
        # Ambil id & nama guru saja, urut nama
        data = d.execute("SELECT id, nama FROM guru WHERE role='guru' ORDER BY nama").fetchall()
    return jsonify([dict(row) for row in data])

@master_bp.route("/api/guru/add", methods=["POST"])
@roles_required("ADMIN_LEADERSHIP")
def api_add_guru():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Data tidak valid atau kosong"
        })

    # Validasi field wajib
    if not data.get("nama") or not data.get("jabatan"):
        return jsonify({
            "status": "error",
            "message": "Nama dan jabatan wajib diisi"
        })
    with db() as d:
        try:
            d.execute(
                """INSERT INTO guru
                (nama, jabatan, tempat, tahun, jk, status, hp, alamat, email, role)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    data["nama"],
                    data["jabatan"],
                    data.get("tempat",""),
                    data.get("tahun",""),
                    data.get("jk",""),
                    data.get("status",""),
                    data.get("hp",""),
                    data.get("alamat",""),
                    data.get("email",""),
                    "guru"
                )
            )
            d.commit()
            return jsonify({
                "status": "success",
                "message": "Guru berhasil ditambahkan"
            })
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": str(e)
            })

@master_bp.route("/api/guru/update/<int:id>", methods=["PUT"])
@roles_required("ADMIN_LEADERSHIP")
def api_update_guru(id):
    data = request.json
    with db() as d:
        try:
            d.execute(
                "UPDATE guru SET nama=?, jabatan=?, tempat=?, tahun=?, jk=?, status=?, hp=?, alamat=?, email=? WHERE id=?",
                (data["nama"], data["jabatan"], data.get("tempat",""), data.get("tahun",""),
                data.get("jk",""), data.get("status",""), data.get("hp",""), data.get("alamat",""), data.get("email",""), id)
            )
            d.commit()
            return jsonify({"status": "success", "message": "Data guru berhasil diperbarui"})
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)})

@master_bp.route("/api/guru/delete/<int:id>", methods=["DELETE"])
@roles_required("ADMIN_LEADERSHIP")
def api_delete_guru(id):
    with db() as d:
        try:
            # 🔎 CEK APAKAH MASIH ADA AKUN
            akun = d.execute(
                "SELECT id FROM akun WHERE guru_id=?",
                (id,)
            ).fetchone()

            if akun:
                return jsonify({
                    "status": "error",
                    "message": "Guru tidak bisa dihapus karena masih memiliki akun."
                })

            # ✅ Kalau tidak ada akun, baru hapus guru
            d.execute("DELETE FROM guru WHERE id=?", (id,))
            d.commit()

            return jsonify({
                "status": "success",
                "message": "Data guru berhasil dihapus."
            })

        except Exception as e:
            d.rollback()
            return jsonify({
                "status": "error",
                "message": str(e)
            })
        
@master_bp.route("/api/akun", methods=["GET"])
@roles_required("ADMIN_LEADERSHIP")
def api_get_akun():
    with db() as d:
        data = d.execute("""
            SELECT a.id, a.guru_id, a.role, a.username, g.nama
            FROM akun a
            JOIN guru g ON a.guru_id = g.id
        """).fetchall()
    return jsonify([dict(row) for row in data])


@master_bp.route("/api/akun/add", methods=["POST"])
@roles_required("ADMIN_LEADERSHIP")
def api_add_akun():
    data = request.json
    with db() as d:
        try:
            # cek username unik
            exists_user = d.execute("SELECT * FROM akun WHERE username=?", (data["username"],)).fetchone()
            if exists_user:
                return jsonify({"status":"error","message":"Username sudah digunakan"})

            # cek guru sudah punya akun
            exists_guru = d.execute("SELECT * FROM akun WHERE guru_id=?", (data["guru_id"],)).fetchone()
            if exists_guru:
                return jsonify({"status":"error","message":"Guru ini sudah memiliki akun"})

            role = data.get("role", "guru")

            hashed_password = generate_password_hash(data["password"])

            d.execute(
                "INSERT INTO akun (guru_id, username, password, role, status) VALUES (?,?,?,?,?)",
                (data["guru_id"], data["username"], hashed_password, role, "aktif")
            )
            d.commit()
            return jsonify({"status":"success","message":"Akun guru berhasil dibuat"})
        except Exception as e:
            return jsonify({"status":"error","message": str(e)})


@master_bp.route("/api/akun/update/<int:id>", methods=["PUT"])
@roles_required("ADMIN_LEADERSHIP")
def api_update_akun(id):
    data = request.json
    with db() as d:
        try:
            # cek username unik kecuali akun ini
            exists_user = d.execute(
                "SELECT * FROM akun WHERE username=? AND id!=?",
                (data["username"], id)
            ).fetchone()

            if exists_user:
                return jsonify({
                    "status":"error",
                    "message":"Username sudah digunakan"
                })

            # cek guru unik kecuali akun ini
            exists_guru = d.execute(
                "SELECT * FROM akun WHERE guru_id=? AND id!=?",
                (data["guru_id"], id)
            ).fetchone()

            if exists_guru:
                return jsonify({
                    "status":"error",
                    "message":"Guru ini sudah memiliki akun"
                })

            # =========================
            # CEK PASSWORD KOSONG / TIDAK
            # =========================
            if "password" in data and data["password"].strip() != "":
                # kalau password diisi → hash ulang
                hashed_password = generate_password_hash(data["password"])
                d.execute("""
                    UPDATE akun
                    SET guru_id=?, username=?, password=?, role=?
                    WHERE id=?
                """, (
                    data["guru_id"],
                    data["username"],
                    hashed_password,
                    data["role"],
                    id
                ))
            else:
                # kalau password kosong → JANGAN sentuh password
                d.execute("""
                    UPDATE akun
                    SET guru_id=?, username=?, role=?
                    WHERE id=?
                """, (
                    data["guru_id"],
                    data["username"],
                    data["role"],
                    id
                ))

            d.commit()

            return jsonify({
                "status":"success",
                "message":"Akun guru berhasil diperbarui"
            })

        except Exception as e:
            return jsonify({
                "status":"error",
                "message": str(e)
            })

@master_bp.route("/api/akun/delete/<int:id>", methods=["DELETE"])
@roles_required("ADMIN_LEADERSHIP")
def api_delete_akun(id):
    with db() as d:
        try:
            d.execute("DELETE FROM akun WHERE id=?", (id,))
            d.commit()
            return jsonify({"status":"success","message":"Akun guru berhasil dihapus"})
        except Exception as e:
            return jsonify({"status":"error","message": str(e)})
        

@master_bp.route("/sekolah/kelas/delete/<int:id>", methods=["DELETE"])
@roles_required("ADMIN_LEADERSHIP")
def delete_kelas(id):
    with db() as d:
        try:
            # 🔎 Cek apakah ada siswa di kelas ini
            siswa = d.execute(
                "SELECT id FROM siswa WHERE kelas_id = ? LIMIT 1",
                (id,)
            ).fetchone()

            if siswa:
                return jsonify({
                    "success": False,
                    "message": "Kelas tidak bisa dihapus karena masih memiliki siswa."
                })

            # ✅ Kalau tidak ada siswa → hapus
            d.execute("DELETE FROM kelas WHERE id = ?", (id,))
            d.commit()

            return jsonify({
                "success": True,
                "message": "Kelas berhasil dihapus."
            })

        except Exception as e:
            return jsonify({
                "success": False,
                "message": str(e)
            })
