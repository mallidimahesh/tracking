import json
from datetime import datetime, timezone
from app.extensions import db, socketio
from app.models.shuttle import Shuttle
from app.models.iot import IoTDevice
from app.models.occupancy import OccupancyEvent
from app.models.audit import AuditLog
from app.models.user import User

class OccupancyService:
    @staticmethod
    def process_iot_event(device: IoTDevice, shuttle_id: int, payload: dict) -> tuple[bool, str, dict]:
        """
        Processes an occupancy event from an ESP32 IR sensor device.
        Payload structure:
        {
            "sequence_number": 105,
            "event_type": "entry" | "exit" | "sync",
            "delta": 1,
            "passenger_count": 14,
            "timestamp": "2026-10-15T16:00:00Z"
        }
        """
        # Verify shuttle assignment
        if device.assigned_shuttle_id != shuttle_id:
            return False, f"Device {device.device_code} is not authorized for shuttle id {shuttle_id}", {}

        shuttle = db.session.get(Shuttle, shuttle_id)
        if not shuttle:
            return False, f"Shuttle {shuttle_id} not found", {}

        sequence_number = payload.get("sequence_number")
        if sequence_number is not None:
            # Replay protection: sequence number must be strictly greater than last seen
            if sequence_number <= device.last_sequence_number:
                return False, f"Duplicate or stale sequence number: {sequence_number} <= {device.last_sequence_number}", {}
            device.last_sequence_number = sequence_number

        event_type = payload.get("event_type", "sync").lower()
        now_utc = datetime.now(timezone.utc)
        old_count = shuttle.current_passenger_count
        delta = 0

        if event_type == "entry":
            delta = payload.get("delta", 1)
            new_count = old_count + delta
        elif event_type == "exit":
            delta = -abs(payload.get("delta", 1))
            new_count = max(0, old_count + delta)
        elif event_type == "sync":
            new_count = max(0, int(payload.get("passenger_count", old_count)))
            delta = new_count - old_count
        else:
            return False, f"Unknown event_type: {event_type}", {}

        # Clamp count to non-negative
        new_count = max(0, new_count)
        shuttle.current_passenger_count = new_count
        shuttle.last_sensor_heartbeat = now_utc
        shuttle.sensor_status = "online"

        device.last_seen = now_utc

        # Record event in audit history
        event_record = OccupancyEvent(
            shuttle_id=shuttle.id,
            device_id=device.id,
            sequence_number=sequence_number,
            event_type=event_type,
            delta=delta,
            count_after=new_count,
            raw_payload=json.dumps(payload),
            timestamp=now_utc
        )
        db.session.add(event_record)
        db.session.commit()

        # Stream event to AWS DynamoDB telemetry table if configured
        try:
            from app.services.dynamo_service import DynamoTelemetryService
            DynamoTelemetryService.record_occupancy_event(
                shuttle_id=shuttle.id,
                shuttle_code=shuttle.shuttle_code,
                device_code=device.device_code,
                event_type=event_type,
                delta=delta,
                count_after=new_count
            )
        except Exception:
            pass

        # Check over-capacity alert
        is_over_capacity = new_count > shuttle.capacity

        # Broadcast update to connected dashboards
        broadcast_payload = {
            "shuttle_id": shuttle.id,
            "shuttle_code": shuttle.shuttle_code,
            "current_passenger_count": shuttle.current_passenger_count,
            "capacity": shuttle.capacity,
            "available_seats": shuttle.available_seats,
            "occupancy_percentage": shuttle.occupancy_percentage,
            "is_full": shuttle.is_full,
            "is_over_capacity": is_over_capacity,
            "sensor_status": "online",
            "last_sensor_heartbeat": now_utc.isoformat(),
            "event_type": event_type,
            "delta": delta,
        }

        try:
            socketio.emit("shuttle_occupancy_update", broadcast_payload)
        except Exception:
            pass

        return True, "Occupancy updated successfully", broadcast_payload

    @staticmethod
    def process_heartbeat(device: IoTDevice, shuttle_id: int, payload: dict) -> tuple[bool, str, dict]:
        """Processes periodic ESP32 health heartbeat."""
        if device.assigned_shuttle_id != shuttle_id:
            return False, "Device not assigned to this shuttle", {}

        shuttle = db.session.get(Shuttle, shuttle_id)
        if not shuttle:
            return False, "Shuttle not found", {}

        now_utc = datetime.now(timezone.utc)
        device.last_seen = now_utc
        if "firmware_version" in payload:
            device.firmware_version = payload["firmware_version"]

        shuttle.last_sensor_heartbeat = now_utc
        shuttle.sensor_status = "online"
        db.session.commit()

        return True, "Heartbeat acknowledged", {
            "device_code": device.device_code,
            "shuttle_code": shuttle.shuttle_code,
            "last_seen": now_utc.isoformat(),
            "status": "online"
        }

    @staticmethod
    def manual_correction(actor: User, shuttle_id: int, new_count: int, reason: str = "") -> tuple[bool, str, dict]:
        """Allows authorized admin/driver to correct passenger count with audit trail."""
        shuttle = db.session.get(Shuttle, shuttle_id)
        if not shuttle:
            return False, "Shuttle not found", {}

        if new_count < 0:
            return False, "Passenger count cannot be negative", {}

        now_utc = datetime.now(timezone.utc)
        old_count = shuttle.current_passenger_count
        delta = new_count - old_count
        shuttle.current_passenger_count = new_count

        # Log occupancy event
        event = OccupancyEvent(
            shuttle_id=shuttle.id,
            device_id=None,
            sequence_number=None,
            event_type="manual_correction",
            delta=delta,
            count_after=new_count,
            raw_payload=json.dumps({"corrected_by": actor.id, "reason": reason, "previous_count": old_count}),
            timestamp=now_utc
        )
        db.session.add(event)

        # Log audit trail
        audit = AuditLog(
            action="MANUAL_OCCUPANCY_CORRECTION",
            actor_id=actor.id,
            target_type="Shuttle",
            target_id=str(shuttle.id),
            details=f"Corrected occupancy from {old_count} to {new_count}. Reason: {reason}",
            timestamp=now_utc
        )
        db.session.add(audit)
        db.session.commit()

        broadcast_payload = {
            "shuttle_id": shuttle.id,
            "shuttle_code": shuttle.shuttle_code,
            "current_passenger_count": shuttle.current_passenger_count,
            "capacity": shuttle.capacity,
            "available_seats": shuttle.available_seats,
            "occupancy_percentage": shuttle.occupancy_percentage,
            "is_full": shuttle.is_full,
            "sensor_status": shuttle.sensor_status,
            "event_type": "manual_correction",
            "delta": delta,
        }

        try:
            socketio.emit("shuttle_occupancy_update", broadcast_payload)
        except Exception:
            pass

        return True, "Manual correction applied", broadcast_payload
