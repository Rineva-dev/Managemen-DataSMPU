from flask import (Blueprint, render_template, request, redirect, url_for, jsonify)
from utils.db import db

beasiswa_bp = Blueprint(
    "beasiswa",
    __name__
)


"""
====================================
HALAMAN BEASISWA
====================================
"""
@beasiswa_bp.route("/beasiswa")
def index():

    conn = db()
    cur = conn.cursor()


    # daftar beasiswa
    cur.execute("""

        SELECT
            b.*,
            j.nama as jenis_pembayaran_nama

        FROM beasiswa b

        JOIN jenis_pembayaran j
            ON j.id = b.jenis_pembayaran_id

        ORDER BY b.id DESC

    """)

    daftar_beasiswa = cur.fetchall()


    cur.execute("""
        SELECT id, nama
        FROM jenis_pembayaran
        WHERE aktif = TRUE
        ORDER BY nama
    """)

    jenis_pembayaran = cur.fetchall()


    # siswa
    cur.execute("""

        SELECT
            id,
            nama

        FROM siswa

        ORDER BY nama ASC

    """)

    daftar_siswa = cur.fetchall()


    # kelas
    cur.execute("""

        SELECT
            id,
            tingkat,
            sub_kelas

        FROM kelas

        ORDER BY tingkat, sub_kelas

    """)

    daftar_kelas = cur.fetchall()


    # angkatan
    cur.execute("""

        SELECT DISTINCT tahun_masuk

        FROM siswa

        WHERE tahun_masuk IS NOT NULL

        ORDER BY tahun_masuk DESC

    """)

    daftar_angkatan = cur.fetchall()


    cur.close()
    conn.close()


    return render_template(
        "dashboard.html",
        active_page="beasiswa",
        daftar_beasiswa=daftar_beasiswa,
        jenis_pembayaran=jenis_pembayaran,
        daftar_siswa=daftar_siswa,
        daftar_kelas=daftar_kelas,
        daftar_angkatan=daftar_angkatan
    )

"""
====================================
SIMPAN BEASISWA
====================================
"""
@beasiswa_bp.route(
    "/save-beasiswa",
    methods=["POST"]
)
def save():

    nama_program = request.form["nama_program"]

    jenis_pembayaran_id = \
        request.form["jenis_pembayaran_id"]

    target_type = \
        request.form["target_type"]

    target_ids = \
        request.form.getlist("target_ids")

    jenis_pengurangan = \
        request.form["jenis_pengurangan"]

    nilai_pengurangan = \
        request.form["nilai_pengurangan"]

    tanggal_mulai = \
        request.form["tanggal_mulai"]

    tanggal_selesai = \
        request.form["tanggal_selesai"]


    conn = db()
    cur = conn.cursor()


    # simpan utama
    cur.execute("""

        INSERT INTO beasiswa
        (
            nama_program,
            jenis_pembayaran_id,
            target_type,
            jenis_pengurangan,
            nilai_pengurangan,
            tanggal_mulai,
            tanggal_selesai
        )

        VALUES
        (
            %s, %s, %s,
            %s, %s,
            %s, %s
        )

        RETURNING id

    """, (
        nama_program,
        jenis_pembayaran_id,
        target_type,
        jenis_pengurangan,
        nilai_pengurangan,
        tanggal_mulai,
        tanggal_selesai
    ))


    beasiswa_id = \
        cur.fetchone()["id"]


    # simpan target
    for target in target_ids:

        cur.execute("""

            INSERT INTO
            beasiswa_target

            (
                beasiswa_id,
                target_id
            )

            VALUES (%s,%s)

        """, (

            beasiswa_id,
            target

        ))


    conn.commit()

    cur.close()
    conn.close()


    return redirect(
        url_for("beasiswa.index")
    )

"""
====================================
AMBIL PENERIMA
====================================
"""
@beasiswa_bp.route(
    "/get-penerima-beasiswa/<int:id>"
)
def get_penerima(id):

    conn = db()
    cur = conn.cursor()


    cur.execute("""

        SELECT
            s.nisn,
            s.nama,
            s.alamat,

            k.tingkat,
            k.sub_kelas

        FROM beasiswa_target bt

        JOIN siswa s
            ON s.id = bt.target_id

        LEFT JOIN kelas k
            ON k.id = s.kelas_id

        WHERE bt.beasiswa_id = %s

    """, (id,))


    data = cur.fetchall()


    cur.close()
    conn.close()


    return jsonify(data)