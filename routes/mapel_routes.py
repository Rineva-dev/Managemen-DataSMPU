from flask import Blueprint, request, jsonify, render_template, session, flash, redirect, url_for
from utils.db import db
from utils.decorators import roles_required

from datetime import date

today = date.today()
iso_today = today.isoformat()

mapel_bp = Blueprint("mapel", __name__)

def seed_mapel_wajib():
    MAPEL_WAJIB = [
        "Matematika",
        "Ilmu Pengetahuan Alam (IPA)",
        "Bahasa Indonesia",
        "Bahasa Inggris",
        "Pendidikan Pancasila dan Kewarganegaraan (PPKn)",
        "Ilmu Pengetahuan Sosial (IPS)",
        "Seni Budaya",
        "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)",
        "Informatika",
        "Pendidikan Agama Islam (PAI)",
    ]

    with db() as d:
        for nama in MAPEL_WAJIB:
            exists = d.execute("""
                SELECT 1 FROM mata_pelajaran
                WHERE TRIM(LOWER(nama)) = TRIM(LOWER(?))
                AND jenis = 'wajib'
            """, (nama,)).fetchone()

            if not exists:
                d.execute("""
                    INSERT INTO mata_pelajaran (nama, jenis, is_locked)
                    VALUES (?, 'wajib', 1)
                """, (nama,))

def seed_mapel_kegiatan():
    KEGIATAN = {
        "Upacara Bendera (Apel)": ["Apel"],
        "Imtaq (Keagamaan)": ["Imtaq", "Imtak"]
    }

    with db() as d:
        for nama_baru, nama_lama_list in KEGIATAN.items():

            # hapus versi lama
            for lama in nama_lama_list:
                d.execute("""
                    DELETE FROM mata_pelajaran
                    WHERE nama = ? AND jenis = 'kegiatan'
                """, (lama,))

            # insert versi resmi
            cek = d.execute("""
                SELECT id FROM mata_pelajaran
                WHERE nama = ? AND jenis = 'kegiatan'
            """, (nama_baru,)).fetchone()

            if not cek:
                d.execute("""
                    INSERT INTO mata_pelajaran (nama, jenis, is_locked)
                    VALUES (?, 'kegiatan', 1)
                """, (nama_baru,))

@mapel_bp.route("/mapel")
@roles_required("admin", "waka_kurikulum")
def index():

    conn = db()
    cur = conn.cursor()

    # MAPEL WAJIB
    cur.execute("""
        SELECT id, nama, is_locked
        FROM mata_pelajaran
        WHERE jenis = 'wajib'
        ORDER BY nama
    """)
    data_wajib = cur.fetchall()

    # MUATAN LOKAL
    cur.execute("""
        SELECT id, nama, is_locked
        FROM mata_pelajaran
        WHERE jenis = 'mulok'
        ORDER BY nama
    """)
    data_mulok = cur.fetchall()

    conn.close()

    return render_template(
        "dashboard.html",
        active_page="mata_pelajaran",
        data_wajib=data_wajib,
        data_mulok=data_mulok
    )

