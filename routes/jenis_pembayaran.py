from flask import Blueprint, render_template, request, redirect, url_for
from utils.db import db

jenis_pembayaran_bp = Blueprint(
    "jenis_pembayaran",
    __name__
)


# HALAMAN
@jenis_pembayaran_bp.route("/jenis-pembayaran")
def index():

    cur = db.connection.cursor()

    cur.execute("""
        SELECT id, nama, keterangan
        FROM jenis_pembayaran
        ORDER BY id ASC
    """)

    pembayaran = cur.fetchall()

    cur.close()

    return render_template(
        "dashboard.html",
        jenis_pembayaran=pembayaran,
        active_page="jenis_pembayaran"
    )


# SIMPAN
@jenis_pembayaran_bp.route(
    "/save-jenis-pembayaran",
    methods=["POST"]
)
def save():

    nama = request.form["nama"]
    keterangan = request.form.get("keterangan")

    cur = db.connection.cursor()

    cur.execute("""
        INSERT INTO jenis_pembayaran
        (nama, keterangan)
        VALUES (%s, %s)
    """, (nama, keterangan))

    db.connection.commit()

    cur.close()

    return redirect(
        url_for("jenis_pembayaran.index")
    )