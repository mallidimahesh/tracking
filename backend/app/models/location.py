from datetime import datetime, timezone
from app.extensions import db

class LocationHistory(db.Model):
    __tablename__ = "location_history"

    id = db.Column(db.Integer, primary_key=True)
    shuttle_id = db.Column(db.Integer, db.ForeignKey("shuttles.id"), nullable=False, index=True)
    driver_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    accuracy = db.Column(db.Float, nullable=True)
    speed = db.Column(db.Float, nullable=True)
    heading = db.Column(db.Float, nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    shuttle = db.relationship("Shuttle", back_populates="location_history")
    driver = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "shuttle_id": self.shuttle_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "accuracy": self.accuracy,
            "speed": self.speed,
            "heading": self.heading,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
