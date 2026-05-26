from flask import Blueprint, render_template, session, request, jsonify
from utils.db import db
from utils.decorators import roles_required
import os
from flask import send_from_directory, abort, redirect
from werkzeug.security import generate_password_hash

profile_bp = Blueprint("profile", __name__)

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@profile_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@profile_bp.route('/api/profile', methods=['GET'])
@roles_required("ALL_AUTHENTICATED")
def api_profile_guru():

    guru_id = session["user_id"]
    with db() as d:

        guru = d.execute("""
            SELECT g.*, a.username, a.password AS akun_password
            FROM guru g
            LEFT JOIN akun a ON a.guru_id = g.id
            WHERE g.id=%s
        """, (guru_id,)).fetchone()

        if not guru:
            return jsonify({"error": "Guru tidak ditemukan"}), 404

    # Return JSON dengan nama field sesuai DB
    return jsonify({
        "guru_id": guru["id"],
        "nama": guru["nama"] or "",
        "username": guru["username"] or "",
        "password": "********",  # jangan kirim password asli
        "jabatan": guru["jabatan"] or "",
        "email": guru["email"] or "",
        "hp": guru["hp"] or "",        # sesuai kolom DB
        "tempat": guru["tempat"] or "",
        "tahun": guru["tahun"] or "",
        "jk": guru["jk"] or "",        # sesuai kolom DB
        "status": guru["status"] or "",# sesuai kolom DB
        "alamat": guru["alamat"] or "",
        "foto": guru["foto"] or ""
    })

@profile_bp.route('/api/profile/update', methods=['POST'])
@roles_required("NON_ADMIN")
def api_update_profile_guru():

    guru_id = session["user_id"]

    # 🔥 Ambil JSON kalau ada, kalau tidak pakai form
    data = request.get_json(silent=True)

    if data:
        username = data.get('username')
        password = data.get('password')
        tempat = data.get('tempat')
        tahun = data.get('tahun')
        jk = data.get('jk')
        status = data.get('status')
        hp = data.get('hp')
        email = data.get('email')
        alamat = data.get('alamat')
    else:
        username = request.form.get('username')
        password = request.form.get('password')
        tempat = request.form.get('tempat')
        tahun = request.form.get('tahun')
        jk = request.form.get('jk')
        status = request.form.get('status')
        hp = request.form.get('hp')
        email = request.form.get('email')
        alamat = request.form.get('alamat')

    with db() as d:

        # ==========================
        # UPDATE USERNAME & PASSWORD
        # ==========================
        if username:
            exists = d.execute(
                "SELECT id FROM akun WHERE username=%s AND guru_id!=%s",
                (username, guru_id)
            ).fetchone()

            if exists:
                return jsonify({
                    "status": "error",
                    "message": "Username sudah digunakan"
                })

            d.execute(
                "UPDATE akun SET username=%s WHERE guru_id=%s",
                (username, guru_id)
            )

        if password:
            hashed_password = generate_password_hash(password)
            d.execute(
                "UPDATE akun SET password=%s WHERE guru_id=%s",
                (hashed_password, guru_id)
            )

        # ==========================
        # UPDATE DATA GURU
        # ==========================
        fields = {}
        if tempat is not None: fields['tempat'] = tempat
        if tahun is not None: fields['tahun'] = tahun
        if jk is not None: fields['jk'] = jk
        if status is not None: fields['status'] = status
        if hp is not None: fields['hp'] = hp
        if email is not None: fields['email'] = email
        if alamat is not None: fields['alamat'] = alamat

        if fields:
            set_clause = ", ".join([f"{k}=%s" for k in fields.keys()])
            values = list(fields.values())
            values.append(guru_id)

            d.execute(f"""
                UPDATE guru
                SET {set_clause}
                WHERE id=%s
            """, values)

        # ==========================
        # HANDLE UPLOAD FOTO
        # ==========================
        if 'foto' in request.files:
            foto = request.files['foto']
            if foto.filename != '':

                if not foto.filename.lower().endswith((".jpg", ".jpeg", ".png")):
                    return jsonify({"status": "error", "message": "Format tidak didukung"}), 400

                filename = f"guru_{guru_id}.jpg"
                filepath = os.path.join(UPLOAD_FOLDER, filename)

                foto.save(filepath)

                d.execute("UPDATE guru SET foto=%s WHERE id=%s", (filename, guru_id))

        d.commit()

    return jsonify({
        "status": "success",
        "message": "Profil berhasil diperbarui",
        "guru_id": guru_id
    })

