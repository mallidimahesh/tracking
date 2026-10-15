from datetime import datetime, timezone
import hashlib
import secrets
from app.extensions import db

class IoTDevice(db.Model):
    __tablename__ = "iot_devices"

    id = db.Column(db.Integer, primary_key=True)
    device_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    assigned_shuttle_id = db.Column(db.Integer, db.ForeignKey("shuttles.id"), nullable=True)
    api_key_hash = db.Column(db.String(64), nullable=False)
    firmware_version = db.Column(db.String(20), default="1.0.0", nullable=False)
    ip_address = db.Column(db.String(50), nullable=True)
    last_sequence_number = db.Column(db.Integer, default=0, nullable=False)
    last_seen = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    assigned_shuttle = db.relationship("Shuttle", back_populates="iot_devices")

    @staticmethod
    def hash_key(api_key: str) -> str:
        return hashlib.sha256(api_key.encode("utf-8")).hexdigest()

    def set_api_key(self, api_key: str):
        self.api_key_hash = self.hash_key(api_key)

    def verify_api_key(self, api_key: str) -> bool:
        return self.api_key_hash == self.hash_key(api_key)

    @classmethod
    def generate_api_key(cls) -> str:
        return f"vit_esp32_{secrets.token_hex(16)}"

    def to_dict(self):
        return {
            "id": self.id,
            "device_code": self.device_code,
            "assigned_shuttle_id": self.assigned_shuttle_id,
            "shuttle_code": self.assigned_shuttle.shuttle_code if self.assigned_shuttle else None,
            "firmware_version": self.firmware_version,
            "ip_address": self.ip_address,
            "last_sequence_number": self.last_sequence_number,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
