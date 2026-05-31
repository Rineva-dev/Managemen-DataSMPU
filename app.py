import os
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, session, jsonify
from flask_wtf.csrf import CSRFProtect
from utils.time_helper import now_wita
from utils.db import db
from utils.init_db import init_db
from routes import ALL_BLUEPRINTS


app = Flask(__name__)

app.secret_key = os.getenv("SECRET_KEY", "dev-secret-key")

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,
)
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

csrf = CSRFProtect(app)

# =========================
# REGISTER BLUEPRINT
# =========================
for bp in ALL_BLUEPRINTS:
    app.register_blueprint(bp)

@app.context_processor
def inject_global_data():
    data = {}

    if "user_id" in session:
        data["guru"] = {
            "id": session.get("user_id"),
            "nama": session.get("nama"),
            "foto": session.get("foto"),
            "role": session.get("role"),
        }

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


@app.route("/init-postgres")
def init_postgres():

    try:

        init_db()

        return {
            "success": True
        }

    except Exception as e:

        return {
            "success": False,
            "error": str(e)
        }, 500


# =========================
# RUN APP
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)