from utils.db import db

class SettingSPP:

    @staticmethod
    def get_spp_siswa(siswa_id, angkatan):
        db = get_db()

        # 1️⃣ Cek SPP khusus siswa
        spp_siswa = db.execute("""
            SELECT nominal FROM setting_spp_siswa
            WHERE siswa_id = ?
        """, (siswa_id,)).fetchone()

        if spp_siswa:
            return spp_siswa["nominal"]

        # 2️⃣ Cek SPP angkatan
        spp_angkatan = db.execute("""
            SELECT nominal FROM setting_spp
            WHERE angkatan = ?
        """, (angkatan,)).fetchone()

        if spp_angkatan:
            return spp_angkatan["nominal"]

        # 3️⃣ Ambil SPP default
        spp_default = db.execute("""
            SELECT nominal FROM setting_spp
            WHERE angkatan IS NULL
        """).fetchone()

        return spp_default["nominal"]