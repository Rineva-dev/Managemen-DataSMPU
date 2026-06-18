from flask import Blueprint, render_template, request, redirect, url_for
from utils.db import db

setting_pembayaran_bp = Blueprint(
    "setting_pembayaran",
    __name__,
    url_prefix="/setting-pembayaran"
)

@setting_pembayaran_bp.route("/")
def index():
    with db() as conn:
        cur = conn.cursor()
        cur.execute("""
            SELECT *
            FROM setting_pembayaran
            ORDER BY created_at DESC
            LIMIT 1
        """)
        setting = cur.fetchone()

    return render_template(
        "dashboard.html",
        setting=setting or {},
        active_page="setting_pembayaran"
    )


@setting_pembayaran_bp.route("/save", methods=["POST"])
def save_setting_pembayaran():
    transfer = bool(request.form.get("metode_transfer"))
    qris = bool(request.form.get("metode_qris"))
    va = bool(request.form.get("metode_va"))

    with db() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM setting_pembayaran")
        cur.execute("""
            INSERT INTO setting_pembayaran (
                transfer, qris, va,
                bank_nama, bank_rekening, bank_atas_nama,
                qris_merchant, qris_code,
                va_provider, va_server_key, va_client_key,
                fee_transfer, fee_qris, fee_va
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            transfer, qris, va,
            request.form.get("bank_nama"),
            request.form.get("bank_rekening"),
            request.form.get("bank_atas_nama"),
            request.form.get("qris_merchant"),
            request.form.get("qris_code"),
            request.form.get("va_provider"),
            request.form.get("va_server_key"),
            request.form.get("va_client_key"),
            request.form.get("fee_transfer") or 0,
            request.form.get("fee_qris") or 0,
            request.form.get("fee_va") or 0,
        ))

    return redirect(url_for("setting_pembayaran.index"))