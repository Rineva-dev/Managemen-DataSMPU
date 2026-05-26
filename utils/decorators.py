from functools import wraps
from flask import session, redirect, abort

ROLE_GROUPS = {
    "ADMIN_ONLY": ["admin"],

    "ADMIN_LEADERSHIP": ["admin", "kepala_sekolah"],

    "WALI_KELAS":["wali_kelas"],

    "NON_ADMIN": [
        "kepala_sekolah",
        "waka_kurikulum",
        "waka_kesiswaan",
        "waka_sarpras",
        "bendahara",
        "guru_bk",
        "wali_kelas",
        "bendahara",
        "staf",
        "guru"
    ],

    "ALL_AUTHENTICATED": [
        "admin",
        "kepala_sekolah",
        "waka_kurikulum",
        "waka_kesiswaan",
        "waka_sarpras",
        "bendahara",
        "guru_bk",
        "wali_kelas",
        "bendahara",
        "staf",
        "guru"
    ]
}

def roles_required(*roles, exclude=None):
    def wrapper(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if "user_id" not in session:
                return redirect("/")
            user_role = session.get("role")

            # Exclude rule
            if exclude and user_role in exclude:
                abort(403)

            # Include rule
            if roles:
                allowed_roles = []
                for role in roles:
                    if role in ROLE_GROUPS:
                        allowed_roles.extend(ROLE_GROUPS[role])
                    else:
                        allowed_roles.append(role)
                if user_role not in allowed_roles:
                    abort(403)
                    
            return f(*args, **kwargs)
        return decorated
    return wrapper