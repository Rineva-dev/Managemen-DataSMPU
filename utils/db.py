import os
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
load_dotenv(".env.local", override=True)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

if os.name == "nt":
    DB_PATH = os.path.join(BASE_DIR, "..", "database.db")
else:
    DB_PATH = "/data/database.db"


# =========================
# POSTGRESQL
# =========================

class CursorWrapper:

    def __init__(self, cursor):
        self.cursor = cursor

    def execute(self, query, params=None):

        # compatibility sqlite -> postgres
        query = query.replace("?", "%s")

        self.cursor.execute(query, params or ())

        return self

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()

    def close(self):
        self.cursor.close()


class PostgresDB:

    def __init__(self):

        self.conn = psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT", 5432),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            cursor_factory=RealDictCursor
        )

    def cursor(self):

        return CursorWrapper(
            self.conn.cursor()
        )

    def execute(self, query, params=None):

        cursor = self.conn.cursor()

        cursor.execute(
            query.replace("?", "%s"),
            params or ()
        )

        return CursorWrapper(cursor)

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):

        if exc_type:
            self.rollback()
        else:
            self.commit()

        self.close()


# =========================
# SQLITE
# =========================

def sqlite_db():

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


# =========================
# MAIN DB
# =========================

def db():

    engine = os.getenv(
        "DB_ENGINE",
        "sqlite"
    ).lower()

    print(f"DB ENGINE AKTIF: {engine}")

    if engine == "postgres":
        return PostgresDB()

    return sqlite_db()
