from flask import Blueprint, request, jsonify, session
from utils.db import db
from utils.decorators import roles_required
from datetime import datetime, timedelta, timezone
from utils.activity import log_activity, now_wita

tahun_bp = Blueprint("tahun", __name__)

WITA = timezone(timedelta(hours=8))

def now_wita():
    return datetime.now(WITA)

@tahun_bp.route("/api/tahun-pelajaran", methods=["POST"])
@roles_required("ADMIN_ONLY")
def tambah_tahun_pelajaran():

    data = request.get_json()

    tahun_pelajaran = data.get("tahun_pelajaran")
    semester = data.get("semester")
    semester_mulai = data.get("semester_mulai")
    semester_akhir = data.get("semester_akhir")

    if not all([tahun_pelajaran, semester, semester_mulai, semester_akhir]):
        return jsonify({"error": "Semua field wajib diisi"}), 400

    if semester_akhir < semester_mulai:
        return jsonify({"error": "Tanggal akhir tidak valid"}), 400

    with db() as d:

        # Cegah duplikat
        existing = d.execute("""
            SELECT id FROM tahun_pelajaran 
            WHERE tahun_pelajaran=%s AND semester=%s
        """, (tahun_pelajaran, semester)).fetchone()

        if existing:
            return jsonify({"error": "Tahun pelajaran sudah ada"}), 400

        d.execute("""
            INSERT INTO tahun_pelajaran
            (tahun_pelajaran, semester, semester_mulai, semester_akhir, updated_at, updated_by)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            tahun_pelajaran,
            semester,
            semester_mulai,
            semester_akhir,
            now_wita().isoformat(),
            session.get("nama")
        ))

        d.commit()

        log_activity(
            action="tambah",
            tahun_pelajaran=tahun_pelajaran,
            semester=semester
        )

    return jsonify({"message": "Berhasil ditambahkan"}), 201

@tahun_bp.route("/api/tahun-pelajaran", methods=["GET"])
@roles_required("ADMIN_LEADERSHIP")
def get_tahun_pelajaran():
    today = now_wita().date()
    with db() as d:
        rows = d.execute("""
            SELECT id,
                tahun_pelajaran,
                semester,
                semester_mulai,
                semester_akhir,
                updated_at,
                updated_by
            FROM tahun_pelajaran
            ORDER BY semester_mulai DESC
        """).fetchall()

    result = []

    for row in rows:

        mulai = datetime.strptime(row["semester_mulai"], "%Y-%m-%d").date()
        akhir = datetime.strptime(row["semester_akhir"], "%Y-%m-%d").date()

        # 🔥 Hitung status otomatis
        if today < mulai:
            status = "Belum Mulai"
        elif mulai <= today <= akhir:
            status = "Aktif"
        else:
            status = "Berakhir"

        result.append({
            "id": row["id"],
            "tahun_pelajaran": row["tahun_pelajaran"],
            "semester": row["semester"],
            "semester_mulai": row["semester_mulai"],
            "semester_akhir": row["semester_akhir"],
            "updated_at": row["updated_at"],
            "updated_by": row["updated_by"],
            "status": status
        })

    return jsonify(result)

@tahun_bp.route("/api/tahun-pelajaran/<int:id>", methods=["DELETE"])
@roles_required("ADMIN_LEADERSHIP")
def delete_tahun_pelajaran(id):
    today = now_wita().date()

    with db() as d:
        # 🔹 Ambil semua data yang diperlukan
        row = d.execute("""
            SELECT tahun_pelajaran, semester,
                    semester_mulai, semester_akhir
            FROM tahun_pelajaran
            WHERE id=%s
        """, (id,)).fetchone()

        if not row:
            return jsonify({"error": "Data tidak ditemukan"}), 404

        mulai = datetime.strptime(row["semester_mulai"], "%Y-%m-%d").date()
        akhir = datetime.strptime(row["semester_akhir"], "%Y-%m-%d").date()

        if mulai <= today <= akhir:
            return jsonify({
                "error": "Tahun pelajaran yang sedang aktif tidak bisa dihapus"
            }), 400

        # 🔹 Simpan dulu datanya sebelum dihapus
        tahun = row["tahun_pelajaran"]
        semester = row["semester"]

        # 🔹 Hapus
        d.execute("DELETE FROM tahun_pelajaran WHERE id=%s", (id,))
        d.commit()

    log_activity(
        action="hapus",
        tahun_pelajaran=tahun,
        semester=semester
    )

    return jsonify({"message": "Berhasil dihapus"})

@tahun_bp.route("/api/tahun-pelajaran/<int:id>", methods=["PUT"])
@roles_required("ADMIN_LEADERSHIP")
def update_tahun_pelajaran(id):

    data = request.get_json(silent=True) or {}

    tahun_pelajaran = data.get("tahun_pelajaran")
    semester = data.get("semester")
    semester_mulai = data.get("semester_mulai")
    semester_akhir = data.get("semester_akhir")

    if not all([tahun_pelajaran, semester, semester_mulai, semester_akhir]):
        return jsonify({"error": "Semua field wajib diisi"}), 400

    if semester_akhir < semester_mulai:
        return jsonify({
            "error": "Tanggal akhir tidak boleh lebih kecil dari tanggal mulai"
        }), 400

    try:
        with db() as d:

            # 🔥 Ambil data lama dulu
            old = d.execute("""
                SELECT semester_mulai, semester_akhir
                FROM tahun_pelajaran
                WHERE id=%s
            """, (id,)).fetchone()

            if not old:
                return jsonify({"error": "Data tidak ditemukan"}), 404

            old_mulai = old["semester_mulai"]
            old_akhir = old["semester_akhir"]

            # 🔥 Update data
            d.execute("""
                UPDATE tahun_pelajaran
                SET tahun_pelajaran=%s,
                    semester=%s,
                    semester_mulai=%s,
                    semester_akhir=%s,
                    updated_at=%s,
                    updated_by=%s
                WHERE id=%s
            """, (
                tahun_pelajaran,
                semester,
                semester_mulai,
                semester_akhir,
                now_wita().isoformat(),
                session.get("nama"),
                id
            ))

            d.commit()

            # 🔥 Tentukan field yang berubah
            field_changed = None

            if old_mulai != semester_mulai and old_akhir != semester_akhir:
                field_changed = "keduanya"
            elif old_mulai != semester_mulai:
                field_changed = "mulai"
            elif old_akhir != semester_akhir:
                field_changed = "berakhir"

            # 🔥 Log hanya jika memang ada perubahan
            if field_changed:
                log_activity(
                    action="edit",
                    tahun_pelajaran=tahun_pelajaran,
                    semester=semester,
                    field_changed=field_changed
                )

        return jsonify({"message": "Berhasil diupdate"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
            
@tahun_bp.route("/api/activity/tahun-pelajaran/latest")
@roles_required("ADMIN_LEADERSHIP")
def latest_tahun_activity():

    with db() as d:
        row = d.execute("""
            SELECT *
            FROM activity_log
            ORDER BY created_at DESC
            LIMIT 1
        """).fetchone()

    if not row:
        return jsonify({})

    # Generate text
    action = row["action"]
    tahun = row["tahun_pelajaran"]
    semester = row["semester"]
    field = row["field_changed"]

    if action == "tambah":
        text = f"Tambah TP {tahun} ({semester})"
    elif action == "hapus":
        text = f"Hapus TP {tahun} ({semester})"
    elif action == "edit":
        if field == "mulai":
            text = f"Edit Mulai TP {tahun} ({semester})"
        elif field == "berakhir":
            text = f"Edit Berakhir TP {tahun} ({semester})"
        else:
            text = f"Edit Mulai & Berakhir TP {tahun} ({semester})"
    else:
        text = "-"

    return jsonify({
        "activity": text,
        "created_at": row["created_at"]
    })
    