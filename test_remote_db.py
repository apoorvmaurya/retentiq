import socket

host = "db.hcbihthxmzgivzyjpnzo.supabase.co"
ports = [5432, 6543]

for port in ports:
    print(f"Checking {host}:{port}...")
    try:
        s = socket.create_connection((host, port), timeout=5)
        print(f"Port {port} is OPEN!")
        s.close()
    except Exception as e:
        print(f"Port {port} is CLOSED: {e}")
