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

        # ===== TABEL KKM =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS kkm (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tingkat INTEGER NOT NULL,
            mapel_id INTEGER NOT NULL,
            kkm INTEGER NOT NULL DEFAULT 75,
            UNIQUE (tingkat, mapel_id),
            FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE
        )
        """)

        # cek kolom
        columns = d.execute(
            "PRAGMA table_info(mata_pelajaran)"
        ).fetchall()
        column_names = [c["name"] for c in columns]

        if "is_locked" not in column_names:
            d.execute(
                "ALTER TABLE mata_pelajaran ADD COLUMN is_locked INTEGER DEFAULT 0"
            )

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

        # ===== Tabel Kelas Mapel =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS kelas_mapel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kelas_id INTEGER NOT NULL,
            mapel_id INTEGER NOT NULL,
            guru_id INTEGER,
            jp INTEGER DEFAULT 0,
            hari TEXT,
            jam_mulai TEXT,
            jam_selesai TEXT,
            created_at TEXT,
            updated_at TEXT,

            FOREIGN KEY (kelas_id) REFERENCES kelas(id) ON DELETE CASCADE,
            FOREIGN KEY (mapel_id) REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
            FOREIGN KEY (guru_id) REFERENCES guru(id) ON DELETE SET NULL,

            UNIQUE (kelas_id, mapel_id)
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

        # ===== Tabel SISWA =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS siswa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            nis TEXT UNIQUE,
            nisn TEXT UNIQUE,
            nik TEXT,

            nama TEXT NOT NULL,
            jk TEXT,

            tempat_lahir TEXT,
            tanggal_lahir TEXT,

            tingkat_default INTEGER,

            tahun_masuk TEXT,
            sekolah_asal TEXT,

            asal_sd TEXT,
            tahun_lulus_sd TEXT,
            sekolah_sebelumnya TEXT,

            kelas_pindah TEXT,
            semester_pindah TEXT,
            tanggal_pindah TEXT,

            kelas_diterima TEXT,
            semester_diterima TEXT,
            tanggal_diterima TEXT,

            alamat TEXT,
            desa TEXT,
            kecamatan TEXT,
            kabupaten TEXT,
            provinsi TEXT,

            nama_ayah TEXT,
            pekerjaan_ayah TEXT,
            nama_ibu TEXT,
            pekerjaan_ibu TEXT,
            no_hp TEXT,

            sekolah_tujuan TEXT,
            alasan_pindah TEXT,

            status_masuk TEXT,
            status TEXT
        )
        """)

        # ===== TABEL JADWAL KELAS =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS kelas_jadwal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kelas_id INTEGER NOT NULL,
            mapel_id INTEGER NOT NULL,
            guru_id INTEGER NOT NULL,
            hari TEXT NOT NULL,
            jam_mulai TEXT NOT NULL,
            jam_selesai TEXT NOT NULL
        )
        """)

        # ======================================
        # TABEL ABSENSI MENGAJAR (FINAL & LENGKAP)
        # ======================================
        d.execute("""
        CREATE TABLE IF NOT EXISTS absensi_mengajar (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            kelas_mapel_id INTEGER NOT NULL,
            pertemuan_ke INTEGER NOT NULL,

            tanggal DATE NOT NULL,
            jam_mulai TIME NOT NULL,
            jam_selesai TIME,

            materi TEXT,
            indikator TEXT,
            kegiatan TEXT,
            catatan TEXT,

            status_final INTEGER DEFAULT 0,
            finalized_at DATETIME,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (kelas_mapel_id) REFERENCES kelas_mapel(id)
        )
        """)

        d.execute("""
        CREATE TABLE IF NOT EXISTS absensi_detail (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            absensi_id INTEGER NOT NULL,
            siswa_id INTEGER NOT NULL,
            status TEXT DEFAULT 'H',
            keterangan TEXT,

            FOREIGN KEY (absensi_id) REFERENCES absensi_mengajar(id),
            FOREIGN KEY (siswa_id) REFERENCES siswa(id)
        )
        """)

        # ===== TABEL NILAI SISWA =====
        d.execute("""
        CREATE TABLE IF NOT EXISTS nilai_siswa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,

            siswa_id INTEGER NOT NULL,
            kelas_mapel_id INTEGER NOT NULL,

            nilai_tugas REAL,
            nilai_uts REAL,
            nilai_uas REAL,
            nilai_akhir REAL,
            grade TEXT,

            created_at TEXT,
            updated_at TEXT,

            UNIQUE (siswa_id, kelas_mapel_id),

            FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE,
            FOREIGN KEY (kelas_mapel_id) REFERENCES kelas_mapel(id) ON DELETE CASCADE
        )
        """)

        # ===== Tambah kolom keaktifan jika belum ada =====
        columns = d.execute("PRAGMA table_info(nilai_siswa)").fetchall()
        column_names = [c["name"] for c in columns]

        if "keaktifan" not in column_names:
            d.execute("""
                ALTER TABLE nilai_siswa
                ADD COLUMN keaktifan REAL DEFAULT 0
            """)

    from routes.mapel_routes import seed_mapel_wajib
    seed_mapel_wajib()

    # ===== SEED DEFAULT KKM =====
    mapels = d.execute("""
        SELECT id FROM mata_pelajaran WHERE aktif = 1
    """).fetchall()

    tingkats = [7, 8, 9]  # atau sesuai sekolahmu

    for m in mapels:
        for t in tingkats:
            exists = d.execute("""
                SELECT 1 FROM kkm
                WHERE mapel_id = ? AND tingkat = ?
            """, (m["id"], t)).fetchone()

            if not exists:
                d.execute("""
                    INSERT INTO kkm (tingkat, mapel_id, kkm)
                    VALUES (?, ?, 75)
                """, (t, m["id"]))

    # ===== Cegah mapel duplikat =====
    d.execute("""
    CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_mapel
    ON mata_pelajaran (nama, jenis)
    """)