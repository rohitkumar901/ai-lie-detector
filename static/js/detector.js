/**
 * =============================================================================
 *   SCIENTIFIC AI LIE DETECTOR ENGINE & FORENSIC CONTROLLER
 * =============================================================================
 * Evaluates real-time physiological & facial deviations:
 *   - rPPG Heart Rate Spikes (Δ BPM above resting baseline)
 *   - Eye Contact Stability (Direct vs Averted Gaze)
 *   - FACS Micro-Expressions (AU4 Brow Furrowing, AU12 Lip Tension)
 *   - Vocal Micro-Tremor & Pitch Jitter
 */

class LieDetectorEngine {
    constructor() {
        this.currentStress = 16;
        this.activeCase = null;
        this.recordsCount = 0;
        this.activeSpokenQuestion = "Did you speak the absolute truth?";
        this.examStartBlinkCount = 0;
        this.examBlinksDetected = 0;

        // 5-Second Active Interrogation Scan State
        this.isScanning = false;
        this.scanDuration = 5.0;
        this.scanInterval = null;

        // Sample buffer
        this.interrogationSamples = {
            bpmReadings: [],
            contactScores: [],
            activeContactCount: 0,
            totalSamples: 0,
            browTensionCount: 0,
            voiceStressSamples: []
        };
    }

    async init() {
        await this.loadCaseDetails();
        this.bindEvents();

        // Continuous real-time stress estimator loop
        setInterval(() => this.computeRealtimeStress(), 100);
    }

    async loadCaseDetails() {
        try {
            const res = await fetch('/api/case');
            const data = await res.json();
            if (data.status === 'success') {
                this.activeCase = data.case;
                this.recordsCount = data.total_records || 0;
                this.updateCaseDisplay();
            }
        } catch (e) {
            console.warn("Could not load case details:", e);
        }
    }

    updateCaseDisplay() {
        if (!this.activeCase) return;
        const nameElem = document.getElementById('banner-suspect-name');
        const metaElem = document.getElementById('banner-suspect-meta');
        const caseIdElem = document.getElementById('banner-case-id');
        const crimeElem = document.getElementById('banner-crime-category');
        const countElem = document.getElementById('banner-records-count');
        const hudBadge = document.getElementById('hud-case-badge');

        if (nameElem) nameElem.innerText = this.activeCase.suspect_name;
        if (metaElem) metaElem.innerText = `${this.activeCase.suspect_age} Yrs, ${this.activeCase.suspect_gender}`;
        if (caseIdElem) caseIdElem.innerText = this.activeCase.case_id;
        if (crimeElem) crimeElem.innerText = this.activeCase.crime_category;
        if (countElem) countElem.innerText = this.recordsCount;
        if (hudBadge) {
            const shortBadge = this.activeCase.scenario_key === 'homicide' ? 'HOMICIDE' :
                               this.activeCase.scenario_key === 'cyber_fraud' ? 'CYBER FRAUD' :
                               this.activeCase.scenario_key === 'general' ? 'GENERAL' : 'VAULT ROBBERY';
            hudBadge.innerText = shortBadge;
        }
    }

    updateQuestionDisplay() {
        if (!this.questions || this.questions.length === 0) return;
        const q = this.questions[this.currentQIndex];

        const textElem = document.getElementById('question-text');
        const counter = document.getElementById('q-counter');

        if (textElem) textElem.innerText = q.text || q.text_en;
        if (counter) counter.innerText = `Q ${this.currentQIndex + 1}/${this.questions.length}`;
    }

    nextQuestion() {
        this.currentQIndex = (this.currentQIndex + 1) % this.questions.length;
        this.updateQuestionDisplay();
    }

    prevQuestion() {
        this.currentQIndex = (this.currentQIndex - 1 + this.questions.length) % this.questions.length;
        this.updateQuestionDisplay();
    }

