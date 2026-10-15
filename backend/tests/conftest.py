import pytest
import os
import sys

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app, seed_initial_fleet
from app.extensions import db
from app.models.user import User, DriverProfile
from app.models.shuttle import Shuttle
from app.models.iot import IoTDevice
from app.utils.decorators import generate_jwt_token

@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        seed_initial_fleet(app)
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def student_user(app):
    with app.app_context():
        user = User(
            email="test.student@vitstudent.ac.in",
            full_name="Aarav Sharma",
            role="student",
            is_email_verified=True
        )
        user.set_password("StudentPass@123")
        db.session.add(user)
        db.session.commit()
        return user.id

@pytest.fixture
def outsider_user(app):
    with app.app_context():
        user = User(
            email="visitor@example.com",
            full_name="Rajesh Visitor",
            role="outsider",
            is_email_verified=True
        )
        user.set_password("OutsiderPass@123")
        db.session.add(user)
        db.session.commit()
        return user.id

@pytest.fixture
def driver_user(app):
    with app.app_context():
        driver = User.query.filter_by(email="driver1@vitshuttle.campus").first()
        return driver.id

@pytest.fixture
def admin_user(app):
    with app.app_context():
        admin = User.query.filter_by(role="admin").first()
        return admin.id

@pytest.fixture
def auth_headers(app):
    def _get_headers(user_or_id):
        with app.app_context():
            uid = user_or_id if isinstance(user_or_id, int) else (user_or_id.id if hasattr(user_or_id, "id") else int(user_or_id))
            user_inst = db.session.get(User, uid)
            token = generate_jwt_token(user_inst)
            return {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
    return _get_headers
