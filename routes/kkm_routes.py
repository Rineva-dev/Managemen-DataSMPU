from flask import (
    Blueprint,
    render_template,
    session,
    abort,
    jsonify,
    request
)

from utils.db import db


# =========================================
# BLUEPRINT
# =========================================

kkm_bp = Blueprint(
    "kkm",
    __name__,
    url_prefix="/kkm"
)


# =========================================
# HALAMAN KKM
# =========================================

@kkm_bp.route("/")
def index():

    role = session.get("role", "").lower().strip()

    if role not in ["admin", "waka_kurikulum"]:
        abort(403)

    with db() as d:

        rows = d.execute("""
            SELECT
                k.id,

                k.tingkat,
                k.mapel_id,

                mp.nama AS mapel,

                k.kkm

            FROM kkm k

            JOIN mata_pelajaran mp
                ON mp.id = k.mapel_id

            ORDER BY
                k.tingkat ASC,
                mp.nama ASC
        """).fetchall()

    return render_template(
        "dashboard.html",
        active_page="kkm",
        show_kkm=True,
        kkm_list=[dict(r) for r in rows]
    )


# =========================================
# UPDATE SINGLE
# =========================================

@kkm_bp.route("/api/update", methods=["POST"])
def update_kkm():

    role = session.get("role", "").lower().strip()

    if role not in ["admin", "waka_kurikulum"]:
        abort(403)

    data = request.get_json() or {}

    kkm_id = data.get("kkm_id")
    nilai_kkm = data.get("kkm")

    try:
        kkm_id = int(kkm_id)
        nilai_kkm = int(nilai_kkm)

    except:
        return jsonify({
            "success": False,
            "message": "Data tidak valid"
        }), 400

    if nilai_kkm < 0 or nilai_kkm > 100:
        return jsonify({
            "success": False,
            "message": "KKM harus 0 - 100"
        }), 400

    with db() as d:

        existing = d.execute("""
            SELECT id
            FROM kkm
            WHERE id = ?
        """, (kkm_id,)).fetchone()

        if not existing:
            return jsonify({
                "success": False,
                "message": "Data tidak ditemukan"
            }), 404

        d.execute("""
            UPDATE kkm
            SET kkm = ?
            WHERE id = ?
        """, (
            nilai_kkm,
            kkm_id
        ))

    return jsonify({
        "success": True,
        "message": "KKM berhasil diperbarui"
    })

# =========================================
# BULK UPDATE
# =========================================

@kkm_bp.route("/api/bulk-update", methods=["POST"])
def bulk_update_kkm():

    role = session.get("role", "").lower().strip()

    if role not in ["admin", "waka_kurikulum"]:
        abort(403)

    data = request.get_json() or {}

    items = data.get("items", [])

    if not items:
        return jsonify({
            "success": False,
            "message": "Data kosong"
        }), 400

    with db() as d:

        for item in items:

            mapel_id = item.get("mapel_id")
            tingkat = item.get("tingkat")
            nilai_kkm = item.get("kkm")

            try:
                mapel_id = int(mapel_id)
                tingkat = int(tingkat)
                nilai_kkm = int(nilai_kkm)

            except:
                continue

            if nilai_kkm < 0 or nilai_kkm > 100:
                continue

            # =====================================
            # UPDATE BERDASARKAN MAPEL + TINGKAT
            # =====================================

            d.execute("""
                UPDATE kkm
                SET kkm = ?
                WHERE mapel_id = ?
                AND tingkat = ?
            """, (
                nilai_kkm,
                mapel_id,
                tingkat
            ))

    return jsonify({
        "success": True,
        "message": "KKM berhasil diperbarui"
    })

# =========================================
# DETAIL KKM
# =========================================

@kkm_bp.route("/api/<int:kkm_id>")
def detail_kkm(kkm_id):

    role = session.get("role", "").lower().strip()

    if role not in [
        "admin",
        "waka_kurikulum",
        "guru",
        "wali_kelas",
        "kepala_sekolah"
    ]:
        abort(403)

    with db() as d:

        row = d.execute("""
            SELECT
                k.id,

                k.tingkat,
                k.mapel_id,

                mp.nama AS mapel,

                k.kkm

            FROM kkm k

            JOIN mata_pelajaran mp
                ON mp.id = k.mapel_id

            WHERE k.id = ?
        """, (kkm_id,)).fetchone()

    if not row:
        return jsonify({
            "success": False,
            "message": "Data tidak ditemukan"
        }), 404

    return jsonify({
        "success": True,
        "data": dict(row)
    })