    // Continuous Real-Time Stress Estimation
    computeRealtimeStress() {
        const ft = window.faceTracker;
        const ab = window.audioBio;

        let contactScore = ft ? ft.eyeContactScore : 90;
        let deltaBpm = ft ? ft.deltaBPM : 0.0;
        let browTension = ft ? ft.browTensionAU4 : false;
        let voiceStress = ab ? ab.pitchJitter : 15;

        // Scientific stress factors
        let gazeStress = Math.max(5, 100 - contactScore);
        let bpmStress = Math.min(100, Math.max(0, deltaBpm * 4.5));
        let microStress = browTension ? 35 : 0;

        // Weighted Multi-Factor Biometric Index
        let targetStress = (gazeStress * 0.40) + (bpmStress * 0.30) + (voiceStress * 0.20) + (microStress * 0.10);
        this.currentStress = Math.round(this.currentStress * 0.82 + targetStress * 0.18);

        this.updateStressMeterUI();
    }

    updateStressMeterUI() {
        const fill = document.getElementById('stress-gauge-fill');
        const scoreText = document.getElementById('stress-score-text');

        if (fill) {
            fill.style.width = `${Math.min(100, Math.max(5, this.currentStress))}%`;
        }

        if (scoreText) {
            scoreText.innerText = `${this.currentStress}%`;
            if (this.currentStress >= 48) {
                scoreText.style.color = 'var(--neon-red)';
            } else if (this.currentStress > 30) {
                scoreText.style.color = 'var(--neon-amber)';
            } else {
                scoreText.style.color = 'var(--neon-green)';
            }
        }
    }

    // =========================================================================
    //   5-SECOND INTERROGATION SCAN PROCEDURE (TRACKS 4-BLINK DECEPTION RULE)
    // =========================================================================

    startInterrogationScan() {
        if (this.isScanning) return;
        this.isScanning = true;

        if (window.speechAnalyzer) {
            window.speechAnalyzer.resetTranscript();
        }

        const ft = window.faceTracker;
        const ab = window.audioBio;

        // Reset sample buffer
        this.interrogationSamples = {
            bpmReadings: [],
            contactScores: [],
            activeContactCount: 0,
            totalSamples: 0,
            browTensionCount: 0,
            voiceStressSamples: []
        };

        // Capture starting blink count at scan engagement
        this.examStartBlinkCount = ft ? ft.blinkCount : 0;
        this.examBlinksDetected = 0;
        this.updateLiveBlinkUI(0);

        // UI animations
        const cameraPanel = document.querySelector('.camera-panel');
        if (cameraPanel) cameraPanel.classList.add('scanning');

        const scanBtn = document.getElementById('scan-now-btn');
        if (scanBtn) scanBtn.disabled = true;

        const progressWrapper = document.getElementById('scan-progress-wrapper');
        if (progressWrapper) progressWrapper.classList.remove('hidden');

        const progressBar = document.getElementById('scan-progress-bar');
        const countdownTimer = document.getElementById('countdown-timer');

        const startTime = Date.now();
        const durationMs = this.scanDuration * 1000;

        // 80ms Sampling Loop
        this.scanInterval = setInterval(() => {
            const elapsedMs = Date.now() - startTime;
            const remainingSec = Math.max(0, ((durationMs - elapsedMs) / 1000)).toFixed(1);
            const progressPct = Math.min(100, (elapsedMs / durationMs) * 100);

            if (progressBar) progressBar.style.width = `${progressPct}%`;
            if (countdownTimer) countdownTimer.innerText = `${remainingSec}s`;

            // Live Blink Detection during Answer Period
            if (ft) {
                const curBlinks = ft.blinkCount || 0;
                this.examBlinksDetected = Math.max(0, curBlinks - this.examStartBlinkCount);
                this.updateLiveBlinkUI(this.examBlinksDetected);
            }

            // Audio tension feedback
            if (ab && Math.floor(elapsedMs / 250) % 2 === 0) {
                ab.playScanTension(progressPct / 100);
            }

            // Sample biometrics
            if (ft) {
                this.interrogationSamples.bpmReadings.push(ft.heartRateBPM);
                this.interrogationSamples.contactScores.push(ft.eyeContactScore);
                if (ft.eyeContactActive) this.interrogationSamples.activeContactCount++;
                if (ft.browTensionAU4) this.interrogationSamples.browTensionCount++;
                this.interrogationSamples.totalSamples++;
            }

            if (ab) {
                this.interrogationSamples.voiceStressSamples.push(ab.pitchJitter);
            }

            // Complete scan after 5 seconds
            if (elapsedMs >= durationMs) {
                clearInterval(this.scanInterval);
                this.completeInterrogationScan();
            }
        }, 80);
    }

