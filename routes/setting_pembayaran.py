from flask import Blueprint, render_template, request, redirect, session, abort
from app import db
from models.setting_spp import SettingSPP
from models.siswa import Siswa

setting_pembayaran_bp = Blueprint(
    "setting_pembayaran",
    __name__,
    url_prefix=""
)

# =========================
# GUARD AKSES
# =========================
def keuangan_only():
    if session.get("role") not in ["admin", "bendahara"]:
        abort(403)

# =========================
# HALAMAN SETTING PEMBAYARAN
# =========================
@setting_pembayaran_bp.route("/setting-spp")
def setting_spp():
    keuangan_only()

    # SPP GLOBAL
    spp_global = SettingSPP.query.filter_by(
        tipe="global",
        aktif=True
    ).first()

    # SPP PER ANGKATAN
    spp_angkatan = SettingSPP.query.filter_by(
        tipe="angkatan",
        aktif=True
    ).order_by(SettingSPP.angkatan.desc()).all()

    # SPP PER SISWA
    spp_siswa = (
        db.session.query(SettingSPP, Siswa)
        .join(Siswa, SettingSPP.siswa_id == Siswa.id)
        .filter(SettingSPP.tipe == "siswa", SettingSPP.aktif == True)
        .all()
    )

    siswa_list = Siswa.query.filter_by(status="aktif").order_by(Siswa.nama).all()

    return render_template(
        "keuangan/setting-pembayaran.html",
        active_page="setting_spp",
        spp_global=spp_global,
        spp_angkatan=spp_angkatan,
        spp_siswa=spp_siswa,
        siswa_list=siswa_list
    )

# =========================
# SIMPAN SPP GLOBAL
# =========================
@setting_pembayaran_bp.route("/setting-spp/global", methods=["POST"])
def save_spp_global():
    keuangan_only()

    nominal = request.form.get("nominal", type=int)
    if not nominal or nominal <= 0:
        return redirect("/setting-spp")

    spp = SettingSPP.query.filter_by(tipe="global").first()

    if spp:
        spp.nominal = nominal
        spp.aktif = True
    else:
        spp = SettingSPP(
            tipe="global",
            nominal=nominal,
            aktif=True
        )
        db.session.add(spp)

    db.session.commit()
    return redirect("/setting-spp")

# =========================
# SIMPAN SPP ANGKATAN
# =========================
@setting_pembayaran_bp.route("/setting-spp/angkatan", methods=["POST"])
def save_spp_angkatan():
    keuangan_only()

    angkatan = request.form.get("angkatan", type=int)
    nominal = request.form.get("nominal", type=int)

    if not angkatan or not nominal or nominal <= 0:
        return redirect("/setting-spp")

    spp = SettingSPP.query.filter_by(
        tipe="angkatan",
        angkatan=angkatan
    ).first()

    if spp:
        spp.nominal = nominal
        spp.aktif = True
    else:
        spp = SettingSPP(
            tipe="angkatan",
            angkatan=angkatan,
            nominal=nominal,
            aktif=True
        )
        db.session.add(spp)

    db.session.commit()
    return redirect("/setting-spp")

# =========================
# SIMPAN SPP SISWA
# =========================
@setting_pembayaran_bp.route("/setting-spp/siswa", methods=["POST"])
def save_spp_siswa():
    keuangan_only()

    siswa_id = request.form.get("siswa_id", type=int)
    nominal = request.form.get("nominal", type=int)

    if not siswa_id or not nominal or nominal <= 0:
        return redirect("/setting-spp")

    siswa = Siswa.query.get(siswa_id)
    if not siswa:
        return redirect("/setting-spp")

    spp = SettingSPP.query.filter_by(
        tipe="siswa",
        siswa_id=siswa_id
    ).first()

    if spp:
        spp.nominal = nominal
        spp.aktif = True
    else:
        spp = SettingSPP(
            tipe="siswa",
            siswa_id=siswa_id,
            nominal=nominal,
            aktif=True
        )
        db.session.add(spp)

    db.session.commit()
    return redirect("/setting-spp")

# =========================
# NONAKTIFKAN SETTING
# =========================
@setting_pembayaran_bp.route("/setting-spp/nonaktif/<int:id>")
def nonaktif_spp(id):
    keuangan_only()

    spp = SettingSPP.query.get_or_404(id)
    spp.aktif = False
    db.session.commit()

    return redirect("/setting-spp")