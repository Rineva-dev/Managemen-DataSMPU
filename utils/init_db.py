from utils.db import db
from werkzeug.security import generate_password_hash

def init_db():
    with db() as d:
        # ===== Tabel guru =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS guru (
            id INTEGER PRIMARY KEY,
            nama TEXT NOT NULL,
            jabatan TEXT NOT NULL,
            tempat TEXT,
            tahun TEXT,
            jk TEXT,
            status TEXT,
            hp TEXT,
            alamat TEXT,
            email TEXT,
            role TEXT NOT NULL,
            password TEXT
        )
        """)

        # ===== Tambahkan kolom foto jika belum ada =====
        columns = d.execute("PRAGMA table_info(guru)").fetchall()
        column_names = [col["name"] for col in columns]
        if "foto" not in column_names:
            d.execute("ALTER TABLE guru ADD COLUMN foto TEXT")

        # ===== Tabel akun =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS akun (
            id INTEGER PRIMARY KEY,
            guru_id INTEGER NOT NULL,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'guru',
            status TEXT NOT NULL DEFAULT 'aktif',
            FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE CASCADE
        )
        """)

        # ===== Tabel absensi =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS absensi (
            id INTEGER PRIMARY KEY,
            guru_id INTEGER NOT NULL,
            tanggal TEXT NOT NULL,
            status TEXT NOT NULL,
            jam_masuk TEXT,
            jam_keluar TEXT,
            alasan TEXT,
            updated_at TEXT,
            FOREIGN KEY (guru_id) REFERENCES guru(id),
            UNIQUE (guru_id, tanggal)
        )
        """)

        # ===== Tabel Mata Pelajaran =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS mata_pelajaran (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama TEXT NOT NULL,
            jenis TEXT NOT NULL,
            aktif INTEGER DEFAULT 1,
            created_at TEXT,
            updated_at TEXT
        )
        """)

        # ===== Tambah kolom updated_at jika belum ada =====
        columns = d.execute("PRAGMA table_info(absensi)").fetchall()
        column_names = [col["name"] for col in columns]

        if "updated_at" not in column_names:
            d.execute("ALTER TABLE absensi ADD COLUMN updated_at TEXT")
        
        # ===== Tambahkan admin default =====
        exists = d.execute("SELECT * FROM guru WHERE nama='admin'").fetchone()
        if not exists:
            d.execute("""
            INSERT INTO guru (nama, jabatan, tempat, tahun, jk, status, hp, alamat, email, role, password)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "admin", "Kepala Sekolah", "Jakarta", "1980", "L", "Aktif",
                "08123456789", "Jl. Contoh No.1", "admin@email.com", "admin", generate_password_hash("admin")
            ))
        admin_guru = d.execute(
            "SELECT id FROM guru WHERE nama='admin'"
        ).fetchone()

        # ===== Tambah kolom role jika belum ada =====
        columns = d.execute("PRAGMA table_info(akun)").fetchall()
        column_names = [col["name"] for col in columns]

        if "role" not in column_names:
            d.execute("ALTER TABLE akun ADD COLUMN role TEXT DEFAULT 'guru'")

        # ===== Tambah kolom status jika belum ada =====
        columns = d.execute("PRAGMA table_info(akun)").fetchall()
        column_names = [col["name"] for col in columns]

        if "status" not in column_names:
            d.execute("ALTER TABLE akun ADD COLUMN status TEXT DEFAULT 'aktif'")

        # cek apakah akun admin sudah ada
        exists_admin = d.execute(
            "SELECT id FROM akun WHERE role='admin'"
        ).fetchone()

        if not exists_admin:
            d.execute("""
                INSERT INTO akun (guru_id, username, password, role, status)
                VALUES (?, ?, ?, ?, ?)
            """, (
                admin_guru["id"],
                "admin",
                generate_password_hash("admin"),
                "admin",
                "aktif"
            ))
            d.commit()

        # ===== Tabel Tahun Pelajaran (Tanpa Status) =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS tahun_pelajaran (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tahun_pelajaran TEXT NOT NULL,
            semester TEXT NOT NULL,
            semester_mulai TEXT NOT NULL,
            semester_akhir TEXT NOT NULL,
            updated_at TEXT,
            updated_by TEXT,
            UNIQUE (tahun_pelajaran, semester)
        )
        """)

        columns = d.execute("PRAGMA table_info(tahun_pelajaran)").fetchall()
        column_names = [col["name"] for col in columns]

        if "updated_at" not in column_names:
            d.execute("ALTER TABLE tahun_pelajaran ADD COLUMN updated_at TEXT")

        if "updated_by" not in column_names:
            d.execute("ALTER TABLE tahun_pelajaran ADD COLUMN updated_by TEXT")

        # ===== Tabel Activity Log =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            action TEXT NOT NULL,
            field_changed TEXT,
            tahun_pelajaran TEXT NOT NULL,
            semester TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES guru(id)
        )
        """)

        # ===== Tabel Kelas =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS kelas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tingkat INTEGER NOT NULL,
            sub_kelas TEXT NOT NULL,
            tahun_pelajaran_id INTEGER NOT NULL,
            wali_kelas_id INTEGER,
            FOREIGN KEY (tahun_pelajaran_id) REFERENCES tahun_pelajaran(id) ON DELETE CASCADE,
            FOREIGN KEY (wali_kelas_id) REFERENCES guru(id) ON DELETE SET NULL,
            UNIQUE (tingkat, sub_kelas, tahun_pelajaran_id)
        )
        """)

        # ===== Tabel Kelas Siswa =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS kelas_siswa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kelas_id INTEGER NOT NULL,
            siswa_id INTEGER NOT NULL,
            FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE
        )
        """)

        # ===== Tabel Siswa =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS siswa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nis TEXT NOT NULL UNIQUE,
            nama TEXT NOT NULL,
            jk TEXT,
            tempat_lahir TEXT,
            tanggal_lahir TEXT,
            alamat TEXT,
            status TEXT NOT NULL DEFAULT 'aktif'
        )
        """)