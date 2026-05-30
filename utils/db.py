import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

if os.name == "nt":
    DB_PATH = os.path.join(BASE_DIR, "..", "database.db")
else:
    DB_PATH = "/data/database.db"

print("DB PATH AKTIF:", DB_PATH)

def db():
    conn = sqlite3.connect(
        DB_PATH,
        timeout=30,
        check_same_thread=False
    )

    conn.row_factory = sqlite3.Row

    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout = 30000")

    return conn