/**
 * =============================================================================
 *   BIOMETRIC OPTICAL EYE, rPPG & MICRO-EXPRESSION TRACKER
 * =============================================================================
 * Receives live forensic telemetry from OpenCV & rPPG backend:
 *   - Real Heart Rate (BPM) from skin blood pulse
 *   - Facial Action Units (AU4 Brow Furrowing, AU12 Lip Tension)
 *   - Eye Contact & Gaze Deviation
 *   - 10-Second Baseline Calibration Controller
 */

class BiometricFaceTracker {
    constructor() {
        this.streamImg = document.getElementById('webcam-stream');
        this.currentCamIndex = 0;

        // Telemetry State
        this.faceDetected = false;
        this.eyesCount = 0;
        this.eyeContactActive = false;
        this.eyeContactScore = 92;
        this.heartRateBPM = 72.0;
        this.pulseWaveValue = 0.0;
        this.blinkCount = 0;
        this.blinkRateBPM = 12;
        this.microExpression = "NEUTRAL / STEADY";
        this.browTensionAU4 = false;

        // Calibration State
        this.calibrationState = "UNINITIALIZED";
        this.calibrationProgress = 0;
        this.baselineBPM = 72.0;
        this.deltaBPM = 0.0;

        this.isPolling = false;
        this.init();
    }

    init() {
        console.log("Biometric Face Tracker initialized with rPPG & FACS Engine...");
        this.bindEvents();
        
        // High-Speed Real-Time Telemetry Polling (40ms / ~25 FPS)
        setInterval(() => this.pollLiveBiometrics(), 40);
    }

    async pollLiveBiometrics() {
        if (this.isPolling) return;
        this.isPolling = true;
        try {
            const res = await fetch('/api/biometrics');
            const data = await res.json();

            this.faceDetected = data.face_detected;
            this.eyesCount = data.eyes_count;
            this.eyeContactActive = data.eye_contact_active;
            this.eyeContactScore = data.eye_contact_score;
            this.heartRateBPM = data.heart_rate_bpm;
            this.pulseWaveValue = data.pulse_wave_value;
            this.blinkCount = data.blink_count;
            this.blinkRateBPM = data.blink_rate_bpm;
            this.microExpression = data.micro_expression;
            this.browTensionAU4 = data.brow_tension_au4;

            this.calibrationState = data.calibration_state;
            this.calibrationProgress = data.calibration_progress;
            this.baselineBPM = data.baseline_bpm;
            this.deltaBPM = data.delta_bpm;

            // Sync pulse wave to global polygraph renderer
            if (window.polygraphRenderer) {
                window.polygraphRenderer.livePulseWave = this.pulseWaveValue;
            }

            this.updateUi();
        } catch (e) {
            // Silently continue
        } finally {
            this.isPolling = false;
        }
    }

