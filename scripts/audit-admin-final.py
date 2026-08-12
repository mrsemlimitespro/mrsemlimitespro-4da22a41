import os
import json
import asyncio
from supabase import create_client

async def main():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print(json.dumps({"error": "Missing credentials"}))
        return
    
    sb = create_client(url, key)
    
    # Audit rogeriocftv.mr@gmail.com
    res_rogerio = sb.auth.admin.list_users()
    rogerio = next((u for u in res_rogerio if u.email.lower() == 'rogeriocftv.mr@gmail.com'), None)
    
    # Audit mariocftv@gmail.com
    mario = next((u for u in res_rogerio if u.email.lower() == 'mariocftv@gmail.com'), None)
    
    roles = sb.table("user_roles").select("*").execute()
    
    audit_data = {
        "rogerio": {
            "id": rogerio.id if rogerio else None,
            "email": rogerio.email if rogerio else None,
            "confirmed": rogerio.email_confirmed_at is not None if rogerio else False,
            "last_login": rogerio.last_sign_in_at if rogerio else None,
            "banned": rogerio.banned_until is not None if rogerio else False
        },
        "mario": {
            "id": mario.id if mario else None,
            "email": mario.email if mario else None,
            "confirmed": mario.email_confirmed_at is not None if mario else False,
            "last_login": mario.last_sign_in_at if mario else None,
        },
        "admin_roles": [r for r in roles.data if r['role'] == 'admin']
    }
    print(json.dumps(audit_data, indent=2))

if __name__ == "__main__":
    # We will use the direct data from previous steps if this fails, 
    # but I want to be sure about Rogerio's existence.
    pass
