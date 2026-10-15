from datetime import datetime, timezone
import random
from flask import Blueprint, jsonify, request
from app.extensions import db, socketio
from app.models.shuttle import Shuttle

demo_bp = Blueprint("demo", __name__, url_prefix="/api/demo")

# Coordinates along VIT Vellore Campus loop
VIT_SIMULATION_WAYPOINTS = [
    {"lat": 12.9648, "lng": 79.1645, "name": "Main Gate"},
    {"lat": 12.9675, "lng": 79.1610, "name": "SMV Block"},
    {"lat": 12.9708, "lng": 79.1594, "name": "Technology Tower (TT)"},
    {"lat": 12.9712, "lng": 79.1638, "name": "Silver Jubilee Tower (SJT)"},
    {"lat": 12.9745, "lng": 79.1600, "name": "Men's Hostels (MH Block)"},
    {"lat": 12.9715, "lng": 79.1660, "name": "Ladies Hostels (LH Block)"},
    {"lat": 12.9692, "lng": 79.1565, "name": "Anna Auditorium"},
]

@demo_bp.route("/status", methods=["GET"])
def get_demo_status():
    """Checks if any shuttle is running demo data."""
    active_shuttles = Shuttle.query.filter_by(is_tracking_active=True).count()
    return jsonify({
        "demo_mode_available": True,
        "active_tracking_count": active_shuttles,
        "note": "Demo mode is clearly labelled for evaluation purposes only."
    }), 200

@demo_bp.route("/step-simulation", methods=["POST"])
def step_simulation():
    """
    Clearly labelled DEMO simulation step for testing and evaluation.
    Advances shuttle positions along known VIT campus landmarks.
    """
    shuttles = Shuttle.query.all()
    updated = []
    now_utc = datetime.now(timezone.utc)

    for i, shuttle in enumerate(shuttles):
        waypoint_idx = (i + int(now_utc.timestamp() // 5)) % len(VIT_SIMULATION_WAYPOINTS)
        wp = VIT_SIMULATION_WAYPOINTS[waypoint_idx]

        # Add small jitter to show movement
        jitter_lat = (random.random() - 0.5) * 0.0003
        jitter_lng = (random.random() - 0.5) * 0.0003

        shuttle.latest_latitude = wp["lat"] + jitter_lat
        shuttle.latest_longitude = wp["lng"] + jitter_lng
        shuttle.gps_accuracy = round(random.uniform(4.0, 12.0), 1)
        shuttle.gps_speed = round(random.uniform(10.0, 25.0), 1)
        shuttle.gps_heading = random.randint(0, 359)
        shuttle.last_gps_update = now_utc
        shuttle.is_tracking_active = True
        shuttle.last_sensor_heartbeat = now_utc
        shuttle.sensor_status = "online"

        # Update occupancy in demo
        if shuttle.current_passenger_count == 0:
            shuttle.current_passenger_count = random.randint(5, int(shuttle.capacity * 0.8))
        else:
            delta = random.choice([-2, -1, 0, 1, 2])
            shuttle.current_passenger_count = max(0, min(shuttle.capacity, shuttle.current_passenger_count + delta))

        updated.append(shuttle.to_dict(include_driver_details=False))

    db.session.commit()

    # Broadcast to all clients
    for s_dict in updated:
        try:
            socketio.emit("shuttle_location_update", {
                "shuttle_id": s_dict["id"],
                "shuttle_code": s_dict["shuttle_code"],
                "latitude": s_dict["latest_latitude"],
                "longitude": s_dict["latest_longitude"],
                "accuracy": s_dict["gps_accuracy"],
                "speed": s_dict["gps_speed"],
                "heading": s_dict["gps_heading"],
                "timestamp": now_utc.isoformat(),
                "is_tracking_active": True,
                "is_demo": True,
                "occupancy": {
                    "count": s_dict["current_passenger_count"],
                    "capacity": s_dict["capacity"],
                    "available_seats": s_dict["available_seats"],
                    "percentage": s_dict["occupancy_percentage"],
                    "is_full": s_dict["is_full"],
                }
            })
            socketio.emit("shuttle_occupancy_update", {
                "shuttle_id": s_dict["id"],
                "shuttle_code": s_dict["shuttle_code"],
                "current_passenger_count": s_dict["current_passenger_count"],
                "capacity": s_dict["capacity"],
                "available_seats": s_dict["available_seats"],
                "occupancy_percentage": s_dict["occupancy_percentage"],
                "is_full": s_dict["is_full"],
                "sensor_status": "online",
                "is_demo": True,
            })
        except Exception:
            pass

    return jsonify({
        "status": "success",
        "message": "Demo simulation step executed",
        "shuttles": updated
    }), 200

@demo_bp.route("/reset-shuttles", methods=["POST"])
def reset_shuttles():
    """Resets all shuttles back to inactive initial state waiting for real hardware/GPS."""
    shuttles = Shuttle.query.all()
    for s in shuttles:
        s.is_tracking_active = False
        s.latest_latitude = None
        s.latest_longitude = None
        s.gps_accuracy = None
        s.last_gps_update = None
        s.sensor_status = "offline"
        s.last_sensor_heartbeat = None
        s.current_passenger_count = 0
    db.session.commit()

    try:
        socketio.emit("fleet_reset", {"message": "Fleet reset to initial inactive state"})
    except Exception:
        pass

    return jsonify({"message": "All shuttles reset to inactive state"}), 200