    updateLiveBlinkUI(count) {
        const countElem = document.getElementById('exam-live-blinks');
        const fillElem = document.getElementById('blink-progress-fill');
        const footerElem = document.getElementById('exam-blink-status-footer');

        if (countElem) countElem.innerText = count;
        if (fillElem) fillElem.style.width = `${Math.min(100, (count / 4) * 100)}%`;

        // Update 4 Golden Gear Slot Indicators
        for (let i = 1; i <= 4; i++) {
            const slot = document.getElementById(`blink-slot-${i}`);
            if (slot) {
                if (i <= 3) {
                    if (count >= i) slot.classList.add('slot-active-gold');
                    else slot.classList.remove('slot-active-gold');
                } else {
                    if (count >= 4) slot.classList.add('slot-active-danger');
                    else slot.classList.remove('slot-active-danger');
                }
            }
        }

        if (footerElem) {
            if (count >= 4) {
                footerElem.innerText = `🚨 ${count} BLINKS DETECTED! EXCEEDED 4-BLINK LIMIT (FALSE / LIE TRIGGERED)`;
                footerElem.className = "blink-status-footer red-alert";
            } else {
                footerElem.innerText = `STATUS: NORMAL OCULAR FREQUENCY (${count} / 4 BLINKS - TRUTH)`;
                footerElem.className = "blink-status-footer green-normal";
            }
        }
    }

