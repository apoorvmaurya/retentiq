import socket

host = "db.hcbihthxmzgivzyjpnzo.supabase.co"
ports = [5432, 6543]

for port in ports:
    print(f"Checking {host}:{port}...")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(5)
    try:
        s.connect((host, port))
        print(f"Port {port} is OPEN!")
        s.close()
    except Exception as e:
        print(f"Port {port} is CLOSED: {e}")
