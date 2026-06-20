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

    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT id, nama, kode, kategori, aktif
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
    kode = request.form["kode"].strip().lower()
    kategori = request.form.get("kategori")
    aktif = request.form.get("aktif")

    conn = db()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO jenis_pembayaran
        (nama, kode, kategori, aktif)
        VALUES (%s, %s, %s, %s)
    """, (nama, kode, kategori, aktif))

    conn.commit()

    cur.close()
    conn.close()

    return redirect(
        url_for("jenis_pembayaran.index")
    )