@profile_bp.route('/api/admin/profile/update', methods=['POST'])
@roles_required("ADMIN_ONLY")
def api_update_profile_admin():

    guru_id = session["user_id"]

    # 🔥 Ambil JSON kalau ada, kalau tidak pakai form
    data = request.get_json(silent=True)

    if data:
        nama = data.get('nama')
        username = data.get('username')
        password = data.get('password')
        tempat = data.get('tempat')
        tahun = data.get('tahun')
        jk = data.get('jk')
        status = data.get('status')
        hp = data.get('hp')
        email = data.get('email')
        alamat = data.get('alamat')
    else:
        nama = request.form.get('nama')
        username = request.form.get('username')
        password = request.form.get('password')
        tempat = request.form.get('tempat')
        tahun = request.form.get('tahun')
        jk = request.form.get('jk')
        status = request.form.get('status')
        hp = request.form.get('hp')
        email = request.form.get('email')
        alamat = request.form.get('alamat')

    with db() as d:

        # ==========================
        # UPDATE USERNAME & PASSWORD
        # ==========================
        if username:
            exists = d.execute(
                "SELECT id FROM akun WHERE username=%s AND guru_id!=%s",
                (username, guru_id)
            ).fetchone()

            if exists:
                return jsonify({
                    "status": "error",
                    "message": "Username sudah digunakan"
                })

            d.execute(
                "UPDATE akun SET username=%s WHERE guru_id=%s",
                (username, guru_id)
            )

        if password:
            hashed_password = generate_password_hash(password)
            d.execute(
                "UPDATE akun SET password=%s WHERE guru_id=%s",
                (hashed_password, guru_id)
            )

        # ==========================
        # UPDATE DATA GURU
        # ==========================
        fields = {}
        if nama is not None and nama.strip() != "":
            fields['nama'] = nama.strip()
        if tempat is not None: fields['tempat'] = tempat
        if tahun is not None: fields['tahun'] = tahun
        if jk is not None: fields['jk'] = jk
        if status is not None: fields['status'] = status
        if hp is not None: fields['hp'] = hp
        if email is not None: fields['email'] = email
        if alamat is not None: fields['alamat'] = alamat

        if fields:
            set_clause = ", ".join([f"{k}=" for k in fields.keys()])
            values = list(fields.values())
            values.append(guru_id)

            d.execute(f"""
                UPDATE guru
                SET {set_clause}
                WHERE id=%s
            """, values)

        # ==========================
        # HANDLE UPLOAD FOTO
        # ==========================
        if 'foto' in request.files:
            foto = request.files['foto']
            if foto.filename != '':

                if not foto.filename.lower().endswith((".jpg", ".jpeg", ".png")):
                    return jsonify({"status": "error", "message": "Format tidak didukung"}), 400

                filename = f"guru_{guru_id}.jpg"
                filepath = os.path.join(UPLOAD_FOLDER, filename)

                foto.save(filepath)

                d.execute("UPDATE guru SET foto=%s WHERE id=%s", (filename, guru_id))

        d.commit()

    return jsonify({
        "status": "success",
        "message": "Profil berhasil diperbarui",
        "guru_id": guru_id
    })

@profile_bp.route('/api/update-profile-photo-guru', methods=['POST'])
@roles_required("NON_ADMIN")
def api_update_profile_photo_guru():

    guru_id = session["user_id"]
    with db() as d:

        if 'foto' not in request.files:
            return jsonify({"status": "error", "message": "No file"}), 400

        foto = request.files['foto']
        if foto.filename == '':
            return jsonify({"status": "error", "message": "Empty file"}), 400

        filename = f"guru_{guru_id}.jpg"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if not foto.filename.lower().endswith((".jpg", ".jpeg", ".png")):
            return jsonify({
                "status": "error",
                "message": "Format tidak didukung"
            }), 400
        foto.save(filepath)

        d.execute("UPDATE guru SET foto=%s WHERE id=%s", (filename, guru_id))
        d.commit()

    return jsonify({
        "status": "success",
        "filename": filename   # ⬅️ INI PENTING
    })

@profile_bp.route('/api/update-profile-photo-admin', methods=['POST'])
@roles_required("ADMIN_ONLY")
def api_update_profile_photo_admin():

    if "user_id" not in session or session.get("role") != "admin":
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    guru_id = session["user_id"]

    if 'foto' not in request.files:
        return jsonify({"status": "error", "message": "No file"}), 400

    foto = request.files['foto']

    if foto.filename == '':
        return jsonify({"status": "error", "message": "Empty file"}), 400

    filename = f"admin_{guru_id}.jpg"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not foto.filename.lower().endswith((".jpg", ".jpeg", ".png")):
        return jsonify({
            "status": "error",
            "message": "Format tidak didukung"
        }), 400
    foto.save(filepath)

    with db() as d:
        d.execute("UPDATE guru SET foto=%s WHERE id=%s", (filename, guru_id))
        d.commit()

    return jsonify({
        "status": "success",
        "filename": filename
    })

# =========================
# DELETE PROFILE PHOTO ADMIN
# =========================
@profile_bp.route('/api/delete-profile-photo-admin', methods=['DELETE'])
def api_delete_profile_photo_admin():

    if "user_id" not in session or session.get("role") != "admin":
        return jsonify({"status": "error", "message": "Unauthorized"}), 401

    guru_id = session["user_id"]

    with db() as d:
        # Ambil nama file foto dulu
        data = d.execute(
            "SELECT foto FROM guru WHERE id=%s",
            (guru_id,)
        ).fetchone()

        if not data or not data["foto"]:
            return jsonify({
                "status": "error",
                "message": "Foto tidak ditemukan"
            })

        filename = data["foto"]
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        # Hapus file fisik jika ada
        if os.path.exists(filepath):
            os.remove(filepath)

        # Kosongkan kolom foto di database
        d.execute(
            "UPDATE guru SET foto=NULL WHERE id=%s",
            (guru_id,)
        )
        d.commit()

    return jsonify({"status": "success"})

