from datetime import datetime, timezone
from app.extensions import db, socketio
from app.models.shuttle import Shuttle
from app.models.location import LocationHistory
from app.models.user import User
from app.utils.vit_bounds import validate_coordinates, is_within_campus_bounds

class TrackingService:
    @staticmethod
    def start_tracking(driver: User, shuttle_id: int = None) -> tuple[bool, str, dict]:
        """Activates tracking for the driver's assigned shuttle."""
        if not driver.driver_profile or not driver.driver_profile.assigned_shuttle_id:
            return False, "Driver is not assigned to any shuttle", {}

        shuttle = db.session.get(Shuttle, driver.driver_profile.assigned_shuttle_id)
        if not shuttle:
            return False, "Assigned shuttle record not found", {}

        shuttle.is_tracking_active = True
        driver.driver_profile.is_on_duty = True
        db.session.commit()

        status_payload = {
            "shuttle_id": shuttle.id,
            "shuttle_code": shuttle.shuttle_code,
            "is_tracking_active": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Broadcast tracking status change to all connected clients
        try:
            socketio.emit("tracking_status_change", status_payload)
        except Exception:
            pass

        return True, "Tracking started successfully", shuttle.to_dict(include_driver_details=True)

    @staticmethod
    def stop_tracking(driver: User) -> tuple[bool, str, dict]:
        """Deactivates tracking for the driver's assigned shuttle."""
        if not driver.driver_profile or not driver.driver_profile.assigned_shuttle_id:
            return False, "Driver is not assigned to any shuttle", {}

        shuttle = db.session.get(Shuttle, driver.driver_profile.assigned_shuttle_id)
        if not shuttle:
            return False, "Assigned shuttle record not found", {}

        shuttle.is_tracking_active = False
        driver.driver_profile.is_on_duty = False
        db.session.commit()

        status_payload = {
            "shuttle_id": shuttle.id,
            "shuttle_code": shuttle.shuttle_code,
            "is_tracking_active": False,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        try:
            socketio.emit("tracking_status_change", status_payload)
        except Exception:
            pass

        return True, "Tracking stopped successfully", shuttle.to_dict(include_driver_details=True)

    @staticmethod
    def record_location(
        driver: User,
        latitude: float,
        longitude: float,
        accuracy: float = None,
        speed: float = None,
        heading: float = None
    ) -> tuple[bool, str, dict]:
        """
        Validates and records driver phone GPS coordinates.
        Updates shuttle real-time state and emits WebSocket event.
        """
        if not driver.driver_profile or not driver.driver_profile.assigned_shuttle_id:
            return False, "Driver is not assigned to any shuttle", {}

        shuttle = db.session.get(Shuttle, driver.driver_profile.assigned_shuttle_id)
        if not shuttle:
            return False, "Assigned shuttle does not exist", {}

        # Validate coordinate formats
        is_valid, err_msg, lat_val, lng_val = validate_coordinates(latitude, longitude)
        if not is_valid:
            return False, err_msg, {}

        # Check accuracy (e.g. reject readings worse than 150m if provided)
        if accuracy is not None and accuracy > 200:
            return False, f"GPS accuracy ({accuracy}m) is too poor. Wait for a clearer satellite fix.", {}

        now_utc = datetime.now(timezone.utc)

        # Update shuttle
        shuttle.latest_latitude = lat_val
        shuttle.latest_longitude = lng_val
        shuttle.gps_accuracy = accuracy
        shuttle.gps_speed = speed
        shuttle.gps_heading = heading
        shuttle.last_gps_update = now_utc
        shuttle.is_tracking_active = True
        driver.driver_profile.is_on_duty = True

        # Insert history record
        history = LocationHistory(
            shuttle_id=shuttle.id,
            driver_id=driver.id,
            latitude=lat_val,
            longitude=lng_val,
            accuracy=accuracy,
            speed=speed,
            heading=heading,
            timestamp=now_utc
        )
        db.session.add(history)
        db.session.commit()

        # Stream location point to AWS DynamoDB telemetry table if configured
        try:
            from app.services.dynamo_service import DynamoTelemetryService
            DynamoTelemetryService.record_location_event(
                shuttle_id=shuttle.id,
                shuttle_code=shuttle.shuttle_code,
                driver_id=driver.id,
                lat=lat_val,
                lng=lng_val,
                speed=speed,
                heading=heading,
                accuracy=accuracy
            )
        except Exception:
            pass

        # Build real-time broadcast payload (sanitized of sensitive driver info)
        location_payload = {
            "shuttle_id": shuttle.id,
            "shuttle_code": shuttle.shuttle_code,
            "latitude": lat_val,
            "longitude": lng_val,
            "accuracy": accuracy,
            "speed": speed,
            "heading": heading,
            "timestamp": now_utc.isoformat(),
            "is_tracking_active": True,
            "is_within_campus": is_within_campus_bounds(lat_val, lng_val),
            "occupancy": {
                "count": shuttle.current_passenger_count,
                "capacity": shuttle.capacity,
                "available_seats": shuttle.available_seats,
                "percentage": shuttle.occupancy_percentage,
                "is_full": shuttle.is_full,
            }
        }

        try:
            socketio.emit("shuttle_location_update", location_payload)
        except Exception:
            pass

        return True, "Location recorded", location_payload
