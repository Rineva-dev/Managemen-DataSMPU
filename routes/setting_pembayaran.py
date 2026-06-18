from flask import Blueprint, render_template, request, redirect, url_for
from utils.db import db

setting_pembayaran_bp = Blueprint(
    "setting_pembayaran",
    __name__,
    url_prefix="/keuangan/setting-pembayaran"
)

@setting_pembayaran_bp.route("/")
def index():
    with db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT *
            FROM setting_pembayaran
            ORDER BY created_at DESC
        """)
        data = cur.fetchall()

    return render_template(
        "dashboard.html",
        data=data,
        active_page="setting_pembayaran"
    )