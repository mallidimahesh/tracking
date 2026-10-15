import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)

DEST_DIR = r"C:\Users\malli\Desktop\Rust"
OUTPUT_PDF = os.path.join(DEST_DIR, "VIT_Shuttle_Complete_Setup_Guide.pdf")

def build_pdf():
    os.makedirs(DEST_DIR, exist_ok=True)
    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#1e1b4b"),
        spaceAfter=6,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#4f46e5"),
        spaceAfter=14,
    )
    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=6,
    )
    h2_style = ParagraphStyle(
        "Heading2_Custom",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#334155"),
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6,
    )
    code_style = ParagraphStyle(
        "Code_Custom",
        parent=styles["Normal"],
        fontName="Courier-Bold",
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"),
        borderColor=colors.HexColor("#cbd5e1"),
        borderWidth=1,
        borderPadding=5,
        spaceAfter=6,
    )
    callout_style = ParagraphStyle(
        "Callout",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#065f46"),
        backColor=colors.HexColor("#ecfdf5"),
        borderColor=colors.HexColor("#a7f3d0"),
        borderWidth=1,
        borderPadding=6,
        spaceAfter=8,
    )

    story = []

    # Title Banner
    story.append(Paragraph("VIT SHUTTLE — SMART CAMPUS TRANSIT", title_style))
    story.append(Paragraph("Complete Beginner Step-by-Step Guide: Localhost, ESP32, and AWS Cloud", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#4f46e5"), spaceAfter=12))

    # Introduction
    story.append(Paragraph(
        "This project is a real-time transit system built specifically for <b>VIT Vellore</b>. It tracks campus shuttle <b>SH-01 (30 Seats)</b> using real driver mobile phone GPS and counts boarding passengers using doorway IR sensors.",
        body_style
    ))

    # SECTION 1: Localhost Execution
    story.append(Paragraph("1. Running the System on Localhost", h1_style))
    story.append(Paragraph(
        "The application has two parts that run together on your computer:",
        body_style
    ))

    url_table_data = [
        [Paragraph("<b>Component</b>", body_style), Paragraph("<b>Localhost URL</b>", body_style), Paragraph("<b>Description</b>", body_style)],
        [Paragraph("Frontend Web App", body_style), Paragraph("<b>http://localhost:5173</b>", code_style), Paragraph("React map interface, seat counts, and dashboards", body_style)],
        [Paragraph("Backend Server", body_style), Paragraph("<b>http://127.0.0.1:5000</b>", code_style), Paragraph("Flask-SocketIO API, GPS & IoT ingestion, SQLite", body_style)],
        [Paragraph("Health Check", body_style), Paragraph("<b>http://127.0.0.1:5000/api/health</b>", code_style), Paragraph("Returns {\"status\": \"healthy\"}", body_style)],
    ]
    url_table = Table(url_table_data, colWidths=[110, 190, 230])
    url_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(url_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Commands to start servers if stopped:</b>", h2_style))
    story.append(Paragraph("Terminal 1 (Backend): <code>.\\venv\\Scripts\\python backend/run.py</code>", code_style))
    story.append(Paragraph("Terminal 2 (Frontend): <code>cd frontend; npm run dev</code>", code_style))

    # SECTION 2: Test Accounts
    story.append(Paragraph("2. Pre-Configured Test Accounts", h1_style))
    story.append(Paragraph("Log in at <b>http://localhost:5173/login</b> using any of these roles:", body_style))

    accounts_data = [
        [Paragraph("<b>Role</b>", body_style), Paragraph("<b>Email</b>", body_style), Paragraph("<b>Password</b>", body_style), Paragraph("<b>What You Can Do</b>", body_style)],
        [Paragraph("Driver", body_style), Paragraph("driver1@vitshuttle.campus", code_style), Paragraph("Driver@2026", code_style), Paragraph("Assigned to SH-01. Click 'START MOBILE GPS TRACKING' to share phone coordinates.", body_style)],
        [Paragraph("Student", body_style), Paragraph("rahul.sharma2023@vitstudent.ac.in", code_style), Paragraph("Student@2026", code_style), Paragraph("Verified VIT student view, live campus map, seat availability, and ₹20 pass badge.", body_style)],
        [Paragraph("Admin", body_style), Paragraph("admin@vitshuttle.campus", code_style), Paragraph("Admin@VIT2026", code_style), Paragraph("Fleet console, driver provisioning, manual passenger adjustments with audit trail.", body_style)],
        [Paragraph("Visitor", body_style), Paragraph("Register any personal email", body_style), Paragraph("Any (6+ chars)", body_style), Paragraph("Public tracking access without driver or administrative permissions.", body_style)],
    ]
    acc_table = Table(accounts_data, colWidths=[70, 180, 90, 190])
    acc_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(acc_table)
    story.append(Spacer(1, 8))

    # SECTION 3: ESP32 Explained
    story.append(Paragraph("3. What to Do with the ESP32 (Explained Simply)", h1_style))
    story.append(Paragraph(
        "The <b>ESP32</b> is a small $4 Wi-Fi microcontroller board. Mounted at the shuttle doorway with two infrared (IR) beam sensors, it automatically detects students getting on (+1) and getting off (-1).",
        body_style
    ))

    story.append(Paragraph("<b>Choose Path A or Path B based on what you have:</b>", h2_style))

    # Path A
    story.append(Paragraph("<b>PATH A: If you DO NOT have the physical ESP32 board (Software Simulator):</b>", h2_style))
    story.append(Paragraph(
        "You do not need hardware to test! We included a Python simulator that sends the exact same authenticated HTTP requests to the backend. Open a terminal and run:",
        body_style
    ))
    story.append(Paragraph("# 1 person enters shuttle (+1) -> Available seats become 29/30:\n.\\venv\\Scripts\\python backend/simulate_esp32.py SH-01 entry 1", code_style))
    story.append(Paragraph("# 1 person exits shuttle (-1) -> Available seats return to 30/30:\n.\\venv\\Scripts\\python backend/simulate_esp32.py SH-01 exit 2", code_style))
    story.append(Paragraph("# Automated 10-event simulation loop simulating student boarding:\n.\\venv\\Scripts\\python backend/simulate_esp32.py loop SH-01 10 2.0", code_style))
    story.append(Paragraph("<b>Notice:</b> The moment you press Enter, look at http://localhost:5173. The seat count changes live via WebSockets!", callout_style))

    # Path B
    story.append(Paragraph("<b>PATH B: If you HAVE the physical ESP32 chip (Hardware Setup):</b>", h2_style))
    story.append(Paragraph("1. <b>Wiring:</b> Connect Sensor A (Outer Door) OUT pin to <b>GPIO 18</b> on the ESP32. Connect Sensor B (Inner Door) OUT pin to <b>GPIO 19</b>. Connect both sensor VCC pins to <b>3.3V</b> and GND pins to <b>GND</b>.", body_style))
    story.append(Paragraph("2. <b>Software:</b> Download and install free <b>Arduino IDE</b> (arduino.cc). Select Board: <i>ESP32 Dev Module</i>.", body_style))
    story.append(Paragraph("3. <b>Firmware File:</b> Open <code>iot/esp32_shuttle_counter/esp32_shuttle_counter.ino</code> in Arduino IDE. In <code>config.h</code>, enter your Wi-Fi name, password, and your computer's IP address.", body_style))
    story.append(Paragraph("4. <b>Upload:</b> Plug the ESP32 into your laptop via USB and click the <b>Upload (→)</b> button. Wave your hand across Sensor A then Sensor B to count passengers!", body_style))

    # SECTION 4: AWS Cloud Deployment
    story.append(Paragraph("4. AWS Cloud Deployment & Free Tier Strategy", h1_style))
    story.append(Paragraph(
        "This project includes ready-to-use AWS deployment files in the <code>aws/</code> directory:",
        body_style
    ))

    aws_data = [
        [Paragraph("<b>AWS Service</b>", body_style), Paragraph("<b>Deployment Purpose</b>", body_style), Paragraph("<b>Free Tier Allowance</b>", body_style)],
        [Paragraph("Amazon EC2 (t2.micro)", body_style), Paragraph("Runs Flask-SocketIO backend and persistent WebSockets", body_style), Paragraph("750 hours/month free (12 months)", body_style)],
        [Paragraph("Amazon EBS (20 GB GP3)", body_style), Paragraph("Persistent volume holding SQLite database outside containers", body_style), Paragraph("30 GB/month free (12 months)", body_style)],
        [Paragraph("Nginx Reverse Proxy", body_style), Paragraph("Handles SSL/HTTPS and WebSocket upgrade proxying", body_style), Paragraph("Included on EC2 host ($0 extra)", body_style)],
        [Paragraph("Zero NAT / Zero RDS", body_style), Paragraph("Uses Internet Gateway and EBS SQLite instead of expensive services", body_style), Paragraph("Saves ~$50/month in billable services", body_style)],
    ]
    aws_table = Table(aws_data, colWidths=[130, 240, 160])
    aws_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(aws_table)
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>Deploying to AWS using CloudFormation:</b>", h2_style))
    story.append(Paragraph("aws cloudformation create-stack --stack-name vit-shuttle-prod --template-body file://aws/cloudformation.yaml --parameters ParameterKey=KeyName,ParameterValue=your-keypair-name", code_style))

    story.append(Paragraph(
        "<b>Important AWS Billing Note:</b> AWS charges $0.005/hr (~$3.65/mo) for public IPv4 addresses since 2024. To keep spending at $0.00, simply stop the EC2 instance via the AWS Console whenever you are not actively presenting or testing.",
        body_style
    ))

    # SECTION 5: Verification & Tests
    story.append(Paragraph("5. Automated Test Suite", h1_style))
    story.append(Paragraph("To verify all 13 backend unit and integration tests passing:", body_style))
    story.append(Paragraph(".\\venv\\Scripts\\pytest backend/tests -v", code_style))
    story.append(Paragraph("All tests (student domain enforcement, replay protection, GPS validation, RBAC, available seats math) pass with 100% accuracy.", callout_style))

    doc.build(story)
    print(f"[OK] PDF successfully generated at: {OUTPUT_PDF}")

if __name__ == "__main__":
    build_pdf()
