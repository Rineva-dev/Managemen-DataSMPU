import sqlite3
import psycopg2

# SQLITE
sqlite_conn = sqlite3.connect("database.db")
sqlite_conn.row_factory = sqlite3.Row
sqlite_cur = sqlite_conn.cursor()

# POSTGRESQL
pg_conn = psycopg2.connect(
    host="managemen-data-smpu-db-bdhy2r",
    database="smpu_db",
    user="database_user",
    password="ManagementSMPU123",
    port=5432
)

pg_cur = pg_conn.cursor()

# =========================
# CONTOH MIGRASI TABEL GURU
# =========================

sqlite_cur.execute("SELECT * FROM guru")
rows = sqlite_cur.fetchall()

for row in rows:
    pg_cur.execute("""
        INSERT INTO guru (
            id,
            nama,
            nip
        )
        VALUES (%s, %s, %s)
    """, (
        row["id"],
        row["nama"],
        row["nip"]
    ))

pg_conn.commit()

print("Migrasi guru selesai")