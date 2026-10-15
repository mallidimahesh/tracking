from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models.user import User
from app.utils.validators import is_valid_email_format, is_vit_student_email, validate_password_strength
from app.utils.decorators import generate_jwt_token, jwt_required
from app.services.email_service import EmailService
from flask import g

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/register-student", methods=["POST"])
def register_student():
    """
    Registers a VIT student account.
    CRITICAL: Strictly enforces @vitstudent.ac.in domain on backend.
    """
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    full_name = (data.get("full_name") or "").strip()
    password = data.get("password") or ""

    if not email or not full_name or not password:
        return jsonify({"error": "Email, full name, and password are required"}), 400

    # 1. Enforce VIT Student domain restriction
    if not is_vit_student_email(email):
        return jsonify({
            "error": "Registration restricted to verified VIT student email addresses ending with @vitstudent.ac.in"
        }), 400

    # 2. Check password strength
    valid_pwd, pwd_err = validate_password_strength(password)
    if not valid_pwd:
        return jsonify({"error": pwd_err}), 400

    # 3. Check for existing user
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email address already exists"}), 409

    # 4. Create student user
    user = User(
        email=email,
        full_name=full_name,
        role="student",
        is_email_verified=False,
    )
    user.set_password(password)
    token = user.generate_verification_token()

    db.session.add(user)
    db.session.commit()

    # 5. Dispatch verification email
    email_result = EmailService.send_verification_email(email, full_name, token)

    return jsonify({
        "message": "Student registration successful. Please verify your email before logging in.",
        "email": email,
        "role": "student",
        # Include token in response for quick testing/dev environments
        "verification_token": token if email_result.get("success") else None
    }), 201


@auth_bp.route("/register-outsider", methods=["POST"])
def register_outsider():
    """
    Registers an outsider / visitor account with any valid email address.
    """
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    full_name = (data.get("full_name") or "").strip()
    password = data.get("password") or ""

    if not email or not full_name or not password:
        return jsonify({"error": "Email, full name, and password are required"}), 400

    if not is_valid_email_format(email):
        return jsonify({"error": "Invalid email address format"}), 400

    valid_pwd, pwd_err = validate_password_strength(password)
    if not valid_pwd:
        return jsonify({"error": pwd_err}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email address already exists"}), 409

    user = User(
        email=email,
        full_name=full_name,
        role="outsider",
        is_email_verified=False,
    )
    user.set_password(password)
    token = user.generate_verification_token()

    db.session.add(user)
    db.session.commit()

    email_result = EmailService.send_verification_email(email, full_name, token)

    return jsonify({
        "message": "Outsider registration successful. Please verify your email before logging in.",
        "email": email,
        "role": "outsider",
        "verification_token": token if email_result.get("success") else None
    }), 201


@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    """Verifies user email with the supplied token."""
    data = request.get_json() or {}
    token = data.get("token")
    email = (data.get("email") or "").strip().lower()

    if not token:
        return jsonify({"error": "Verification token is required"}), 400

    query = User.query.filter_by(verification_token=token)
    if email:
        query = query.filter_by(email=email)

    user = query.first()
    if not user:
        return jsonify({"error": "Invalid or expired verification token"}), 400

    user.is_email_verified = True
    user.verification_token = None
    db.session.commit()

    return jsonify({
        "message": "Email successfully verified. You may now log in.",
        "email": user.email,
        "role": user.role
    }), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Unified login endpoint for Driver, Student, Outsider, and Admin.
    Enforces email verification for student and outsider accounts.
    """
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "Your account has been deactivated. Please contact campus admin."}), 403

    # Require email verification for students and outsiders (drivers and admins can be pre-verified)
    if user.role in ["student", "outsider"] and not user.is_email_verified:
        return jsonify({
            "error": "Email not verified. Please check your inbox or click 'Resend Verification'.",
            "needs_verification": True,
            "email": user.email
        }), 403

    token = generate_jwt_token(user)

    return jsonify({
        "token": token,
        "user": user.to_dict(include_driver_profile=True)
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required
def get_current_user_profile():
    return jsonify({"user": g.current_user.to_dict(include_driver_profile=True)})


@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "If the account exists, a verification email has been sent."}), 200

    if user.is_email_verified:
        return jsonify({"message": "Email is already verified. Please log in."}), 200

    token = user.generate_verification_token()
    db.session.commit()
    EmailService.send_verification_email(user.email, user.full_name, token)

    return jsonify({
        "message": "Verification email resent successfully.",
        "verification_token": token
    }), 200