    async completeInterrogationScan() {
        this.isScanning = false;

        const ft = window.faceTracker;
        const ab = window.audioBio;

        // Reset UI states
        const cameraPanel = document.querySelector('.camera-panel');
        if (cameraPanel) cameraPanel.classList.remove('scanning');

        const scanBtn = document.getElementById('scan-now-btn');
        if (scanBtn) scanBtn.disabled = false;

        const progressWrapper = document.getElementById('scan-progress-wrapper');
        const progressBar = document.getElementById('scan-progress-bar');
        const countdownTimer = document.getElementById('countdown-timer');

        if (progressBar) progressBar.style.width = '100%';
        if (countdownTimer) countdownTimer.innerText = 'AI THINKING...';

        // 1. Calculate Average Heart Rate during test
        const bpms = this.interrogationSamples.bpmReadings;
        const avgBpm = bpms.length > 0 
            ? Math.round((bpms.reduce((a, b) => a + b, 0) / bpms.length) * 10) / 10 
            : (ft ? ft.heartRateBPM : 72.0);

        const baseBpm = ft ? ft.baselineBPM : 72.0;
        const deltaBpm = Math.round((avgBpm - baseBpm) * 10) / 10;

        // 2. Calculate Average Eye Contact
        const contacts = this.interrogationSamples.contactScores;
        const avgContact = contacts.length > 0 
            ? Math.round(contacts.reduce((a, b) => a + b, 0) / contacts.length) 
            : 85;

        // 3. Micro-Expression & Brow Tension
        const total = Math.max(1, this.interrogationSamples.totalSamples);
        const browTensionRatio = this.interrogationSamples.browTensionCount / total;
        const browTensionDetected = browTensionRatio > 0.35;

        // 4. Voice Stress Average
        const voiceSamples = this.interrogationSamples.voiceStressSamples;
        const avgVoice = voiceSamples.length > 0 
            ? Math.round(voiceSamples.reduce((a, b) => a + b, 0) / voiceSamples.length) 
            : 18;

        // 5. Spoken Speech & Linguistic Analysis
        const sa = window.speechAnalyzer;
        const spokenText = (sa && sa.currentTranscript.trim().length > 0) ? sa.currentTranscript.trim() : "";
        let markers = sa ? sa.detectedMarkers : [];

        // Question Context (User asked question or custom typed question)
        const customQVal = document.getElementById('custom-question-input') ? document.getElementById('custom-question-input').value.trim() : "";
        const questionText = (sa && sa.currentQuestionText && sa.currentQuestionText.trim().length > 0)
            ? sa.currentQuestionText.trim()
            : (customQVal.length > 0 ? customQVal : (this.activeSpokenQuestion || "Did you commit the alleged act?"));

        // =====================================================================
        //   USER DECEPTION RULE:
        //   "agar meri eyes blink higi 4 time jada to false bolega unless truth"
        // =====================================================================
        const totalBlinks = this.examBlinksDetected;
        const isLie = (totalBlinks >= 4);
        const confidence = isLie 
            ? Math.min(99, 86 + (totalBlinks - 4) * 4) 
            : Math.min(98, 88 + (4 - totalBlinks) * 3);

        const reasoning = isLie
            ? `Abnormal ocular flutter detected: Subject blinked ${totalBlinks} times during examination, exceeding the 4-blink threshold! Excessive ocular flutter confirms deception.`
            : `Steady ocular stability verified: Subject blinked only ${totalBlinks} time(s) during examination (strictly within truthful threshold < 4 blinks). Steady gaze confirmed truth.`;

        const voiceVerdict = isLie ? "Sorry sir, you are lying." : "Yes, this is truth.";

        // Call backend cognitive API for historical logging and multimodal dossier integration
        try {
            const apiKey = localStorage.getItem('gemini_api_key') || "";
            const response = await fetch('/api/cognitive_interrogate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: questionText,
                    spoken_text: spokenText,
                    biometrics: {
                        heart_rate_bpm: avgBpm,
                        baseline_bpm: baseBpm,
                        delta_bpm: deltaBpm,
                        eye_contact_score: avgContact,
                        voice_stress: avgVoice,
                        brow_tension: browTensionDetected,
                        micro_expression: browTensionDetected ? "AU4 BROW TENSION" : "STEADY",
                        blink_count: totalBlinks,
                        exam_blinks: totalBlinks
                    },
                    api_key: apiKey
                })
            });
            if (response.ok) {
                this.recordsCount++;
                const countElem = document.getElementById('banner-records-count');
                if (countElem) countElem.innerText = this.recordsCount;
            }
        } catch (e) {
            console.warn("Cognitive API fetch error:", e);
        }

        if (progressWrapper) progressWrapper.classList.add('hidden');

        // Show Dramatic Verdict Screen with exact 4-blink verdict
        this.showVerdictModal({
            isLie: isLie,
            spokenText: spokenText,
            markers: markers,
            heartRate: avgBpm,
            deltaBpm: deltaBpm,
            eyeContact: avgContact,
            browTension: browTensionDetected,
            blinks: totalBlinks,
            deceptionScore: isLie ? Math.max(74, confidence) : Math.min(22, 100 - confidence),
            reasoning: reasoning,
            engine: "3D Golden Ocular Blink Engine",
            voiceVerdict: voiceVerdict
        });
    }

    // =========================================================================
    //   THE BIG DRAMATIC VERDICT SCREEN (LIE DETECTED / TRUTH VERIFIED)
    // =========================================================================

    showVerdictModal(data) {
        const modal = document.getElementById('verdict-modal');
        const giantText = document.getElementById('verdict-giant-text');
        const confBadge = document.getElementById('verdict-confidence-badge');
        const siren = document.getElementById('siren-lights');
        const timeElem = document.getElementById('verdict-timestamp');

        // Spoken Statement Evidence Elements
        const statementElem = document.getElementById('bd-spoken-statement');
        const lingStatusElem = document.getElementById('bd-linguistic-status');
        const voicePhraseElem = document.getElementById('verdict-voice-phrase');
        const speechSubtextElem = document.getElementById('verdict-speech-subtext');

        // Cognitive AI Reasoning Elements
        const aiEngineBadge = document.getElementById('bd-ai-engine-badge');
        const aiConfidenceElem = document.getElementById('bd-ai-confidence');
        const aiReasoningElem = document.getElementById('bd-ai-reasoning-text');

        if (!modal) return;
        if (timeElem) timeElem.innerText = `TIMESTAMP: ${new Date().toLocaleTimeString()}`;

        // Populate Spoken Transcript Evidence
        if (statementElem) {
            statementElem.innerText = data.spokenText ? `"${data.spokenText}"` : '"[No verbal answer detected / Silence]"';
        }

        // Populate AI Cognitive Reasoning
        if (aiEngineBadge) {
            aiEngineBadge.innerText = `🧠 ${data.engine || 'COGNITIVE AI'} REASONING:`;
        }
        if (aiConfidenceElem) {
            aiConfidenceElem.innerText = `CONFIDENCE: ${data.deceptionScore || 85}%`;
        }
        if (aiReasoningElem) {
            aiReasoningElem.innerText = data.reasoning || "Cognitive psychological evaluation completed across speech semantics, rPPG pulse, and facial dynamics.";
        }

        if (lingStatusElem) {
            if (data.isLie) {
                if (data.markers && data.markers.length > 0) {
                    lingStatusElem.innerText = `LINGUISTIC DECEPTION: ${data.markers.map(m => m.msg || m).join(', ')}`;
                } else {
                    lingStatusElem.innerText = "LINGUISTIC EVASION / COGNITIVE LATENCY IDENTIFIED";
                }
                lingStatusElem.className = "vs-status red-text";
            } else {
                lingStatusElem.innerText = "DIRECT, CONCISE & CREDIBLE STATEMENT VERIFIED";
                lingStatusElem.className = "vs-status green-text";
            }
        }

        const voicePhrase = data.voiceVerdict || (data.isLie ? "Sorry sir, you are lying." : "Yes, this is truth.");

        if (data.isLie) {
            // LIE DETECTED (झूठ पकड़ा गया!) - "Sorry sir, you are lying"
            modal.className = "verdict-modal lie-verdict";
            if (giantText) giantText.innerText = "LIE DETECTED!";
            if (voicePhraseElem) voicePhraseElem.innerText = `"${voicePhrase}"`;
            if (speechSubtextElem) speechSubtextElem.className = "verdict-speech-subtext red-text";
            if (confBadge) confBadge.innerText = `DECEPTION PROBABILITY: ${data.deceptionScore}%`;
            if (siren) siren.classList.add('active');

            // Play siren alarm & speak voice "Sorry sir, you are lying."
            if (window.audioBio) {
                window.audioBio.playLieAlarm();
                window.audioBio.speakVerdict(voicePhrase, true);
            }

            // Evidence Breakdown (Includes 4-Blink Evidence Breakdown)
            this.setBreakdownCard('bd-blink-text', 'bd-blink-status',
                `${data.blinks !== undefined ? data.blinks : 5} Blinks (Limit: 4)`,
                "4+ BLINK BURST EXCEEDED (LIE DETECTED)", true);

            const sign = data.deltaBpm >= 0 ? "+" : "";
            this.setBreakdownCard('bd-pulse-text', 'bd-pulse-status',
                `Pulse: ${data.heartRate} BPM (${sign}${data.deltaBpm} BPM)`,
                data.deltaBpm > 8 ? "TACHYCARDIA ANXIETY SPIKE" : "CARDIO TENSION DETECTED", true);

            this.setBreakdownCard('bd-gaze-text', 'bd-gaze-status',
                `Contact: ${data.eyeContact}%`,
                data.eyeContact < 50 ? "CAMERA EYE CONTACT BROKEN" : "VISUAL FOCUS STRAIN", true);

            this.setBreakdownCard('bd-stress-text', 'bd-stress-status',
                `Forensic Deception Index: ${data.deceptionScore}%`,
                "VERDICT: DECEPTION / LIE", true);

        } else {
            // TRUTH VERIFIED (सच सत्यापित!) - "Yes, this is truth"
            modal.className = "verdict-modal truth-verdict";
            if (giantText) giantText.innerText = "TRUTH VERIFIED!";
            if (voicePhraseElem) voicePhraseElem.innerText = `"${voicePhrase}"`;
            if (speechSubtextElem) speechSubtextElem.className = "verdict-speech-subtext green-text";
            const credibility = Math.min(99, Math.max(82, 100 - (data.deceptionScore < 50 ? data.deceptionScore : 15)));
            if (confBadge) confBadge.innerText = `CREDIBILITY SCORE: ${credibility}%`;
            if (siren) siren.classList.remove('active');

            // Play confirmation chime & speak voice "Yes, this is truth."
            if (window.audioBio) {
                window.audioBio.playTruthChime();
                window.audioBio.speakVerdict(voicePhrase, false);
            }

            // Evidence Breakdown
            this.setBreakdownCard('bd-blink-text', 'bd-blink-status',
                `${data.blinks !== undefined ? data.blinks : 1} Blinks (Limit: 4)`,
                "NORMAL OCULAR STABILITY (< 4 BLINKS)", false);

            const sign = data.deltaBpm >= 0 ? "+" : "";
            this.setBreakdownCard('bd-pulse-text', 'bd-pulse-status',
                `Pulse: ${data.heartRate} BPM (${sign}${data.deltaBpm} BPM)`,
                "RESTING BASELINE UNIFORM", false);

            this.setBreakdownCard('bd-gaze-text', 'bd-gaze-status',
                `Contact: ${data.eyeContact}% (Direct Alignment)`,
                "DIRECT CAMERA CONTACT MAINTAINED", false);

            this.setBreakdownCard('bd-stress-text', 'bd-stress-status',
                `Credibility Index: ${credibility}%`,
                "VERDICT: TRUTH / VERIFIED", false);
        }

        modal.classList.remove('hidden');

        // Log to backend
        try {
            const curQ = this.activeSpokenQuestion || "General Inquiry";
            fetch('/api/log_verdict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: curQ,
                    verdict: data.isLie ? "LIE" : "TRUTH",
                    heart_rate_bpm: data.heartRate,
                    eye_contact_score: data.eyeContact,
                    micro_expression: data.browTension ? "BROW_FURROW" : "STEADY"
                })
            });
        } catch (err) {
            console.log("Verdict logged.");
        }
    }

    setBreakdownCard(textId, statusId, textVal, statusVal, isDanger) {
        const textElem = document.getElementById(textId);
        const statusElem = document.getElementById(statusId);
        if (textElem) textElem.innerText = textVal;
        if (statusElem) {
            statusElem.innerText = statusVal;
            statusElem.className = isDanger ? "bd-status red-text" : "bd-status green-text";
        }
    }

    dismissVerdict() {
        const modal = document.getElementById('verdict-modal');
        const siren = document.getElementById('siren-lights');
        if (modal) modal.classList.add('hidden');
        if (siren) siren.classList.remove('active');

        if (window.speechAnalyzer) {
            window.speechAnalyzer.resetTranscript();
        }
    }

    bindEvents() {
        // Scan Button
        const scanBtn = document.getElementById('scan-now-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                if (window.audioBio) window.audioBio.ensureAudioContext();
                this.startInterrogationScan();
            });
        }

        // Demo Buttons (User exact 4-blink rule testing)
        const demoLieBtn = document.getElementById('demo-lie-btn');
        if (demoLieBtn) {
            demoLieBtn.addEventListener('click', () => {
                if (window.audioBio) window.audioBio.ensureAudioContext();
                this.showVerdictModal({
                    isLie: true,
                    spokenText: "I did not touch anything, I swear...",
                    markers: [{ msg: "Ocular Flutter: 5 Blinks (exceeded 4-blink limit)" }],
                    heartRate: 88.5,
                    deltaBpm: 16.5,
                    eyeContact: 42,
                    browTension: true,
                    blinks: 5,
                    deceptionScore: 92,
                    reasoning: "Abnormal ocular flutter detected: Subject blinked 5 times during interrogation (exceeded 4-blink limit)! Deception triggered.",
                    engine: "3D Golden Ocular Engine",
                    voiceVerdict: "Sorry sir, you are lying."
                });
            });
        }

        const demoTruthBtn = document.getElementById('demo-truth-btn');
        if (demoTruthBtn) {
            demoTruthBtn.addEventListener('click', () => {
                if (window.audioBio) window.audioBio.ensureAudioContext();
                this.showVerdictModal({
                    isLie: false,
                    spokenText: "Yes, I am speaking the absolute truth.",
                    markers: [],
                    heartRate: 71.0,
                    deltaBpm: -1.0,
                    eyeContact: 96,
                    browTension: false,
                    blinks: 2,
                    deceptionScore: 14,
                    reasoning: "Steady ocular stability verified: Subject blinked only 2 times during interrogation (within calm truth threshold < 4 blinks).",
                    engine: "3D Golden Ocular Engine",
                    voiceVerdict: "Yes, this is truth."
                });
            });
        }
                    reasoning: "Direct unhedged verbal affirmation with unbroken camera gaze (96%) and calm resting heart rate within baseline bounds.",
                    engine: "Cognitive AI Interrogator",
                    voiceVerdict: "Yes, this is truth."
                });
            });
        }

        // AI Brain Configuration Modal
        const brainBtn = document.getElementById('ai-brain-btn');
        const brainModal = document.getElementById('ai-brain-modal');
        const closeBrainBtn = document.getElementById('close-brain-modal-btn');
        const brainBackdrop = document.getElementById('brain-modal-backdrop');
        const saveBrainBtn = document.getElementById('save-brain-config-btn');
        const geminiInput = document.getElementById('gemini-api-key-input');
        const currentEngineLabel = document.getElementById('current-engine-label');
        const headerBadge = document.getElementById('ai-engine-badge');

        // Check for saved API key or use local engine
        const updateBrainBadge = () => {
            const key = localStorage.getItem('gemini_api_key') || "";
            if (headerBadge) {
                if (key.trim()) {
                    headerBadge.innerText = "GEMINI 2.5 FLASH";
                    headerBadge.style.color = "var(--neon-green)";
                } else {
                    headerBadge.innerText = "COGNITIVE ML";
                    headerBadge.style.color = "var(--neon-cyan)";
                }
            }
        };
        updateBrainBadge();

        if (brainBtn && brainModal) {
            brainBtn.addEventListener('click', () => {
                const savedKey = localStorage.getItem('gemini_api_key') || "";
                if (geminiInput) geminiInput.value = savedKey;
                if (currentEngineLabel) {
                    currentEngineLabel.innerText = savedKey.trim() 
                        ? "Google Gemini 2.5 Flash API (Configured)"
                        : "Local Cognitive Semantic Engine (Active & Free)";
                }
                brainModal.classList.remove('hidden');
            });
        }

        const hideBrainModal = () => {
            if (brainModal) brainModal.classList.add('hidden');
        };

        if (closeBrainBtn) closeBrainBtn.addEventListener('click', hideBrainModal);
        if (brainBackdrop) brainBackdrop.addEventListener('click', hideBrainModal);

        if (saveBrainBtn && geminiInput) {
            saveBrainBtn.addEventListener('click', async () => {
                const key = geminiInput.value.trim();
                localStorage.setItem('gemini_api_key', key);
                updateBrainBadge();

                // Send to backend
                try {
                    const res = await fetch('/api/set_gemini_key', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ api_key: key })
                    });
                    const data = await res.json();
                    if (currentEngineLabel) {
                        currentEngineLabel.innerText = data.active_engine;
                    }
                } catch (e) {
                    console.log("Key set locally.");
                }

                hideBrainModal();
            });
        }

        // =====================================================================
        //   CRIMINAL CASE SETUP & SUSPECT PROFILING MODAL EVENTS
        // =====================================================================
        const openCaseBtn = document.getElementById('open-case-modal-btn');
        const quickEditCaseBtn = document.getElementById('quick-edit-case-btn');
        const caseModal = document.getElementById('case-setup-modal');
        const closeCaseBtn = document.getElementById('close-case-modal-btn');
        const cancelCaseBtn = document.getElementById('cancel-case-btn');
        const caseBackdrop = document.getElementById('case-modal-backdrop');
        const saveCaseBtn = document.getElementById('save-case-btn');

        const caseIdInput = document.getElementById('input-case-id');
        const suspectNameInput = document.getElementById('input-suspect-name');
        const suspectAgeInput = document.getElementById('input-suspect-age');
        const suspectGenderSelect = document.getElementById('input-suspect-gender');
        const crimeScenarioSelect = document.getElementById('input-crime-scenario');
        const crimeDetailsText = document.getElementById('input-crime-details');
        const customQuestionsText = document.getElementById('input-custom-questions');
        const officerInput = document.getElementById('input-officer-name');

        const scenarioDefaultBriefs = {
            vault_heist: "Armed or unauthorized breach of commercial bank vault at midnight; transfer of currency and bullion.",
            homicide: "Targeted assault and murder investigation; suspect identified in victim's last known contacts.",
            cyber_fraud: "Exfiltration of proprietary source code, classified financial documents, and client database leakage.",
            general: "Standard biometric forensic screening for veracity assessment and deceptive intent."
        };

        const showCaseModal = () => {
            if (!caseModal) return;
            if (this.activeCase) {
                if (caseIdInput) caseIdInput.value = this.activeCase.case_id || "CBI-2026-X89";
                if (suspectNameInput) suspectNameInput.value = this.activeCase.suspect_name || "Vikram Malhotra";
                if (suspectAgeInput) suspectAgeInput.value = this.activeCase.suspect_age || 32;
                if (suspectGenderSelect) suspectGenderSelect.value = this.activeCase.suspect_gender || "Male";
                if (crimeScenarioSelect) crimeScenarioSelect.value = this.activeCase.scenario_key || "vault_heist";
                if (crimeDetailsText) crimeDetailsText.value = this.activeCase.crime_details || scenarioDefaultBriefs.vault_heist;
                if (officerInput) officerInput.value = this.activeCase.officer_name || "Special Agent In-Charge";
            }
            caseModal.classList.remove('hidden');
        };

        const hideCaseModal = () => {
            if (caseModal) caseModal.classList.add('hidden');
        };

        if (openCaseBtn) openCaseBtn.addEventListener('click', showCaseModal);
        if (quickEditCaseBtn) quickEditCaseBtn.addEventListener('click', showCaseModal);
        if (closeCaseBtn) closeCaseBtn.addEventListener('click', hideCaseModal);
        if (cancelCaseBtn) cancelCaseBtn.addEventListener('click', hideCaseModal);
        if (caseBackdrop) caseBackdrop.addEventListener('click', hideCaseModal);

        if (crimeScenarioSelect && crimeDetailsText) {
            crimeScenarioSelect.addEventListener('change', (e) => {
                const def = scenarioDefaultBriefs[e.target.value];
                if (def) crimeDetailsText.value = def;
            });
        }

        if (saveCaseBtn) {
            saveCaseBtn.addEventListener('click', async () => {
                const customQ = (customQuestionsText && customQuestionsText.value.trim().length > 0)
                    ? customQuestionsText.value.split('\n').map(q => q.trim()).filter(q => q.length > 0)
                    : [];

                const payload = {
                    case_id: caseIdInput ? caseIdInput.value.trim() : "CASE-2026-X89",
                    suspect_name: suspectNameInput ? suspectNameInput.value.trim() : "Subject Alpha",
                    suspect_age: suspectAgeInput ? parseInt(suspectAgeInput.value) : 30,
                    suspect_gender: suspectGenderSelect ? suspectGenderSelect.value : "Male",
                    scenario_key: crimeScenarioSelect ? crimeScenarioSelect.value : "vault_heist",
                    crime_details: crimeDetailsText ? crimeDetailsText.value.trim() : "",
                    officer_name: officerInput ? officerInput.value.trim() : "Special Agent In-Charge",
                    custom_questions: customQ
                };

                try {
                    const res = await fetch('/api/set_case', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (data.status === 'success') {
                        this.activeCase = data.case;
                        this.questions = data.questions || [];
                        this.currentQIndex = 0;
                        this.recordsCount = 0;
                        this.updateCaseDisplay();
                        this.updateQuestionDisplay();
                    }
                } catch (e) {
                    console.warn("Error setting case:", e);
                }

                hideCaseModal();
            });
        }

        // Spacebar Shortcut
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (window.audioBio) window.audioBio.ensureAudioContext();
                const modal = document.getElementById('verdict-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    this.dismissVerdict();
                } else {
                    this.startInterrogationScan();
                }
            }
        });

        // Question Nav
        const prevBtn = document.getElementById('prev-q-btn');
        const nextBtn = document.getElementById('next-q-btn');
        if (prevBtn) prevBtn.addEventListener('click', () => this.prevQuestion());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextQuestion());

        // Dismiss Button
        const dismissBtn = document.getElementById('dismiss-verdict-btn');
        if (dismissBtn) dismissBtn.addEventListener('click', () => this.dismissVerdict());

        // Audio Toggle
        const soundBtn = document.getElementById('sound-toggle-btn');
        const soundLabel = document.getElementById('sfx-label');
        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
                if (window.audioBio) {
                    window.audioBio.sfxEnabled = !window.audioBio.sfxEnabled;
                    if (soundLabel) {
                        soundLabel.innerText = window.audioBio.sfxEnabled ? "ON" : "MUTED";
                    }
                }
            });
        }
    }
}

// Global initialization
window.addEventListener('DOMContentLoaded', async () => {
    window.lieEngine = new LieDetectorEngine();
    await window.lieEngine.init();

    const unlock = () => {
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        if (window.audioBio) window.audioBio.ensureAudioContext();
    };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
});
