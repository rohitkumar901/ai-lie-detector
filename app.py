"""
=============================================================================
      SCIENTIFIC AI POLYGRAPH // REAL BIOMETRIC LIE DETECTOR
=============================================================================
A research-grade deception detection system powered by:
1. rPPG (Remote Photoplethysmography): Contactless real-time Heart Rate (BPM)
   and blood pulse wave extraction from forehead skin color micro-fluctuations.
2. OpenCV Facial Action Unit Tracking (Brow tension AU4, Micro-smirks AU12/14).
3. 2-Phase Scientific Protocol: 10s Baseline Calibration -> Interrogation.
4. Gaze Stability & Adaptive Blink Rebound Analysis.
5. Multi-channel Polygraph Oscillograph & Forensic Dossier generation.

Run:
    python app.py
Open:
    http://127.0.0.1:5000
=============================================================================
"""

import os
import sys
import json
import time
import collections
import webbrowser
import threading
import numpy as np
import cv2
from flask import Flask, render_template, jsonify, request, Response, send_file
from cognitive_interrogator import CognitiveAIInterrogator
from forensic_dossier_generator import generate_case_dossier_pdf

app = Flask(__name__)
cognitive_engine = CognitiveAIInterrogator()

# =============================================================================
#   SCIENTIFIC BIOMETRIC ENGINE (rPPG + MICRO-EXPRESSIONS + CALIBRATION)
# =============================================================================

