from flask import Blueprint, render_template, request, abort, jsonify, current_app
from datetime import datetime, date
from utils.db import db
from werkzeug.utils import secure_filename
import os
import uuid

public_bp = Blueprint(
    "public",
    __name__,
    url_prefix="/public"
)

@public_bp.before_request
def only_payment_domain():

    if not request.host.lower().startswith("payment."):
        abort(404)

@public_bp.route("/payment")
def payment():

    return render_template(
        "public/pembayaran-publik.html"
    )

@public_bp.route("/search-siswa")
def search_siswa():

    try:

        q = request.args.get("q", "").strip()

        if len(q) < 2:
            return jsonify([])

        with db() as d:

            rows = d.execute("""
                SELECT
                    s.id,
                    s.nisn,
                    s.nama,
                    s.status,
                    k.tingkat,
                    k.sub_kelas,
                    s.nama_ayah,
                    s.nama_ibu

                FROM siswa s

                LEFT JOIN kelas_siswa ks
                    ON ks.siswa_id = s.id

                LEFT JOIN kelas k
                    ON k.id = ks.kelas_id

                WHERE (
                    LOWER(s.nama) LIKE LOWER(?)
                    OR s.nisn LIKE ?
                )

                ORDER BY s.nama
                LIMIT 10
            """, (
                f"%{q}%",
                f"%{q}%"
            )).fetchall()

        return jsonify([
            {
                "id": r["id"],
                "nisn": r["nisn"],
                "nama": r["nama"],
                "tingkat": r["tingkat"],
                "sub_kelas": r["sub_kelas"],
                "status": r["status"],
                "nama_ayah": r["nama_ayah"],
                "nama_ibu": r["nama_ibu"]
            }
            for r in rows
        ])

    except Exception as e:

        import traceback

        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@public_bp.route("/tagihan-spp")
def tagihan_spp():

    siswa_id = request.args.get("siswa_id", type=int)
    if not siswa_id:
        return jsonify([])

    today = date.today()

    try:
        with db() as d:

            siswa = d.execute("""
                SELECT tahun_masuk, status, tanggal_nonaktif
                FROM siswa
                WHERE id=?
            """, (siswa_id,)).fetchone()

            if not siswa:
                return jsonify([])

            # tahun masuk
            try:
                tahun_masuk = int(siswa["tahun_masuk"])
            except:
                return jsonify([])

            # bulan pertama SPP
            start = date(tahun_masuk, 7, 1)

            # ===== HITUNG BATAS AKHIR =====
            end = date(today.year, today.month, 1)

            tanggal_nonaktif = siswa["tanggal_nonaktif"]

            if tanggal_nonaktif:
                na = tanggal_nonaktif

                if na.day <= 10:
                    if na.month == 1:
                        end = date(na.year - 1, 12, 1)
                    else:
                        end = date(na.year, na.month - 1, 1)
                else:
                    end = date(na.year, na.month, 1)

            # ===== DATA LUNAS =====
            lunas = d.execute("""
                SELECT
                    bulan,
                    EXTRACT(YEAR FROM tanggal)::int AS tahun
                FROM pembayaran
                WHERE nisn = (
                    SELECT nisn FROM siswa WHERE id = ?
                )
                AND jenis = 'SPP'
            """, (siswa_id,)).fetchall()

            lunas_set = {(r["bulan"], r["tahun"]) for r in lunas}

            tagihan = []
            cur = start

            while cur <= end:
                if (cur.month, cur.year) not in lunas_set:
                    tagihan.append({
                        "bulan": cur.month,
                        "tahun": cur.year,
                        "nominal": 400000,
                        "status": "BELUM"
                    })

                # next month
                if cur.month == 12:
                    cur = date(cur.year + 1, 1, 1)
                else:
                    cur = date(cur.year, cur.month + 1, 1)

        return jsonify(tagihan)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@public_bp.route("/tagihan-pembangunan")