    bindEvents() {
        // 1. Camera Switch Button
        const switchBtn = document.getElementById('switch-cam-btn');
        const camLabel = document.getElementById('active-cam-label');

        if (switchBtn) {
            switchBtn.addEventListener('click', async () => {
                const nextIndex = this.currentCamIndex === 0 ? 1 : 0;
                try {
                    const res = await fetch('/api/switch_camera', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ camera_index: nextIndex })
                    });
                    const data = await res.json();
                    this.currentCamIndex = data.active_camera;

                    if (camLabel) camLabel.innerText = `CAM ${this.currentCamIndex}`;
                    if (this.streamImg) {
                        this.streamImg.src = `/video_feed?cam_id=${this.currentCamIndex}&t=${Date.now()}`;
                    }
                } catch (err) {
                    console.error("Camera switch failed:", err);
                }
            });
        }

        // 2. Calibration Trigger Button
        const calBtn = document.getElementById('calibrate-btn');
        if (calBtn) {
            calBtn.addEventListener('click', async () => {
                try {
                    await fetch('/api/start_calibration', { method: 'POST' });
                    const banner = document.getElementById('calibration-banner');
                    if (banner) banner.classList.remove('hidden');
                } catch (err) {
                    console.error("Calibration request failed:", err);
                }
            });
        }
    }

    updateUi() {
        // rPPG Heart Rate
        const bpmVal = document.getElementById('bpm-val');
        const baseBpmVal = document.getElementById('base-bpm-val');
        const deltaBpmVal = document.getElementById('delta-bpm-val');
        const bpmStatus = document.getElementById('bpm-status');

        if (bpmVal) bpmVal.innerText = this.heartRateBPM.toFixed(1);
        if (baseBpmVal) baseBpmVal.innerText = this.baselineBPM.toFixed(1);
        if (deltaBpmVal) {
            const sign = this.deltaBPM >= 0 ? "+" : "";
            deltaBpmVal.innerText = `${sign}${this.deltaBPM.toFixed(1)}`;
            deltaBpmVal.style.color = Math.abs(this.deltaBPM) > 10 ? "var(--neon-red)" : "var(--neon-green)";
        }

        // Eye Contact
        const contactVal = document.getElementById('eye-contact-val');
        const contactBar = document.getElementById('eye-contact-bar');
        const gazeDir = document.getElementById('gaze-direction');

        if (contactVal) contactVal.innerText = `${this.eyeContactScore}%`;
        if (contactBar) {
            contactBar.style.width = `${Math.max(5, this.eyeContactScore)}%`;
            contactBar.className = this.eyeContactActive ? "progress-fill cyan-fill" : "progress-fill red-fill";
        }
        if (gazeDir) {
            gazeDir.innerText = this.eyeContactActive ? "DIRECT CONTACT [TRUTH]" : "AVERTED / SHIFTY [LIE]";
            gazeDir.className = this.eyeContactActive ? "green-text" : "red-text";
        }

        // Blinks
        const blinkVal = document.getElementById('blink-count-val');
        const blinkRateVal = document.getElementById('blink-rate-val');
        if (blinkVal) blinkVal.innerText = this.blinkCount;
        if (blinkRateVal) blinkRateVal.innerText = this.blinkRateBPM;

        // Micro-Expressions
        const microExprVal = document.getElementById('micro-expr-val');
        const browStatus = document.getElementById('brow-tension-status');

        if (microExprVal) {
            microExprVal.innerText = this.microExpression;
            microExprVal.style.color = (this.browTensionAU4 || !this.eyeContactActive) ? "var(--neon-red)" : "var(--neon-green)";
        }
        if (browStatus) {
            browStatus.innerText = this.browTensionAU4 ? "AU4 BROW: TENSION DETECTED" : "AU4 BROW: RELAXED";
            browStatus.style.color = this.browTensionAU4 ? "var(--neon-red)" : "var(--text-dim)";
        }

        // Target badge
        const targetBadge = document.getElementById('target-status');
        if (targetBadge) {
            if (this.faceDetected) {
                targetBadge.innerText = this.eyeContactActive ? "FACIAL LOCK ACTIVE" : "AVERTED GAZE / SEARCHING";
                targetBadge.parentElement.className = this.eyeContactActive ? "hud-badge top-left-badge" : "hud-badge top-left-badge amber";
            } else {
                targetBadge.innerText = "NO SUBJECT IN FRAME";
                targetBadge.parentElement.className = "hud-badge top-left-badge red";
            }
        }

        // Calibration Banner Handling
        const banner = document.getElementById('calibration-banner');
        const calPercent = document.getElementById('cal-percent');
        const calFill = document.getElementById('cal-fill');
        const calBtn = document.getElementById('calibrate-btn');

        if (this.calibrationState === "CALIBRATING") {
            if (banner) banner.classList.remove('hidden');
            if (calPercent) calPercent.innerText = this.calibrationProgress;
            if (calFill) calFill.style.width = `${this.calibrationProgress}%`;
            if (calBtn) calBtn.innerText = `CALIBRATING (${this.calibrationProgress}%)`;
        } else {
            if (banner) banner.classList.add('hidden');
            if (calBtn) calBtn.innerText = `RE-CALIBRATE (${this.baselineBPM} BPM)`;
        }
    }
}

window.faceTracker = new BiometricFaceTracker();
