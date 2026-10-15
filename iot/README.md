# VIT Shuttle — ESP32 Passenger Counter System

This directory contains the production-grade Arduino C++ firmware and wiring documentation for the **ESP32 Dual-IR Passenger Ingestion System** deployed aboard VIT Vellore campus transit shuttles.

---

## 1. Directional Passenger Counting Principle

A transit shuttle doorway experiences bi-directional passenger traffic: students entering from outside into the cabin, and passengers alighting.

### Why Dual Sensors Are Mandatory (Single Sensor Limitations)
- **Single Sensor Failure Mode:** A single optical or IR sensor can only detect that an obstruction occurred (beam broken). It has **zero directionality**: an alighting passenger looks identical to a boarding passenger, resulting in compounding count errors within minutes. Furthermore, a passenger standing near the doorway will repeatedly trigger false positives.
- **Dual Sensor State Machine:** By positioning two IR obstacle sensors in series along the doorway axis (Sensor A on the exterior doorframe, Sensor B towards the interior cabin, spaced 8–12 cm apart):
  - **Entry Pattern:** Sensor A interrupted first, followed by Sensor B within `DIRECTION_TIMEOUT_MS` (2000ms) $\rightarrow$ Passenger **Entered** (+1).
  - **Exit Pattern:** Sensor B interrupted first, followed by Sensor A within `DIRECTION_TIMEOUT_MS` $\rightarrow$ Passenger **Exited** (-1).
  - **Aborted Movement:** If a passenger steps into beam A but turns back without triggering beam B before the timeout, the state resets cleanly to `IDLE` with no count modification.

```
Door Exterior                        Door Interior
[ Outside ] ---> [ IR Sensor A ] ---> [ IR Sensor B ] ---> [ Shuttle Cabin ]
                   (GPIO 18)            (GPIO 19)
```

---

## 2. Hardware Wiring & Bill of Materials

| Component | Part Description | Connection to ESP32 |
| :--- | :--- | :--- |
| **Microcontroller** | ESP32 DevKit V1 (30 or 38 pin) | Micro-USB / 5V Regulated |
| **IR Sensor A (Outer)** | TCRT5000 / LM393 IR Obstacle Module | VCC $\rightarrow$ 3.3V, GND $\rightarrow$ GND, OUT $\rightarrow$ GPIO 18 |
| **IR Sensor B (Inner)** | TCRT5000 / LM393 IR Obstacle Module | VCC $\rightarrow$ 3.3V, GND $\rightarrow$ GND, OUT $\rightarrow$ GPIO 19 |
| **Status Indicator** | Built-in Blue LED | GPIO 2 |
| **Power Supply** | 12V-to-5V Step-Down Converter (Shuttle 12V Battery) | 5V $\rightarrow$ ESP32 VIN, GND $\rightarrow$ GND |

> **Note on Pull-up Resistors:** The firmware configures internal pull-ups (`INPUT_PULLUP`). Most LM393 digital obstacle modules have active-LOW outputs with built-in pull-up resistors.

---

## 3. Configuration & Flashing

1. Copy `config.h.example` to `config.h`:
   ```bash
   cp config.h.example config.h
   ```
2. Edit `config.h` with your Wi-Fi SSID, password, and the assigned shuttle API key (retrieved from the Admin dashboard or `python manage.py show-device-keys`).
3. Open `esp32_shuttle_counter.ino` in Arduino IDE or VS Code PlatformIO.
4. Select Board: **ESP32 Dev Module**, Flash Frequency: **80MHz**, Upload Speed: **921600**.
5. Connect ESP32 via USB and click **Upload**.
6. Open Serial Monitor at **115200 baud** to view real-time beam break events, Wi-Fi connectivity, and HTTP responses.

---

## 4. Local Testing Without Physical Hardware

If you are developing or testing without physical hardware connected, run the Python simulation script:
```bash
# Send an entry event (+1) for SH-01
python backend/simulate_esp32.py SH-01 entry 1

# Send an exit event (-1) for SH-01
python backend/simulate_esp32.py SH-01 exit 2

# Send heartbeat health check
python backend/simulate_esp32.py SH-01 heartbeat

# Run an interactive simulation loop
python backend/simulate_esp32.py loop SH-01 5 1.5
```
