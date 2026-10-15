from app.models.shuttle import Shuttle
from app.models.location import LocationHistory

def test_driver_tracking_start_and_stop(client, driver_user, auth_headers):
    headers = auth_headers(driver_user)

    # 1. Start tracking
    res_start = client.post("/api/driver/tracking/start", headers=headers)
    assert res_start.status_code == 200
    assert res_start.get_json()["shuttle"]["is_tracking_active"] is True

    # 2. Stop tracking
    res_stop = client.post("/api/driver/tracking/stop", headers=headers)
    assert res_stop.status_code == 200
    assert res_stop.get_json()["shuttle"]["is_tracking_active"] is False

def test_driver_location_submission(client, driver_user, auth_headers, app):
    headers = auth_headers(driver_user)

    # Submit valid GPS coordinate (near VIT Main Gate)
    payload = {
        "latitude": 12.9692,
        "longitude": 79.1559,
        "accuracy": 8.0,
        "speed": 15.5,
        "heading": 90.0
    }
    res = client.post("/api/driver/tracking/location", json=payload, headers=headers)
    assert res.status_code == 200
    loc_data = res.get_json()["location"]
    assert loc_data["latitude"] == 12.9692
    assert loc_data["longitude"] == 79.1559

    # Verify database persistence
    with app.app_context():
        shuttle = Shuttle.query.filter_by(shuttle_code="SH-01").first()
        assert shuttle.latest_latitude == 12.9692
        assert shuttle.latest_longitude == 79.1559
        assert shuttle.is_tracking_active is True

        history = LocationHistory.query.filter_by(shuttle_id=shuttle.id).first()
        assert history is not None
        assert history.latitude == 12.9692

def test_invalid_coordinates_rejected(client, driver_user, auth_headers):
    headers = auth_headers(driver_user)

    # Invalid latitude > 90
    res = client.post("/api/driver/tracking/location", json={
        "latitude": 999.0,
        "longitude": 79.1559
    }, headers=headers)
    assert res.status_code == 400
