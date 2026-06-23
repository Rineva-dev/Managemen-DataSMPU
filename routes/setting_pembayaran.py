from flask import Blueprint, render_template, request, redirect, url_for
from utils.db import db

aturan_pembayaran_bp = Blueprint(
    "aturan_pembayaran",
    __name__
)


@aturan_pembayaran_bp.route("/aturan-pembayaran")
def index():

    conn = db()
    cur = conn.cursor()

    # daftar aturan
    cur.execute("""
        SELECT a.*, j.nama AS jenis_nama
        FROM aturan_pembayaran a
        JOIN jenis_pembayaran j
            ON j.id = a.jenis_pembayaran_id
        ORDER BY a.id DESC
    """)

    aturan = cur.fetchall()


    # jenis pembayaran
    cur.execute("""
        SELECT id, nama
        FROM jenis_pembayaran
        WHERE aktif = TRUE
        ORDER BY nama ASC
    """)

    jenis = cur.fetchall()


    # angkatan
    cur.execute("""
        SELECT DISTINCT angkatan
        FROM siswa
        ORDER BY angkatan DESC
    """)

    daftar_angkatan = cur.fetchall()


    # kelas
    cur.execute("""
        SELECT id, nama_kelas
        FROM kelas
        ORDER BY nama_kelas ASC
    """)

    daftar_kelas = cur.fetchall()


    # siswa
    cur.execute("""
        SELECT id, nama_lengkap
        FROM siswa
        ORDER BY nama_lengkap ASC
    """)

    daftar_siswa = cur.fetchall()

    cur.close()
    conn.close()


    return render_template(
        "dashboard.html",

        active_page="aturan_pembayaran",

        aturan_pembayaran=aturan,

        jenis_pembayaran=jenis,

        daftar_angkatan=daftar_angkatan,

        daftar_kelas=daftar_kelas,

        daftar_siswa=daftar_siswa
    )

@aturan_pembayaran_bp.route(
    "/save-aturan-pembayaran",
    methods=["POST"]
)
def save():

    jenis_pembayaran_id = request.form["jenis_pembayaran_id"]

    nama_aturan = request.form["nama_aturan"]

    target_type = request.form["target_type"]

    target_ids = request.form.getlist("target_ids")

    nominal = request.form["nominal"]

    periode_type = request.form["periode_type"]

    jumlah_cicilan = request.form.get("jumlah_cicilan") or 1


    # hapus format ribuan
    nominal = nominal.replace(".", "")


    conn = db()
    cur = conn.cursor()


    # simpan aturan utama
    cur.execute("""
        INSERT INTO aturan_pembayaran
        (
            jenis_pembayaran_id,
            nama_aturan,
            target_type,
            nominal,
            periode_type,
            jumlah_cicilan
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        jenis_pembayaran_id,
        nama_aturan,
        target_type,
        nominal,
        periode_type,
        jumlah_cicilan
    ))


    aturan_id = cur.fetchone()["id"]


    # simpan multiple target
    for target in target_ids:

        cur.execute("""
            INSERT INTO aturan_pembayaran_target
            (
                aturan_id,
                target_id
            )
            VALUES (%s, %s)
        """, (
            aturan_id,
            target
        ))


    conn.commit()

    cur.close()
    conn.close()


    return redirect(
        url_for("aturan_pembayaran.index")
    )