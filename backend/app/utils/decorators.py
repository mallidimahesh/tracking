from functools import wraps
from datetime import datetime, timezone, timedelta
import jwt
from flask import request, jsonify, g, current_app
from app.models.user import User
from app.models.iot import IoTDevice

def generate_jwt_token(user: User, expires_in_seconds: int = None) -> str:
    """Generates a secure JWT token containing user identity and role."""
    if expires_in_seconds is None:
        delta = current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", timedelta(days=1))
        exp = datetime.now(timezone.utc) + delta
    else:
        exp = datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds)

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
        "exp": exp,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")

def decode_jwt_token(token: str) -> dict:
    """Decodes and validates a JWT token."""
    return jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])

def jwt_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header:
            return jsonify({"error": "Authorization header missing"}), 401

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Authorization format must be: Bearer <token>"}), 401

        token = parts[1]
        try:
            payload = decode_jwt_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired, please log in again"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        user_id_raw = payload.get("sub")
        try:
            user_id = int(user_id_raw)
        except (ValueError, TypeError):
            return jsonify({"error": "Malformed user subject in token"}), 401

        from app.extensions import db
        user = db.session.get(User, user_id)
        if not user or not user.is_active:
            return jsonify({"error": "User account not found or deactivated"}), 401

        g.current_user = user
        return f(*args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        @jwt_required
        def decorated(*args, **kwargs):
            if g.current_user.role not in allowed_roles:
                return jsonify({
                    "error": f"Access denied. Requires one of the following roles: {', '.join(allowed_roles)}"
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

def iot_auth_required(f):
    """
    Validates IoT devices sending telemetry via HTTP.
    Accepts: X-API-Key header or Authorization: Bearer <key>
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                api_key = auth_header[7:].strip()

        if not api_key:
            return jsonify({"error": "Missing IoT API key. Provide X-API-Key header"}), 401

        key_hash = IoTDevice.hash_key(api_key)
        device = IoTDevice.query.filter_by(api_key_hash=key_hash, is_active=True).first()
        if not device:
            return jsonify({"error": "Unauthorized IoT device or invalid API key"}), 401

        g.current_device = device
        return f(*args, **kwargs)
    return decorated
