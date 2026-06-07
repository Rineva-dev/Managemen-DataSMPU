from flask import Blueprint, render_template, request, abort, jsonify
from datetime import datetime, date
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

@public_bp.route("/tagihan-spp")
def tagihan_spp():

    siswa_id = request.args.get("siswa_id", type=int)
    if not siswa_id:
        return jsonify([])

    today = date.today()

    with db() as d:

        siswa = d.execute("""
            SELECT tanggal_masuk
            FROM siswa
            WHERE id=?
        """, (siswa_id,)).fetchone()

        if not siswa:
            return jsonify([])

        # ✅ AMAN UNTUK DATE / STRING
        tm = siswa["tanggal_masuk"]
        if isinstance(tm, str):
            tanggal_masuk = datetime.strptime(tm, "%Y-%m-%d").date()
        else:
            tanggal_masuk = tm

        # 🔑 BULAN MULAI TAGIHAN
        if tanggal_masuk.month <= 7:
            start = date(tanggal_masuk.year, 7, 1)
        else:
            start = date(tanggal_masuk.year, tanggal_masuk.month, 1)

        end = date(today.year, today.month, 1)

        lunas = d.execute("""
            SELECT bulan, tahun
            FROM pembayaran
            WHERE siswa_id=?
              AND LOWER(jenis)='spp'
              AND LOWER(status)='lunas'
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
                    "status": "Belum Dibayar"
                })

            if cur.month == 12:
                cur = date(cur.year + 1, 1, 1)
            else:
                cur = date(cur.year, cur.month + 1, 1)

    return jsonify(tagihan)