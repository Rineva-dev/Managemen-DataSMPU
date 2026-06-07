from flask import Blueprint, render_template, request, abort, jsonify
from utils.db import db

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