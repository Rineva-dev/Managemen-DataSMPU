import psycopg2
from psycopg2.extras import RealDictCursor

def db():
    return psycopg2.connect(
        host="managemen-data-smpu-db-bdhy2r",
        port=5432,
        database="smpu_db",
        user="database_user",
        password="ManagementSMPU123",
        cursor_factory=RealDictCursor
    )