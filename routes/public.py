from flask import Blueprint, render_template, request, abort

public_bp = Blueprint(
    "public",
    __name__,
    url_prefix="/public"
)

@public_bp.before_request
def only_payment_domain():

    if not request.host.lower().startswith("payment."):
        abort(404)

@public_bp.route("/payment")
def payment():

    return render_template(
        "public/pembayaran-publik.html"
    )