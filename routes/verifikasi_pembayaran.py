from flask import Blueprint, render_template, jsonify, request

from utils.db import db

verifikasi_bp = Blueprint("verifikasi", __name__,)

@verifikasi_bp.route("/verifikasi-pembayaran")
def verifikasi_pembayaran_page():

    return render_template(
        "dashboard.html",
        active_page="pembayaran_siswa",
        show_verifikasi_pembayaran=True
    )

@verifikasi_bp.route("/verifikasi-pembayaran/list")
def verifikasi_pembayaran_list():

    try:

        with db() as d:

            rows = d.execute("""
                SELECT
                    pp.id,
                    pp.siswa_id,
                    pp.metode,
                    pp.total,
                    pp.detail,
                    pp.status,
                    pp.bukti,
                    pp.created_at,

                    s.nama,
                    s.nisn,

                    k.tingkat,
                    k.sub_kelas

                FROM pembayaran_pending pp

                LEFT JOIN siswa s
                    ON s.id = pp.siswa_id

                LEFT JOIN kelas_siswa ks
                    ON ks.siswa_id = s.id

                LEFT JOIN kelas k
                    ON k.id = ks.kelas_id

                WHERE pp.status IN (
                    'MENUNGGU',
                    'MENUNGGU VERIFIKASI',
                    'PENDING'
                )

                ORDER BY pp.created_at DESC
            """).fetchall()

        result = []

        for r in rows:

            result.append({
                "id": r["id"],
                "nama": r["nama"],
                "nisn": r["nisn"],
                "kelas": f'{r["tingkat"]} {r["sub_kelas"]}',
                "metode": r["metode"],
                "total": r["total"],
                "detail": r["detail"],
                "status": r["status"],
                "bukti": r["bukti"],
                "tanggal": r["created_at"].strftime(
                    "%d-%m-%Y %H:%M"
                ) if r["created_at"] else "-"
            })

        return jsonify(result)

    except Exception as e:

        import traceback
        traceback.print_exc()

        return jsonify([])
    
@verifikasi_bp.route("/verifikasi-pembayaran/approve", methods=["POST"])
def approve_pembayaran():
    try:
        data = request.get_json()
        pembayaran_id = data.get("id")

        if not pembayaran_id:
            return jsonify({"success": False, "error": "ID tidak valid"}), 400

        with db() as d:

            trx = d.execute("""
                SELECT 
                    pp.*,
                    s.nisn
                FROM pembayaran_pending pp
                JOIN siswa s ON s.id = pp.siswa_id
                WHERE pp.id = %s
            """, (pembayaran_id,)).fetchone()

            if not trx:
                return jsonify({"success": False, "error": "Data tidak ditemukan"}), 404

            nisn = trx["nisn"]
            siswa_id = trx["siswa_id"]  # <-- ambil siswa_id
            import json

            details = json.loads(trx["detail"] or "[]")

            bulan_map = {
                "januari": 1,
                "februari": 2,
                "maret": 3,
                "april": 4,
                "mei": 5,
                "juni": 6,
                "juli": 7,
                "agustus": 8,
                "september": 9,
                "oktober": 10,
                "november": 11,
                "desember": 12
            }

            # update status pembayaran_pending
            d.execute("""
                UPDATE pembayaran_pending
                SET status = 'DITERIMA'
                WHERE id = %s
            """, (pembayaran_id,))

            # ==============================================
            # TAMBAHAN: Ubah status cart jadi SELESAI
            # ==============================================
            for item in details:
                bulan_text = item.get("bulan")
                tahun = item.get("tahun")

                bulan = None
                if isinstance(bulan_text, int):
                    bulan = bulan_text
                elif bulan_text:
                    bulan = bulan_map.get(str(bulan_text).strip().lower())

                if bulan and tahun:
                    d.execute("""
                        UPDATE cart_pembayaran
                        SET status = 'SELESAI'
                        WHERE siswa_id = %s
                          AND jenis = 'SPP'
                          AND bulan = %s
                          AND tahun = %s
                    """, (siswa_id, bulan, tahun))
            # ==============================================

            # insert ke tabel pembayaran
            for item in details:

                bulan_text = item.get("bulan")
                tahun = item.get("tahun")
                nominal = item.get("nominal") or 0

                bulan = None

                if isinstance(bulan_text, int):
                    bulan = bulan_text
                elif bulan_text:
                    bulan = bulan_map.get(str(bulan_text).strip().lower())

                if not bulan or not tahun:
                    continue

                d.execute("""
                    INSERT INTO pembayaran (
                        nisn,
                        jenis,
                        bulan,
                        tahun,
                        tanggal,
                        nominal,
                        status
                    )
                    VALUES (%s, %s, %s, %s, CURRENT_DATE, %s, %s)
                """, (
                    nisn,
                    "SPP",
                    bulan,
                    tahun,
                    nominal,
                    "DITERIMA"
                ))

        return jsonify({"success": True})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
    
@verifikasi_bp.route("/verifikasi-pembayaran/reject", methods=["POST"])
def reject_pembayaran():
    try:
        data = request.get_json()
        pembayaran_id = data.get("id")

        if not pembayaran_id:
            return jsonify({"success": False, "error": "ID tidak valid"}), 400

        with db() as d:

            trx = d.execute("""
                SELECT siswa_id, detail
                FROM pembayaran_pending
                WHERE id = %s
            """, (pembayaran_id,)).fetchone()

            if not trx:
                return jsonify({"success": False, "error": "Data tidak ditemukan"}), 404
            
            siswa_id = trx["siswa_id"]
            import json
            items = json.loads(trx["detail"] or "[]")

            d.execute("""
                UPDATE pembayaran_pending
                SET status = 'DITOLAK'
                WHERE id = %s
            """, (pembayaran_id,))

            for item in items:
                jenis = item.get("jenis", "SPP")
                bulan = item.get("bulan")
                tahun = item.get("tahun")
                nominal = item.get("nominal", 0)

                sudah_ada = d.execute("""
                    SELECT id FROM cart_pembayaran
                    WHERE siswa_id = %s
                      AND jenis = %s
                      AND COALESCE(bulan, -1) = COALESCE(%s, -1)
                      AND COALESCE(tahun, -1) = COALESCE(%s, -1)
                      AND status = 'CART'
                """, (siswa_id, jenis, bulan, tahun)).fetchone()

                if not sudah_ada:
                    d.execute("""
                        INSERT INTO cart_pembayaran (
                            siswa_id, jenis, bulan, tahun, nominal, status
                        ) VALUES (%s, %s, %s, %s, %s, 'CART')
                    """, (siswa_id, jenis, bulan, tahun, nominal))

        return jsonify({"success": True, "message": "Pembayaran ditolak, tagihan dikembalikan ke keranjang."})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500