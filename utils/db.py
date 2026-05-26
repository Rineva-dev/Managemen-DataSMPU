import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# =========================
# DATABASE PATH
# =========================
if os.name == "nt":  # Windows (LOCAL)
    DB_PATH = os.path.join(BASE_DIR, "..", "database.db")
else:  # Linux / Docker / Dokploy
    DB_PATH = os.getenv("DB_PATH", "/data/database.db")

print("DB PATH AKTIF:", DB_PATH)


def db():
    # pastikan folder DB ada
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    conn = sqlite3.connect(
        DB_PATH,
        timeout=30,
        check_same_thread=False
    )

    conn.row_factory = sqlite3.Row

    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout = 30000;")

    return conn