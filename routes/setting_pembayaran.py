from flask import Blueprint, render_template, request, redirect, url_for
from utils.db import db

aturan_pembayaran_bp = Blueprint(
    "aturan_pembayaran",
    __name__
)

@aturan_pembayaran_bp.route("/aturan-pembayaran")
def index():

    conn = db()
    cur = conn.cursor()

    # ======================
    # aturan pembayaran
    # ======================
    cur.execute("""
        SELECT a.*, j.nama as jenis_nama
        FROM aturan_pembayaran a
        JOIN jenis_pembayaran j
            ON j.id = a.jenis_pembayaran_id
        ORDER BY a.id DESC
    """)

    aturan = cur.fetchall()


    # ======================
    # buat target summary
    # ======================
    for a in aturan:

        # kalau berlaku untuk semua siswa
        if a["target_type"] == "all":
            a["target_summary"] = "Semua Siswa"
            continue


        # ambil target dari tabel relasi
        cur.execute("""
            SELECT target_id
            FROM aturan_pembayaran_target
            WHERE aturan_id = %s
        """, (a["id"],))

        targets = cur.fetchall()

        nama_target = []


        # ======================
        # target siswa
        # ======================
        if a["target_type"] == "siswa":

            for t in targets:

                cur.execute("""
                    SELECT nama
                    FROM siswa
                    WHERE id = %s
                """, (t["target_id"],))

                siswa = cur.fetchone()

                if siswa:
                    nama_target.append(
                        siswa["nama"]
                    )


        # ======================
        # target kelas
        # ======================
        elif a["target_type"] == "kelas":

            for t in targets:

                cur.execute("""
                    SELECT tingkat, sub_kelas
                    FROM kelas
                    WHERE id = %s
                """, (t["target_id"],))

                kelas = cur.fetchone()

                if kelas:
                    nama_target.append(
                        f'{kelas["tingkat"]} {kelas["sub_kelas"]}'
                    )


        # ======================
        # target angkatan
        # ======================
        elif a["target_type"] == "angkatan":

            for t in targets:

                nama_target.append(
                    f'Angkatan {t["target_id"]}'
                )


        # gabungkan jadi summary
        a["target_summary"] = "<br>".join(
            nama_target
        )


    # ======================
    # jenis pembayaran
    # ======================
    cur.execute("""
        SELECT id, nama
        FROM jenis_pembayaran
        WHERE aktif = TRUE
        ORDER BY nama ASC
    """)

    jenis = cur.fetchall()


    # ======================
    # angkatan = tahun_masuk
    # ======================
    cur.execute("""
        SELECT DISTINCT tahun_masuk
        FROM siswa
        WHERE tahun_masuk IS NOT NULL
        ORDER BY tahun_masuk DESC
    """)

    daftar_angkatan = cur.fetchall()


    # ======================
    # kelas
    # ======================
    cur.execute("""
        SELECT id, tingkat, sub_kelas
        FROM kelas
        ORDER BY tingkat, sub_kelas
    """)

    daftar_kelas = cur.fetchall()


    # ======================
    # siswa
    # ======================
    cur.execute("""
        SELECT id, nama
        FROM siswa
        ORDER BY nama ASC
    """)

    daftar_siswa = cur.fetchall()


    cur.close()
    conn.close()

    return render_template(
        "dashboard.html",

        active_page="aturan_pembayaran",

        aturan_pembayaran=aturan,

        jenis_pembayaran=jenis,

        daftar_angkatan=daftar_angkatan,

        daftar_kelas=daftar_kelas,

        daftar_siswa=daftar_siswa
    )

@aturan_pembayaran_bp.route("/save-aturan-pembayaran", methods=["POST"])
def save():
    print("FORM DATA:", request.form)

    jenis_pembayaran_id = request.form["jenis_pembayaran_id"]

    target_type = request.form["target_type"]

    target_ids = request.form.getlist("target_ids")

    nominal = request.form["nominal"]

    periode_type = request.form["periode_type"]

    jumlah_cicilan = request.form.get("jumlah_cicilan") or 1


    # hapus format ribuan
    nominal = nominal.replace(".", "")


    conn = db()
    cur = conn.cursor()


    # simpan aturan utama
    cur.execute("""
        INSERT INTO aturan_pembayaran
        (
            jenis_pembayaran_id,
            target_type,
            nominal,
            periode_type,
            jumlah_cicilan
        )
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id
    """, (
        jenis_pembayaran_id,
        target_type,
        nominal,
        periode_type,
        jumlah_cicilan
    ))


    aturan_id = cur.fetchone()["id"]


    # simpan multiple target
    for target in target_ids:

        cur.execute("""
            INSERT INTO aturan_pembayaran_target
            (
                aturan_id,
                target_id
            )
            VALUES (%s, %s)
        """, (
            aturan_id,
            target
        ))


    conn.commit()

    cur.close()
    conn.close()


    return redirect(
        url_for("aturan_pembayaran.index")
    )