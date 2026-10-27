"""
=============================================================================
         AI LIE DETECTOR SIMULATOR - PDF REPORT GENERATOR
=============================================================================
Generates a comprehensive, professional PDF technical report covering:
- What it does & What it does not do (Capabilities vs Limitations)
- How it works & How it fails (Architecture, Vision Pipeline, Edge Cases)
- The Polygraph Monitor HUD System
- Complete Tech Stack & Tools used
=============================================================================
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Adds running headers and footers with page numbers."""
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0f2b48"))

        # Header (Pages 2+)
        if self._pageNumber > 1:
            self.drawString(54, 750, "AI POLYGRAPH & LIE DETECTOR SIMULATOR // TECHNICAL DOCUMENTATION")
            self.setStrokeColor(colors.HexColor("#00bcd4"))
            self.setLineWidth(0.8)
            self.line(54, 744, 558, 744)

        # Footer (All pages)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#556677"))
        self.setStrokeColor(colors.HexColor("#d0d7de"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)

        self.drawString(54, 32, "Confidential & Educational Project Specification - PyCharm / OpenCV / Flask Edition")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_text)
        self.restoreState()


def build_pdf(filename="AI_Lie_Detector_Project_Report.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#0a192f"),
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#00838f"),
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0a192f"),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0277bd"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#263238"),
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletItem',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=colors.HexColor("#263238"),
        leftIndent=14,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#004d40")
    )

    table_header = ParagraphStyle(
        'THeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1e293b")
    )

    story = []

    # =========================================================================
    #   COVER / TITLE BLOCK
    # =========================================================================
    story.append(Paragraph("AI POLYGRAPH // LIE DETECTOR SIMULATOR", title_style))
    story.append(Paragraph("Complete Technical Architecture, Operational Scope, Capabilities & Forensic Specification", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#00bcd4"), spaceBefore=0, spaceAfter=14))

    # Meta Info Card
    meta_data = [
        [Paragraph("<b>Project:</b> AI Lie Detector Simulator", table_cell),
         Paragraph("<b>Date:</b> October 2026", table_cell)],
        [Paragraph("<b>Core Engine:</b> OpenCV Hardware Vision + Web Audio", table_cell),
         Paragraph("<b>Status:</b> Production Ready & Calibrated", table_cell)],
        [Paragraph("<b>Platform:</b> Python 3.12 / Flask / PyCharm IDE", table_cell),
         Paragraph("<b>Classification:</b> Biometric Interrogation Simulation", table_cell)]
    ]
    meta_table = Table(meta_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f0fdf4")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#86efac")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#bbf7d0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # =========================================================================
    #   SECTION 1: WHAT IT DOES (YE KYA KAREGA)
    # =========================================================================
    story.append(Paragraph("1. What It Does (Core Capabilities & Features)", h1_style))
    story.append(Paragraph(
        "The system acts as an interactive biometric interrogation polygraph that captures and analyzes "
        "facial dynamics, gaze direction, and vocal tension in real-time to determine truthfulness versus deception.",
        body_style
    ))

    capabilities = [
        "<b>Direct Hardware Webcam Capture:</b> Connects directly to hardware camera index 0 (with one-click switching to camera 1) bypassing browser WebRTC permission restrictions.",
        "<b>rPPG Real Heart Rate Extraction:</b> Contactless cardiovascular pulse (BPM) extraction from forehead skin color micro-fluctuations via Fast Fourier Transform (FFT).",
        "<b>Real-Time Live Speech-to-Text & Linguistic Analysis:</b> Transcribes the user's spoken words live (English/Hindi) and detects verbal evasion, emphatic protestations ('I swear', 'honestly', 'kasam se'), and cognitive hesitation fillers.",
        "<b>Real-Time Face & Eye Detection:</b> Employs dual Haar Cascade classifiers (Frontal Face & Dual Eye ROIs) processing 30 frames per second.",
        "<b>Eye Contact Stability Tracking (0–100%):</b> Continuously evaluates whether the subject is maintaining direct eye contact with the camera lens or looking away.",
        "<b>Gaze Aversion Detection:</b> Identifies sideways glances, downward head tilts, and rapid eye movements that correlate with cognitive deception or nervousness.",
        "<b>Adaptive Blink Dynamics & Frequency:</b> Tracks total blinks and calculates Blinks Per Minute (BPM), detecting both rapid anxiety blinking (>26 BPM) and conscious frozen stares.",
        "<b>Voice Pitch & Micro-Tremor (Jitter) Analysis:</b> Microphonic capture via Web Audio API, calculating fundamental pitch stability and vocal tension.",
        "<b>Multi-Channel Polygraph Oscillograph:</b> Real-time animated oscilloscope rendering 4 concurrent physiological channels: Cardio/Pulse ECG, Voice Tension, Eye Tension, and Deception Index.",
        "<b>5-Second Active Interrogation Scan:</b> Triggered via button or Spacebar, scanning the subject's response window with progressive tension audio and laser sweep.",
        "<b>Dramatic Holographic Verdict Screen:</b> Slams a high-impact, full-screen holographic verdict: <b>LIE DETECTED!</b> (Red sirens, alarm audio, forensic breakdown) or <b>TRUTH VERIFIED!</b> (Green glow, victory chime, credibility seal)."
    ]
    for cap in capabilities:
        story.append(Paragraph(f"• {cap}", bullet_style))

    story.append(Spacer(1, 12))

    # =========================================================================
    #   SECTION 2: WHAT IT DOES NOT DO (YE KYA NAHI KAREGA - LIMITATIONS)
    # =========================================================================
    story.append(Paragraph("2. What It Does NOT Do (Operational Limits & Ethics)", h1_style))
    story.append(Paragraph(
        "To ensure responsible deployment, the system's exact boundaries and limitations must be clearly understood:",
        body_style
    ))

    limitations = [
        "<b>Does NOT Read Thoughts or Brainwaves:</b> It evaluates outward physiological and biometric indicators (eyes, face angle, voice), not neurological thoughts or internal intent.",
        "<b>NOT a Legally Admissible Medical Polygraph:</b> This software is designed for simulation, research, educational demonstrations, and entertainment. It cannot replace forensic polygraph examinations in a court of law.",
        "<b>Does NOT Operate in Complete Darkness:</b> Optical computer vision requires minimum ambient facial lighting (>20 lux) to extract eye socket landmarks.",
        "<b>Does NOT Work When Masked or Obstructed:</b> If sunglasses, thick face masks, or heavy obstructions cover the eyes, eye contact cannot be computed.",
        "<b>Does NOT Force 100% Constant Lies or Constant Truth:</b> The algorithm is balanced. If the subject maintains camera eye contact, it yields TRUTH. If eye contact breaks, it yields LIE."
    ]
    for lim in limitations:
        story.append(Paragraph(f"• {lim}", bullet_style))

    story.append(Spacer(1, 14))

    # =========================================================================
    #   SECTION 3: HOW IT WORKS (KAISE WORK KAREGA - SYSTEM ARCHITECTURE)
    # =========================================================================
    story.append(Paragraph("3. How It Works (Step-by-Step Architecture)", h1_style))
    story.append(Paragraph(
        "The application is structured into an interconnected three-tier pipeline:",
        body_style
    ))

    arch_table_data = [
        [Paragraph("Pipeline Layer", table_header),
         Paragraph("Component & Technology", table_header),
         Paragraph("Operational Function", table_header)],
        [Paragraph("<b>Hardware & Vision</b>", table_cell),
         Paragraph("OpenCV (cv2) + Haar Cascades", table_cell),
         Paragraph("Captures camera 0/1, detects face bounding box, isolates upper 55% eye region, and tracks eye pupils.", table_cell)],
        [Paragraph("<b>Telemetry API</b>", table_cell),
         Paragraph("Flask REST + MJPEG Stream", table_cell),
         Paragraph("Streams annotated video via <code>/video_feed</code> and exposes live telemetry via <code>/api/biometrics</code>.", table_cell)],
        [Paragraph("<b>Acoustic Engine</b>", table_cell),
         Paragraph("Web Audio API + Autocorrelation", table_cell),
         Paragraph("Captures microphone PCM stream, estimates fundamental voice pitch, and calculates pitch jitter/tremor percentage.", table_cell)],
        [Paragraph("<b>Polygraph HUD</b>", table_cell),
         Paragraph("HTML5 Canvas + Cyberpunk CSS", table_cell),
         Paragraph("Renders ECG cardio wave, voice waveform, eye tension stylus, live stress gauge, and target reticles.", table_cell)],
        [Paragraph("<b>Decision Fusion</b>", table_cell),
         Paragraph("LieDetectorEngine (JS)", table_cell),
         Paragraph("Fuses eye contact ratio (40%), vocal jitter (35%), and blink dynamics (25%) over 5-second interrogation.", table_cell)]
    ]
    arch_table = Table(arch_table_data, colWidths=[100, 150, 254])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 14))

    # Decision Logic Callout Box
    story.append(Paragraph("<b>The Core Eye-Contact Decision Formula:</b>", h2_style))
    story.append(Paragraph(
        "• <b>Direct Eye Contact (Eye Contact ≥ 50%):</b> When the subject looks directly into the webcam lens, both eyes remain consistently detected in the upper facial ROI. The system tags the frame with a <b>GREEN BOX</b> <code>[DIRECT EYE CONTACT: TRUTH]</code> and finalizes a <b>TRUTH VERIFIED</b> verdict.<br/>"
        "• <b>Averted Gaze / Looking Away (Eye Contact &lt; 50%):</b> When the subject shifts their gaze away, looks down, or turns their head, eye detection count drops to 0 or 1. The bounding box switches to <b>RED</b> <code>[EYE CONTACT BROKEN: LIE]</code> and triggers a <b>LIE DETECTED</b> verdict.",
        body_style
    ))

    story.append(Spacer(1, 14))

    # =========================================================================
    #   SECTION 4: HOW IT DOES NOT WORK (FAILURE MODES & EDGE CASES)
    # =========================================================================
    story.append(Paragraph("4. How It Does NOT Work (Failure Modes & Edge Cases)", h1_style))
    story.append(Paragraph(
        "Awareness of specific failure modes ensures correct operation and diagnostic troubleshooting:",
        body_style
    ))

    failures = [
        "<b>Hardware Port Contention:</b> If another application (Zoom, Microsoft Teams, OBS Virtual Camera) holds an exclusive lock on Camera 0, OpenCV will report error -1072875772. The user must release camera access in other programs or use the <code>SWITCH CAM</code> button.",
        "<b>Audio Context Mute:</b> If the browser's audio context is in a suspended state without user interaction, sound effects will be muted until the user clicks anywhere on the dashboard.",
        "<b>Multiple Subjects in View:</b> The vision pipeline isolates the largest detected face. If multiple persons enter the camera frame simultaneously, background movements may interfere with gaze scoring.",
        "<b>No User Answer Action:</b> The polygraph does not guess arbitrarily; the user must speak their answer during the 5-second active scan (triggered by <code>SPACEBAR</code> or the <code>START LIE TEST</code> button)."
    ]
    for fail in failures:
        story.append(Paragraph(f"• {fail}", bullet_style))

    story.append(Spacer(1, 14))

    # =========================================================================
    #   SECTION 5: THE MONITOR HUD DASHBOARD (ISKA MONITOR)
    # =========================================================================
    story.append(Paragraph("5. The Monitor HUD Dashboard (Layout & Indicators)", h1_style))
    story.append(Paragraph(
        "The user interface operates as an authentic military/cyberpunk polygraph terminal divided into two primary zones:",
        body_style
    ))

    hud_items = [
        "<b>Channel 01 - Optical Biometric Viewport:</b> Displays the 30 FPS mirrored camera feed with dynamic green/red reticles, pupil target crosshairs, and live status badges (<code>FACIAL LOCK ACTIVE</code>, <code>GAZE: DIRECT CONTACT</code>).",
        "<b>Biometric Metric Cards:</b> Three digital telemetry readouts displaying <b>Total Blinks</b>, <b>Blink Frequency (BPM)</b>, <b>Eye Contact Stability (%)</b>, and <b>Eye Aperture (EAR)</b>.",
        "<b>Channel 02 - Polygraph Oscillograph:</b> Continuous multi-channel scrolling wave canvas showing real-time spikes for Cardio ECG pulse, vocal frequency tension, ocular jitter, and deception probability.",
        "<b>Channel 03 - Vocal Tremor & Spectrum:</b> 36-band audio equalizer canvas reflecting live voice frequencies, pitch jitter percentage, and vocal micro-tremor classification (<code>STEADY</code>, <code>ELEVATED</code>, <code>HIGH TREMOR</code>).",
        "<b>Suspicion / Deception Meter:</b> Horizontal gradient gauge (0 to 100%) with a digital numeric readout and a clearly marked 48% Lie Threshold marker.",
        "<b>Interrogation Control Unit:</b> Displays English interrogation prompt bank with <code>PREV</code> and <code>NEXT</code> buttons, plus the primary <b>START LIE TEST</b> trigger button.",
        "<b>The Verdict Modal:</b> Slams into the viewport with emergency red sirens (LIE) or toxic green holographic shields (TRUTH) with four forensic evidence breakdown cards."
    ]
    for item in hud_items:
        story.append(Paragraph(f"• {item}", bullet_style))

    story.append(Spacer(1, 14))

    # =========================================================================
    #   SECTION 6: TECH STACK & TOOLS USED (KYA-KYA USE KIYA)
    # =========================================================================
    story.append(Paragraph("6. Technology Stack & Tools Used", h1_style))

    tech_data = [
        [Paragraph("Category", table_header),
         Paragraph("Library / Tool", table_header),
         Paragraph("Version / Source", table_header),
         Paragraph("Role in Project", table_header)],
        [Paragraph("Programming Language", table_cell),
         Paragraph("Python", table_cell),
         Paragraph("v3.12.10", table_cell),
         Paragraph("Core server, hardware vision loop, API controller.", table_cell)],
        [Paragraph("Web Framework", table_cell),
         Paragraph("Flask", table_cell),
         Paragraph("v3.1.3", table_cell),
         Paragraph("Serves HTTP frontend, MJPEG stream, and JSON telemetry.", table_cell)],
        [Paragraph("Computer Vision", table_cell),
         Paragraph("OpenCV (cv2)", table_cell),
         Paragraph("v5.0.0.93", table_cell),
         Paragraph("Hardware video capture, Haar cascades, facial drawing.", table_cell)],
        [Paragraph("Vision Models", table_cell),
         Paragraph("Haar Face & Eye XMLs", table_cell),
         Paragraph("OpenCV Official", table_cell),
         Paragraph("Frontal face and dual eye bounding box extraction.", table_cell)],
        [Paragraph("Frontend Stack", table_cell),
         Paragraph("HTML5 / CSS3 / ES6+", table_cell),
         Paragraph("Native Standards", table_cell),
         Paragraph("Cyberpunk CRT HUD, scanline animations, responsive grid.", table_cell)],
        [Paragraph("Acoustic Processing", table_cell),
         Paragraph("Web Audio API", table_cell),
         Paragraph("W3C Standard", table_cell),
         Paragraph("Microphone pitch tracking, spectrum FFT, audio oscillators.", table_cell)],
        [Paragraph("Sound Synthesis", table_cell),
         Paragraph("Procedural Synth", table_cell),
         Paragraph("Custom JS", table_cell),
         Paragraph("Zero-file audio: Heartbeat, scan tension, siren, chime.", table_cell)],
        [Paragraph("Report Generator", table_cell),
         Paragraph("ReportLab", table_cell),
         Paragraph("v5.1.0", table_cell),
         Paragraph("Automated PDF forensic technical report generation.", table_cell)]
    ]
    tech_table = Table(tech_data, colWidths=[90, 110, 80, 224])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(tech_table)

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF Report generated successfully: {os.path.abspath(filename)}")

if __name__ == "__main__":
    build_pdf()
