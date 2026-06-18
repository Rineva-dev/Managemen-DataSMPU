from routes.auth_routes import auth_bp
from routes.profile_routes import profile_bp
from routes.absensi_routes import absensi_bp
from routes.dashboard_routes import dashboard_bp
from routes.master_routes import master_bp
from routes.tahun_routes import tahun_bp
from routes.kelas_routes import kelas_bp
from routes.ekstrakurikuler_routes import ekskul_bp
from routes.siswa_routes import siswa_bp
from routes.pembayaran_routes import pembayaran_bp
from routes.mapel_routes import mapel_bp
from routes.kelas_ampu import kelas_ampu_bp
from routes.kkm_routes import kkm_bp
from routes.public import public_bp
from routes.verifikasi_pembayaran import verifikasi_bp
from routes.setting_pembayaran import setting_pembayaran

ALL_BLUEPRINTS = [
    auth_bp,
    profile_bp,
    absensi_bp,
    dashboard_bp,
    master_bp,
    tahun_bp,
    kelas_bp,
    ekskul_bp,
    siswa_bp,
    pembayaran_bp,
    mapel_bp,
    kelas_ampu_bp,
    kkm_bp,
    public_bp,
    verifikasi_bp,
    setting_pembayaran
]