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

            d.execute("""
                UPDATE pembayaran_pending
                SET status = 'DITOLAK'
                WHERE id = %s
            """, (pembayaran_id,))

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