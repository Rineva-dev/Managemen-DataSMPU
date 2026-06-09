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

            # update status
            d.execute("""
                UPDATE pembayaran_pending
                SET status = 'DITERIMA'
                WHERE id = %s
            """, (pembayaran_id,))

            # insert pembayaran
            for item in details:

                # contoh item dari detail:
                # {"bulan": "Juli", "tahun": 2026, "nominal": 400000}

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
            return jsonify({
                "success": False,
                "error": "ID tidak valid"
            }), 400

        with db() as d:

            # ambil detail transaksi
            trx = d.execute("""
                SELECT detail
                FROM pembayaran_pending
                WHERE id = %s
            """, (pembayaran_id,)).fetchone()

            if not trx:
                return jsonify({
                    "success": False,
                    "error": "Data tidak ditemukan"
                }), 404

            # ubah transaksi jadi ditolak
            d.execute("""
                UPDATE pembayaran_pending
                SET status = 'DITOLAK'
                WHERE id = %s
            """, (pembayaran_id,))

            # kembalikan item cart ke CART
            import json

            details = json.loads(
                trx["detail"] or "[]"
            )

            for item in details:

                cart_id = item.get("cart_id")

                if cart_id:

                    d.execute("""
                        UPDATE cart_pembayaran
                        SET status = 'CART'
                        WHERE id = %s
                    """, (cart_id,))
            
            row = d.execute("""
                SELECT siswa_id
                FROM pembayaran_pending
                WHERE id = %s
            """, (pembayaran_id,)).fetchone()

            if row:
                d.execute("""
                    UPDATE cart_pembayaran
                    SET status = 'CART'
                    WHERE siswa_id = %s
                    AND status = 'PENDING'
                """, (row["siswa_id"],))

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