@mapel_bp.route("/api/mapel", methods=["GET"])
@roles_required("admin", "operator")
def get_mapel():
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            m.id,
            m.nama,
            m.jenis,
            GROUP_CONCAT(g.nama, ', ') AS guru_mapel
        FROM mata_pelajaran m
        LEFT JOIN mapel_guru mg ON mg.mapel_id = m.id
        LEFT JOIN guru g ON g.id = mg.guru_id
        WHERE m.jenis IN ('wajib', 'mulok')
        GROUP BY m.id
        ORDER BY m.nama
    """)

    data = [
        {
            "id": row[0],
            "nama": row[1],
            "jenis": row[2],
            "guru": row[3] or "-"
        }
        for row in cur.fetchall()
    ]

    return jsonify(data)

@mapel_bp.route("/api/guru/list", methods=["GET"])
@roles_required("admin", "operator")
def list_guru():
    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT id, nama FROM guru ORDER BY nama")

    return jsonify([
        {"id": row[0], "nama": row[1]}
        for row in cur.fetchall()
    ])

@mapel_bp.route("/api/mapel/tambah", methods=["POST"])
@roles_required("admin")
def tambah_mapel():
    data = request.get_json()

    nama = data.get("nama", "").strip()
    jenis = data.get("jenis", "").strip()
    guru_ids = data.get("guru_ids", [])

    if not nama or not jenis:
        return jsonify({"error": "Data tidak lengkap"}), 400

    conn = db()
    cur = conn.cursor()

    # ===== CEK DUPLIKAT (INI KUNCI) =====
    cek = cur.execute("""
        SELECT 1 FROM mata_pelajaran
        WHERE TRIM(LOWER(nama)) = TRIM(LOWER(?))
        AND jenis = ?
    """, (nama, jenis)).fetchone()

    if cek:
        conn.close()
        return jsonify({
            "error": f"Mata pelajaran '{nama}' sudah ada"
        }), 400

    # ===== INSERT MAPEL =====
    row = d.execute("""
        INSERT INTO mata_pelajaran (nama, jenis)
        VALUES (?, ?)
        RETURNING id
    """, (nama, jenis)).fetchone()

    mapel_id = row["id"]

    # ===== RELASI GURU (JIKA ADA) =====
    for gid in guru_ids:
        cur.execute(
            "INSERT INTO mapel_guru (mapel_id, guru_id) VALUES (?, ?)",
            (mapel_id, gid)
        )

    conn.commit()
    conn.close()

    return jsonify({"message": "Mata pelajaran berhasil ditambahkan"})

@mapel_bp.route("/api/mapel/<int:mapel_id>", methods=["GET"])
@roles_required("admin", "operator")
def detail_mapel(mapel_id):
    conn = db()
    cur = conn.cursor()

    cur.execute("SELECT id, nama, jenis FROM mata_pelajaran WHERE id=?", (mapel_id,))
    mapel = cur.fetchone()

    if not mapel:
        return jsonify({"error": "Mapel tidak ditemukan"}), 404

    cur.execute(
        "SELECT guru_id FROM mapel_guru WHERE mapel_id=?",
        (mapel_id,)
    )
    guru_ids = [row[0] for row in cur.fetchall()]

    return jsonify({
        "id": mapel[0],
        "nama": mapel[1],
        "jenis": mapel[2],
        "guru_ids": guru_ids
    })

@mapel_bp.route("/api/mapel/update/<int:mapel_id>", methods=["POST"])
@roles_required("admin")
def update_mapel(mapel_id):
    data = request.get_json()

    nama = data.get("nama")
    jenis = data.get("jenis")
    guru_ids = data.get("guru_ids", [])

    conn = db()
    cur = conn.cursor()

    cur.execute(
        "UPDATE mata_pelajaran SET nama=?, jenis=? WHERE id=?",
        (nama, jenis, mapel_id)
    )

    # reset guru mapel
    cur.execute("DELETE FROM mapel_guru WHERE mapel_id=?", (mapel_id,))
    for gid in guru_ids:
        cur.execute(
            "INSERT INTO mapel_guru (mapel_id, guru_id) VALUES (?, ?)",
            (mapel_id, gid)
        )

    conn.commit()
    conn.close()

    return jsonify({"message": "Mata pelajaran berhasil diupdate"})

@mapel_bp.route("/api/mapel/hapus/<int:mapel_id>", methods=["DELETE"])
@roles_required("admin")
def hapus_mapel(mapel_id):
    conn = db()
    cur = conn.cursor()

    cur.execute("DELETE FROM mapel_guru WHERE mapel_id=?", (mapel_id,))
    cur.execute("DELETE FROM mata_pelajaran WHERE id=?", (mapel_id,))

    conn.commit()
    conn.close()

    return jsonify({"message": "Mata pelajaran berhasil dihapus"})

@mapel_bp.route("/api/mapel/simpan", methods=["POST"])
@roles_required("admin", "waka_kurikulum")
def simpan_mapel():

    data = request.get_json(silent=True)

    if not data:
        return jsonify(success=False, message="Invalid JSON"), 400

    mapel_id = data.get("id")
    nama = data.get("nama")
    jenis = data.get("jenis")

    if not nama or not jenis:
        return jsonify(success=False, message="Data tidak lengkap"), 400

    with db() as d:
        if mapel_id:
            # ===== EDIT =====
            d.execute("""
                UPDATE mata_pelajaran
                SET nama = ?, jenis = ?
                WHERE id = ?
            """, (nama, jenis, mapel_id))
        else:
            # ===== TAMBAH =====
            d.execute("""
                INSERT INTO mata_pelajaran (nama, jenis)
                VALUES (?, ?)
            """, (nama, jenis))

    return jsonify(success=True)

@mapel_bp.route("/hapus/<int:id>")
@roles_required("admin")
def hapus(id):

    conn = db()
    cur = conn.cursor()

    cek = cur.execute("""
        SELECT is_locked FROM mata_pelajaran WHERE id = ?
    """, (id,)).fetchone()

    if cek and cek["is_locked"] == 1:
        return jsonify({"error": "Mapel ini tidak bisa dihapus"}), 403

    if cek and cek["is_locked"] == 1:
        flash("Mata pelajaran wajib tidak bisa dihapus", "danger")
        return redirect(url_for("mapel.index"))

    cur.execute("DELETE FROM mata_pelajaran WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    flash("Mata pelajaran berhasil dihapus", "success")
    return redirect(url_for("mapel.index"))