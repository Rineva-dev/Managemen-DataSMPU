import psycopg2
from psycopg2.extras import RealDictCursor
import os

def db():
    return psycopg2.connect(
        host=os.getenv("managemen-data-smpu-db-bdhy2r"),
        port=os.getenv("5432"),
        database=os.getenv("smpu_db"),
        user=os.getenv("database_user"),
        password=os.getenv("ManagementSMPU123"),
        cursor_factory=RealDictCursor
    )