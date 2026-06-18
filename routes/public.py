from flask import Blueprint, render_template, request, abort, jsonify, current_app, send_from_directory
from datetime import datetime, date
from utils.db import db
from werkzeug.utils import secure_filename
import os, json, uuid

public_bp = Blueprint(
    "public",
    __name__,
    url_prefix="/public"
)

def get_tahun_pelajaran_by_date(d, tp_list):
    for tp in tp_list:
        if tp["semester_mulai"] <= d <= tp["semester_akhir"]:
            return tp["tahun_pelajaran"]
    return "-"

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

    try:
        with db() as d:

            # ==============================================
            # 1. DATA SISWA
            # ==============================================
            siswa = d.execute("""
                SELECT tahun_masuk, status, tanggal_nonaktif, nisn
                FROM siswa
                WHERE id = %s
            """, (siswa_id,)).fetchone()

            if not siswa:
                return jsonify([])

            tahun_masuk = int(siswa["tahun_masuk"])
            nisn = siswa["nisn"]

            # ==============================================
            # 2. RENTANG WAJIB SPP (FIX)
            # Juli tahun masuk → Juni tahun berikutnya
            # ==============================================
            tanggal_mulai = date(tahun_masuk, 7, 1)
            tanggal_akhir = date(tahun_masuk + 1, 6, 1)

            # ==============================================
            # 3. STOP JIKA NONAKTIF
            # ==============================================
            if siswa["tanggal_nonaktif"]:
                try:
                    tgl_nonaktif = siswa["tanggal_nonaktif"]
                    tanggal_akhir = min(tanggal_akhir, tgl_nonaktif)
                except:
                    pass

            if tanggal_akhir < tanggal_mulai:
                return jsonify([])

            # ==============================================
            # 4. DATA PEMBAYARAN LUNAS
            # ==============================================
            lunas = d.execute("""
                SELECT 
                    CAST(bulan AS INTEGER) AS bulan,
                    CAST(tahun AS INTEGER) AS tahun
                FROM pembayaran
                WHERE nisn = %s
                  AND jenis = 'SPP'
                  AND status IN ('DITERIMA', 'LUNAS')
            """, (nisn,)).fetchall()

            lunas_pending = d.execute("""
                SELECT detail
                FROM pembayaran_pending
                WHERE siswa_id = %s
                  AND status IN ('DITERIMA', 'LUNAS')
            """, (siswa_id,)).fetchall()

            lunas_set = set()
            for r in lunas:
                if r["bulan"] and r["tahun"]:
                    lunas_set.add((int(r["bulan"]), int(r["tahun"])))

            bulan_map = {
                "januari":1,"februari":2,"maret":3,"april":4,"mei":5,"juni":6,
                "juli":7,"agustus":8,"september":9,"oktober":10,"november":11,"desember":12
            }

            for p in lunas_pending:
                try:
                    items = json.loads(p["detail"] or "[]")
                    for it in items:
                        b = bulan_map.get(str(it.get("bulan","")).lower())
                        t = it.get("tahun")
                        if b and t:
                            lunas_set.add((b, int(t)))
                except:
                    pass

            # ==============================================
            # 5. TAHUN PELAJARAN (LABEL SAJA)
            # ==============================================
            tp_all = d.execute("""
                SELECT tahun_pelajaran, semester_mulai, semester_akhir
                FROM tahun_pelajaran
            """).fetchall()

            def get_tahun_pelajaran(tanggal):
                for tp in tp_all:
                    try:
                        sm = tp["semester_mulai"]
                        sa = tp["semester_akhir"]
                        if sm <= tanggal <= sa:
                            return tp["tahun_pelajaran"]
                    except:
                        pass
                return f"{tanggal.year}/{tanggal.year+1}"

            # ==============================================
            # 6. GENERATE TAGIHAN
            # ==============================================
            tagihan = []
            cur = tanggal_mulai

            while cur <= tanggal_akhir:
                if (cur.month, cur.year) not in lunas_set:
                    tagihan.append({
                        "bulan": cur.month,
                        "tahun": cur.year,
                        "tahun_pelajaran": get_tahun_pelajaran(cur),
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
        return jsonify([])
    
@public_bp.route("/tagihan-pembangunan")
def tagihan_pembangunan():
    siswa_id = request.args.get("siswa_id", type=int)
    if not siswa_id:
        return jsonify({})

    try:
        with db() as d:

            # 👇 BACA DATA LANGSUNG DARI TABEL cart_pembayaran
            # Ambil total yang sudah dibayar/dimasukkan untuk jenis PEMBANGUNAN
            total_terbayar = d.execute("""
                SELECT COALESCE(SUM(nominal), 0)::BIGINT AS total
                FROM cart_pembayaran
                WHERE siswa_id = %s
                  AND jenis = 'PEMBANGUNAN'
                  AND status IN ('CHECKED_OUT', 'DITERIMA')
            """, (siswa_id,)).fetchone()["total"] or 0

            # Target tetap sama seperti sebelumnya
            target_sem1 = 3000000
            target_sem2 = 2000000
            total_target = target_sem1 + target_sem2

            # Hitung pembagian ke semester (karena di tabel cuma satu nama)
            # Logika: Isi dulu Sem 1 sampai penuh, sisa masuk ke Sem 2
            terima_sem1 = min(total_terbayar, target_sem1)
            terima_sem2 = max(0, total_terbayar - target_sem1)

            sisa_sem1 = max(0, target_sem1 - terima_sem1)
            sisa_sem2 = max(0, target_sem2 - terima_sem2)

            is_lunas = (total_terbayar >= total_target)

            return jsonify({
                "total": total_target,
                "lunas": is_lunas,
                "sem1": {
                    "target": target_sem1,
                    "terbayar": terima_sem1,
                    "sisa": sisa_sem1
                },
                "sem2": {
                    "target": target_sem2,
                    "terbayar": terima_sem2,
                    "sisa": sisa_sem2
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
            WHERE nisn=%s
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
            WHERE nisn=%s
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
        detail = request.form.get("detail")
        detail_json = json.loads(detail or "[]")
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
        upload_folder = "/var/smpu-storage/bukti"
        os.makedirs(upload_folder, exist_ok=True)

        # =========================
        # NAMA FILE
        # =========================
        original_name = secure_filename(file.filename)

        filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{original_name}"

        filepath = os.path.join(upload_folder, filename)

        file.save(filepath)

        # =========================
        # SIMPAN DATABASE
        # =========================
        with db() as d:

            # =========================
            # UPDATE CART -> PENDING
            # =========================

            for item in detail_json:

                cart_id = (
                    item.get("cart_id")
                    or item.get("id")
                )

                if cart_id:
                    d.execute("""
                        UPDATE cart_pembayaran
                        SET status = 'CHECKED_OUT'
                        WHERE id = %s
                    """, (cart_id,))

            d.execute("""
                INSERT INTO pembayaran_pending (
                    siswa_id,
                    metode,
                    total,
                    detail,
                    bukti,
                    status,
                    created_at
                )
                VALUES (%s, %s, %s, %s, %s, 'MENUNGGU VERIFIKASI', CURRENT_TIMESTAMP)
            """, (
                siswa_id,
                metode,
                total,
                detail,
                filename
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
    
@public_bp.route("/bukti/<filename>")
def bukti_file(filename):
    return send_from_directory(
        "/var/smpu-storage/bukti",
        filename
    )

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
                    siswa_id,
                    metode,
                    total,
                    detail,
                    status,
                    created_at,
                    kode_pembayaran, 
                    qr_image,
                    expired_at
                FROM pembayaran_pending
                WHERE siswa_id = %s
                AND status IN (
                        'MENUNGGU',
                        'MENUNGGU VERIFIKASI',
                        'PENDING',
                        'MENUNGGU PEMBAYARAN'
                )
                ORDER BY created_at DESC
            """, (siswa_id,)).fetchall()

        result = []

        for r in rows:

            # Format tanggal dibuat
            if r["created_at"]:
                tanggal = r["created_at"].strftime("%d-%m-%Y %H:%M")
            else:
                tanggal = "-"

            # ✅ PERBAIKAN BAGIAN EXPIRED_AT (AMAN DARI ERROR)
            expired_at_formatted = ""
            if r["expired_at"] is not None: # Cek apakah isinya benar-benar ada
                expired_at_formatted = r["expired_at"].strftime("%Y-%m-%d %H:%M:%S")

            result.append({
                "id": r["id"],
                "metode": r["metode"],
                "total": r["total"],
                "detail": r["detail"],
                "status": r["status"],
                "tanggal": tanggal,
                "kode_pembayaran": r["kode_pembayaran"] if r["kode_pembayaran"] else "",
                "qr_image": r["qr_image"] if r["qr_image"] else "",
                "expired_at": expired_at_formatted
            })

        return jsonify(result)

    except Exception as e:

        import traceback
        traceback.print_exc()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    
@public_bp.route("/riwayat-pembayaran")
def riwayat_pembayaran():

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
                    detail,
                    status,
                    created_at
                FROM pembayaran_pending
                WHERE siswa_id = %s
                  AND status IN (
                        'DITOLAK',
                        'DITERIMA',
                        'LUNAS'
                  )
                ORDER BY created_at DESC
            """, (siswa_id,)).fetchall()

        result = []

        for r in rows:

            result.append({
                "id": r["id"],
                "metode": r["metode"],
                "total": r["total"],
                "detail": r["detail"],
                "status": r["status"],
                "tanggal": (
                    r["created_at"].strftime("%d-%m-%Y %H:%M")
                    if r["created_at"]
                    else "-"
                )
            })

        return jsonify(result)

    except Exception as e:

        import traceback
        traceback.print_exc()

        return jsonify([]), 500
    
@public_bp.route("/add-cart", methods=["POST"])
def add_cart():

    data = request.json

    siswa_id = data.get("siswa_id")
    jenis = data.get("jenis")
    bulan = data.get("bulan")
    tahun = data.get("tahun")
    nominal = data.get("nominal")

    if not siswa_id or not jenis or not nominal:
        return jsonify({
            "success": False,
            "error": "Data tidak lengkap"
        }), 400

    try:

        with db() as d:

            # =========================
            # CEK DUPLIKAT CART
            # =========================
            existing = d.execute("""
                SELECT id
                FROM cart_pembayaran
                WHERE siswa_id = %s
                  AND jenis = %s
                  AND COALESCE(bulan,0) = COALESCE(%s,0)
                  AND COALESCE(tahun,0) = COALESCE(%s,0)
                  AND status IN ('CART', 'PENDING')
            """, (
                siswa_id,
                jenis,
                bulan,
                tahun
            )).fetchone()

            if existing:
                return jsonify({
                    "success": False,
                    "error": "Tagihan sudah ada"
                }), 400

            # =========================
            # INSERT CART
            # =========================
            d.execute("""
                INSERT INTO cart_pembayaran (
                    siswa_id,
                    jenis,
                    bulan,
                    tahun,
                    nominal,
                    status
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s,
                    'CART'
                )
            """, (
                siswa_id,
                jenis,
                bulan,
                tahun,
                nominal
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
    
@public_bp.route("/cart")
def cart_list():

    siswa_id = request.args.get(
        "siswa_id",
        type=int
    )

    if not siswa_id:
        return jsonify([])

    try:

        with db() as d:

            rows = d.execute("""
                SELECT
                    id,
                    jenis,
                    bulan,
                    tahun,
                    nominal,
                    status
                FROM cart_pembayaran
                WHERE siswa_id = %s
                AND status = 'CART'
                ORDER BY created_at DESC
            """, (siswa_id,)).fetchall()

        return jsonify([
            {
                "id": r["id"],
                "jenis": r["jenis"],
                "bulan": r["bulan"],
                "tahun": r["tahun"],
                "nominal": r["nominal"],
                "status": r["status"]
            }
            for r in rows
        ])

    except Exception as e:

        import traceback
        traceback.print_exc()

        return jsonify([]), 500
    
@public_bp.route("/cart/delete/<int:cart_id>", methods=["DELETE"])
def delete_cart(cart_id):

    try:

        with db() as d:

            d.execute("""
                DELETE FROM cart_pembayaran
                WHERE id = ?
            """, (cart_id,))

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
    
@public_bp.route("/retry-pembayaran", methods=["POST"])
def retry_pembayaran():
    data = request.json
    pending_id = data.get("pending_id")

    with db() as d:

        trx = d.execute("""
            SELECT siswa_id, detail
            FROM pembayaran_pending
            WHERE id = %s AND status = 'DITOLAK'
        """, (pending_id,)).fetchone()

        if not trx:
            return jsonify({"error": "Invalid"}), 400

        import json
        details = json.loads(trx["detail"] or "[]")

        # recreate cart dari rejected transaction
        for item in details:
            d.execute("""
                INSERT INTO cart_pembayaran (
                    siswa_id, jenis, bulan, tahun, nominal, status
                ) VALUES (%s,%s,%s,%s,%s,'CART')
            """, (
                trx["siswa_id"],
                "SPP",
                item.get("bulan"),
                item.get("tahun"),
                item.get("nominal")
            ))

    return jsonify({"success": True})

# ==============================================
# RUTE BARU: GENERATE PEMBAYARAN VA / QRIS
# ==============================================
from datetime import datetime, timedelta
import uuid

@public_bp.route("/generate-pembayaran", methods=["POST"])
def generate_pembayaran():
    try:
        siswa_id = request.form.get("siswa_id")
        total_str = request.form.get("total") # Ambil sebagai teks dulu
        metode = request.form.get("metode")
        detail = request.form.get("detail")

        # ==============================================
        # ✅ PERBAIKAN VALIDASI & KONVERSI TOTAL
        # ==============================================
        # Cek kelengkapan data DULU
        if not siswa_id:
            return jsonify({"success": False, "error": "ID Siswa tidak valid"}), 400

        if not total_str:
            total_str = "0"

        if not detail:
            detail = "[]"

        # Baru ubah ke angka dengan aman
        try:
            total = int(float(total_str))
        except ValueError:
            return jsonify({"success": False, "error": "Format total salah"}), 400

        if total <= 0:
            return jsonify({"success": False, "error": "Total pembayaran tidak boleh nol"}), 400

        # ==============================================
        # LANJUT KE PROSES
        # ==============================================
        with db() as d:

            d.execute("""
                UPDATE pembayaran_pending 
                SET status = 'DIBATALKAN' 
                WHERE siswa_id = %s 
                AND status = 'MENUNGGU PEMBAYARAN'
                AND metode = %s  -- <--- TAMBAHKAN BARIS INI
            """, (siswa_id, metode))

            # =========================
            # 1. BUAT KODE & DATA
            # =========================
            kode_unik = ""
            qr_image = ""
            expired_at = datetime.now() + timedelta(hours=24)

            if metode == "VA":
                kode_unik = f"8882{siswa_id}{int(datetime.now().timestamp()) % 1000000}"
            
            elif metode == "QRIS":
                kode_unik = f"QR-{uuid.uuid4().hex[:12]}"
                qr_image = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + kode_unik

            else:
                return jsonify({"success": False, "error": "Metode tidak dikenali"}), 400

            # =========================
            # 2. UBAH STATUS KERANJANG
            # =========================
            try:
                detail_json = json.loads(detail)
            except:
                return jsonify({"success": False, "error": "Data detail keranjang rusak"}), 400

            for item in detail_json:
                cart_id = item.get("cart_id") or item.get("id")
                if cart_id:
                    d.execute("""
                        UPDATE cart_pembayaran 
                        SET status = 'CHECKED_OUT' 
                        WHERE id = %s 
                        AND status = 'CART'
                    """, (cart_id,))

            # =========================
            # 3. SIMPAN KE DATABASE
            # =========================
            d.execute("""
                INSERT INTO pembayaran_pending (
                    siswa_id, metode, total, detail, status, 
                    kode_pembayaran, qr_image, expired_at, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            """, (
                siswa_id,
                metode,
                total,       # ✅ Angka yang sudah aman
                detail,      # ✅ JSON asli lengkap
                "MENUNGGU PEMBAYARAN",
                kode_unik,
                qr_image,
                expired_at
            ))

        # =========================
        # 4. KIRIM BALASAN KE JS
        # =========================
        return jsonify({
            "success": True,
            "data": {
                "kode": kode_unik,
                "qr_image": qr_image,
                "expired": expired_at.strftime("%Y-%m-%d %H:%M:%S")
            }
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Server Error: {str(e)}"}), 500
    
@public_bp.route("/get-cart")
def get_cart():
    siswa_id = request.args.get("siswa_id", type=int)
    if not siswa_id:
        return jsonify([])
    
    with db() as d:
        # ✅ HANYA ambil barang yang statusnya CART (belum dibayar)
        rows = d.execute("""
            SELECT id, jenis, bulan, tahun, nominal, status 
            FROM cart_pembayaran 
            WHERE siswa_id = %s 
              AND status = 'CART'  -- <--- UBAH DI SINI, JANGAN AMBIL YANG CHECKED_OUT
            ORDER BY created_at DESC
        """, (siswa_id,)).fetchall()
        
        return jsonify([dict(r) for r in rows])