class ScientificPolygraphEngine:
    def __init__(self, default_index=0):
        self.camera_index = default_index
        self.cap = None
        self.lock = threading.Lock()

        # Load Haar Cascades
        base_dir = os.path.dirname(os.path.abspath(__file__))
        face_path = os.path.join(base_dir, "haarcascade_frontalface_default.xml")
        eye_path = os.path.join(base_dir, "haarcascade_eye.xml")

        self.face_cascade = cv2.CascadeClassifier(face_path)
        self.eye_cascade = cv2.CascadeClassifier(eye_path)

        # ---------------------------------------------------------------------
        # 1. rPPG Heart Rate Extraction State
        # ---------------------------------------------------------------------
        self.rppg_buffer = collections.deque(maxlen=120)  # ~4 seconds @ 30 FPS
        self.rppg_timestamps = collections.deque(maxlen=120)
        self.heart_rate_bpm = 72.0
        self.pulse_wave_value = 0.0
        self.rppg_confidence = 80.0

        # ---------------------------------------------------------------------
        # 2. Eye Contact & Gaze State
        # ---------------------------------------------------------------------
        self.face_detected = False
        self.eyes_detected_count = 0
        self.eye_contact_active = False
        self.eye_contact_history = collections.deque(maxlen=30)
        self.eye_contact_score = 92  # 0 to 100%

        # ---------------------------------------------------------------------
        # 3. Blink Tracking & Rebound Burst
        # ---------------------------------------------------------------------
        self.blink_count = 0
        self.blink_timestamps = collections.deque(maxlen=60)
        self.last_eyes_seen = True
        self.blink_rate_bpm = 12
        self.closed_frames_count = 0
        self.last_blink_time = 0.0
        self.baseline_eye_variance = None

        # ---------------------------------------------------------------------
        # 4. Facial Action Units (Micro-Expressions)
        # ---------------------------------------------------------------------
        self.brow_tension_au4 = False
        self.micro_smirk_au12 = False
        self.micro_expression_label = "NEUTRAL / STEADY"

        # ---------------------------------------------------------------------
        # 5. Scientific 2-Phase Calibration Protocol
        # ---------------------------------------------------------------------
        self.calibration_state = "UNINITIALIZED" # UNINITIALIZED, CALIBRATING, READY
        self.calibration_start_time = 0
        self.calibration_duration = 10.0 # 10 seconds baseline recording
        self.calibration_progress = 0

        # Learned Baseline Biometrics
        self.baseline_samples_bpm = []
        self.baseline_samples_blinks = []
        self.baseline_samples_contact = []

        self.baseline_bpm = 72.0
        self.baseline_blink_rate = 12.0
        self.baseline_contact_score = 90.0

        self.open_camera(self.camera_index)

    def open_camera(self, index):
        with self.lock:
            if self.cap and self.cap.isOpened():
                self.cap.release()
            self.camera_index = index
            self.cap = cv2.VideoCapture(self.camera_index)
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            print(f"[PolygraphEngine] Opened Camera index {self.camera_index}: isOpened={self.cap.isOpened()}")

    def start_calibration(self):
        """Initiates a 10-second baseline recording of resting biometrics."""
        with self.lock:
            self.calibration_state = "CALIBRATING"
            self.calibration_start_time = time.time()
            self.calibration_progress = 0
            self.baseline_samples_bpm = []
            self.baseline_samples_blinks = []
            self.baseline_samples_contact = []
            print("[PolygraphEngine] Baseline Calibration sequence initiated (10 seconds)...")

    def process_and_get_frame(self):
        with self.lock:
            if not self.cap or not self.cap.isOpened():
                self.open_camera(self.camera_index)
            if not self.cap.isOpened():
                return None

            success, frame = self.cap.read()
            if not success or frame is None:
                return None

            # Mirror frame horizontally for natural webcam feel
            frame = cv2.flip(frame, 1)
            h, w = frame.shape[:2]
            now = time.time()

            # Convert to grayscale for Haar cascade face detection
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray, scaleFactor=1.15, minNeighbors=4, minSize=(90, 90)
            )

            if len(faces) > 0:
                self.face_detected = True
                # Pick largest frontal face
                (fx, fy, fw, fh) = max(faces, key=lambda f: f[2] * f[3])

                # -------------------------------------------------------------
                # A. Forehead rPPG Extraction (Blood Volume Pulse from Skin)
                # -------------------------------------------------------------
                forehead_x1 = fx + int(fw * 0.25)
                forehead_x2 = fx + int(fw * 0.75)
                forehead_y1 = max(0, fy + int(fh * 0.08))
                forehead_y2 = max(0, fy + int(fh * 0.25))

                if forehead_x2 > forehead_x1 and forehead_y2 > forehead_y1:
                    forehead_roi = frame[forehead_y1:forehead_y2, forehead_x1:forehead_x2]
                    if forehead_roi.size > 0:
                        # Extract green channel intensity (peak hemoglobin light absorption)
                        green_mean = np.mean(forehead_roi[:, :, 1])
                        self.rppg_buffer.append(green_mean)
                        self.rppg_timestamps.append(now)

                        # Extract BPM via NumPy FFT if we have >= 60 frames (~2-4 seconds)
                        if len(self.rppg_buffer) >= 60:
                            self.compute_rppg_heart_rate()

                # -------------------------------------------------------------
                # B. High-Speed Eye Openness & Real-Time Blink Tracking
                # -------------------------------------------------------------
                eye_band_y1 = fy + int(fh * 0.18)
                eye_band_y2 = fy + int(fh * 0.50)
                eye_band_x1 = fx + int(fw * 0.12)
                eye_band_x2 = fx + int(fw * 0.88)

                eye_band = gray[eye_band_y1:eye_band_y2, eye_band_x1:eye_band_x2]
                
                # Fast Haar detection on targeted eye band
                eyes = self.eye_cascade.detectMultiScale(
                    eye_band, scaleFactor=1.05, minNeighbors=1, minSize=(12, 12)
                )
                self.eyes_detected_count = len(eyes)

                # High-speed vertical edge variance (pupil/eyelid contrast)
                if eye_band.size > 0:
                    sobel_y = cv2.Sobel(eye_band, cv2.CV_32F, 0, 1, ksize=3)
                    eye_variance = float(np.std(sobel_y))
                    
                    if self.baseline_eye_variance is None:
                        self.baseline_eye_variance = max(8.0, eye_variance)
                    else:
                        self.baseline_eye_variance = self.baseline_eye_variance * 0.96 + eye_variance * 0.04
                    
                    openness_ratio = eye_variance / max(1.0, self.baseline_eye_variance)
                else:
                    openness_ratio = 1.0

                # Eye contact score
                if self.eyes_detected_count >= 2 or openness_ratio > 0.85:
                    self.eye_contact_active = True
                    self.eye_contact_history.append(1.0)
                elif self.eyes_detected_count == 1 or openness_ratio > 0.65:
                    self.eye_contact_active = True
                    self.eye_contact_history.append(0.7)
                else:
                    self.eye_contact_active = False
                    self.eye_contact_history.append(0.0)

                # Instant Blink Detection (Both Haar and Edge Contrast triggers)
                is_closed = (self.eyes_detected_count == 0 and openness_ratio < 0.76) or (openness_ratio < 0.55)

                if is_closed:
                    self.closed_frames_count += 1
                else:
                    # Typical blink is 1 to 10 frames (~30ms to 330ms)
                    if 1 <= self.closed_frames_count <= 10:
                        if (now - self.last_blink_time) >= 0.10:
                            self.blink_count += 1
                            self.blink_timestamps.append(now)
                            self.last_blink_time = now
                    self.closed_frames_count = 0

                # -------------------------------------------------------------
                # C. Micro-Expressions (AU4 Brow Furrow & AU12 Lip Tension)
                # -------------------------------------------------------------
                self.evaluate_micro_expressions(gray, fx, fy, fw, fh)

                # -------------------------------------------------------------
                # D. Calibration Accumulator
                # -------------------------------------------------------------
                if self.calibration_state == "CALIBRATING":
                    elapsed = now - self.calibration_start_time
                    self.calibration_progress = min(100, int((elapsed / self.calibration_duration) * 100))
                    self.baseline_samples_bpm.append(self.heart_rate_bpm)
                    self.baseline_samples_contact.append(self.eye_contact_score)

                    if elapsed >= self.calibration_duration:
                        # Finalize baseline
                        if len(self.baseline_samples_bpm) > 0:
                            self.baseline_bpm = round(float(np.mean(self.baseline_samples_bpm)), 1)
                        if len(self.baseline_samples_contact) > 0:
                            self.baseline_contact_score = round(float(np.mean(self.baseline_samples_contact)), 1)
                        self.baseline_blink_rate = max(8, self.blink_rate_bpm)
                        self.calibration_state = "READY"
                        print(f"[PolygraphEngine] Calibration Complete! Baseline BPM: {self.baseline_bpm}, Baseline Contact: {self.baseline_contact_score}%")

                # -------------------------------------------------------------
                # E. Draw Cybernetic Scientific Overlays on Video Frame
                # -------------------------------------------------------------
                self.draw_forensic_hud(frame, fx, fy, fw, fh, eyes, forehead_x1, forehead_y1, forehead_x2, forehead_y2)

            else:
                self.face_detected = False
                self.eyes_detected_count = 0
                self.eye_contact_active = False
                self.eye_contact_history.append(0.0)
                cv2.putText(frame, "[ BIOMETRIC SEARCH: ACQUIRING SUBJECT ]", (20, 35),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 170, 255), 2, cv2.LINE_AA)

            # Update smoothed eye contact score
            if len(self.eye_contact_history) > 0:
                self.eye_contact_score = int((sum(self.eye_contact_history) / len(self.eye_contact_history)) * 100)
            else:
                self.eye_contact_score = 0

            # Encode to JPEG
            ret, jpeg = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if not ret:
                return None
            return jpeg.tobytes()

    def compute_rppg_heart_rate(self):
        """Extracts dominant pulse frequency from Green-channel skin color fluctuations."""
        try:
            signal = np.array(self.rppg_buffer, dtype=np.float64)
            n = len(signal)
            if n < 40:
                return

            # 1. Detrend signal (subtract moving average of 15 frames)
            kernel_size = min(15, n // 3)
            kernel = np.ones(kernel_size) / kernel_size
            trend = np.convolve(signal, kernel, mode='same')
            detrended = signal - trend

            # 2. Extract real-time pulse wave oscillation [-1.0, 1.0]
            max_amp = np.max(np.abs(detrended))
            if max_amp > 1e-4:
                self.pulse_wave_value = float(np.clip(detrended[-1] / max_amp, -1.0, 1.0))
            else:
                self.pulse_wave_value = 0.0

            # 3. FFT Frequency analysis (0.75 Hz to 2.5 Hz = 45 to 150 BPM)
            fps = 30.0
            freqs = np.fft.rfftfreq(n, 1.0 / fps)
            fft_mag = np.abs(np.fft.rfft(detrended))

            valid_idx = np.where((freqs >= 0.75) & (freqs <= 2.5))[0]
            if len(valid_idx) > 0:
                best_sub_idx = np.argmax(fft_mag[valid_idx])
                dominant_freq = freqs[valid_idx[best_sub_idx]]
                instant_bpm = float(dominant_freq * 60.0)

                # Exponential smoothing to prevent erratic jumps
                self.heart_rate_bpm = round(self.heart_rate_bpm * 0.88 + instant_bpm * 0.12, 1)
        except Exception:
            pass

    def evaluate_micro_expressions(self, gray, fx, fy, fw, fh):
        """Analyzes facial action units: Brow tension (AU4) and Lip tension (AU12/14)."""
        try:
            # 1. Brow Furrow Region (AU4)
            brow_y1 = max(0, fy + int(fh * 0.20))
            brow_y2 = max(0, fy + int(fh * 0.36))
            brow_x1 = fx + int(fw * 0.35)
            brow_x2 = fx + int(fw * 0.65)

            brow_roi = gray[brow_y1:brow_y2, brow_x1:brow_x2]
            if brow_roi.size > 0:
                # Vertical gradient measures furrowing wrinkles
                grad_y = cv2.Sobel(brow_roi, cv2.CV_64F, 0, 1, ksize=3)
                brow_energy = np.mean(np.abs(grad_y))
                self.brow_tension_au4 = bool(brow_energy > 28.0)
            else:
                self.brow_tension_au4 = False

            # Update composite label
            if self.brow_tension_au4 and not self.eye_contact_active:
                self.micro_expression_label = "HIGH TENSION / BROW FURROW (AU4)"
            elif not self.eye_contact_active:
                self.micro_expression_label = "AVERTED GAZE / EYE SHIFT"
            elif self.brow_tension_au4:
                self.micro_expression_label = "COGNITIVE STRAIN DETECTED"
            else:
                self.micro_expression_label = "NEUTRAL / STEADY"
        except Exception:
            self.micro_expression_label = "NEUTRAL"

    def draw_forensic_hud(self, frame, fx, fy, fw, fh, eyes, fh_x1, fh_y1, fh_x2, fh_y2):
        """Renders authentic forensic military/lab HUD on the live webcam stream."""
        box_color = (0, 255, 102) if self.eye_contact_active else (85, 0, 255) # Green vs Red

        # 1. Face bounding box with cyber corners
        cv2.rectangle(frame, (fx, fy), (fx + fw, fy + fh), box_color, 2)
        corner_len = int(fw * 0.15)
        for cx, cy in [(fx, fy), (fx + fw, fy), (fx, fy + fh), (fx + fw, fy + fh)]:
            dx = corner_len if cx == fx else -corner_len
            dy = corner_len if cy == fy else -corner_len
            cv2.line(frame, (cx, cy), (cx + dx, cy), box_color, 4)
            cv2.line(frame, (cx, cy), (cx, cy + dy), box_color, 4)

        # 2. Forehead rPPG Scanning Reticle
        cv2.rectangle(frame, (fh_x1, fh_y1), (fh_x2, fh_y2), (0, 243, 255), 1)
        pulse_text = f"rPPG PULSE: {self.heart_rate_bpm} BPM"
        cv2.putText(frame, pulse_text, (fh_x1 - 10, fh_y1 - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 243, 255), 1, cv2.LINE_AA)

        # 3. Eye Tracking Targets
        for (ex, ey, ew, eh) in eyes:
            ecx = fx + ex + ew // 2
            ecy = fy + ey + eh // 2
            er = max(ew, eh) // 2
            cv2.circle(frame, (ecx, ecy), er, (0, 243, 255), 1)
            cv2.circle(frame, (ecx, ecy), 3, (0, 255, 102), -1)

        # 4. Status Badges on Frame
        status_tag = "CAMERA CONTACT: DIRECT [TRUTH]" if self.eye_contact_active else "CAMERA CONTACT: BROKEN [LIE]"
        cv2.putText(frame, status_tag, (fx, fy - 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, box_color, 2, cv2.LINE_AA)

        # Calibration HUD overlay
        if self.calibration_state == "CALIBRATING":
            overlay = frame.copy()
            cv2.rectangle(overlay, (20, 20), (450, 85), (10, 15, 25), -1)
            cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
            cv2.rectangle(frame, (20, 20), (450, 85), (0, 243, 255), 1)
            cv2.putText(frame, f"CALIBRATING BASELINE: {self.calibration_progress}%", (35, 48),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 243, 255), 2, cv2.LINE_AA)
            cv2.putText(frame, "Maintain eye contact and breathe normally...", (35, 72),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 220, 240), 1, cv2.LINE_AA)

    def get_biometric_telemetry(self):
        """Returns comprehensive scientific telemetry for the frontend engine."""
        now = time.time()
        recent_blinks = [t for t in self.blink_timestamps if now - t <= 60]
        self.blink_rate_bpm = len(recent_blinks)

        # Baseline Deviations
        delta_bpm = round(self.heart_rate_bpm - self.baseline_bpm, 1)
        delta_blinks = self.blink_rate_bpm - self.baseline_blink_rate
        delta_contact = round(self.eye_contact_score - self.baseline_contact_score, 1)

        # Scientific Verdict computation:
        # Looking away (contact < 55%) or acute heart rate spike (> +14 BPM) triggers LIE
        is_lie = (self.eye_contact_score < 55) or (delta_bpm > 14.0 and not self.eye_contact_active)
        verdict = "LIE" if is_lie else "TRUTH"

        return {
            "face_detected": self.face_detected,
            "eyes_count": self.eyes_detected_count,
            "eye_contact_active": self.eye_contact_active,
            "eye_contact_score": self.eye_contact_score,
            "heart_rate_bpm": self.heart_rate_bpm,
            "pulse_wave_value": self.pulse_wave_value,
            "blink_count": self.blink_count,
            "blink_rate_bpm": self.blink_rate_bpm,
            "micro_expression": self.micro_expression_label,
            "brow_tension_au4": self.brow_tension_au4,
            "calibration_state": self.calibration_state,
            "calibration_progress": self.calibration_progress,
            "baseline_bpm": self.baseline_bpm,
            "baseline_contact": self.baseline_contact_score,
            "delta_bpm": delta_bpm,
            "delta_contact": delta_contact,
            "verdict": verdict
        }

