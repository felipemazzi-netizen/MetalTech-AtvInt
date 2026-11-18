import secrets

print("INGEST_API_KEY=" + secrets.token_urlsafe(48))
print("ADMIN_API_KEY=" + secrets.token_urlsafe(48))
print("MYSQL_ROOT_PASSWORD=" + secrets.token_urlsafe(24))
