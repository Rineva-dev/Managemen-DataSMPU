from flask import Blueprint, render_template, request, redirect, url_for
from utils.db import db

setting_pembayaran = Blueprint(
    "setting_pembayaran",
    __name__,
    url_prefix="/setting-pembayaran"
)

@setting_pembayaran.route("/")
def index():
    with db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM jenis_pembayaran ORDER BY id ASC")
        pembayaran = cur.fetchall()

    return render_template(
        "dashboard.html",
        active_page="setting_pembayaran",
        pembayaran=pembayaran
    )


@setting_pembayaran.route("/save", methods=["POST"])
def save_jenis_pembayaran():
    nama = request.form["nama"]
    kode = request.form["kode"]
    nominal = request.form["nominal"]
    tipe = request.form["tipe"]

    with db() as conn:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO jenis_pembayaran (nama, kode, nominal, tipe)
            VALUES (?, ?, ?, ?)
        """, (nama, kode, nominal, tipe))

    return redirect(url_for("setting_pembayaran.index"))