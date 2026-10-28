/**
 * =============================================================================
 *   REAL-TIME SPEECH RECOGNITION & LINGUISTIC DECEPTION ANALYZER
 * =============================================================================
 * Listens to the user's spoken words in real time, streams live transcripts,
 * and extracts psychological deception markers (over-promising, hesitation fillers,
 * evasive phrases, and deflection patterns).
 */

class RealtimeSpeechAnalyzer {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentTranscript = "";
        this.currentLang = "en-IN"; // Default to English (India), supports 'hi-IN'

        // Linguistic Metrics
        this.linguisticStressScore = 15; // 0 (Honest/Concise) to 100 (High Deception)
        this.detectedMarkers = [];
        this.speechWordCount = 0;
        this.lastSpokeTime = Date.now();

        // Forensic Psychological Deception Dictionaries (English + Hinglish/Hindi)
        this.DECEPTION_PATTERNS = {
            // 1. Over-promising / Emphatic Protestations (Liars over-sell honesty)
            emphatic: [
                "honestly", "honestly speaking", "to be honest", "to be completely honest",
                "believe me", "trust me", "i swear", "swear to god", "as god is my witness",
                "kasam se", "sach bol raha hu", "sachi", "bhagwan kasam", "khuda kasam",
                "believe what you want", "i never lie"
            ],
            // 2. Cognitive Hesitations & Fillers (Fabrication latency)
            fillers: [
                "uh", "um", "uhh", "umm", "like", "you know", "actually", "basically",
                "matlab", "woh kya hai na", "aisa hai ki", "well", "sort of", "kind of"
            ],
            // 3. Evasive Deflections (Refusing direct answer)
            evasion: [
                "why would i", "why would i do that", "who told you that", "i don't recall",
                "i don't remember", "not that i know of", "maine aisa kabhi nahi kiya",
                "mujhe kya pata", "kisi aur ne kiya hoga", "maybe", "probably"
            ]
        };

        this.isQuestionMode = false;
        this.currentQuestionText = "Are you speaking the truth right now?";
        this.questionSilenceTimer = null;

