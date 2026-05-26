from flask import Blueprint, render_template, request, redirect, session, url_for
from utils.db import db
from werkzeug.security import generate_password_hash, check_password_hash

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        with db() as d:
            akun = d.execute("""
                SELECT a.*, g.nama, g.foto
                FROM akun a
                JOIN guru g ON a.guru_id = g.id
                WHERE a.username=?
            """, (username,)).fetchone()

            if akun and check_password_hash(akun["password"], password):
                session["user_id"] = akun["guru_id"]
                session["role"] = akun["role"]
                session["nama"] = akun["nama"]
                session["foto"] = akun["foto"]

                return redirect("/dashboard")

        return render_template(
            "login.html",
            error="Username atau password salah",
            old_username=username
        )

    return render_template("login.html")


@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.login'))