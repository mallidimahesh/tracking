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
    PageBreak,
)

DEST_DIR = r"C:\Users\malli\Desktop\Rust"
OUTPUT_PDF = os.path.join(DEST_DIR, "ESP32_Start_To_End_Guide.pdf")
ALT_PDF = os.path.join(DEST_DIR, "VIT_Shuttle_Complete_Setup_Guide.pdf")

def create_story():
    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1e1b4b"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#4f46e5"),
        spaceAfter=10,
    )
    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=12,
        spaceAfter=5,
    )
    h2_style = ParagraphStyle(
        "Heading2_Custom",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14.5,
        textColor=colors.HexColor("#334155"),
        spaceBefore=8,
        spaceAfter=3,
    )
    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=5,
    )
    code_style = ParagraphStyle(
        "Code_Custom",
        parent=styles["Normal"],
        fontName="Courier-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"),
        borderColor=colors.HexColor("#cbd5e1"),
        borderWidth=0.8,
        borderPadding=4,
        spaceAfter=5,
    )
    callout_green = ParagraphStyle(
        "CalloutGreen",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#065f46"),
        backColor=colors.HexColor("#ecfdf5"),
        borderColor=colors.HexColor("#a7f3d0"),
        borderWidth=0.8,
        borderPadding=5,
        spaceAfter=6,
    )
    callout_amber = ParagraphStyle(
        "CalloutAmber",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#92400e"),
        backColor=colors.HexColor("#fffbeb"),
        borderColor=colors.HexColor("#fde68a"),
        borderWidth=0.8,
        borderPadding=5,
        spaceAfter=6,
    )

    story = []

    # Title Banner
    story.append(Paragraph("ESP32 PASSENGER COUNTER — START TO END GUIDE", title_style))
    story.append(Paragraph("Complete Beginner Manual: Hardware, Wiring, Arduino IDE, Code Upload & Testing", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#4f46e5"), spaceAfter=10))

    # SECTION 0: What Does This Hardware Do?
    story.append(Paragraph("0. What Does the ESP32 Actually Do in This Project?", h1_style))
    story.append(Paragraph(
        "The <b>ESP32</b> is a small $4 microcontroller board with built-in Wi-Fi. In this project, it acts as the <b>automated passenger counter</b> installed inside shuttle <b>SH-01</b>.",
        body_style
    ))
    story.append(Paragraph(
        "It connects to <b>two infrared (IR) beam sensors</b> positioned at the shuttle doorway: "
        "<br/>• When a student enters (breaks Outer Sensor A then Inner Sensor B), the ESP32 sends a message over Wi-Fi: <i>'+1 boarded! Available seats: 29/30'</i>."
        "<br/>• When a student exits (breaks Inner Sensor B then Outer Sensor A), it sends: <i>'-1 alighted! Available seats: 30/30'</i>."
        "<br/>• The website at <b>http://localhost:5173</b> immediately updates the seat meter in real time without refreshing!",
        body_style
    ))

    # SECTION 1: Parts Checklist
    story.append(Paragraph("1. Hardware Parts Checklist (What to Buy)", h1_style))
    parts_data = [
        [Paragraph("<b>Item Name</b>", body_style), Paragraph("<b>Description</b>", body_style), Paragraph("<b>Approx. Cost</b>", body_style), Paragraph("<b>Where to Buy</b>", body_style)],
        [Paragraph("ESP32 DevKit V1", body_style), Paragraph("30-pin or 38-pin ESP-WROOM-32 board with Micro-USB port", body_style), Paragraph("₹350 – ₹450 ($4)", body_style), Paragraph("Amazon, Robocraze, Robu.in", body_style)],
        [Paragraph("2x IR Obstacle Sensors", body_style), Paragraph("LM393 or TCRT5000 active-low optical obstacle sensor modules", body_style), Paragraph("₹40 – ₹60 each ($0.50)", body_style), Paragraph("Amazon, local electronics shop", body_style)],
        [Paragraph("Jumper Wires", body_style), Paragraph("Female-to-Female (F-F) or Female-to-Male jumper wires (pack of 10)", body_style), Paragraph("₹50 ($0.60)", body_style), Paragraph("Any electronics store", body_style)],
        [Paragraph("Micro-USB Cable", body_style), Paragraph("<b>Must be a Data Cable</b> (NOT charge-only cable) to upload code", body_style), Paragraph("₹100 ($1.20)", body_style), Paragraph("Standard phone/device cable", body_style)],
    ]
    parts_table = Table(parts_data, colWidths=[110, 200, 100, 130])
    parts_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(parts_table)
    story.append(Spacer(1, 4))

    # SECTION 2: Wiring
    story.append(Paragraph("2. How to Wire the Sensors to the ESP32 (Pin by Pin)", h1_style))
    story.append(Paragraph("Look at the little printed labels on your ESP32 board and on the back of each IR sensor:", body_style))

    wiring_data = [
        [Paragraph("<b>Sensor Pin</b>", body_style), Paragraph("<b>Connects to ESP32 Pin</b>", body_style), Paragraph("<b>Function / Purpose</b>", body_style)],
        [Paragraph("<b>Sensor A (Outer Door) - VCC</b>", body_style), Paragraph("<b>3V3</b> (or 3.3V pin)", code_style), Paragraph("Powers Sensor A with 3.3 Volts DC", body_style)],
        [Paragraph("<b>Sensor A (Outer Door) - GND</b>", body_style), Paragraph("<b>GND</b> (Ground pin)", code_style), Paragraph("Negative ground connection", body_style)],
        [Paragraph("<b>Sensor A (Outer Door) - OUT</b>", body_style), Paragraph("<b>GPIO 18</b> (labeled D18 or 18)", code_style), Paragraph("Sends signal when person crosses outer doorway", body_style)],
        [Paragraph("<b>Sensor B (Inner Cabin) - VCC</b>", body_style), Paragraph("<b>3V3</b> (Shared with Sensor A)", code_style), Paragraph("Powers Sensor B with 3.3 Volts DC", body_style)],
        [Paragraph("<b>Sensor B (Inner Cabin) - GND</b>", body_style), Paragraph("<b>GND</b> (Shared with Sensor A)", code_style), Paragraph("Negative ground connection", body_style)],
        [Paragraph("<b>Sensor B (Inner Cabin) - OUT</b>", body_style), Paragraph("<b>GPIO 19</b> (labeled D19 or 19)", code_style), Paragraph("Sends signal when person crosses inner cabin", body_style)],
    ]
    wiring_table = Table(wiring_data, colWidths=[160, 160, 220])
    wiring_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(wiring_table)
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Tip:</b> If your ESP32 only has one 3V3 pin and you have two VCC wires, you can plug both into a breadboard power rail, or twist the two VCC wires together into one jumper.", callout_green))

    # SECTION 3: Installing Software
    story.append(Paragraph("3. Installing Free Software on Your Computer (Arduino IDE)", h1_style))
    story.append(Paragraph("<b>Step 3.1: Download Arduino IDE</b><br/>Go to <b>https://www.arduino.cc/en/software</b> and download <b>Arduino IDE 2.x</b> for Windows. Run the installer.", body_style))
    story.append(Paragraph("<b>Step 3.2: Enable ESP32 Support in Arduino IDE</b><br/>"
        "1. Open Arduino IDE. Click <b>File</b> &rarr; <b>Preferences</b>.<br/>"
        "2. Look for the box called <i>'Additional Boards Manager URLs'</i> and paste this link:<br/>"
        "<code>https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json</code><br/>"
        "3. Click <b>OK</b>.<br/>"
        "4. On the left sidebar, click the <b>Boards Manager</b> icon (looks like a circuit board).<br/>"
        "5. Search <code>esp32</code> by <i>Espressif Systems</i> and click <b>Install</b> (takes ~1 minute).",
        body_style
    ))

    # Page Break for clean reading
    story.append(PageBreak())

    # SECTION 4: Configuring Code
    story.append(Paragraph("4. Configuring the Firmware Code for Your Network", h1_style))
    story.append(Paragraph(
        "We already wrote the complete, working Arduino C++ code for you in your project directory!",
        body_style
    ))
    story.append(Paragraph(
        "<b>File location:</b> <code>d:\\cloud project\\iot\\esp32_shuttle_counter\\esp32_shuttle_counter.ino</code>",
        code_style
    ))

    story.append(Paragraph("<b>Step 4.1: Find Your Computer's Wi-Fi IP Address</b>", h2_style))
    story.append(Paragraph(
        "Your ESP32 and your computer must be connected to the <b>same Wi-Fi</b> (or your mobile hotspot):<br/>"
        "1. Press <b>Windows Key + R</b>, type <code>cmd</code>, press Enter.<br/>"
        "2. Type <code>ipconfig</code> and press Enter.<br/>"
        "3. Look for <b>IPv4 Address</b> (for example: <code>192.168.1.15</code>). Note this number down!",
        body_style
    ))

    story.append(Paragraph("<b>Step 4.2: Open and Edit config.h</b>", h2_style))
    story.append(Paragraph(
        "In the folder <code>d:\\cloud project\\iot\\esp32_shuttle_counter\\config.h</code>, we have pre-configured your hotspot credentials:",
        body_style
    ))
    story.append(Paragraph(
        "// 1. Your Vivo Y11 5G Hotspot name:\n"
        "#define WIFI_SSID \"vivo Y11 5G\"\n\n"
        "// 2. Your Hotspot password:\n"
        "#define WIFI_PASSWORD \"9618498888\"\n\n"
        "// 3. Your computer's IP address with port 5000:\n"
        "#define BACKEND_BASE_URL \"http://10.148.151.64:5000\"\n\n"
        "// 4. Shuttle & API key configured for SH-01:\n"
        "#define SHUTTLE_ID 1\n"
        "#define SHUTTLE_CODE \"SH-01\"\n"
        "#define DEVICE_CODE \"ESP32-SH01\"\n"
        "#define DEVICE_API_KEY \"vit_esp32_key_sh-01\"",
        code_style
    ))

    # SECTION 5: Uploading
    story.append(Paragraph("5. Uploading Code to the ESP32 (One-Click Flashing)", h1_style))
    story.append(Paragraph(
        "1. Plug the ESP32 into your laptop using the Micro-USB cable.<br/>"
        "2. In Arduino IDE top menu: Click <b>Tools</b> &rarr; <b>Board</b> &rarr; <b>esp32</b> &rarr; select <b>ESP32 Dev Module</b>.<br/>"
        "3. Click <b>Tools</b> &rarr; <b>Port</b> &rarr; select the port showing (e.g., <code>COM3</code> or <code>COM4</code>).<br/>"
        "4. Click the round green <b>Upload (&rarr;)</b> button in the top left.<br/>"
        "5. The code will compile and begin writing to the chip.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Important Troubleshooting Tip:</b> If the console at the bottom shows <i>'Connecting........_____.....'</i>, "
        "simply <b>press and hold the little 'BOOT' button</b> on the ESP32 board for 2 seconds. The upload will start immediately!",
        callout_amber
    ))

    # SECTION 6: Testing & Verification
    story.append(Paragraph("6. How to Test and Watch It Work Live", h1_style))
    story.append(Paragraph(
        "1. In Arduino IDE, open the <b>Serial Monitor</b> (magnifying glass icon in top right) and set the speed to <b>115200 baud</b>.<br/>"
        "2. You will see: <code>[WiFi] Connected successfully! IP: 192.168.1.x</code>.<br/>"
        "3. <b>Simulate a Passenger Entering:</b> Wave your hand across <b>Sensor A</b> (Outer) first, then across <b>Sensor B</b> (Inner).<br/>"
        "   &rarr; Serial Monitor shows: <code>[ENTRY DETECTED] New Count: 1</code>.<br/>"
        "   &rarr; The onboard blue LED pulses.<br/>"
        "4. <b>Look at Your Browser at http://localhost:5173:</b><br/>"
        "   &rarr; Shuttle SH-01 seat count drops from <b>30</b> to <b>29 available seats</b> live!<br/>"
        "5. <b>Simulate a Passenger Leaving:</b> Wave your hand across <b>Sensor B</b> then <b>Sensor A</b>.<br/>"
        "   &rarr; Serial Monitor shows: <code>[EXIT DETECTED] New Count: 0</code>.<br/>"
        "   &rarr; The website jumps back to <b>30 available seats</b>!",
        body_style
    ))

    # SECTION 7: Calibration
    story.append(Paragraph("7. Sensor Calibration & Physical Shuttle Mounting", h1_style))
    story.append(Paragraph(
        "• <b>Adjusting Sensitivity:</b> Each IR sensor has a tiny brass screw on a blue box (potentiometer). Turn it with a small screwdriver until the sensor LED lights up when an object passes 60–80 cm away.<br/>"
        "• <b>Physical Placement:</b> Mount Sensor A and Sensor B <b>8 to 12 cm apart</b> on the shuttle doorway frame.<br/>"
        "• <b>Mounting Height:</b> Mount them <b>1.0 to 1.2 meters</b> above the floor. This detects the human torso cleanly and prevents false counts from swinging hands or bags.",
        body_style
    ))

    # SECTION 8: Path A Testing (Zero Hardware)
    story.append(Paragraph("8. Don't Have the Hardware Yet? Use the 1-Line Software Simulator", h1_style))
    story.append(Paragraph(
        "If your physical ESP32 has not arrived yet, you can test the exact same functionality from PowerShell:",
        body_style
    ))
    story.append(Paragraph(
        "# Passenger boards shuttle (+1):\n.\\venv\\Scripts\\python backend/simulate_esp32.py SH-01 entry 1\n\n"
        "# Passenger leaves shuttle (-1):\n.\\venv\\Scripts\\python backend/simulate_esp32.py SH-01 exit 2\n\n"
        "# Run a continuous loop of 10 students boarding:\n.\\venv\\Scripts\\python backend/simulate_esp32.py loop SH-01 10 2.0",
        code_style
    ))
    story.append(Paragraph("This sends the exact same authenticated HTTP requests to the backend with device API keys and sequence numbers.", callout_green))

    return story

def build_pdf():
    os.makedirs(DEST_DIR, exist_ok=True)
    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    doc.build(create_story())
    print(f"[OK] Dedicated ESP32 Guide PDF created at: {OUTPUT_PDF}")

if __name__ == "__main__":
    build_pdf()

