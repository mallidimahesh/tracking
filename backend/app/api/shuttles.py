from flask import Blueprint, jsonify, request
from app.models.shuttle import Shuttle
from app.models.location import LocationHistory
from app.models.occupancy import OccupancyEvent
from app.utils.vit_bounds import (
    VIT_CAMPUS_CENTER,
    VIT_CAMPUS_BOUNDS,
    VIT_CAMPUS_POLYGON,
    VIT_CAMPUS_LANDMARKS,
    is_within_campus_bounds
)

shuttles_bp = Blueprint("shuttles", __name__, url_prefix="/api/shuttles")

@shuttles_bp.route("", methods=["GET"])
def list_shuttles():
    """
    Returns all 6 shuttles with live coordinates, occupancy counts,
    and stale/offline statuses. Accessible to students, outsiders, drivers.
    """
    shuttles = Shuttle.query.order_by(Shuttle.shuttle_code.asc()).all()
    result = [s.to_dict(include_driver_details=False) for s in shuttles]
    return jsonify({
        "shuttles": result,
        "count": len(result),
        "active_count": sum(1 for s in result if s["gps_status"] == "active"),
    }), 200


@shuttles_bp.route("/<int:shuttle_id>", methods=["GET"])
def get_shuttle_details(shuttle_id: int):
    """
    Returns comprehensive details for a single shuttle,
    including recent 20 location trail points and occupancy events.
    """
    shuttle = Shuttle.query.get_or_404(shuttle_id)
    shuttle_dict = shuttle.to_dict(include_driver_details=False)

    # Fetch last 30 location trail points for smooth route rendering
    trail = LocationHistory.query.filter_by(shuttle_id=shuttle.id)\
        .order_by(LocationHistory.timestamp.desc())\
        .limit(30)\
        .all()

    # Fetch recent occupancy events
    events = OccupancyEvent.query.filter_by(shuttle_id=shuttle.id)\
        .order_by(OccupancyEvent.timestamp.desc())\
        .limit(15)\
        .all()

    shuttle_dict["location_trail"] = [t.to_dict() for t in reversed(trail)]
    shuttle_dict["recent_events"] = [e.to_dict() for e in events]

    return jsonify(shuttle_dict), 200


@shuttles_bp.route("/campus-meta", methods=["GET"])
def get_campus_meta():
    """
    Returns VIT Vellore campus center, bounds, perimeter polygon,
    and key campus landmarks for Leaflet map display.
    """
    return jsonify({
        "campus_name": "VIT Vellore",
        "center": VIT_CAMPUS_CENTER,
        "bounds": VIT_CAMPUS_BOUNDS,
        "polygon": VIT_CAMPUS_POLYGON,
        "landmarks": VIT_CAMPUS_LANDMARKS,
    }), 200
