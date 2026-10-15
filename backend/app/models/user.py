from datetime import datetime, timezone
import secrets
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="outsider")  # student, outsider, driver, admin
    is_email_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(100), unique=True, nullable=True)
    verification_token_expiry = db.Column(db.DateTime, nullable=True)
    password_reset_token = db.Column(db.String(100), unique=True, nullable=True)
    password_reset_expiry = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    driver_profile = db.relationship("DriverProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def generate_verification_token(self):
        self.verification_token = secrets.token_urlsafe(32)
        return self.verification_token

    def generate_password_reset_token(self):
        self.password_reset_token = secrets.token_urlsafe(32)
        return self.password_reset_token

    def to_dict(self, include_driver_profile=True):
        data = {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_email_verified": self.is_email_verified,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_driver_profile and self.driver_profile:
            data["driver_profile"] = self.driver_profile.to_dict()
        return data


class DriverProfile(db.Model):
    __tablename__ = "driver_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    driver_license_no = db.Column(db.String(50), nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    assigned_shuttle_id = db.Column(db.Integer, db.ForeignKey("shuttles.id"), nullable=True)
    is_on_duty = db.Column(db.Boolean, default=False, nullable=False)

    user = db.relationship("User", back_populates="driver_profile")
    assigned_shuttle = db.relationship("Shuttle", back_populates="driver_profile", foreign_keys=[assigned_shuttle_id])

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "driver_license_no": self.driver_license_no,
            "phone_number": self.phone_number,
            "assigned_shuttle_id": self.assigned_shuttle_id,
            "assigned_shuttle_code": self.assigned_shuttle.shuttle_code if self.assigned_shuttle else None,
            "is_on_duty": self.is_on_duty,
        }
