"""
ESP32 Hardware Simulation Tool (Clearly Labelled for Development / Testing).
Sends authenticated HTTP requests mimicking physical ESP32 with dual IR sensors.
"""

import sys
import time
import json
import random
import urllib.request
import urllib.error
from datetime import datetime, timezone

BASE_URL = "http://127.0.0.1:5000"

SHUTTLE_DEVICE_MAP = {
    "SH-01": {"shuttle_id": 1, "device_code": "ESP32-SH01", "api_key": "vit_esp32_key_sh-01"},
    "SH-02": {"shuttle_id": 2, "device_code": "ESP32-SH02", "api_key": "vit_esp32_key_sh-02"},
    "SH-03": {"shuttle_id": 3, "device_code": "ESP32-SH03", "api_key": "vit_esp32_key_sh-03"},
    "SH-04": {"shuttle_id": 4, "device_code": "ESP32-SH04", "api_key": "vit_esp32_key_sh-04"},
    "SH-05": {"shuttle_id": 5, "device_code": "ESP32-SH05", "api_key": "vit_esp32_key_sh-05"},
    "SH-06": {"shuttle_id": 6, "device_code": "ESP32-SH06", "api_key": "vit_esp32_key_sh-06"},
}

def send_request(url: str, payload: dict, api_key: str):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-API-Key": api_key,
            "User-Agent": "ESP32-HTTP-Client/1.0.0"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return e.code, json.loads(body) if body else {"error": str(e)}
    except Exception as e:
        return 0, {"error": str(e)}

def simulate_event(shuttle_code: str, event_type: str, sequence_no: int, target_count: int = None):
    config = SHUTTLE_DEVICE_MAP.get(shuttle_code.upper())
    if not config:
        print(f"[!] Unknown shuttle code: {shuttle_code}")
        return

    url = f"{BASE_URL}/api/iot/shuttles/{config['shuttle_id']}/occupancy"
    payload = {
        "device_code": config["device_code"],
        "shuttle_id": config["shuttle_id"],
        "sequence_number": sequence_no,
        "event_type": event_type,
        "delta": 1 if event_type == "entry" else (-1 if event_type == "exit" else 0),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "SIMULATED_ESP32_DUAL_IR_SENSOR"
    }
    if event_type == "sync" and target_count is not None:
        payload["passenger_count"] = target_count

    status, response = send_request(url, payload, config["api_key"])
    print(f"[{status}] Sent {event_type.upper()} for {shuttle_code} (seq={sequence_no}) -> {response}")

def simulate_heartbeat(shuttle_code: str):
    config = SHUTTLE_DEVICE_MAP.get(shuttle_code.upper())
    if not config:
        return

    url = f"{BASE_URL}/api/iot/shuttles/{config['shuttle_id']}/heartbeat"
    payload = {
        "device_code": config["device_code"],
        "firmware_version": "1.0.0-sim",
        "battery_mv": 3920,
        "uptime_seconds": 3600
    }
    status, response = send_request(url, payload, config["api_key"])
    print(f"[{status}] Heartbeat for {shuttle_code} -> {response}")

def run_loop(shuttle_code: str = "SH-01", count: int = 10, interval: float = 2.0):
    print(f"\n--- [DEMO SIMULATION] Running ESP32 Sensor Simulation for {shuttle_code} ---")
    print("Press Ctrl+C to stop.\n")
    seq = int(time.time())
    # send heartbeat first
    simulate_heartbeat(shuttle_code)
    try:
        for i in range(count):
            event = random.choice(["entry", "entry", "exit"])
            seq += 1
            simulate_event(shuttle_code, event, seq)
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\nSimulation stopped by user.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("""
ESP32 Sensor Simulator (Development / Testing Mode)
Usage:
  python simulate_esp32.py <shuttle_code> <entry|exit|heartbeat> [seq]
  python simulate_esp32.py loop <shuttle_code> [iterations] [interval_seconds]

Examples:
  python simulate_esp32.py SH-01 entry
  python simulate_esp32.py SH-01 exit
  python simulate_esp32.py SH-01 heartbeat
  python simulate_esp32.py loop SH-01 5 1.5
        """)
        sys.exit(0)

    arg1 = sys.argv[1].upper()
    if arg1 == "LOOP":
        shuttle = sys.argv[2] if len(sys.argv) > 2 else "SH-01"
        iters = int(sys.argv[3]) if len(sys.argv) > 3 else 5
        sec = float(sys.argv[4]) if len(sys.argv) > 4 else 2.0
        run_loop(shuttle, iters, sec)
    elif len(sys.argv) >= 3:
        action = sys.argv[2].lower()
        if action == "heartbeat":
            simulate_heartbeat(arg1)
        elif action == "sync":
            count_val = int(sys.argv[3]) if len(sys.argv) > 3 else 0
            seq = int(time.time())
            simulate_event(arg1, "sync", seq, target_count=count_val)
        else:
            seq = int(sys.argv[3]) if (len(sys.argv) > 3 and sys.argv[3].isdigit() and len(sys.argv[3]) > 6) else int(time.time())
            simulate_event(arg1, action, seq)

