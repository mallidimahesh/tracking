from app.models.shuttle import Shuttle

def test_shuttle_initialization(client):
    res = client.get("/api/shuttles")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] == 1
    assert data["shuttles"][0]["shuttle_code"] == "SH-01"
    assert data["shuttles"][0]["capacity"] == 30

def test_occupancy_and_capacity_calculations(app):
    with app.app_context():
        shuttle = Shuttle.query.filter_by(shuttle_code="SH-01").first()
        assert shuttle is not None
        shuttle.capacity = 30
        shuttle.current_passenger_count = 15

        # Available seats = 30 - 15 = 15
        assert shuttle.available_seats == 15
        assert shuttle.occupancy_percentage == 50.0
        assert not shuttle.is_full

        # Set to full capacity
        shuttle.current_passenger_count = 30
        assert shuttle.available_seats == 0
        assert shuttle.occupancy_percentage == 100.0
        assert shuttle.is_full

        # Over-capacity test
        shuttle.current_passenger_count = 35
        assert shuttle.available_seats == 0
        assert shuttle.occupancy_percentage == 100.0
        assert shuttle.is_full

def test_campus_meta_vit_vellore(client):
    res = client.get("/api/shuttles/campus-meta")
    assert res.status_code == 200
    meta = res.get_json()
    assert meta["campus_name"] == "VIT Vellore"
    assert meta["center"]["lat"] == 12.9692
    assert meta["center"]["lng"] == 79.1559
    assert len(meta["polygon"]) >= 4
    assert len(meta["landmarks"]) >= 5
