from flask import Blueprint, render_template

public_bp = Blueprint(
    "public",
    __name__,
    url_prefix="/public"
)

@public_bp.route("/payment")
def payment():
    return render_template(
        "public/pembayaran-publik.html"
    )