        this.init();
    }

    init() {
        console.log("Initializing Real-Time Speech Recognition Engine...");
        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognitionClass) {
            console.warn("Web Speech API not supported in this browser. Running fallback linguistic simulator.");
            this.updateStatus("BROWSER STT UNSUPPORTED", "amber");
            return;
        }

        try {
            this.recognition = new SpeechRecognitionClass();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = this.currentLang;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateStatus("LIVE MIC LISTENING", "green");
            };

            this.recognition.onresult = (event) => {
                this.handleSpeechResults(event);
            };

            this.recognition.onerror = (event) => {
                console.warn("Speech recognition error:", event.error);
                if (event.error === 'not-allowed') {
                    this.updateStatus("MIC PERMISSION DENIED", "red");
                }
            };

            this.recognition.onend = () => {
                // Auto-restart continuous listening unless stopped
                if (this.isListening) {
                    try {
                        this.recognition.start();
                    } catch (e) {}
                }
            };

            this.bindEvents();
            this.startListening();
        } catch (e) {
            console.error("Speech initialization error:", e);
        }
    }

    startListening() {
        if (!this.recognition) return;
        try {
            this.isListening = true;
            this.recognition.start();
        } catch (e) {
            // Already started or busy
        }
    }

    stopListening() {
        this.isListening = false;
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    bindEvents() {
        const langSelect = document.getElementById('speech-lang-select');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                this.currentLang = e.target.value;
                if (this.recognition) {
                    this.stopListening();
                    this.recognition.lang = this.currentLang;
                    setTimeout(() => this.startListening(), 200);
                }
            });
        }

        // Question Mic & Direct Input Binding
        const askMicBtn = document.getElementById('ask-question-mic-btn');
        if (askMicBtn) {
            askMicBtn.addEventListener('click', () => this.toggleQuestionMode());
        }

        const customQInput = document.getElementById('custom-question-input');
        const setQBtn = document.getElementById('set-question-btn');
        if (setQBtn && customQInput) {
            setQBtn.addEventListener('click', () => {
                this.setDirectQuestion(customQInput.value);
            });
            customQInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.setDirectQuestion(customQInput.value);
                }
            });
        }
    }

    toggleQuestionMode() {
        this.isQuestionMode = !this.isQuestionMode;
        const askMicBtn = document.getElementById('ask-question-mic-btn');
        const mainLabel = document.getElementById('mic-btn-main-label');
        const subLabel = document.getElementById('mic-btn-sub-label');
        const statusBadge = document.getElementById('mic-status-badge');
        const qSubtext = document.getElementById('question-meta-subtext');

        if (this.isQuestionMode) {
            if (askMicBtn) askMicBtn.classList.add('mic-recording-active');
            if (mainLabel) mainLabel.innerText = "🔴 LISTENING TO QUESTION...";
            if (subLabel) subLabel.innerText = "SPEAK CLEARLY (CLICK TO LOCK)";
            if (statusBadge) {
                statusBadge.innerText = "INTERROGATOR SPEAKING";
                statusBadge.className = "mic-badge-recording";
            }
            if (qSubtext) qSubtext.innerText = "Awaaz capture ho rahi hai...";
            this.ensureListening();
        } else {
            if (askMicBtn) askMicBtn.classList.remove('mic-recording-active');
            if (mainLabel) mainLabel.innerText = "ASK QUESTION (MIC)";
            if (subLabel) subLabel.innerText = "CLICK & SPEAK YOUR QUESTION";
            if (statusBadge) {
                statusBadge.innerText = "QUESTION LOCKED";
                statusBadge.className = "mic-badge-locked";
            }
            if (qSubtext) qSubtext.innerText = "Sawaal set ho chuka hai! Ab examine karein.";
        }
    }

    setDirectQuestion(text) {
        if (!text || text.trim().length === 0) return;
        this.currentQuestionText = text.trim();
        const qDisplay = document.getElementById('question-text');
        const qSubtext = document.getElementById('question-meta-subtext');
        if (qDisplay) qDisplay.innerText = `"${this.currentQuestionText}"`;
        if (qSubtext) qSubtext.innerText = "Manual question set. Ready for ocular scan!";
        if (window.lieEngine) {
            window.lieEngine.activeSpokenQuestion = this.currentQuestionText;
        }
    }

    ensureListening() {
        if (!this.recognition) return;
        try {
            this.recognition.start();
        } catch (e) {
            // Already active
        }
    }

    setManualTranscript(text) {
        if (!text || text.trim().length === 0) return;
        this.currentTranscript = text.trim();
        this.lastSpokeTime = Date.now();
        this.analyzeLinguisticDeception(this.currentTranscript);
        this.renderTranscriptUI(this.currentTranscript);
    }

    handleSpeechResults(event) {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + " ";
            } else {
                interimTranscript += transcript;
            }
        }

        const combined = (finalTranscript + " " + interimTranscript).trim();
        if (combined.length === 0) return;

        // If currently recording Interrogator Question
        if (this.isQuestionMode) {
            this.currentQuestionText = combined;
            const qDisplay = document.getElementById('question-text');
            const customQInput = document.getElementById('custom-question-input');
            if (qDisplay) qDisplay.innerText = `"${this.currentQuestionText}"`;
            if (customQInput) customQInput.value = this.currentQuestionText;
            if (window.lieEngine) {
                window.lieEngine.activeSpokenQuestion = this.currentQuestionText;
            }

            clearTimeout(this.questionSilenceTimer);
            this.questionSilenceTimer = setTimeout(() => {
                if (this.isQuestionMode) {
                    this.toggleQuestionMode();
                }
            }, 2500);
            return;
        }

        // Otherwise, Suspect answering
        this.currentTranscript = combined;
        this.lastSpokeTime = Date.now();
        this.analyzeLinguisticDeception(this.currentTranscript);
        this.renderTranscriptUI(this.currentTranscript);
    }

    analyzeLinguisticDeception(text) {
        const lower = text.toLowerCase();
        const words = lower.split(/\s+/).filter(w => w.length > 0);
        this.speechWordCount = words.length;

        this.detectedMarkers = [];
        let score = 15; // Baseline neutral score

        // 1. Check for Emphatic Protestations (e.g. "honestly", "trust me", "kasam se")
        for (const pattern of this.DECEPTION_PATTERNS.emphatic) {
            if (lower.includes(pattern)) {
                this.detectedMarkers.push({
                    type: "EMPHATIC_PROTESTATION",
                    phrase: pattern,
                    severity: "HIGH",
                    msg: `Over-promising honesty ('${pattern}')`
                });
                score += 26;
            }
        }

        // 2. Check for Cognitive Fillers (e.g. "uh", "um", "matlab", "actually")
        for (const filler of this.DECEPTION_PATTERNS.fillers) {
            // Match whole word for short fillers like 'um'/'uh'
            const regex = new RegExp(`\\b${filler}\\b`, 'i');
            if (regex.test(lower)) {
                this.detectedMarkers.push({
                    type: "COGNITIVE_FILLER",
                    phrase: filler,
                    severity: "MEDIUM",
                    msg: `Fabrication latency filler ('${filler}')`
                });
                score += 15;
            }
        }

        // 3. Check for Evasion & Deflection (e.g. "why would i", "kisi aur ne")
        for (const evade of this.DECEPTION_PATTERNS.evasion) {
            if (lower.includes(evade)) {
                this.detectedMarkers.push({
                    type: "EVASIVE_DEFLECTION",
                    phrase: evade,
                    severity: "HIGH",
                    msg: `Evasive non-direct answer ('${evade}')`
                });
                score += 28;
            }
        }

        // Normalize score between 10% and 95%
        this.linguisticStressScore = Math.min(95, Math.max(10, score));
    }

    renderTranscriptUI(text) {
        const transcriptElem = document.getElementById('live-transcript-text');
        const pillsContainer = document.getElementById('linguistic-pills');

        if (transcriptElem) {
            transcriptElem.innerText = `"${text}"`;
            transcriptElem.classList.add('active-speaking');
            clearTimeout(this.fadeTimeout);
            this.fadeTimeout = setTimeout(() => {
                transcriptElem.classList.remove('active-speaking');
            }, 1200);
        }

        if (pillsContainer) {
            if (this.detectedMarkers.length === 0) {
                pillsContainer.innerHTML = `
                    <span class="ling-pill steady">
                        ✓ DIRECT &amp; CONCISE (${this.speechWordCount} WORDS) [CREDIBLE]
                    </span>
                `;
            } else {
                pillsContainer.innerHTML = this.detectedMarkers.map(m => `
                    <span class="ling-pill ${m.severity === 'HIGH' ? 'danger' : 'warning'}">
                        ⚠️ ${m.msg}
                    </span>
                `).join('');
            }
        }
    }

    updateStatus(label, color) {
        const statusLabel = document.getElementById('speech-status-label');
        const dot = document.getElementById('speech-indicator');
        if (statusLabel) statusLabel.innerText = label;
        if (dot) dot.className = `status-dot ${color}`;
    }

    resetTranscript() {
        this.currentTranscript = "";
        this.detectedMarkers = [];
        this.speechWordCount = 0;
        this.linguisticStressScore = 15;
        const transcriptElem = document.getElementById('live-transcript-text');
        if (transcriptElem) {
            transcriptElem.innerText = '"Listening... speak your answer into the microphone."';
        }
        const pills = document.getElementById('linguistic-pills');
        if (pills) {
            pills.innerHTML = '<span class="ling-pill steady">LINGUISTIC ANALYSIS READY</span>';
        }
    }
}

// Global speech analyzer singleton
window.speechAnalyzer = new RealtimeSpeechAnalyzer();
