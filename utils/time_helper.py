from datetime import datetime, timezone, timedelta

WITA = timezone(timedelta(hours=8))

def now_wita():
    return datetime.now(WITA)