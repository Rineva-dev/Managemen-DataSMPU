from flask import Blueprint, render_template, request, abort

public_bp = Blueprint(
    "public",
    __name__,
    url_prefix="/public"
)

@public_bp.route("/payment")
def payment():

    host = request.host.lower()

    if not host.startswith("payment."):
        abort(404)

    return render_template(
        "public/pembayaran-publik.html"
    )