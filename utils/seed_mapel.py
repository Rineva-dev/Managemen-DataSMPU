from utils.db import db
from utils.time_helper import now_wita

def seed_mapel_wajib():
    with db() as d:
        cur = d.cursor()

        cur.execute("""
        CREATE TABLE IF NOT EXISTS mata_pelajaran (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama TEXT NOT NULL,
            jenis TEXT NOT NULL,
            aktif INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT
        )
        """)

        total = cur.execute(
            "SELECT COUNT(*) FROM mata_pelajaran"
        ).fetchone()[0]

        if total == 0:
            now = now_wita().isoformat()
            cur.executemany("""
                INSERT INTO mata_pelajaran (nama, jenis, aktif, created_at)
                VALUES (?, ?, 1, ?)
            """, [
                ("Pendidikan Agama", "wajib", now),
                ("PPKn", "wajib", now),
                ("Bahasa Indonesia", "wajib", now),
                ("Matematika", "wajib", now),
                ("IPA", "wajib", now),
                ("IPS", "wajib", now),
            ])

        d.commit()