def tagihan_pembangunan():

    siswa_id = request.args.get("siswa_id", type=int)
    if not siswa_id:
        return jsonify({})

    try:
        with db() as d:

            siswa = d.execute("""
                SELECT nisn
                FROM siswa
                WHERE id = %s
            """, (siswa_id,)).fetchone()

            if not siswa:
                return jsonify({})

            nisn = siswa["nisn"]

            # ======================
            # TOTAL SUDAH DIBAYAR
            # ======================
            row = d.execute("""
                SELECT COALESCE(SUM(nominal),0) AS total
                FROM pembayaran
                WHERE nisn = %s
                  AND jenis LIKE 'PEMBANGUNAN%%'
            """, (nisn,)).fetchone()

            total_terbayar = row["total"]

            # ======================
            # SEMESTER 1
            # ======================
            sem1 = d.execute("""
                SELECT COALESCE(SUM(nominal),0) AS total
                FROM pembayaran
                WHERE nisn = %s
                  AND jenis = 'PEMBANGUNAN_SEM1'
            """, (nisn,)).fetchone()["total"]

            # ======================
            # SEMESTER 2
            # ======================
            sem2 = d.execute("""
                SELECT COALESCE(SUM(nominal),0) AS total
                FROM pembayaran
                WHERE nisn = %s
                  AND jenis = 'PEMBANGUNAN_SEM2'
            """, (nisn,)).fetchone()["total"]

        return jsonify({
            "total": 5000000,
            "lunas": total_terbayar >= 5000000,
            "sem1": {
                "target": 3000000,
                "terbayar": sem1,
                "sisa": max(0, 3000000 - sem1)
            },
            "sem2": {
                "target": 2000000,
                "terbayar": sem2,
                "sisa": max(0, 2000000 - sem2)
            }
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    
@public_bp.route("/bayar-pembangunan", methods=["POST"])
def bayar_pembangunan():

    data = request.json

    siswa_id = data.get("siswa_id")
    nominal = int(data.get("nominal", 0))

    if nominal <= 0:
        return jsonify({"error": "Nominal tidak valid"}), 400

    with db() as d:

        siswa = d.execute("""
            SELECT nisn
            FROM siswa
            WHERE id=%s
        """, (siswa_id,)).fetchone()

        if not siswa:
            return jsonify({"error": "Siswa tidak ditemukan"}), 404

        nisn = siswa["nisn"]

        # total sebelumnya
        row = d.execute("""
            SELECT COALESCE(SUM(nominal),0) AS total
            FROM pembayaran
            WHERE nisn=?
              AND jenis LIKE 'PEMBANGUNAN%'
        """, (nisn,)).fetchone()

        total_sebelumnya = row["total"]

        sisa_total = 5000000 - total_sebelumnya
        if sisa_total <= 0:
            return jsonify({"error": "Pembangunan sudah lunas"}), 400

        if nominal > sisa_total:
            nominal = sisa_total  # auto potong

        # ======================
        # BAGI KE SEMESTER
        # ======================
        sem1_row = d.execute("""
            SELECT COALESCE(SUM(nominal),0) AS total
            FROM pembayaran
            WHERE nisn=?
              AND jenis='PEMBANGUNAN_SEM1'
        """, (nisn,)).fetchone()

        sem1_sisa = max(0, 3000000 - sem1_row["total"])

        inserts = []

        if sem1_sisa > 0:
            ambil = min(sem1_sisa, nominal)
            inserts.append(("PEMBANGUNAN_SEM1", ambil))
            nominal -= ambil

        if nominal > 0:
            inserts.append(("PEMBANGUNAN_SEM2", nominal))

        for jenis, jumlah in inserts:
            d.execute("""
                INSERT INTO pembayaran
                    (nisn, jenis, tanggal, nominal)
                VALUES (?, ?, CURRENT_DATE, ?)
            """, (nisn, jenis, jumlah))

    return jsonify({"success": True})

@public_bp.route("/tagihan-siswa")
def tagihan_siswa():

    siswa_id = request.args.get("siswa_id")

    return render_template(
        "public/tagihan-siswa.html",
        siswa_id=siswa_id
    )

@public_bp.route("/checkout")
def checkout():

    siswa_id = request.args.get("siswa_id")

    return render_template(
        "public/checkout.html",
        siswa_id=siswa_id
    )

@public_bp.route("/siswa-detail")
def siswa_detail():

    siswa_id = request.args.get("siswa_id", type=int)

    if not siswa_id:
        return jsonify({}), 400

    try:

        with db() as d:

            siswa = d.execute("""
                SELECT
                    s.id,
                    s.nama,
                    s.nisn,
                    s.status,
                    s.tempat_lahir,
                    s.tanggal_lahir,
                    s.alamat,
                    s.nama_ayah,
                    s.nama_ibu,
                    k.tingkat,
                    k.sub_kelas

                FROM siswa s

                LEFT JOIN kelas_siswa ks
                    ON ks.siswa_id = s.id

                LEFT JOIN kelas k
                    ON k.id = ks.kelas_id

                WHERE s.id = %s
            """, (siswa_id,)).fetchone()

        if not siswa:
            return jsonify({}), 404

        return jsonify({
            "id": siswa["id"],
            "nama": siswa["nama"],
            "nisn": siswa["nisn"],
            "status": siswa["status"],

            "tempat_lahir": siswa["tempat_lahir"],
            "tanggal_lahir": siswa["tanggal_lahir"] or "",
            "alamat": siswa["alamat"],

            "tingkat": siswa["tingkat"],
            "sub_kelas": siswa["sub_kelas"],

            "nama_ayah": siswa["nama_ayah"],
            "nama_ibu": siswa["nama_ibu"]
        })

    except Exception as e:

        import traceback
        traceback.print_exc()

        return jsonify({
            "error": str(e)
        }), 500
    
@public_bp.route("/upload-pembayaran", methods=["POST"])
def upload_pembayaran():

    try:

        siswa_id = request.form.get("siswa_id")
        total = request.form.get("total")
        metode = request.form.get("metode")

        file = request.files.get("bukti")

        if not siswa_id:
            return jsonify({
                "success": False,
                "error": "Siswa tidak ditemukan"
            }), 400

        if not total:
            return jsonify({
                "success": False,
                "error": "Total pembayaran kosong"
            }), 400

        if not file:
            return jsonify({
                "success": False,
                "error": "Bukti transfer wajib upload"
            }), 400

        # =========================
        # FOLDER UPLOAD
        # =========================
        upload_folder = os.path.join(
            current_app.static_folder,
            "uploads",
            "bukti"
        )

        os.makedirs(upload_folder, exist_ok=True)

        # =========================
        # NAMA FILE
        # =========================
        filename = secure_filename(file.filename)

        filename = (
            f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
        )

        filepath = os.path.join(upload_folder, filename)

        file.save(filepath)

        # =========================
        # SIMPAN DATABASE
        # =========================
        with db() as d:

            d.execute("""
                INSERT INTO pembayaran_pending (
                    siswa_id,
                    metode,
                    total,
                    bukti,
                    status
                )
                VALUES (%s, %s, %s, %s, %s)
            """, (
                siswa_id,
                metode,
                total,
                filename,
                "MENUNGGU VERIFIKASI"
            ))

        return jsonify({
            "success": True
        })

    except Exception as e:

        import traceback
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@public_bp.route("/submit-transfer", methods=["POST"])
def submit_transfer():

    siswa_id = request.form.get("siswa_id")
    total = request.form.get("total")

    file = request.files.get("bukti")

    if not siswa_id or not total or not file:
        return jsonify({
            "success": False,
            "message": "Data tidak lengkap"
        }), 400

    try:

        filename = secure_filename(file.filename)

        ext = filename.split(".")[-1]

        unique_name = f"{uuid.uuid4()}.{ext}"

        upload_path = os.path.join(
            "static",
            "uploads",
            "transfer",
            unique_name
        )

        file.save(upload_path)

        with db() as d:

            d.execute("""
                INSERT INTO pembayaran_public (
                    siswa_id,
                    metode,
                    total,
                    status,
                    bukti_transfer
                )
                VALUES (%s, %s, %s, %s, %s)
            """, (
                siswa_id,
                "TRANSFER",
                total,
                "MENUNGGU",
                unique_name
            ))

        return jsonify({
            "success": True
        })

    except Exception as e:

        import traceback
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
    
@public_bp.route("/status-pembayaran")
def status_pembayaran():

    siswa_id = request.args.get("siswa_id", type=int)

    if not siswa_id:
        return jsonify([])

    try:

        with db() as d:

            rows = d.execute("""
                SELECT
                    id,
                    metode,
                    total,
                    status,
                    created_at
                FROM pembayaran_pending
                WHERE siswa_id = %s
                ORDER BY created_at DESC
            """, (siswa_id,)).fetchall()

        result = []

        for r in rows:

            created_at = r["created_at"]

            if created_at:
                tanggal = created_at.strftime("%d-%m-%Y %H:%M")
            else:
                tanggal = "-"

            result.append({
                "id": r["id"],
                "metode": r["metode"],
                "total": r["total"],
                "status": r["status"],
                "tanggal": tanggal
            })

        return jsonify(result)

    except Exception as e:

        import traceback
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500