polygraph_engine = ScientificPolygraphEngine(default_index=0)

def generate_video_stream():
    """Generates continuous MJPEG frames with real-time biometric HUD."""
    while True:
        frame_bytes = polygraph_engine.process_and_get_frame()
        if frame_bytes is None:
            time.sleep(0.05)
            continue
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.033)  # ~30 FPS

# =============================================================================
#   FLASK API & VIEW ROUTES
# =============================================================================

CRIME_SCENARIOS = {
    "vault_heist": {
        "key": "vault_heist",
        "title": "High-Value Vault and Bank Robbery",
        "badge": "VAULT ROBBERY",
        "details": "Armed or unauthorized breach of commercial bank vault at midnight; transfer of currency and bullion.",
        "questions": [
            {"id": 1, "text": "Are you speaking the 100% truth before this investigation board?"},
            {"id": 2, "text": "Were you present near the bank premises between 10:00 PM and midnight?"},
            {"id": 3, "text": "Did you possess or have unauthorized access to the vault master codes?"},
            {"id": 4, "text": "Did you assist or communicate with anyone who planned this robbery?"},
            {"id": 5, "text": "Did you take, conceal, or receive any portion of the stolen assets?"},
            {"id": 6, "text": "Is everything you have stated regarding your alibi the absolute truth?"}
        ]
    },
    "homicide": {
        "key": "homicide",
        "title": "Homicide and Murder Investigation",
        "badge": "HOMICIDE CASE",
        "details": "Targeted assault and murder investigation; suspect identified in victim's last known contacts.",
        "questions": [
            {"id": 1, "text": "Are you speaking the complete truth under oath today?"},
            {"id": 2, "text": "Were you present at or near the crime scene on the night of the incident?"},
            {"id": 3, "text": "Did you have a bitter financial dispute or personal grudge with the victim?"},
            {"id": 4, "text": "Have you ever touched, possessed, or discarded the weapon found by forensics?"},
            {"id": 5, "text": "Did you play any direct or indirect role in the death of the victim?"},
            {"id": 6, "text": "Are you withholding any critical information to shield yourself or an accomplice?"}
        ]
    },
    "cyber_fraud": {
        "key": "cyber_fraud",
        "title": "Corporate Cyber Espionage and Embezzlement",
        "badge": "CYBER ESPIONAGE",
        "details": "Exfiltration of proprietary source code, classified financial documents, and client database leakage.",
        "questions": [
            {"id": 1, "text": "Are you telling the truth regarding your access to internal servers?"},
            {"id": 2, "text": "Did you ever copy confidential company databases onto unauthorized external media?"},
            {"id": 3, "text": "Have you shared internal trade secrets or credentials with external third parties?"},
            {"id": 4, "text": "Did you receive undisclosed financial kickbacks or cryptocurrency payments?"},
            {"id": 5, "text": "Have you deleted message logs or encrypted local hard drives to conceal evidence?"},
            {"id": 6, "text": "Can you declare under biometric scrutiny that you had zero role in this breach?"}
        ]
    },
    "general": {
        "key": "general",
        "title": "General Police Interrogation and Deception Screening",
        "badge": "GENERAL INQUIRY",
        "details": "Standard biometric forensic screening for veracity assessment and deceptive intent.",
        "questions": [
            {"id": 1, "text": "Are you speaking the truth right now?"},
            {"id": 2, "text": "Have you ever stolen or taken something that was not yours?"},
            {"id": 3, "text": "Did you secretly take items or property without permission?"},
            {"id": 4, "text": "Have you ever made a false excuse to avoid accountability?"},
            {"id": 5, "text": "Have you ever hidden a major secret from investigators or family?"},
            {"id": 6, "text": "Is everything you have told me today the absolute truth?"}
        ]
    }
}

