from datetime import datetime, timezone
from app.extensions import db

class Shuttle(db.Model):
    __tablename__ = "shuttles"

    id = db.Column(db.Integer, primary_key=True)
    shuttle_code = db.Column(db.String(10), unique=True, nullable=False, index=True)  # SH-01 to SH-06
    name = db.Column(db.String(100), nullable=False)
    capacity = db.Column(db.Integer, nullable=False, default=30)
    current_passenger_count = db.Column(db.Integer, nullable=False, default=0)

    # GPS state
    is_tracking_active = db.Column(db.Boolean, default=False, nullable=False)
    latest_latitude = db.Column(db.Float, nullable=True)
    latest_longitude = db.Column(db.Float, nullable=True)
    gps_accuracy = db.Column(db.Float, nullable=True)  # in meters
    gps_speed = db.Column(db.Float, nullable=True)     # in m/s
    gps_heading = db.Column(db.Float, nullable=True)   # in degrees
    last_gps_update = db.Column(db.DateTime, nullable=True)

    # Sensor state
    last_sensor_heartbeat = db.Column(db.DateTime, nullable=True)
    sensor_status = db.Column(db.String(20), default="offline", nullable=False)  # online, stale, offline, error

    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Assigned driver
    driver_profile = db.relationship("DriverProfile", back_populates="assigned_shuttle", uselist=False, foreign_keys="DriverProfile.assigned_shuttle_id")
    iot_devices = db.relationship("IoTDevice", back_populates="assigned_shuttle", cascade="all, delete-orphan")
    location_history = db.relationship("LocationHistory", back_populates="shuttle", cascade="all, delete-orphan", order_by="desc(LocationHistory.timestamp)")
    occupancy_events = db.relationship("OccupancyEvent", back_populates="shuttle", cascade="all, delete-orphan", order_by="desc(OccupancyEvent.timestamp)")

    @property
    def available_seats(self) -> int:
        return max(0, self.capacity - self.current_passenger_count)

    @property
    def occupancy_percentage(self) -> float:
        if self.capacity <= 0:
            return 0.0
        pct = (self.current_passenger_count / self.capacity) * 100.0
        return min(100.0, round(pct, 1))

    @property
    def is_full(self) -> bool:
        return self.current_passenger_count >= self.capacity

    def get_gps_status(self, stale_seconds=30, offline_seconds=120) -> str:
        if not self.is_tracking_active or not self.last_gps_update:
            return "offline"
        now = datetime.now(timezone.utc)
        # make sure last_gps_update is timezone-aware
        last_update = self.last_gps_update
        if last_update.tzinfo is None:
            last_update = last_update.replace(tzinfo=timezone.utc)
        elapsed = (now - last_update).total_seconds()
        if elapsed > offline_seconds:
            return "offline"
        elif elapsed > stale_seconds:
            return "stale"
        return "active"

    def get_sensor_status(self, stale_seconds=45, offline_seconds=150) -> str:
        if not self.last_sensor_heartbeat:
            return "offline"
        now = datetime.now(timezone.utc)
        last_beat = self.last_sensor_heartbeat
        if last_beat.tzinfo is None:
            last_beat = last_beat.replace(tzinfo=timezone.utc)
        elapsed = (now - last_beat).total_seconds()
        if elapsed > offline_seconds:
            return "offline"
        elif elapsed > stale_seconds:
            return "stale"
        return "online"

    def to_dict(self, include_driver_details=False):
        gps_status = self.get_gps_status()
        sensor_status = self.get_sensor_status()

        data = {
            "id": self.id,
            "shuttle_code": self.shuttle_code,
            "name": self.name,
            "capacity": self.capacity,
            "current_passenger_count": self.current_passenger_count,
            "available_seats": self.available_seats,
            "occupancy_percentage": self.occupancy_percentage,
            "is_full": self.is_full,
            "is_tracking_active": self.is_tracking_active,
            "latest_latitude": self.latest_latitude,
            "latest_longitude": self.latest_longitude,
            "gps_accuracy": self.gps_accuracy,
            "gps_speed": self.gps_speed,
            "gps_heading": self.gps_heading,
            "last_gps_update": self.last_gps_update.isoformat() if self.last_gps_update else None,
            "gps_status": gps_status,
            "last_sensor_heartbeat": self.last_sensor_heartbeat.isoformat() if self.last_sensor_heartbeat else None,
            "sensor_status": sensor_status,
            "is_active": self.is_active,
        }

        if include_driver_details and self.driver_profile and self.driver_profile.user:
            data["driver"] = {
                "id": self.driver_profile.user.id,
                "name": self.driver_profile.user.full_name,
                "phone": self.driver_profile.phone_number,
                "is_on_duty": self.driver_profile.is_on_duty,
            }
        else:
            data["driver_assigned"] = bool(self.driver_profile)

        return data
