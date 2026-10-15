from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models.user import User, DriverProfile
from app.models.shuttle import Shuttle
from app.models.iot import IoTDevice
from app.models.audit import AuditLog
from app.utils.decorators import role_required
from app.services.occupancy_service import OccupancyService

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

@admin_bp.route("/drivers", methods=["GET"])
@role_required("admin")
def list_drivers():
    drivers = User.query.filter_by(role="driver").all()
    return jsonify({"drivers": [d.to_dict(include_driver_profile=True) for d in drivers]}), 200


@admin_bp.route("/drivers", methods=["POST"])
@role_required("admin")
def create_driver():
    """Admin provisions a driver account."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    full_name = (data.get("full_name") or "").strip()
    password = data.get("password") or ""
    license_no = data.get("driver_license_no") or ""
    phone = data.get("phone_number") or ""
    assigned_shuttle_code = data.get("assigned_shuttle_code")

    if not email or not full_name or not password:
        return jsonify({"error": "email, full_name, and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    driver_user = User(
        email=email,
        full_name=full_name,
        role="driver",
        is_email_verified=True,  # pre-verified by administrator
    )
    driver_user.set_password(password)
    db.session.add(driver_user)
    db.session.flush()

    assigned_shuttle_id = None
    if assigned_shuttle_code:
        shuttle = Shuttle.query.filter_by(shuttle_code=assigned_shuttle_code).first()
        if shuttle:
            assigned_shuttle_id = shuttle.id

    profile = DriverProfile(
        user_id=driver_user.id,
        driver_license_no=license_no,
        phone_number=phone,
        assigned_shuttle_id=assigned_shuttle_id,
        is_on_duty=False,
    )
    db.session.add(profile)

    audit = AuditLog(
        action="DRIVER_PROVISIONED",
        actor_id=g.current_user.id,
        target_type="User",
        target_id=str(driver_user.id),
        details=f"Admin created driver {full_name} ({email})"
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": "Driver account created successfully",
        "driver": driver_user.to_dict(include_driver_profile=True)
    }), 201


@admin_bp.route("/assign-shuttle", methods=["POST"])
@role_required("admin")
def assign_shuttle():
    """Assigns a driver to a specific shuttle."""
    data = request.get_json() or {}
    driver_id = data.get("driver_id")
    shuttle_code = data.get("shuttle_code")

    driver = User.query.get(driver_id)
    if not driver or driver.role != "driver" or not driver.driver_profile:
        return jsonify({"error": "Valid driver not found"}), 404

    shuttle = Shuttle.query.filter_by(shuttle_code=shuttle_code).first()
    if not shuttle:
        return jsonify({"error": "Shuttle code not found"}), 404

    # Unassign previous driver from this shuttle if any
    prev_profiles = DriverProfile.query.filter_by(assigned_shuttle_id=shuttle.id).all()
    for p in prev_profiles:
        p.assigned_shuttle_id = None

    driver.driver_profile.assigned_shuttle_id = shuttle.id
    db.session.commit()

    return jsonify({
        "message": f"Driver {driver.full_name} assigned to {shuttle.shuttle_code}",
        "shuttle": shuttle.to_dict(include_driver_details=True)
    }), 200


@admin_bp.route("/devices", methods=["GET"])
@role_required("admin")
def list_devices():
    devices = IoTDevice.query.all()
    return jsonify({"devices": [d.to_dict() for d in devices]}), 200


@admin_bp.route("/devices", methods=["POST"])
@role_required("admin")
def register_device():
    """Registers an ESP32 hardware device and returns its one-time API key."""
    data = request.get_json() or {}
    device_code = (data.get("device_code") or "").strip()
    shuttle_code = data.get("shuttle_code")

    if not device_code:
        return jsonify({"error": "device_code is required"}), 400

    if IoTDevice.query.filter_by(device_code=device_code).first():
        return jsonify({"error": "Device code already registered"}), 409

    assigned_shuttle_id = None
    if shuttle_code:
        shuttle = Shuttle.query.filter_by(shuttle_code=shuttle_code).first()
        if shuttle:
            assigned_shuttle_id = shuttle.id

    raw_api_key = IoTDevice.generate_api_key()
    device = IoTDevice(
        device_code=device_code,
        assigned_shuttle_id=assigned_shuttle_id,
        firmware_version=data.get("firmware_version", "1.0.0"),
        is_active=True
    )
    device.set_api_key(raw_api_key)
    db.session.add(device)

    audit = AuditLog(
        action="DEVICE_REGISTERED",
        actor_id=g.current_user.id,
        target_type="IoTDevice",
        target_id=device_code,
        details=f"Registered ESP32 device {device_code} assigned to shuttle {shuttle_code}"
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "message": "Device registered successfully",
        "device": device.to_dict(),
        "api_key": raw_api_key  # Returned once to be flashed onto ESP32 firmware
    }), 201


@admin_bp.route("/shuttles/<int:shuttle_id>/correct-count", methods=["POST"])
@role_required("admin")
def correct_occupancy(shuttle_id: int):
    """Manual correction of passenger count with audit logging."""
    data = request.get_json() or {}
    new_count = data.get("new_count")
    reason = data.get("reason", "Manual admin count reconciliation")

    if new_count is None:
        return jsonify({"error": "new_count is required"}), 400

    success, message, result = OccupancyService.manual_correction(
        actor=g.current_user,
        shuttle_id=shuttle_id,
        new_count=int(new_count),
        reason=reason
    )

    if not success:
        return jsonify({"error": message}), 400

    return jsonify({"message": message, "shuttle": result}), 200


@admin_bp.route("/audit-logs", methods=["GET"])
@role_required("admin")
def list_audit_logs():
    limit = int(request.args.get("limit", 50))
    logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return jsonify({"logs": [l.to_dict() for l in logs]}), 200
