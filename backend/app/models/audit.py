from datetime import datetime, timezone
from app.extensions import db

class AuditLog(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(100), nullable=False, index=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    target_type = db.Column(db.String(50), nullable=True)
    target_id = db.Column(db.String(50), nullable=True)
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    actor = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "action": self.action,
            "actor_id": self.actor_id,
            "actor_name": self.actor.full_name if self.actor else "System",
            "target_type": self.target_type,
            "target_id": self.target_id,
            "details": self.details,
            "ip_address": self.ip_address,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
