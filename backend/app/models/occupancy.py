from datetime import datetime, timezone
from app.extensions import db

class OccupancyEvent(db.Model):
    __tablename__ = "occupancy_events"

    id = db.Column(db.Integer, primary_key=True)
    shuttle_id = db.Column(db.Integer, db.ForeignKey("shuttles.id"), nullable=False, index=True)
    device_id = db.Column(db.Integer, db.ForeignKey("iot_devices.id"), nullable=True)
    sequence_number = db.Column(db.Integer, nullable=True)
    event_type = db.Column(db.String(30), nullable=False)  # entry, exit, sync, manual_correction
    delta = db.Column(db.Integer, default=0, nullable=False)
    count_after = db.Column(db.Integer, nullable=False)
    raw_payload = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    shuttle = db.relationship("Shuttle", back_populates="occupancy_events")
    device = db.relationship("IoTDevice")

    def to_dict(self):
        return {
            "id": self.id,
            "shuttle_id": self.shuttle_id,
            "device_id": self.device_id,
            "sequence_number": self.sequence_number,
            "event_type": self.event_type,
            "delta": self.delta,
            "count_after": self.count_after,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
