import json
from app.models.user import User

def test_student_registration_domain_enforcement(client):
    # 1. Valid VIT Student email
    res = client.post("/api/auth/register-student", json={
        "email": "riya.sen2024@vitstudent.ac.in",
        "full_name": "Riya Sen",
        "password": "Password123"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data["role"] == "student"
    assert "verification_token" in data

    # 2. Invalid domain: @gmail.com
    res_bad = client.post("/api/auth/register-student", json={
        "email": "riya.sen@gmail.com",
        "full_name": "Riya Sen",
        "password": "Password123"
    })
    assert res_bad.status_code == 400
    assert "@vitstudent.ac.in" in res_bad.get_json()["error"]

    # 3. Invalid domain: @vit.ac.in (faculty domain, not student)
    res_fac = client.post("/api/auth/register-student", json={
        "email": "prof.sharma@vit.ac.in",
        "full_name": "Prof Sharma",
        "password": "Password123"
    })
    assert res_fac.status_code == 400
    assert "@vitstudent.ac.in" in res_fac.get_json()["error"]

def test_outsider_registration_and_email_verification(client):
    # 1. Register outsider with regular email
    res = client.post("/api/auth/register-outsider", json={
        "email": "parent.visitor@yahoo.com",
        "full_name": "Anil Visitor",
        "password": "Password123"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data["role"] == "outsider"
    token = data["verification_token"]
    assert token is not None

    # 2. Attempt login before email verification -> Must fail with 403
    login_res = client.post("/api/auth/login", json={
        "email": "parent.visitor@yahoo.com",
        "password": "Password123"
    })
    assert login_res.status_code == 403
    assert login_res.get_json().get("needs_verification") is True

    # 3. Verify email with token
    verify_res = client.post("/api/auth/verify-email", json={
        "email": "parent.visitor@yahoo.com",
        "token": token
    })
    assert verify_res.status_code == 200

    # 4. Login after verification -> Must succeed with 200 and return JWT
    login_after = client.post("/api/auth/login", json={
        "email": "parent.visitor@yahoo.com",
        "password": "Password123"
    })
    assert login_after.status_code == 200
    assert "token" in login_after.get_json()
    assert login_after.get_json()["user"]["role"] == "outsider"

def test_login_invalid_credentials(client):
    res = client.post("/api/auth/login", json={
        "email": "nonexistent@vitstudent.ac.in",
        "password": "wrongpassword"
    })
    assert res.status_code == 401
