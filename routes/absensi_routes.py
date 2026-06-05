from flask import Blueprint, render_template, request, jsonify, session
from utils.db import db
from utils.decorators import roles_required
from datetime import datetime, timezone, timedelta
from flask import abort

absensi_bp = Blueprint("absensi", __name__)

WITA = timezone(timedelta(hours=8))

def now_wita():
    return datetime.now(WITA)

@absensi_bp.route("/absensi-harian")
@roles_required(exclude=["admin"])
def absensi_harian():
    return render_template(
        "dashboard.html",
        active_page="absensi_harian"
    )

@absensi_bp.route("/log-pembelajaran")
@roles_required("NON_ADMIN")
def log_pembelajaran():

    with db() as d:
        guru_data = d.execute(
            "SELECT * FROM guru WHERE id=?",
            (session["user_id"],)
        ).fetchone()
        timestamp = int(now_wita().timestamp())

    return render_template(
        "log_pembelajaran.html",
        guru=guru_data,
        current_time=timestamp
    )

@absensi_bp.route("/api/absensi", methods=["GET"])
@roles_required("NON_ADMIN")
def api_get_absensi():

    guru_id = session["user_id"]

    with db() as d:
        rows = d.execute("""
            SELECT id, tanggal, status, jam_masuk, jam_keluar, alasan
            FROM absensi
            WHERE guru_id = ?
            ORDER BY tanggal DESC, id DESC
        """, (guru_id,)).fetchall()

    result = []
    for r in rows:
        result.append({
            "tanggal": r["tanggal"],
            "status": r["status"],
            "jamMasuk": r["jam_masuk"] or "",
            "jamPulang": r["jam_keluar"] or "",
            "alasan": r["alasan"] or ""
        })

    return jsonify(result)

