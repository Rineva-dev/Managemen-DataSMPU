import sqlite3

DB_PATH = "database.db"

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA foreign_keys = ON;")
cur = conn.cursor()

# 1️⃣ Cek duplikat dulu
cur.execute("""
SELECT guru_id, tanggal, COUNT(*)
FROM absensi
GROUP BY guru_id, tanggal
HAVING COUNT(*) > 1;
""")

duplicates = cur.fetchall()

if duplicates:
    print("⚠️ Ditemukan data duplikat:")
    for row in duplicates:
        print(row)
    print("Bersihkan dulu sebelum lanjut.")
    conn.close()
    exit()

print("✅ Tidak ada duplikat. Lanjut migrasi...")

# 2️⃣ Rename tabel lama
cur.execute("ALTER TABLE absensi RENAME TO absensi_old;")

# 3️⃣ Buat tabel baru dengan UNIQUE
cur.execute("""
CREATE TABLE absensi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guru_id INTEGER NOT NULL,
    tanggal TEXT NOT NULL,
    status TEXT NOT NULL,
    jam_masuk TEXT,
    jam_keluar TEXT,
    alasan TEXT,
    updated_at TEXT,
    FOREIGN KEY (guru_id) REFERENCES guru(id),
    UNIQUE (guru_id, tanggal)
);
""")

# 4️⃣ Copy data lama
cur.execute("""
INSERT INTO absensi (
    id, guru_id, tanggal, status,
    jam_masuk, jam_keluar, alasan, updated_at
)
SELECT
    id, guru_id, tanggal, status,
    jam_masuk, jam_keluar, alasan, updated_at
FROM absensi_old;
""")

# 5️⃣ Hapus tabel lama
cur.execute("DROP TABLE absensi_old;")

conn.commit()
conn.close()

print("🎉 Migrasi selesai! UNIQUE sudah aktif.")