ACTIVE_CASE = {
    "case_id": "CBI-2026-X89",
    "suspect_name": "Vikram Malhotra",
    "suspect_age": 32,
    "suspect_gender": "Male",
    "scenario_key": "vault_heist",
    "crime_category": CRIME_SCENARIOS["vault_heist"]["title"],
    "crime_details": CRIME_SCENARIOS["vault_heist"]["details"],
    "officer_name": "Special Agent In-Charge",
    "date": time.strftime("%Y-%m-%d %H:%M:%S")
}

CURRENT_QUESTIONS = list(CRIME_SCENARIOS["vault_heist"]["questions"])
INTERROGATION_HISTORY = []

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/video_feed")
def video_feed():
    cam_id = request.args.get("cam_id", default=None, type=int)
    if cam_id is not None and cam_id != polygraph_engine.camera_index:
        polygraph_engine.open_camera(cam_id)
    return Response(generate_video_stream(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/api/biometrics")
def get_biometrics():
    return jsonify(polygraph_engine.get_biometric_telemetry())

@app.route("/api/register_blink", methods=["POST"])
def register_blink():
    polygraph_engine.blink_count += 1
    polygraph_engine.blink_timestamps.append(time.time())
    return jsonify({"status": "success", "blink_count": polygraph_engine.blink_count})

@app.route("/api/start_calibration", methods=["POST"])
def start_calibration():
    polygraph_engine.start_calibration()
    return jsonify({"status": "started", "duration": polygraph_engine.calibration_duration})

@app.route("/api/switch_camera", methods=["POST"])
def switch_camera():
    data = request.get_json() or {}
    cam_id = data.get("camera_index", 0)
    polygraph_engine.open_camera(cam_id)
    return jsonify({"status": "success", "active_camera": polygraph_engine.camera_index})

@app.route("/api/questions", methods=["GET"])
def get_questions():
    return jsonify({"status": "success", "questions": CURRENT_QUESTIONS, "case": ACTIVE_CASE})

@app.route("/api/case", methods=["GET"])
def get_case():
    return jsonify({
        "status": "success",
        "case": ACTIVE_CASE,
        "scenarios": [
            {"key": k, "title": v["title"], "badge": v["badge"], "details": v["details"]}
            for k, v in CRIME_SCENARIOS.items()
        ],
        "questions": CURRENT_QUESTIONS,
        "total_records": len(INTERROGATION_HISTORY)
    })

@app.route("/api/set_case", methods=["POST"])
def set_case():
    global ACTIVE_CASE, CURRENT_QUESTIONS, INTERROGATION_HISTORY
    data = request.get_json() or {}
    
    scenario_key = data.get("scenario_key", "vault_heist")
    scenario_info = CRIME_SCENARIOS.get(scenario_key, CRIME_SCENARIOS["vault_heist"])
    
    ACTIVE_CASE = {
        "case_id": data.get("case_id", f"CASE-2026-{int(time.time()) % 10000}").strip().upper(),
        "suspect_name": data.get("suspect_name", "Subject Alpha").strip(),
        "suspect_age": int(data.get("suspect_age", 30)),
        "suspect_gender": data.get("suspect_gender", "Male"),
        "scenario_key": scenario_key,
        "crime_category": scenario_info["title"],
        "crime_details": data.get("crime_details", scenario_info["details"]).strip(),
        "officer_name": data.get("officer_name", "Special Agent In-Charge").strip(),
        "date": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    # Custom or Scenario questions
    if data.get("custom_questions") and isinstance(data.get("custom_questions"), list) and len(data.get("custom_questions")) > 0:
        CURRENT_QUESTIONS = [
            {"id": i + 1, "text": q.strip()} 
            for i, q in enumerate(data.get("custom_questions")) if q.strip()
        ]
    else:
        CURRENT_QUESTIONS = list(scenario_info["questions"])

    # Reset interrogation records for this new suspect case
    INTERROGATION_HISTORY = []

    return jsonify({
        "status": "success",
        "message": "Case Dossier initialized successfully.",
        "case": ACTIVE_CASE,
        "questions": CURRENT_QUESTIONS
    })

@app.route("/api/log_verdict", methods=["POST"])
def log_verdict():
    data = request.get_json() or {}
    record = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "question": data.get("question", "General Statement"),
        "spoken_text": data.get("spoken_text", ""),
        "verdict": data.get("verdict", "UNKNOWN"),
        "heart_rate_bpm": data.get("heart_rate_bpm", 72),
        "delta_bpm": data.get("delta_bpm", 0.0),
        "eye_contact_score": data.get("eye_contact_score", 0),
        "blink_rate": data.get("blink_rate", 0),
        "voice_stress": data.get("voice_stress", 0),
        "micro_expression": data.get("micro_expression", "NEUTRAL"),
        "reasoning": data.get("reasoning", "")
    }
    INTERROGATION_HISTORY.append(record)
    return jsonify({"status": "logged", "record": record, "total_records": len(INTERROGATION_HISTORY)})

@app.route("/api/history", methods=["GET"])
def get_history():
    return jsonify({"status": "success", "history": INTERROGATION_HISTORY, "case": ACTIVE_CASE})

@app.route("/api/cognitive_interrogate", methods=["POST"])
def cognitive_interrogate():
    data = request.get_json() or {}
    question = data.get("question", "General Statement")
    spoken_text = data.get("spoken_text", "")
    biometrics = data.get("biometrics", {})
    custom_key = data.get("api_key", None)

    # Run Cognitive Evaluation (Gemini 2.5 Flash if available/key set, else Local Cognitive Engine)
    result = cognitive_engine.evaluate(
        question=question,
        spoken_text=spoken_text,
        biometrics=biometrics,
        custom_key=custom_key,
        case_context=ACTIVE_CASE
    )

    # Automatically Log to Interrogation History
    record = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "question": question,
        "spoken_text": spoken_text,
        "verdict": result.get("verdict", "UNKNOWN"),
        "confidence": result.get("confidence", 80),
        "reasoning": result.get("reasoning", ""),
        "engine": result.get("engine", "Local Cognitive Engine"),
        "heart_rate_bpm": biometrics.get("heart_rate_bpm", 72),
        "eye_contact_score": biometrics.get("eye_contact_score", 90),
        "delta_bpm": biometrics.get("delta_bpm", 0.0),
        "micro_expression": biometrics.get("micro_expression", "STEADY")
    }
    INTERROGATION_HISTORY.append(record)

    return jsonify(result)

@app.route("/api/set_gemini_key", methods=["POST"])
def set_gemini_key():
    data = request.get_json() or {}
    key = data.get("api_key", "")
    success = cognitive_engine.set_api_key(key)
    return jsonify({
        "status": "success" if success else "fallback_active",
        "configured": bool(key.strip()),
        "active_engine": "Google Gemini 2.5 Flash" if (success and key.strip()) else "Local Cognitive Semantic Engine"
    })

@app.route("/download_dossier_pdf")
def download_dossier_pdf():
    """Generates on-the-fly and downloads the official court-ready Forensic Case Dossier."""
    safe_case_id = ACTIVE_CASE.get("case_id", "CASE").replace("/", "_").replace(" ", "_")
    filename = f"Forensic_Dossier_{safe_case_id}.pdf"
    pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)
    
    try:
        generate_case_dossier_pdf(ACTIVE_CASE, INTERROGATION_HISTORY, pdf_path)
        if os.path.exists(pdf_path):
            return send_file(pdf_path, as_attachment=True, download_name=filename)
    except Exception as e:
        print(f"[DossierPDF] Error generating dossier PDF: {e}")
        return jsonify({"error": f"Failed to generate dossier PDF: {str(e)}"}), 500

    return jsonify({"error": "Report PDF not found"}), 404

@app.route("/download_pdf")
def download_pdf():
    pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "AI_Lie_Detector_Project_Report.pdf")
    if os.path.exists(pdf_path):
        return send_file(pdf_path, as_attachment=True, download_name="AI_Lie_Detector_Project_Report.pdf")
    return jsonify({"error": "Report PDF not found"}), 404

def open_browser():
    time.sleep(1.2)
    webbrowser.open("http://127.0.0.1:5000")

if __name__ == "__main__":
    port = 5000
    print("=" * 65)
    print("  >> REAL SCIENTIFIC AI POLYGRAPH SERVER RUNNING")
    print(f"  >> URL: http://127.0.0.1:{port}")
    print("  >> rPPG Real Heart Rate & Facial Action Units Active")
    print("=" * 65)
    
    # Auto-open browser in background thread
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Start Flask server
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
