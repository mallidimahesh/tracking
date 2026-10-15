import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app, seed_initial_fleet
from app.extensions import db
from app.models.user import User, DriverProfile
from app.models.shuttle import Shuttle
from app.models.iot import IoTDevice

app = create_app(os.environ.get("FLASK_ENV", "development"))

def print_help():
    print("""
VIT Shuttle Management CLI
Usage: python manage.py <command> [args]

Commands:
  seed                       - Initialize database and seed 6 shuttles and test accounts
  list-shuttles              - List all shuttles, occupancy and tracking state
  create-admin <email> <pwd> <name> - Create a new administrator account
  create-driver <email> <pwd> <name> <shuttle_code> [phone] - Provision a driver
  reset-occupancy            - Reset all passenger counts to 0
  show-device-keys           - Display API keys for ESP32 devices
    """)

def main():
    if len(sys.argv) < 2:
        print_help()
        return

    cmd = sys.argv[1].lower()

    with app.app_context():
        if cmd == "seed":
            seed_initial_fleet(app)
            print("[OK] Fleet and initial accounts seeded successfully.")

        elif cmd == "list-shuttles":
            shuttles = Shuttle.query.order_by(Shuttle.shuttle_code.asc()).all()
            print("\n=== VIT VELLORE SHUTTLE FLEET ===")
            print(f"{'Code':<8} {'Name':<22} {'Cap':<5} {'Count':<6} {'Avail':<6} {'Status':<10} {'GPS Status'}")
            print("-" * 75)
            for s in shuttles:
                gps_st = s.get_gps_status()
                sens_st = s.get_sensor_status()
                print(f"{s.shuttle_code:<8} {s.name:<22} {s.capacity:<5} {s.current_passenger_count:<6} {s.available_seats:<6} {sens_st:<10} {gps_st}")
            print("-" * 75)

        elif cmd == "create-admin":
            if len(sys.argv) < 5:
                print("Usage: python manage.py create-admin <email> <password> <name>")
                return
            email = sys.argv[2]
            pwd = sys.argv[3]
            name = sys.argv[4]
            user = User(email=email, full_name=name, role="admin", is_email_verified=True)
            user.set_password(pwd)
            db.session.add(user)
            db.session.commit()
            print(f"[OK] Administrator {name} ({email}) created.")

        elif cmd == "create-driver":
            if len(sys.argv) < 6:
                print("Usage: python manage.py create-driver <email> <password> <name> <shuttle_code> [phone]")
                return
            email = sys.argv[2]
            pwd = sys.argv[3]
            name = sys.argv[4]
            code = sys.argv[5].upper()
            phone = sys.argv[6] if len(sys.argv) > 6 else ""

            shuttle = Shuttle.query.filter_by(shuttle_code=code).first()
            if not shuttle:
                print(f"[!] Error: Shuttle code {code} not found. Available: SH-01 to SH-06")
                return

            user = User(email=email, full_name=name, role="driver", is_email_verified=True)
            user.set_password(pwd)
            db.session.add(user)
            db.session.flush()

            profile = DriverProfile(
                user_id=user.id,
                driver_license_no=f"LIC-{code}",
                phone_number=phone,
                assigned_shuttle_id=shuttle.id
            )
            db.session.add(profile)
            db.session.commit()
            print(f"[OK] Driver {name} created and assigned to {code}.")

        elif cmd == "show-device-keys":
            devices = IoTDevice.query.all()
            print("\n=== ESP32 IOT REGISTERED DEVICES ===")
            for d in devices:
                shuttle_code = d.assigned_shuttle.shuttle_code if d.assigned_shuttle else "Unassigned"
                print(f"Device: {d.device_code} | Assigned: {shuttle_code} | Key Hash: {d.api_key_hash[:16]}...")

        elif cmd == "reset-occupancy":
            Shuttle.query.update({Shuttle.current_passenger_count: 0})
            db.session.commit()
            print("[OK] All passenger counts reset to 0.")

        else:
            print(f"[!] Unknown command: {cmd}")
            print_help()

if __name__ == "__main__":
    main()
