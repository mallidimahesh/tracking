from flask import Blueprint, request, jsonify, g
from app.utils.decorators import iot_auth_required
from app.services.occupancy_service import OccupancyService

iot_bp = Blueprint("iot", __name__, url_prefix="/api/iot")

@iot_bp.route("/shuttles/<int:shuttle_id>/occupancy", methods=["POST"])
@iot_auth_required
def report_occupancy(shuttle_id: int):
    """
    Receives passenger counting telemetry from ESP32 with dual IR sensors.
    Headers:
        X-API-Key: <secret-device-api-key>
    Payload:
    {
        "sequence_number": 42,
        "event_type": "entry" | "exit" | "sync",
        "delta": 1,
        "passenger_count": 15,
        "timestamp": "2026-10-15T16:00:00Z"
    }
    """
    payload = request.get_json() or {}
    success, message, result = OccupancyService.process_iot_event(
        device=g.current_device,
        shuttle_id=shuttle_id,
        payload=payload
    )

    if not success:
        return jsonify({"error": message}), 400

    return jsonify({"status": "success", "message": message, "data": result}), 200


@iot_bp.route("/shuttles/<int:shuttle_id>/heartbeat", methods=["POST"])
@iot_auth_required
def report_heartbeat(shuttle_id: int):
    """
    Receives periodic health ping from ESP32 hardware device.
    Headers:
        X-API-Key: <secret-device-api-key>
    Payload:
    {
        "firmware_version": "1.0.0",
        "battery_mv": 3950,
        "uptime_seconds": 1280
    }
    """
    payload = request.get_json() or {}
    success, message, result = OccupancyService.process_heartbeat(
        device=g.current_device,
        shuttle_id=shuttle_id,
        payload=payload
    )

    if not success:
        return jsonify({"error": message}), 400

    return jsonify({"status": "success", "message": message, "data": result}), 200