@absensi_bp.route('/api/absensi/guru', methods=['GET', 'POST'])
@roles_required("NON_ADMIN")
def api_absensi_guru():
    guru_id = session["user_id"]
    today = now_wita().date().isoformat()

    with db() as d:
        if request.method == "GET":
            rows = d.execute("""
                SELECT tanggal, jam_masuk, jam_keluar, status, alasan
                FROM absensi
                WHERE guru_id=? AND tanggal=?
                ORDER BY id DESC
            """, (guru_id, today)).fetchall()

            status = "belum_absen"
            jam_masuk = None
            jam_keluar = None
            alasan = None

            for row in rows:
                if row["status"] == "izin_tidak_masuk":
                    status = "izin_tidak_masuk"
                    alasan = row["alasan"]
                    jam_masuk = None
                    jam_keluar = None
                    break
                elif row["status"] == "keluar":
                    status = "sudah_keluar"
                    jam_keluar = row["jam_keluar"]
                    alasan = row["alasan"]
                    break
                elif row["status"] in ("masuk", "terlambat"):
                    status = "sudah_masuk"
                    jam_masuk = row["jam_masuk"]
                    alasan = row["alasan"]

            return jsonify({
                "tanggal": today,
                "jam_masuk": jam_masuk,
                "jam_keluar": jam_keluar,
                "status": status,
                "alasan": alasan
            })

        data = request.get_json(silent=True) or {}
        status_request = data.get("status")
        alasan = data.get("alasan")

        if not status_request:
            return jsonify({"status": "error", "message": "Payload tidak valid"}), 400

        now = now_wita()
        tanggal = now.date().isoformat()
        jam_sekarang = now.strftime("%H:%M:%S")
        jam = now.hour
        menit = now.minute

        existing_absensi = d.execute("""
            SELECT id FROM absensi WHERE guru_id=? AND tanggal=?
        """, (guru_id, tanggal)).fetchone()

        if status_request == "masuk":

            if jam > 13:
                return jsonify({
                    "status": "error",
                    "message": "Sudah lewat batas waktu absen masuk"
                }), 400

            batas_terlambat = (7 * 60) + 30
            total_menit = jam * 60 + menit

            if total_menit > batas_terlambat and not alasan:
                return jsonify({
                    "need_reason": True,
                    "message": "Anda terlambat, silakan isi alasan"
                }), 400

            final_status = "terlambat" if total_menit > batas_terlambat else "masuk"

            if existing_absensi:
                d.execute("""
                    UPDATE absensi
                    SET status=?, jam_masuk=?, alasan=?, updated_at=?
                    WHERE guru_id=? AND tanggal=?
                """, (final_status, jam_sekarang, alasan, now.isoformat(), guru_id, tanggal))
            else:
                d.execute("""
                    INSERT INTO absensi
                    (guru_id, tanggal, status, jam_masuk, alasan, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (guru_id, tanggal, final_status, jam_sekarang, alasan, now.isoformat()))

            d.commit()

            return jsonify({
                "status": "success",
                "state": "sudah_masuk",
                "final_status": final_status
            })

        elif status_request == "keluar":

            if jam < 15:
                return jsonify({
                    "status": "error",
                    "message": "Belum waktunya absen keluar"
                }), 400

            d.execute("""
                UPDATE absensi
                SET jam_keluar=?, updated_at=?
                WHERE guru_id=? AND tanggal=?
            """, (jam_sekarang, now.isoformat(), guru_id, tanggal))

            d.commit()

            return jsonify({"status": "success"})

        elif status_request == "izin_tidak_masuk":

            if jam >= 13:
                return jsonify({
                    "status": "error",
                    "message": "Batas waktu izin hari ini sudah lewat"
                }), 400

            if not alasan:
                return jsonify({
                    "status": "error",
                    "message": "Alasan wajib diisi"
                }), 400

            if existing_absensi:
                d.execute("""
                    UPDATE absensi
                    SET status=?, alasan=?, updated_at=?
                    WHERE guru_id=? AND tanggal=?
                """, ("izin_tidak_masuk", alasan, now.isoformat(), guru_id, tanggal))
            else:
                d.execute("""
                    INSERT INTO absensi
                    (guru_id, tanggal, status, alasan, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (guru_id, tanggal, "izin_tidak_masuk", alasan, now.isoformat()))

            d.commit()

            return jsonify({
                "status": "success",
                "state": "izin_tidak_masuk"
            })

@absensi_bp.route('/api/absensi/status')
def absensi_status():

    if session.get("role") == "admin":
        return jsonify({"state": "no_absen"})

    guru_id = session["user_id"]
    today = now_wita().date().isoformat()

    with db() as d:
        # Ambil semua data absensi untuk guru dan tanggal ini
        rows = d.execute("""
            SELECT status, jam_keluar
            FROM absensi
            WHERE guru_id=? AND tanggal=?
            ORDER BY id DESC
        """, (guru_id, today)).fetchall()

        # Tentukan status absensi berdasarkan data yang ada
        state = "belum_absen"
        for row in rows:
            if row["status"] == "izin_tidak_masuk":
                state = "izin_tidak_masuk"
                break

            elif row["jam_keluar"]:
                state = "sudah_keluar"
                break

            elif row["status"] in ("masuk", "terlambat"):
                state = "sudah_masuk"

        return jsonify({"state": state})

@absensi_bp.route("/api/admin/absensi", methods=["GET"])
@roles_required("ADMIN_LEADERSHIP")
def api_admin_absensi():
    with db() as d:
        rows = d.execute("""
            SELECT 
                a.id,
                a.guru_id,
                g.nama,
                a.tanggal,
                a.status,
                a.jam_masuk,
                a.jam_keluar,
                a.alasan,
                a.updated_at
            FROM absensi a
            JOIN guru g ON a.guru_id = g.id
            ORDER BY a.updated_at DESC
        """).fetchall()

        def format_status(status):
            if not status:
                return ""

            return status.replace("_", " ").title()
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "guru_id": r["guru_id"],
                "nama": r["nama"],
                "tanggal": r["tanggal"],
                "status": format_status(r["status"]),
                "jam_masuk": r["jam_masuk"],
                "jam_keluar": r["jam_keluar"],
                "alasan": r["alasan"],
                "updated_at": r["updated_at"]
            })

        return jsonify(result)
    
@absensi_bp.route('/dev-reset-guru', methods=['POST'])
@roles_required("ADMIN_ONLY")
def dev_reset_guru():
    if "user_id" not in session or session.get("role") != "admin":
        return jsonify({
            "status": "error",
            "message": "Unauthorized"
        }), 403 
    data = request.get_json(silent=True) or {}
    guru_id = data.get("guru_id")

    if not guru_id:
        return jsonify({"status": "error", "message": "guru_id required"}), 400

    with db() as d:
        try:
            d.execute("""
                DELETE FROM absensi
                WHERE guru_id = ?
            """, (guru_id,))
            d.commit()
            return jsonify({
                "status": "success",
                "message": "Semua data absensi guru berhasil direset"
            }), 200
        except Exception as e:
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500
