# ESP32 Dual IR Sensor Hardware & Wiring Guide
## VIT Shuttle — Smart Campus Transit System

This document provides complete instructions for wiring, calibrating, and installing the directional passenger counting hardware inside transit shuttles.

---

## 1. Electrical Schematic & Wiring Diagram

```
+-------------------------------------------------------------+
|                ESP32 DevKit V1 (30/38 Pin)                  |
|                                                             |
|   [VIN] <-----------------+ 5V DC (from LM2596 Converter)   |
|   [GND] <-------------+---+ GND Common                      |
|                       |   |                                 |
|   [3V3] --------+-----+   |                                 |
|                 |         |                                 |
|   [GPIO 18] <-- | --------+-- OUT (Sensor A: Outer Door)    |
|   [GPIO 19] <-- | --------+-- OUT (Sensor B: Inner Door)    |
|   [GPIO 2]  --> [Onboard Status LED]                        |
+-------------------------------------------------------------+
                  |         |
                  |         |
       +----------+         +----------+
       |                               |
+------+------+                 +------+------+
| IR Sensor A |                 | IR Sensor B |
| (Outer Door)|                 | (Inner Door)|
| VCC: 3.3V   |                 | VCC: 3.3V   |
| GND: GND    |                 | GND: GND    |
| OUT: GPIO 18|                 | OUT: GPIO 19|
+-------------+                 +-------------+
```

---

## 2. Doorway Sensor Placement Guidelines

To prevent miscounts and ensure reliable entry/exit distinction:

1. **Mounting Height:**
   - Mount sensors at **1.0 to 1.2 meters** above the shuttle entrance steps.
   - This height detects the human torso while ignoring swinging hands, bags, or foot movements.
2. **Horizontal Spacing:**
   - Space Sensor A (outer) and Sensor B (inner) **8 cm to 12 cm apart**.
   - If spaced too close (< 5 cm), both sensors trigger simultaneously, obscuring directionality.
   - If spaced too far (> 25 cm), a fast-walking student may clear Sensor A before triggering Sensor B within the timeout.
3. **Alignment & Optical Cross-Talk:**
   - Ensure the IR emitters and phototransistors point across the doorway towards a matte (non-reflective) surface.
   - Use the onboard potentiometer on the LM393 comparator to adjust sensitivity: adjust until the onboard LED triggers reliably when a hand passes through the doorway at 60–80 cm distance.

---

## 3. Power Supply from Vehicle 12V Battery

Transit shuttles operate on a standard 12V or 24V lead-acid battery system:

- **Do NOT connect vehicle 12V directly to the ESP32.**
- Use an **LM2596 DC-DC Buck Converter Step-Down Module** or automotive 12V-to-5V USB regulator.
- Tune the LM2596 output potentiometer with a multimeter to output exactly **5.0V DC** before wiring to the ESP32 `VIN` and `GND` pins.
- Add a 1A inline fuse on the 12V positive rail for fire and short-circuit protection.

---

## 4. Hardware Troubleshooting Checklist

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| **Both sensors trigger at once** | Sensors mounted too close together | Increase sensor spacing to 10–12 cm. |
| **False triggers in bright sunlight** | Direct ambient sunlight saturating IR receiver | Add 3D-printed black hoods / shrouds over the photodiode lenses. |
| **Count resets on engine ignition** | Voltage dip during vehicle starter motor cranking | Add a 470µF electrolytic capacitor across 5V and GND rails; verify NVS persistence. |
| **Wi-Fi disconnects intermittently** | Campus Wi-Fi dead zone on transit loop | Firmware automatically buffers events and retries once connection resumes. |
