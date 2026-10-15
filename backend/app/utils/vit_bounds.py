"""VIT Vellore Campus Boundary and Location Utilities."""

# Exact center coordinate of VIT Vellore Campus (near Technology Tower / Admin Block)
VIT_CAMPUS_CENTER = {
    "lat": 12.9692,
    "lng": 79.1559,
    "zoom": 16,
    "name": "VIT Vellore Main Campus"
}

# Campus bounding box for geofence validation and initial map bounds
VIT_CAMPUS_BOUNDS = {
    "min_lat": 12.9620,
    "max_lat": 12.9780,
    "min_lng": 79.1480,
    "max_lng": 79.1680
}

# Approximate campus perimeter polygon for visual boundary on Leaflet map
VIT_CAMPUS_POLYGON = [
    [12.9755, 79.1520],  # North-West (Near Railway side / Outskirts)
    [12.9765, 79.1620],  # North-East (Near Men's Hostels Block P/Q)
    [12.9730, 79.1665],  # East (Near Ladies Hostels & Katpadi road)
    [12.9650, 79.1650],  # South-East (Near Main Gate / Chennai Highway Road)
    [12.9635, 79.1570],  # South (Near Admin Gate)
    [12.9650, 79.1510],  # South-West (Near Outdoor Stadium)
    [12.9720, 79.1500],  # West (Near Technology Tower)
]

# Major Campus Stops / Landmarks for reference
VIT_CAMPUS_LANDMARKS = [
    {"name": "Main Gate / Entrance", "lat": 12.9648, "lng": 79.1645},
    {"name": "Technology Tower (TT)", "lat": 12.9708, "lng": 79.1594},
    {"name": "Silver Jubilee Tower (SJT)", "lat": 12.9712, "lng": 79.1638},
    {"name": "Men's Hostels (MH Block)", "lat": 12.9745, "lng": 79.1600},
    {"name": "Ladies Hostels (LH Block)", "lat": 12.9715, "lng": 79.1660},
    {"name": "Anna Auditorium & Foodys", "lat": 12.9692, "lng": 79.1565},
    {"name": "SMV / MB Building", "lat": 12.9680, "lng": 79.1555},
]

def is_within_campus_bounds(lat: float, lng: float, tolerance: float = 0.005) -> bool:
    """
    Checks if a coordinate falls within the VIT campus bounding box with tolerance.
    Tolerance allows shuttles to be tracked slightly outside main gate or adjacent roads.
    """
    return (
        (VIT_CAMPUS_BOUNDS["min_lat"] - tolerance) <= lat <= (VIT_CAMPUS_BOUNDS["max_lat"] + tolerance) and
        (VIT_CAMPUS_BOUNDS["min_lng"] - tolerance) <= lng <= (VIT_CAMPUS_BOUNDS["max_lng"] + tolerance)
    )

def validate_coordinates(lat: any, lng: any) -> tuple[bool, str, float, float]:
    """
    Validates latitude and longitude values.
    Returns (is_valid, error_message, lat_float, lng_float).
    """
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except (ValueError, TypeError):
        return False, "Coordinates must be valid numbers", 0.0, 0.0

    if not (-90.0 <= lat_f <= 90.0):
        return False, "Latitude must be between -90 and 90", 0.0, 0.0

    if not (-180.0 <= lng_f <= 180.0):
        return False, "Longitude must be between -180 and 180", 0.0, 0.0

    return True, "", lat_f, lng_f

# Official Campus Shuttle Routes matching D:\tracking\VIT-SHUTTLE-TRACK-main
VIT_CAMPUS_ROUTES = {
    "A": {
        "id": "A",
        "name": "SJT / PRP Green Route",
        "color": "#16a34a",
        "waypoints": [
            [12.9729, 79.1586],
            [12.9715, 79.1608],
            [12.9695, 79.1622],
            [12.9678, 79.1637],
            [12.9712, 79.1638],
            [12.9729, 79.1586]
        ]
    },
    "B": {
        "id": "B",
        "name": "Mens Hostel Blue Route",
        "color": "#2563eb",
        "waypoints": [
            [12.9724, 79.1552],
            [12.9709, 79.1531],
            [12.9686, 79.1518],
            [12.9669, 79.1507],
            [12.9692, 79.1559],
            [12.9724, 79.1552]
        ]
    },
    "C": {
        "id": "C",
        "name": "Out of Campus Yellow Route",
        "color": "#eab308",
        "waypoints": [
            [12.9692, 79.1559],
            [12.9680, 79.1550],
            [12.9670, 79.1540],
            [12.9660, 79.1530],
            [12.9675, 79.1520],
            [12.9690, 79.1535],
            [12.9700, 79.1550],
            [12.9692, 79.1559]
        ]
    }
}
