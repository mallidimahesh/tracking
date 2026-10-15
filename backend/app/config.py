import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Config:
    """Base application configuration."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "vit-shuttle-dev-secret-key-change-in-production-2026")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "jwt-super-secret-vit-transit-key-2026")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES_SECONDS", 86400)) # 24 hours
    )

    # Database
    INSTANCE_DIR = BASE_DIR / "instance"
    INSTANCE_DIR.mkdir(parents=True, exist_ok=True)
    DB_PATH = INSTANCE_DIR / "vit_shuttle.db"
    _raw_db_url = os.environ.get("DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")
    if _raw_db_url.startswith("postgres://"):
        _raw_db_url = _raw_db_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URI = _raw_db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # CORS
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

    # Domain restriction for VIT students
    VIT_STUDENT_EMAIL_DOMAIN = os.environ.get("VIT_STUDENT_EMAIL_DOMAIN", "@vitstudent.ac.in").lower()

    # Campus Geofence Boundaries (VIT Vellore Campus)
    VIT_CAMPUS_CENTER = {"lat": 12.9692, "lng": 79.1559}
    VIT_CAMPUS_BOUNDS = {
        "min_lat": 12.9600,
        "max_lat": 12.9800,
        "min_lng": 79.1450,
        "max_lng": 79.1750
    }

    # Timeouts for staleness
    STALE_GPS_THRESHOLD_SECONDS = int(os.environ.get("STALE_GPS_THRESHOLD_SECONDS", 30))
    OFFLINE_GPS_THRESHOLD_SECONDS = int(os.environ.get("OFFLINE_GPS_THRESHOLD_SECONDS", 120))
    STALE_SENSOR_THRESHOLD_SECONDS = int(os.environ.get("STALE_SENSOR_THRESHOLD_SECONDS", 45))
    OFFLINE_SENSOR_THRESHOLD_SECONDS = int(os.environ.get("OFFLINE_SENSOR_THRESHOLD_SECONDS", 150))

    # Rate limiting & security
    MAX_LOCATION_UPDATE_RATE_SECONDS = float(os.environ.get("MAX_LOCATION_UPDATE_RATE_SECONDS", 1.5))
    BCRYPT_ROUNDS = int(os.environ.get("BCRYPT_ROUNDS", 12))

    # Email simulation/verification
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER", "noreply@vitshuttle.campus")
    ENABLE_CONSOLE_EMAIL = os.environ.get("ENABLE_CONSOLE_EMAIL", "true").lower() == "true"


class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False


class TestingConfig(Config):
    DEBUG = True
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    # In production, require environment variables for secrets
    SECRET_KEY = os.environ.get("SECRET_KEY")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
