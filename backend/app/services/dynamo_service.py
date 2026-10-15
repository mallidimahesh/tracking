"""
Amazon DynamoDB Telemetry & Location Streaming Service.
Streams high-frequency GPS tracking points and IoT passenger events to DynamoDB.
Falls back silently if AWS credentials are not configured (local mode).
"""

import os
import json
from datetime import datetime, timezone

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False


class DynamoTelemetryService:
    _dynamo_resource = None
    _table = None

    @classmethod
    def get_table(cls):
        if not BOTO3_AVAILABLE:
            return None

        table_name = os.environ.get("DYNAMODB_TABLE_NAME", "VITShuttleTelemetry")
        region = os.environ.get("AWS_REGION", "ap-south-1")

        if cls._table is None:
            try:
                cls._dynamo_resource = boto3.resource("dynamodb", region_name=region)
                cls._table = cls._dynamo_resource.Table(table_name)
            except Exception:
                return None
        return cls._table

    @classmethod
    def record_location_event(cls, shuttle_id: int, shuttle_code: str, driver_id: int, lat: float, lng: float, speed: float, heading: float, accuracy: float):
        """Streams driver GPS location update to DynamoDB."""
        table = cls.get_table()
        if not table:
            return

        item = {
            "shuttle_id": str(shuttle_id),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": "GPS_LOCATION",
            "shuttle_code": str(shuttle_code),
            "driver_id": str(driver_id),
            "latitude": str(lat),
            "longitude": str(lng),
            "speed_kmh": str(round(speed or 0.0, 2)),
            "heading": str(round(heading or 0.0, 1)),
            "accuracy_meters": str(round(accuracy or 0.0, 1)),
        }
        try:
            table.put_item(Item=item)
        except (NoCredentialsError, ClientError, Exception):
            pass

    @classmethod
    def record_occupancy_event(cls, shuttle_id: int, shuttle_code: str, device_code: str, event_type: str, delta: int, count_after: int):
        """Streams ESP32 passenger counting beam break to DynamoDB."""
        table = cls.get_table()
        if not table:
            return

        item = {
            "shuttle_id": str(shuttle_id),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": f"IOT_{event_type.upper()}",
            "shuttle_code": str(shuttle_code),
            "device_code": str(device_code),
            "delta": int(delta),
            "passenger_count": int(count_after),
        }
        try:
            table.put_item(Item=item)
        except (NoCredentialsError, ClientError, Exception):
            pass
