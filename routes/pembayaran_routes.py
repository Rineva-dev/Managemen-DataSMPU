from flask import Blueprint, request, jsonify, render_template, session
from utils.db import db
from utils.decorators import roles_required
from datetime import datetime

pembayaran_bp = Blueprint("pembayaran", __name__)

@pembayaran_bp.route("/pembayaran-siswa")
@roles_required("admin", "bendahara")
def pembayaran_siswa_page():
    return render_template(
        "dashboard.html",
        active_page="pembayaran_siswa"
    )

# =====================================================
# AUTOCOMPLETE SISWA
# /api/siswa/search?q=
# =====================================================
@pembayaran_bp.route("/api/siswa/search")
@roles_required("admin", "bendahara")
def search_siswa():
    keyword = request.args.get("q", "")

    conn = db()
    cursor = conn.execute("""
        SELECT 
            s.nisn,
            s.nama,
            k.sub_kelas AS rombel,
            k.tingkat
        FROM siswa s
        LEFT JOIN kelas_siswa ks ON ks.siswa_id = s.id
        LEFT JOIN kelas k ON k.id = ks.kelas_id
        WHERE s.nama LIKE ? OR s.nisn LIKE ?
        LIMIT 10
    """, (f"%{keyword}%", f"%{keyword}%"))

    rows = cursor.fetchall()
    conn.close()

    return jsonify([dict(row) for row in rows])

# =====================================================
# LIST SISWA (TABLE)
# /api/pembayaran/siswa
# =====================================================
@pembayaran_bp.route("/api/pembayaran/siswa")
@roles_required("admin", "bendahara")
def list_siswa_pembayaran():
    search = request.args.get("search", "").strip()

    query = """
        SELECT DISTINCT
            s.nisn,
            s.nama,
            k.tingkat,
            k.sub_kelas AS rombel,
            s.status
        FROM siswa s
        LEFT JOIN kelas_siswa ks ON ks.siswa_id = s.id
        LEFT JOIN kelas k ON k.id = ks.kelas_id
    """

    params = []

    if search:
        query += " WHERE s.nama LIKE ? OR s.nisn LIKE ?"
        params.extend([f"%{search}%", f"%{search}%"])

    query += " ORDER BY s.nama ASC"

    conn = db()
    cur = conn.execute(query, tuple(params))
    rows = cur.fetchall()
    conn.close()

    return jsonify([dict(r) for r in rows])

# =====================================================
# SIMPAN PEMBAYARAN
# /api/pembayaran/simpan
# =====================================================
@pembayaran_bp.route("/api/pembayaran/simpan", methods=["POST"])
@roles_required("admin", "bendahara")
def simpan_pembayaran():
    data = request.get_json()

    required = ["nisn", "jenis", "bulan", "tanggal", "nominal"]
    for field in required:
        if field not in data or not data[field]:
            return jsonify({"error": f"{field} wajib diisi"}), 400

    nisn = data["nisn"]
    jenis = data["jenis"]
    bulan = data["bulan"]

    try:
        # ============================
        # 🔒 CEGAH SPP DOBEL
        # ============================
        conn = db()

        if jenis == "spp":
            cek = conn.execute("""
                SELECT 1 FROM pembayaran
                WHERE nisn = ? AND jenis = 'spp' AND bulan = ?
                LIMIT 1
            """, (nisn, bulan)).fetchone()

            if cek:
                conn.close()
                return jsonify({"error": "SPP sudah dibayar"}), 409

        conn.execute("""
            INSERT INTO pembayaran
            (nisn, jenis, bulan, tanggal, nominal)
            VALUES (?, ?, ?, ?, ?)
        """, (nisn, jenis, bulan, data["tanggal"], int(data["nominal"])))

        conn.commit()
        conn.close()

        return jsonify({"success": True})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =====================================================
# RIWAYAT PEMBAYARAN PER SISWA
# /api/pembayaran/riwayat/<nisn>
# =====================================================
@pembayaran_bp.route("/api/pembayaran/riwayat/<nisn>")
@roles_required("admin", "bendahara")
def riwayat_pembayaran(nisn):
    try:
        conn = db()
        cur = conn.cursor()

        cur.execute("""
            SELECT jenis, bulan, tanggal, nominal
            FROM pembayaran
            WHERE nisn = %s
            ORDER BY tanggal DESC
        """, (nisn,))

        rows = cur.fetchall()

        data = []
        for r in rows:
            data.append({
                "jenis": r[0] or "",
                "bulan": r[1] or "",
                "tanggal": str(r[2]) if r[2] else None,
                "nominal": r[3] or 0
            })

        cur.close()
        conn.close()

        return jsonify(data)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500