"""
Comprehensive Local API Testing Suite (using HTTP / curl equivalents)
Tests:
1. Health Check
2. Student Login (@vitstudent.ac.in)
3. Driver Login & Web-Based GPS Location Update
4. Outsider Login & Access
5. ESP32 Dual-IR Passenger Count Update (Testing Count = 3 from board)
6. Real-Time Shuttle List & Occupancy Verification
"""

import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://127.0.0.1:5000"

def make_req(method, endpoint, payload=None, headers=None):
    headers = headers or {}
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    if payload is not None:
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, json.loads(body) if body else {"error": str(e)}

def run_tests():
    print("=" * 70)
    print("  VIT SHUTTLE — LOCAL FUNCTIONALITY VERIFICATION (CURL / HTTP)")
    print("=" * 70)

    # 1. Health
    st, res = make_req("GET", "/api/health")
    print(f"\n[1/6] Health Check: Status {st} -> {res.get('status')}")
    assert st == 200, f"Health check failed: {res}"

    # 2. Student Login
    st, res = make_req("POST", "/api/auth/login", {
        "email": "student1@vitstudent.ac.in",
        "password": "Student@2026"
    })
    print(f"[2/6] Student Login: Status {st} -> User: {res.get('user', {}).get('email')}, Role: {res.get('user', {}).get('role')}")
    assert st == 200, f"Student login failed: {res}"

    # 3. Outsider Login
    st, res = make_req("POST", "/api/auth/login", {
        "email": "outsider1@gmail.com",
        "password": "Outsider@2026"
    })
    print(f"[3/6] Outsider Login: Status {st} -> User: {res.get('user', {}).get('email')}, Role: {res.get('user', {}).get('role')}")
    assert st == 200, f"Outsider login failed: {res}"

    # 4. Driver Login & Web-Based GPS Location Dispatch
    st, res = make_req("POST", "/api/auth/login", {
        "email": "driver1@vitshuttle.campus",
        "password": "Driver@2026"
    })
    assert st == 200, f"Driver login failed: {res}"
    driver_token = res["token"]
    driver_user = res["user"]
    print(f"[4/6] Driver Login: Status {st} -> Driver: {driver_user['full_name']}, Assigned Shuttle: {driver_user.get('driver_profile', {}).get('assigned_shuttle_code')}")

    # Web-based GPS dispatch:
    st, res = make_req("POST", "/api/driver/tracking/location", {
        "latitude": 12.9692,
        "longitude": 79.1559,
        "speed": 22.4,
        "heading": 178.5,
        "accuracy": 8.0
    }, headers={"Authorization": f"Bearer {driver_token}"})
    print(f"      Driver Web-GPS Update: Status {st} -> Lat: {res.get('data', {}).get('latitude')}, Lng: {res.get('data', {}).get('longitude')}, Speed: {res.get('data', {}).get('speed')} km/h")
    assert st == 200, f"Driver GPS update failed: {res}"

    # 5. ESP32 Count from Board Test (Setting count to 3)
    seq = int(time.time() * 10)
    st, res = make_req("POST", "/api/iot/shuttles/1/occupancy", {
        "device_code": "ESP32-SH01",
        "shuttle_id": 1,
        "sequence_number": seq,
        "event_type": "sync",
        "passenger_count": 3
    }, headers={"X-API-Key": "vit_esp32_key_sh-01"})
    print(f"[5/6] ESP32 Board Telemetry (Count=3): Status {st} -> Passenger Count: {res.get('data', {}).get('current_passenger_count')}, Seats Available: {res.get('data', {}).get('available_seats')}/30, Load: {res.get('data', {}).get('occupancy_percentage')}%")
    assert st == 200, f"IoT count update failed: {res}"

    # 6. Public Shuttles Endpoint (Verify live status on website)
    st, res = make_req("GET", "/api/shuttles")
    shuttle = res["shuttles"][0]
    print(f"[6/6] Public Shuttle API: Status {st} -> Code: {shuttle['shuttle_code']}, Current Passengers: {shuttle['current_passenger_count']}, Available Seats: {shuttle['available_seats']}, Sensor Status: {shuttle['sensor_status']}")
    assert shuttle["current_passenger_count"] == 3, f"Expected 3 passengers, got {shuttle['current_passenger_count']}"

    print("\n" + "=" * 70)
    print("  ALL 6/6 LOCAL FUNCTIONALITIES TESTED AND WORKING 100% SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
