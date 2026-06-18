from utils.db import db

class Siswa:
    @staticmethod
    def get_by_id(siswa_id):
        db = get_db()
        return db.execute(
            "SELECT * FROM siswa WHERE id = ?",
            (siswa_id,)
        ).fetchone()