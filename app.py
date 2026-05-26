from flask import Flask, session, jsonify
from utils.time_helper import now_wita
from utils.db import db
from utils.init_db import init_db
from utils.seed_mapel import seed_mapel_wajib

app = Flask(__name__)

with app.app_context():
    init_db()
    seed_mapel_wajib()

app.secret_key = "SMPU_Absensi_2026_SuperSecretKey_!@#987654"
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=True,
)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

from flask_wtf.csrf import CSRFProtect

csrf = CSRFProtect(app)

# =========================
# REGISTER BLUEPRINT
# =========================
from routes.auth_routes import auth_bp
app.register_blueprint(auth_bp)

from routes.profile_routes import profile_bp
app.register_blueprint(profile_bp)

from routes.absensi_routes import absensi_bp
app.register_blueprint(absensi_bp)

from routes.dashboard_routes import dashboard_bp
app.register_blueprint(dashboard_bp)

from routes.master_routes import master_bp
app.register_blueprint(master_bp)

from routes.tahun_routes import tahun_bp
app.register_blueprint(tahun_bp)

from routes.kelas_routes import kelas_bp
app.register_blueprint(kelas_bp)

from routes.ekstrakurikuler_routes import ekskul_bp
app.register_blueprint(ekskul_bp)

from routes.siswa_routes import siswa_bp
app.register_blueprint(siswa_bp)

from routes.pembayaran_routes import pembayaran_bp
app.register_blueprint(pembayaran_bp)

from routes.mapel_routes import mapel_bp
app.register_blueprint(mapel_bp)

from routes.kelas_ampu import kelas_ampu_bp
app.register_blueprint(kelas_ampu_bp)

from routes.kkm_routes import kkm_bp

app.register_blueprint(kkm_bp)

@app.context_processor
def inject_global_data():
    data = {}

    if "user_id" in session:
        try:
            with db() as d:
                guru_data = d.execute(
                    "SELECT * FROM guru WHERE id=?",
                    (session["user_id"],)
                ).fetchone()
        except Exception as e:
            guru_data = None

        data["guru"] = guru_data
        data["current_time"] = int(now_wita().timestamp())

    role = session.get("role")
    if role:
        role = role.lower().strip()

    mapping = {
        "admin": "Administrator",
        "kepala_sekolah": "Kepala Sekolah",
        "guru": "Guru",
        "wali_kelas": "Wali Kelas",
        "waka_kurikulum": "Waka Kurikulum",
        "waka_kesiswaan": "Waka Kesiswaan",
        "waka_sarpras": "Waka Sarpras",
        "bendahara": "Bendahara",
        "staf": "Staf"
    }

    data["role_title"] = mapping.get(role, "")
    return data

@app.route("/api/server-time")
def server_time():
    return jsonify({
        "server_time": now_wita().isoformat()
    })

def get_admin_data():
    with db() as d:
        admin_data = d.execute("""
            SELECT g.*, a.username
            FROM guru g
            LEFT JOIN akun a ON a.guru_id = g.id
            WHERE g.id=?
        """, (session["user_id"],)).fetchone()

    return admin_data

# =========================
# RUN APP
# =========================
if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=False)