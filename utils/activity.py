from utils.db import db
from datetime import datetime, timezone, timedelta
from flask import session

WITA = timezone(timedelta(hours=8))

def now_wita():
    return datetime.now(WITA)

def log_activity(action, tahun_pelajaran, semester, field_changed=None):
    with db() as d:
        d.execute("""
            INSERT INTO activity_log
            (user_id, action, field_changed, tahun_pelajaran, semester, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            session.get("user_id"),
            action,
            field_changed,
            tahun_pelajaran,
            semester,
            now_wita().isoformat()
        ))
        d.commit()