from flask import Blueprint, render_template, request, redirect, url_for
from utils.db import db

jenis_pembayaran_bp = Blueprint(
    "jenis_pembayaran",
    __name__
)


# =========================
# HALAMAN
# =========================
@jenis_pembayaran_bp.route("/jenis-pembayaran")
def index():

    conn = db()              # <-- panggil function
    cur = conn.cursor()

    cur.execute("""
        SELECT id, nama, keterangan
        FROM jenis_pembayaran
        ORDER BY id ASC
    """)

    pembayaran = cur.fetchall()

    cur.close()
    conn.close()

    return render_template(
        "dashboard.html",
        jenis_pembayaran=pembayaran,
        active_page="jenis_pembayaran"
    )


# =========================
# SIMPAN
# =========================
@jenis_pembayaran_bp.route(
    "/save-jenis-pembayaran",
    methods=["POST"]
)
def save():

    nama = request.form["nama"]
    keterangan = request.form.get("keterangan")

    conn = db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO jenis_pembayaran
        (nama, keterangan)
        VALUES (?, ?)
    """, (nama, keterangan))

    conn.commit()

    cur.close()
    conn.close()

    return redirect(
        url_for("jenis_pembayaran.index")
    )