from flask import Blueprint, render_template
from utils.db import db

aturan_pembayaran_bp = Blueprint(
    "aturan_pembayaran",
    __name__
)

@aturan_pembayaran_bp.route("/aturan-pembayaran")
def index():

    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT a.*, j.nama as jenis_nama
        FROM aturan_pembayaran a
        JOIN jenis_pembayaran j
            ON j.id = a.jenis_pembayaran_id
        ORDER BY a.id DESC
    """)

    aturan = cur.fetchall()

    cur.close()
    conn.close()

    return render_template(
        "dashboard.html",
        active_page="aturan_pembayaran",
        aturan_pembayaran=aturan
    )