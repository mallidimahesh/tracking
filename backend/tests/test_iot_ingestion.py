from app.models.shuttle import Shuttle
from app.models.occupancy import OccupancyEvent
from app.models.audit import AuditLog

def test_iot_authentication_and_event_ingestion(client, app):
    # SH-01 has device ESP32-SH01 with key 'vit_esp32_key_sh-01'
    api_key = "vit_esp32_key_sh-01"
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    # 1. Send ENTRY event
    res_entry = client.post("/api/iot/shuttles/1/occupancy", json={
        "sequence_number": 1,
        "event_type": "entry",
        "delta": 1,
    }, headers=headers)
    assert res_entry.status_code == 200
    assert res_entry.get_json()["data"]["current_passenger_count"] == 1

    # 2. Replay same sequence number -> Must be rejected with 400
    res_replay = client.post("/api/iot/shuttles/1/occupancy", json={
        "sequence_number": 1,
        "event_type": "entry",
        "delta": 1,
    }, headers=headers)
    assert res_replay.status_code == 400
    assert "Duplicate or stale sequence" in res_replay.get_json()["error"]

    # 3. Send EXIT event with higher sequence number
    res_exit = client.post("/api/iot/shuttles/1/occupancy", json={
        "sequence_number": 2,
        "event_type": "exit",
        "delta": 1,
    }, headers=headers)
    assert res_exit.status_code == 200
    assert res_exit.get_json()["data"]["current_passenger_count"] == 0

    # 4. Unauthorized device key
    res_unauth = client.post("/api/iot/shuttles/1/occupancy", json={
        "sequence_number": 3,
        "event_type": "entry",
    }, headers={"X-API-Key": "fake_invalid_key"})
    assert res_unauth.status_code == 401

def test_iot_heartbeat(client):
    headers = {"X-API-Key": "vit_esp32_key_sh-01", "Content-Type": "application/json"}
    res = client.post("/api/iot/shuttles/1/heartbeat", json={
        "firmware_version": "1.2.0",
        "battery_mv": 3900
    }, headers=headers)
    assert res.status_code == 200
    assert res.get_json()["data"]["status"] == "online"

def test_admin_manual_count_correction_with_audit(client, admin_user, auth_headers, app):
    headers = auth_headers(admin_user)

    res = client.post("/api/admin/shuttles/1/correct-count", json={
        "new_count": 18,
        "reason": "Manual driver physical headcount reconciliation"
    }, headers=headers)
    assert res.status_code == 200
    assert res.get_json()["shuttle"]["current_passenger_count"] == 18

    # Verify audit log recorded
    with app.app_context():
        audit = AuditLog.query.filter_by(action="MANUAL_OCCUPANCY_CORRECTION").first()
        assert audit is not None
        assert "18" in audit.details
