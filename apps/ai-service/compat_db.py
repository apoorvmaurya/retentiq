import psycopg2
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger("ai-service.compat_db")

def parse_dsn(dsn_str):
    if not dsn_str.startswith("postgresql://") and not dsn_str.startswith("postgres://"):
        return {"dsn": dsn_str}
        
    # Strip protocol
    raw = dsn_str.split("://", 1)[1]
    
    # Split on the last '@' to separate credentials from host
    if "@" not in raw:
        return {"dsn": dsn_str}
        
    creds, host_part = raw.rsplit("@", 1)
    
    # Split credentials on the first ':'
    user = creds
    password = ""
    if ":" in creds:
        user, password = creds.split(":", 1)
        
    import urllib.parse
    user = urllib.parse.unquote(user)
    password = urllib.parse.unquote(password)
    
    # Strip query parameters from host_part
    query_options = ""
    if "?" in host_part:
        host_part, query_options = host_part.split("?", 1)
        
    sslmode = "prefer"
    if query_options:
        params = urllib.parse.parse_qs(query_options)
        if "sslmode" in params:
            sslmode = params["sslmode"][0]
            
    # Split host_part on the first '/'
    host_port = host_part
    dbname = "postgres"
    if "/" in host_part:
        host_port, dbname = host_part.split("/", 1)
            
    # Split host_port on ':'
    host = host_port
    port = "5432"
    if ":" in host_port:
        host, port = host_port.split(":", 1)
        
    return {
        "user": user,
        "password": password,
        "host": host,
        "port": port,
        "database": dbname,
        "sslmode": sslmode
    }

class PostgresCompatResult:
    def __init__(self, data):
        self.data = data

class PostgresTableQueryBuilder:
    def __init__(self, dsn, table_name):
        self.dsn = dsn
        self.table_name = table_name
        self.select_cols = "*"
        self.filters = []
        self.order_by = None
        self.limit_val = None
        self.insert_data = None
        self.action = "select"

    def select(self, cols_str):
        self.select_cols = cols_str
        self.action = "select"
        return self

    def eq(self, col, val):
        self.filters.append((col, "=", val))
        return self

    def gte(self, col, val):
        self.filters.append((col, ">=", val))
        return self

    def order(self, col, desc=False):
        self.order_by = f'"{col}" {"DESC" if desc else "ASC"}'
        return self

    def limit(self, limit_num):
        self.limit_val = limit_num
        return self

    def insert(self, data):
        self.insert_data = data
        self.action = "insert"
        return self

    def execute(self):
        parsed = parse_dsn(self.dsn)
        if "dsn" in parsed:
            conn = psycopg2.connect(parsed["dsn"])
        else:
            conn = psycopg2.connect(
                user=parsed["user"],
                password=parsed["password"],
                host=parsed["host"],
                port=parsed["port"],
                database=parsed["database"],
                sslmode=parsed["sslmode"]
            )
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            if self.action == "insert":
                data = self.insert_data
                if isinstance(data, list):
                    if not data:
                        return PostgresCompatResult([])
                    inserted_rows = []
                    for row in data:
                        cols = list(row.keys())
                        vals = [row[k] for k in cols]
                        import json
                        processed_vals = []
                        for v in vals:
                            if isinstance(v, (list, dict)):
                                processed_vals.append(json.dumps(v))
                            else:
                                processed_vals.append(v)
                        placeholders = ", ".join(["%s"] * len(cols))
                        col_names = ", ".join([f'"{c}"' for c in cols])
                        query = f'INSERT INTO "{self.table_name}" ({col_names}) VALUES ({placeholders}) RETURNING *'
                        cursor.execute(query, processed_vals)
                        res = cursor.fetchone()
                        if res:
                            inserted_rows.append(dict(res))
                    conn.commit()
                    return PostgresCompatResult(inserted_rows)
                else:
                    cols = list(data.keys())
                    vals = [data[k] for k in cols]
                    import json
                    processed_vals = []
                    for v in vals:
                        if isinstance(v, (list, dict)):
                            processed_vals.append(json.dumps(v))
                        else:
                            processed_vals.append(v)
                    placeholders = ", ".join(["%s"] * len(cols))
                    col_names = ", ".join([f'"{c}"' for c in cols])
                    query = f'INSERT INTO "{self.table_name}" ({col_names}) VALUES ({placeholders}) RETURNING *'
                    cursor.execute(query, processed_vals)
                    res = cursor.fetchone()
                    conn.commit()
                    return PostgresCompatResult([dict(res)] if res else [])
            else:
                cols = "*"
                if self.select_cols != "*":
                    cols = ", ".join([f'"{c.strip()}"' for c in self.select_cols.split(",")])
                
                query = f'SELECT {cols} FROM "{self.table_name}"'
                params = []
                if self.filters:
                    filter_clauses = []
                    for col, op, val in self.filters:
                        filter_clauses.append(f'"{col}" {op} %s')
                        params.append(val)
                    query += " WHERE " + " AND ".join(filter_clauses)
                
                if self.order_by:
                    query += f" ORDER BY {self.order_by}"
                
                if self.limit_val is not None:
                    query += f" LIMIT {self.limit_val}"
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                return PostgresCompatResult([dict(r) for r in rows])
        except Exception as e:
            if self.action == "insert":
                conn.rollback()
            logger.error(f"PostgresCompatQuery error on {self.table_name} ({self.action}): {e}")
            raise e
        finally:
            cursor.close()
            conn.close()

class PostgresSupabaseCompatClient:
    def __init__(self, dsn):
        # Handle protocol compatibility if it uses postgresql:// or postgres://
        self.dsn = dsn

    def table(self, name):
        return PostgresTableQueryBuilder(self.dsn, name)
