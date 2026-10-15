import os
from flask import Flask, jsonify
from flask_cors import CORS
from app.config import config_by_name
from app.extensions import db, socketio
from app.sockets.events import register_socket_events

def seed_initial_fleet(app: Flask):
    """Initializes the 6 standard VIT Vellore shuttles and initial accounts if empty."""
    with app.app_context():
        from app.models.shuttle import Shuttle
        from app.models.user import User, DriverProfile
        from app.models.iot import IoTDevice

        db.create_all()

        fleet_specs = [
            {"code": "SH-01", "name": "SJT / PRP Green Express", "vehicle_no": "VIT-A-101", "route": "A", "lat": 12.9729, "lng": 79.1586},
            {"code": "SH-02", "name": "Mens Hostel Blue Express", "vehicle_no": "VIT-B-202", "route": "B", "lat": 12.9724, "lng": 79.1552},
        ]

        for spec in fleet_specs:
            shuttle = Shuttle.query.filter_by(shuttle_code=spec["code"]).first()
            if not shuttle:
                new_shuttle = Shuttle(
                    shuttle_code=spec["code"],
                    name=spec["name"],
                    route=spec["route"],
                    vehicle_no=spec["vehicle_no"],
                    latest_latitude=spec["lat"],
                    latest_longitude=spec["lng"],
                    capacity=30,
                    current_passenger_count=0,
                    is_tracking_active=True,
                    sensor_status="offline"
                )
                db.session.add(new_shuttle)
            else:
                shuttle.route = spec["route"]
                shuttle.vehicle_no = spec["vehicle_no"]
                shuttle.name = spec["name"]

        # Seed default Administrator if none exists
        admin = User.query.filter_by(role="admin").first()
        if not admin:
            admin_user = User(
                email="admin@vitshuttle.campus",
                full_name="Fleet Administrator",
                role="admin",
                is_email_verified=True,
            )
            admin_user.set_password("Admin@VIT2026")
            db.session.add(admin_user)

        # Seed default Drivers for routes
        default_drivers = [
            ("driver1@vitshuttle.campus", "Ramesh Kumar", "SH-01", "TN-23-D-1001", "+91-9876543210"),
            ("driver2@vitshuttle.campus", "Suresh Patel", "SH-02", "TN-23-D-2002", "+91-9876543211"),
        ]

        db.session.commit()

        for email, name, shuttle_code, license_no, phone in default_drivers:
            driver = User.query.filter_by(email=email).first()
            if not driver:
                d_user = User(
                    email=email,
                    full_name=name,
                    role="driver",
                    is_email_verified=True,
                )
                d_user.set_password("Driver@2026")
                db.session.add(d_user)
                db.session.flush()

                target_shuttle = Shuttle.query.filter_by(shuttle_code=shuttle_code).first()
                profile = DriverProfile(
                    user_id=d_user.id,
                    driver_license_no=license_no,
                    phone_number=phone,
                    assigned_shuttle_id=target_shuttle.id if target_shuttle else None,
                    is_on_duty=False
                )
                db.session.add(profile)

        # Seed default Student
        student = User.query.filter_by(email="student1@vitstudent.ac.in").first()
        if not student:
            s_user = User(
                email="student1@vitstudent.ac.in",
                full_name="Arjun Sharma",
                role="student",
                is_email_verified=True,
            )
            s_user.set_password("Student@2026")
            db.session.add(s_user)

        # Seed default Outsider
        outsider = User.query.filter_by(email="outsider1@gmail.com").first()
        if not outsider:
            o_user = User(
                email="outsider1@gmail.com",
                full_name="Priya Patel",
                role="outsider",
                is_email_verified=True,
            )
            o_user.set_password("Outsider@2026")
            db.session.add(o_user)

        # Seed demo IoT ESP32 device keys for each shuttle
        for spec in fleet_specs:
            dev_code = f"ESP32-{spec['code'].replace('-', '')}"
            device = IoTDevice.query.filter_by(device_code=dev_code).first()
            if not device:
                target_shuttle = Shuttle.query.filter_by(shuttle_code=spec["code"]).first()
                dev = IoTDevice(
                    device_code=dev_code,
                    assigned_shuttle_id=target_shuttle.id if target_shuttle else None,
                    firmware_version="1.0.0",
                    is_active=True
                )
                # Set predictable development API key for testing
                dev.set_api_key(f"vit_esp32_key_{spec['code'].lower()}")
                db.session.add(dev)

        db.session.commit()


def create_app(config_name=None) -> Flask:
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    config_cls = config_by_name.get(config_name, config_by_name["development"])
    app.config.from_object(config_cls)

    # Initialize CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Initialize extensions
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")

    # Register blueprints
    from app.api.auth import auth_bp
    from app.api.shuttles import shuttles_bp
    from app.api.driver import driver_bp
    from app.api.iot import iot_bp
    from app.api.admin import admin_bp
    from app.api.demo import demo_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(shuttles_bp)
    app.register_blueprint(driver_bp)
    app.register_blueprint(iot_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(demo_bp)

    # Register sockets
    register_socket_events()

    # Health check endpoint for AWS ALB/EC2/monitoring
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "vit-shuttle-backend",
            "version": "1.0.0",
            "environment": config_name
        }), 200

    # Auto seed database on startup (for non-testing)
    if not app.config.get("TESTING", False):
        seed_initial_fleet(app)

    return app
