from flask import Blueprint, request, jsonify, g
from app.utils.decorators import role_required
from app.models.shuttle import Shuttle
from app.services.tracking_service import TrackingService

driver_bp = Blueprint("driver", __name__, url_prefix="/api/driver")

@driver_bp.route("/my-shuttle", methods=["GET"])
@role_required("driver", "admin")
def get_my_shuttle():
    """Returns the shuttle assigned to the authenticated driver."""
    profile = g.current_user.driver_profile
    if not profile or not profile.assigned_shuttle_id:
        return jsonify({
            "message": "No shuttle currently assigned. Please contact the fleet administrator.",
            "shuttle": None
        }), 200

    shuttle = Shuttle.query.get(profile.assigned_shuttle_id)
    if not shuttle:
        return jsonify({"error": "Assigned shuttle record not found"}), 404

    return jsonify({
        "shuttle": shuttle.to_dict(include_driver_details=True),
        "is_on_duty": profile.is_on_duty,
    }), 200


@driver_bp.route("/tracking/start", methods=["POST"])
@role_required("driver", "admin")
def start_tracking():
    """Activates GPS tracking on the driver's phone."""
    success, message, data = TrackingService.start_tracking(g.current_user)
    if not success:
        return jsonify({"error": message}), 400
    return jsonify({"message": message, "shuttle": data}), 200


@driver_bp.route("/tracking/stop", methods=["POST"])
@role_required("driver", "admin")
def stop_tracking():
    """Stops GPS tracking on the driver's phone."""
    success, message, data = TrackingService.stop_tracking(g.current_user)
    if not success:
        return jsonify({"error": message}), 400
    return jsonify({"message": message, "shuttle": data}), 200


@driver_bp.route("/tracking/location", methods=["POST"])
@role_required("driver", "admin")
def submit_location():
    """
    Receives live GPS coordinates from the driver's mobile browser Geolocation API.
    Payload:
    {
        "latitude": 12.9692,
        "longitude": 79.1559,
        "accuracy": 8.5,
        "speed": 4.2,
        "heading": 180.0
    }
    """
    data = request.get_json() or {}
    lat = data.get("latitude")
    lng = data.get("longitude")

    if lat is None or lng is None:
        return jsonify({"error": "latitude and longitude are required"}), 400

    accuracy = data.get("accuracy")
    speed = data.get("speed")
    heading = data.get("heading")

    success, message, payload = TrackingService.record_location(
        driver=g.current_user,
        latitude=lat,
        longitude=lng,
        accuracy=accuracy,
        speed=speed,
        heading=heading
    )

    if not success:
        return jsonify({"error": message}), 400

    return jsonify({"message": message, "location": payload}), 200
