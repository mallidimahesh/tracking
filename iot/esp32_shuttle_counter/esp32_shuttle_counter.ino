/*
 * VIT Shuttle — ESP32 Dual IR Passenger Counter Firmware
 * Platform: ESP32 (Arduino Core)
 * Author: VIT Transit Systems Engineering
 * 
 * Hardware Description:
 *   - ESP32 DevKit V1
 *   - 2x Active-LOW IR Obstacle Sensors (Sensor A: Outer Door, Sensor B: Inner Door)
 *   - Status LED on GPIO 2
 *   - Preferences NVS storage to preserve passenger count across unexpected restarts
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Preferences.h>
#include "config.h"

// Non-volatile storage to persist passenger count across reboots
Preferences preferences;

// Tracking state variables
int localPassengerCount = 0;
unsigned long sequenceNumber = 0;
unsigned long lastHeartbeatTime = 0;

// Directional State Machine States
enum SensorState {
  STATE_IDLE,
  STATE_A_FIRST, // Entered from outside towards inside
  STATE_B_FIRST  // Exited from inside towards outside
};

SensorState currentState = STATE_IDLE;
unsigned long stateStartTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==========================================");
  Serial.println("  VIT Shuttle — ESP32 IR Passenger Counter");
  Serial.print("  Device: "); Serial.println(DEVICE_CODE);
  Serial.print("  Firmware: "); Serial.println(FIRMWARE_VERSION);
  Serial.println("==========================================");

  // Configure GPIO Pins
  pinMode(PIN_IR_SENSOR_A, INPUT_PULLUP);
  pinMode(PIN_IR_SENSOR_B, INPUT_PULLUP);
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);

  // Load persisted passenger count and sequence from NVS
  preferences.begin("shuttle_iot", false);
  localPassengerCount = preferences.getInt("pass_count", 0);
  sequenceNumber = preferences.getULong("seq_no", 0);
  Serial.printf("[NVS] Restored local passenger count: %d, seq: %lu\n", localPassengerCount, sequenceNumber);

  // Connect to Wi-Fi
  connectWiFi();
}

// Set to true if testing with 1 IR sensor. Set to false for 2-sensor directional doorway.
#define SINGLE_SENSOR_MODE true

bool lastSensorAState = false;

void loop() {
  // Ensure Wi-Fi remains connected
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(PIN_STATUS_LED, LOW);
    connectWiFi();
  } else {
    digitalWrite(PIN_STATUS_LED, HIGH);
  }

  // Read IR sensor states (Active LOW: LOW / 0 = Obstacle/Hand detected, HIGH / 1 = Clear)
  bool aBlocked = (digitalRead(PIN_IR_SENSOR_A) == LOW);
  bool bBlocked = (digitalRead(PIN_IR_SENSOR_B) == LOW);
  unsigned long now = millis();

  // Print raw sensor debug to Serial Monitor every time it changes
  if (aBlocked != lastSensorAState) {
    Serial.printf("[SENSOR RAW] Sensor A (GPIO 18): %s\n", aBlocked ? "HAND DETECTED (BLOCKED)" : "CLEAR");
  }

  // =========================================================================
  // MODE 1: SINGLE-SENSOR MODE (Immediate trigger on hand wave)
  // =========================================================================
  if (SINGLE_SENSOR_MODE) {
    // Edge trigger: Only count when hand enters beam (transition from clear -> blocked)
    if (aBlocked && !lastSensorAState) {
      localPassengerCount++;
      sequenceNumber++;
      persistState();
      
      Serial.printf("\n>>> [HAND DETECTED] Passenger In! Count: %d | Seq: %lu\n", localPassengerCount, sequenceNumber);
      pulseLed();
      sendOccupancyEvent("entry", 1, localPassengerCount);
      
      delay(400); // Debounce delay to prevent double-counting 1 hand wave
    }
    lastSensorAState = aBlocked;
  }
  // =========================================================================
  // MODE 2: DUAL-SENSOR DIRECTIONAL MODE (Doorway A -> B entry, B -> A exit)
  // =========================================================================
  else {
    lastSensorAState = aBlocked;
    switch (currentState) {
      case STATE_IDLE:
        if (aBlocked && !bBlocked) {
          currentState = STATE_A_FIRST;
          stateStartTime = now;
          Serial.println("[IR] Sensor A interrupted (Outer -> Inner attempt)");
        } else if (bBlocked && !aBlocked) {
          currentState = STATE_B_FIRST;
          stateStartTime = now;
          Serial.println("[IR] Sensor B interrupted (Inner -> Outer attempt)");
        }
        break;

      case STATE_A_FIRST:
        if (bBlocked) {
          localPassengerCount++;
          sequenceNumber++;
          persistState();
          Serial.printf("[ENTRY DETECTED] New Count: %d | Seq: %lu\n", localPassengerCount, sequenceNumber);
          
          pulseLed();
          sendOccupancyEvent("entry", 1, localPassengerCount);

          delay(SENSOR_DEBOUNCE_MS);
          currentState = STATE_IDLE;
        } else if (now - stateStartTime > DIRECTION_TIMEOUT_MS) {
          Serial.println("[IR] Timeout: Person did not complete entry. Resetting state.");
          currentState = STATE_IDLE;
        }
        break;

      case STATE_B_FIRST:
        if (aBlocked) {
          if (localPassengerCount > 0) {
            localPassengerCount--;
          }
          sequenceNumber++;
          persistState();
          Serial.printf("[EXIT DETECTED] New Count: %d | Seq: %lu\n", localPassengerCount, sequenceNumber);
          
          pulseLed();
          sendOccupancyEvent("exit", -1, localPassengerCount);

          delay(SENSOR_DEBOUNCE_MS);
          currentState = STATE_IDLE;
        } else if (now - stateStartTime > DIRECTION_TIMEOUT_MS) {
          Serial.println("[IR] Timeout: Person did not complete exit. Resetting state.");
          currentState = STATE_IDLE;
        }
        break;
    }
  }

  // Periodic heartbeat transmission
  if (now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    sendHeartbeat();
    lastHeartbeatTime = now;
  }

  delay(20); // Small loop pause
}

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to SSID: %s ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED)); // Toggle LED while connecting
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PIN_STATUS_LED, HIGH);
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP Address: "); Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI Signal: "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");
  } else {
    Serial.println("\n[WiFi] Failed to connect. Will retry in background loop.");
  }
}

void persistState() {
  preferences.putInt("pass_count", localPassengerCount);
  preferences.putULong("seq_no", sequenceNumber);
}

void pulseLed() {
  digitalWrite(PIN_STATUS_LED, LOW);
  delay(80);
  digitalWrite(PIN_STATUS_LED, HIGH);
}

void sendOccupancyEvent(const char* eventType, int delta, int countAfter) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Cannot send event: Wi-Fi disconnected");
    return;
  }

  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/iot/shuttles/" + String(SHUTTLE_ID) + "/occupancy";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", DEVICE_API_KEY);
  http.addHeader("User-Agent", "ESP32-VIT-Shuttle/1.2.0");

  String payload = "{";
  payload += "\"device_code\":\"" + String(DEVICE_CODE) + "\",";
  payload += "\"shuttle_id\":" + String(SHUTTLE_ID) + ",";
  payload += "\"sequence_number\":" + String(sequenceNumber) + ",";
  payload += "\"event_type\":\"" + String(eventType) + "\",";
  payload += "\"delta\":" + String(delta) + ",";
  payload += "\"passenger_count\":" + String(countAfter);
  payload += "}";

  Serial.printf("[HTTP] POST %s -> %s\n", url.c_str(), payload.c_str());

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP] Server Response (%d): %s\n", httpCode, response.c_str());
  } else {
    Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/iot/shuttles/" + String(SHUTTLE_ID) + "/heartbeat";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", DEVICE_API_KEY);

  String payload = "{";
  payload += "\"device_code\":\"" + String(DEVICE_CODE) + "\",";
  payload += "\"firmware_version\":\"" + String(FIRMWARE_VERSION) + "\",";
  payload += "\"uptime_seconds\":" + String(millis() / 1000) + ",";
  payload += "\"wifi_rssi\":" + String(WiFi.RSSI()) + ",";
  payload += "\"current_count\":" + String(localPassengerCount);
  payload += "}";

  int httpCode = http.POST(payload);
  if (httpCode == 200) {
    Serial.println("[HEARTBEAT] Ping acknowledged by transit server.");
  } else {
    Serial.printf("[HEARTBEAT] Failed with code: %d\n", httpCode);
  }
  http.end();
}
