# VIT Shuttle — Smart Campus Transit System (VIT Vellore)

![VIT Shuttle Banner](https://img.shields.io/badge/VIT%20Vellore-Smart%20Campus%20Transit-4f46e5?style=for-the-badge)
![AWS Architecture](https://img.shields.io/badge/AWS-Free%20Tier%20Eligible-ff9900?style=for-the-badge&logo=amazon-aws)
![ESP32 Telemetry](https://img.shields.io/badge/IoT-ESP32%20Dual%20IR-10b981?style=for-the-badge&logo=espressif)
![Tests](https://img.shields.io/badge/Tests-13%2F13%20Passing-success?style=for-the-badge)

A complete, production-ready, real-time campus transit tracking and passenger counting web platform engineered specifically for **VIT Vellore**.

The system connects **mobile phone GPS from drivers**, **automated bidirectional passenger counts from ESP32 IR sensors aboard shuttles**, and a **Leaflet map centered exclusively on the VIT Vellore campus** for students and campus visitors.

---

## 1. Key Features

- **Driver Mobile Phone GPS Tracking:** Drivers log in via their smartphone browser and share live GPS coordinates (3–5s intervals) with accuracy filtering, heading, and speed telemetry.
- **ESP32 Bidirectional Passenger Counting:** Doorway dual-IR optical state machine automatically detects passenger entry (+1) and exit (-1), maintains counts across restarts in non-volatile flash (NVS), and pushes authenticated updates via HTTPS.
- **Server-Side Domain Enforcement:** Registration for VIT students is strictly restricted on the backend to verified `@vitstudent.ac.in` email addresses.
- **Outsider & Visitor Access:** Public access for visitors and parents to track shuttle locations and available seats without administrative privileges.
- **Exclusive VIT Vellore Map:** Leaflet map centered at `12.9692° N, 79.1559° E` with campus geofence boundary polygon and key stops (Tech Tower, SJT, Hostels, Main Gate).
- **Six-Shuttle Fleet (SH-01 to SH-06):** Tracks capacities (20–35 seats), remaining available seats, occupancy percentage, GPS status (Active, Stale, Offline), and sensor status.
- **Future ₹20 Flat Fare Architecture:** Integrated wallet badge placeholder indicating the fixed ₹20 campus transit pass.
- **AWS Free Tier Deployment:** Engineered to run within 12-month AWS Free Tier limits (EC2 `t2.micro`, persistent EBS GP3 SQLite volume, zero paid NAT gateways, zero paid RDS).

---

## 2. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Leaflet with OpenStreetMap, Socket.IO Client, Lucide Icons, Recharts |
| **Backend** | Python 3.12+, Flask 3, Flask-SocketIO, Flask-SQLAlchemy, Simple-WebSocket, Gunicorn, Gevent, PyJWT, Pytest |
| **IoT Hardware** | ESP32 DevKit V1, 2x TCRT5000 / LM393 IR Obstacle Sensors, Arduino C++ core, NVS Preferences |
| **Cloud (AWS)** | Amazon EC2 (t2.micro / t3.micro), Amazon EBS (GP3), Nginx Reverse Proxy, CloudFormation, Docker & Docker Compose |

---

## 3. Six-Shuttle Fleet Specifications

| Shuttle ID | Vehicle Display Name | Capacity | Route Loop | Initial State |
| :---: | :--- | :---: | :--- | :---: |
| **SH-01** | Campus Express 1 | 30 | Main Gate $\leftrightarrow$ Technology Tower | Inactive / Offline |
| **SH-02** | Campus Express 2 | 30 | Main Gate $\leftrightarrow$ Silver Jubilee Tower | Inactive / Offline |
| **SH-03** | Hostel Shuttle A | 25 | Men's Hostels (MH) Loop | Inactive / Offline |
| **SH-04** | Hostel Shuttle B | 25 | Ladies Hostels (LH) Connector | Inactive / Offline |
| **SH-05** | Tech Tower Loop | 20 | Admin Block $\leftrightarrow$ TT $\leftrightarrow$ Foodys | Inactive / Offline |
| **SH-06** | Main Gate Connector | 35 | Katpadi Road Junction $\leftrightarrow$ Campus | Inactive / Offline |

> Shuttles initialize as inactive until real driver GPS coordinates and ESP32 telemetry arrive. A clearly labelled **Demo Mode** is available for evaluation and testing.

---

## 4. Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 20+ & npm

### Step 1: Clone & Setup Backend
```bash
# Create Python virtual environment
python -m venv venv

# Activate venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Initialize database and seed 6 shuttles & default accounts
python backend/manage.py seed
python backend/manage.py list-shuttles

# Run Flask-SocketIO backend
python backend/run.py
```
Backend runs at `http://127.0.0.1:5000`.

### Step 2: Setup & Run Frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

---

## 5. Automated Pytest Suite

Run all automated unit and integration tests:

```bash
# Run pytest across all test modules
pytest backend/tests -v
```

### Verified Test Coverage (13 Tests Passing):
- `test_student_registration_domain_enforcement`: Rejects non-VIT emails (`@gmail.com`, `@vit.ac.in`) and enforces `@vitstudent.ac.in`.
- `test_outsider_registration_and_email_verification`: Tests visitor signup and token activation.
- `test_login_invalid_credentials`: Verifies password hashing and 401 handling.
- `test_driver_tracking_start_and_stop`: Tests driver session activation.
- `test_driver_location_submission`: Validates GPS coordinates and persistence in `LocationHistory`.
- `test_invalid_coordinates_rejected`: Bounds validation (rejects invalid latitude/longitude).
- `test_iot_authentication_and_event_ingestion`: Tests ESP32 `X-API-Key` auth and sequence replay rejection.
- `test_iot_heartbeat`: Verifies device health telemetry.
- `test_admin_manual_count_correction_with_audit`: Tests manual headcount overrides with audit trail.
- `test_role_based_access_control`: Verifies students/outsiders cannot access driver or admin routes.
- `test_six_shuttles_initialization`: Verifies SH-01 through SH-06 initialization.
- `test_occupancy_and_capacity_calculations`: Tests available seats math, percentages, and over-capacity clamps.
- `test_campus_meta_vit_vellore`: Verifies campus coordinates, boundary polygon, and landmark stops.

---

## 6. Testing Without Physical Hardware (Simulation Tool)

If developing without physical ESP32 hardware plugged in:

```bash
# Send an entry event (+1 passenger) for SH-01
python backend/simulate_esp32.py SH-01 entry 1

# Send an exit event (-1 passenger) for SH-01
python backend/simulate_esp32.py SH-01 exit 2

# Send heartbeat health check
python backend/simulate_esp32.py SH-01 heartbeat

# Run an automated 10-event loop simulating student boarding
python backend/simulate_esp32.py loop SH-01 10 2.0
```

---

## 7. Default Credentials for Testing

| Role | Email | Password | Assigned Vehicle |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@vitshuttle.campus` | `Admin@VIT2026` | Fleet-wide access |
| **Driver 1** | `driver1@vitshuttle.campus` | `Driver@2026` | SH-01 (Campus Express 1) |
| **Driver 2** | `driver2@vitshuttle.campus` | `Driver@2026` | SH-02 (Campus Express 2) |
| **Student (Demo)** | `rahul.sharma2023@vitstudent.ac.in` | `Student@2026` | Student Dashboard & Map |

---

## 8. AWS Cloud Deployment

Complete deployment guides and infrastructure-as-code templates are included in the `aws/` and `docs/` directories:

- **[AWS Free Tier & Cost Guide](docs/AWS_FREE_TIER_GUIDE.md):** Complete cost analysis and budget alert instructions.
- **[AWS Deployment Guide](docs/AWS_DEPLOYMENT_GUIDE.md):** CloudFormation template deployment, Nginx WebSocket configuration, and Let's Encrypt SSL setup.
- **[System Architecture](docs/ARCHITECTURE.md):** Technical data flow diagrams and RBAC specifications.
- **[ESP32 Hardware Guide](docs/ESP32_WIRING_GUIDE.md):** Physical wiring, schematics, and sensor calibration.
- **[Teardown Guide](docs/TEARDOWN_GUIDE.md):** Step-by-step instructions to delete or pause resources for zero-cost operation.
