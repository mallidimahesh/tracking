import sqlite3

conn = sqlite3.connect('backend/instance/vit_shuttle.db')
c = conn.cursor()

cols = [r[1] for r in c.execute("PRAGMA table_info(shuttles)").fetchall()]
if "route" not in cols:
    c.execute("ALTER TABLE shuttles ADD COLUMN route TEXT DEFAULT 'A'")
    print("[+] Added column route")
if "vehicle_no" not in cols:
    c.execute("ALTER TABLE shuttles ADD COLUMN vehicle_no TEXT DEFAULT 'VIT-A-101'")
    print("[+] Added column vehicle_no")

conn.commit()
conn.close()
print("[OK] Migration complete.")
