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

    q = request.args.get("q", "").strip()

    if len(q) < 2:
        return jsonify([])

    with db() as d:

        rows = d.execute("""
            SELECT
                id,
                nisn,
                nama,
                tingkat,
                sub_kelas
            FROM siswa
            WHERE status='aktif'
            AND (
                LOWER(nama) LIKE LOWER(?)
                OR nisn LIKE ?
            )
            ORDER BY nama
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
            "kelas": r["tingkat"],
            "rombel": r["sub_kelas"]
        }
        for r in rows
    ])