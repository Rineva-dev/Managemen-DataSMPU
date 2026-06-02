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
        active_page="pembayaran_siswa",
        show_riwayat=False
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
# HALAMAN RIWAYAT PEMBAYARAN
# /pembayaran/riwayat/<nisn>
# =====================================================
@pembayaran_bp.route("/pembayaran/riwayat/<nisn>")
def halaman_riwayat_pembayaran(nisn):
    return render_template(
        "dashboard.html",
        active_page="pembayaran_siswa",
        show_riwayat=True,
        riwayat_nisn=nisn
    )

@pembayaran_bp.route("/api/pembayaran/riwayat/<nisn>")
@roles_required("admin", "bendahara")
def api_riwayat_pembayaran(nisn):
    jenis = request.args.get("jenis")
    bulan = request.args.get("bulan")
    page  = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))
    offset = (page - 1) * limit

    query = """
        SELECT id, jenis, bulan, tanggal, nominal
        FROM pembayaran
        WHERE nisn = %s
    """
    params = [nisn]

    if jenis:
        query += " AND jenis = %s"
        params.append(jenis)

    if bulan:
        query += " AND bulan = %s"
        params.append(bulan)

    query += " ORDER BY tanggal DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    conn = db()
    cur = conn.cursor()
    cur.execute(query, params)
    rows = cur.fetchall()

    cur.execute(
        "SELECT COUNT(*) FROM pembayaran WHERE nisn = %s",
        (nisn,)
    )
    total = cur.fetchone()[0]

    conn.close()

    return jsonify({
        "data": [
            {
                "id": r[0],
                "jenis": r[1],
                "bulan": r[2],
                "tanggal": str(r[3]),
                "nominal": r[4]
            } for r in rows
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total
        }
    })
    
@pembayaran_bp.route("/api/pembayaran/riwayat/<nisn>/summary")
@roles_required("admin", "bendahara")
def summary_pembayaran(nisn):
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            COUNT(*) AS total_transaksi,
            COALESCE(SUM(nominal), 0),
            MAX(tanggal)
        FROM pembayaran
        WHERE nisn = %s
    """, (nisn,))

    row = cur.fetchone()
    conn.close()

    return jsonify({
        "total_transaksi": row[0],
        "total_nominal": row[1],
        "terakhir_bayar": str(row[2]) if row[2] else None
    })