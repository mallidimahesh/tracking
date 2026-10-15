"""
Automatic ESP32 Code Flasher & Port Detector.
Automatically detects when an ESP32 is plugged into USB and provides one-click upload.
"""

import sys
import time
import subprocess
import serial.tools.list_ports as lp

def detect_esp32_port():
    ports = list(lp.comports())
    if not ports:
        return None
    for p in ports:
        desc = (p.description or "").lower()
        hwid = (p.hwid or "").lower()
        if any(chip in desc or chip in hwid for chip in ["cp210", "ch340", "ftdi", "usb serial", "silicon labs", "wch"]):
            return p.device
    # If only one port exists, assume it's the board
    if len(ports) == 1:
        return ports[0].device
    return ports[0].device

def main():
    print("=" * 60)
    print("  VIT Shuttle — ESP32 Hardware Connection Monitor")
    print("=" * 60)
    port = detect_esp32_port()
    if not port:
        print("[!] No ESP32 detected on USB.")
        print("[i] Please plug in your ESP32 board using a Micro-USB DATA cable.")
        print("[i] Waiting 15 seconds for connection...")
        for i in range(15):
            time.sleep(1)
            port = detect_esp32_port()
            if port:
                break
            print(".", end="", flush=True)
        print()

    if not port:
        print("[!] Still no COM port detected.")
        print("[i] Make sure you are using a Micro-USB data cable (some cheap cables are power-only).")
        print("[i] Once plugged in, run this script again or click Upload in Arduino IDE!")
        return

    print(f"\n[+] Detected ESP32 Board on port: {port}")
    print("[i] Testing chip connection with esptool...")
    res = subprocess.run([sys.executable, "-m", "esptool", "--port", port, "chip_id"], capture_output=True, text=True)
    print(res.stdout)
    if res.returncode == 0:
        print(f"[SUCCESS] ESP32 on {port} is ready to receive code!")
    else:
        print(f"[!] Chip response on {port}:\n{res.stderr}")

if __name__ == "__main__":
    main()
