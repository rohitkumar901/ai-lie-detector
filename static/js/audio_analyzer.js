/**
 * =============================================================================
 *   AUDIO ANALYZER & PROCEDURAL SFX SYNTHESIZER
 * =============================================================================
 * Handles microphone capture, pitch/jitter stress computation, frequency visualizer,
 * and procedural sound synthesis (heartbeats, scan tension, truth chime, lie siren).
 */

class AudioBiometrics {
    constructor() {
        this.audioCtx = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.timeData = null;
        this.isAudioReady = false;
        this.sfxEnabled = true;

        // Pitch & Tremor metrics
        this.pitchHistory = [];
        this.maxPitchHistory = 40;
        this.currentPitch = 0;
        this.pitchJitter = 0; // Stress index (0 - 100%)
        this.currentVolume = 0;

        // Canvas for Spectrum
        this.spectrumCanvas = document.getElementById('audio-spectrum-canvas');
        this.spectrumCtx = this.spectrumCanvas ? this.spectrumCanvas.getContext('2d') : null;
    }

    async init() {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContextClass();

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: true, 
                    noiseSuppression: false, 
                    autoGainControl: false 
                } 
            });

            this.microphone = this.audioCtx.createMediaStreamSource(stream);
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = 0.8;

            this.microphone.connect(this.analyser);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            this.timeData = new Float32Array(this.analyser.fftSize);

            this.isAudioReady = true;
            const micPill = document.getElementById('mic-status');
            if (micPill) micPill.innerText = "ACTIVE";

            this.startLoop();
            return true;
        } catch (err) {
            console.warn("Microphone access denied or unavailable:", err);
            const micPill = document.getElementById('mic-status');
            if (micPill) {
                micPill.innerText = "DENIED/SIMULATED";
                micPill.parentElement.classList.add("amber");
            }
            // Fallback simulated audio for testing even without microphone
            this.startSimulationLoop();
            return false;
        }
    }

    startLoop() {
        const render = () => {
            if (this.isAudioReady) {
                this.updateMetrics();
                this.drawSpectrum();
            }
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    startSimulationLoop() {
        setInterval(() => {
            // Generate subtle ambient fluctuations
            this.currentPitch = 120 + Math.sin(Date.now() / 600) * 15;
            this.pitchJitter = Math.max(5, Math.min(85, 20 + Math.random() * 15));
            this.currentVolume = 0.05 + Math.random() * 0.04;
            this.updateUiMetrics();
        }, 150);
    }

    updateMetrics() {
        if (!this.analyser) return;

        // 1. Frequency data for spectrum
        this.analyser.getByteFrequencyData(this.dataArray);

        // 2. Time domain data for pitch autocorrelation
        this.analyser.getFloatTimeDomainData(this.timeData);

        // Calculate RMS Volume
        let sumSquares = 0;
        for (let i = 0; i < this.timeData.length; i++) {
            sumSquares += this.timeData[i] * this.timeData[i];
        }
        this.currentVolume = Math.sqrt(sumSquares / this.timeData.length);

        // Estimate Pitch via Autocorrelation
        const pitch = this.autoCorrelate(this.timeData, this.audioCtx.sampleRate);
        if (pitch !== -1 && this.currentVolume > 0.02) {
            this.currentPitch = pitch;
            this.pitchHistory.push(pitch);
            if (this.pitchHistory.length > this.maxPitchHistory) {
                this.pitchHistory.shift();
            }
        }

        // Calculate Vocal Tremor / Pitch Jitter (relative standard deviation)
        if (this.pitchHistory.length > 5) {
            const avg = this.pitchHistory.reduce((a, b) => a + b, 0) / this.pitchHistory.length;
            const variance = this.pitchHistory.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / this.pitchHistory.length;
            const stdDev = Math.sqrt(variance);

            // Jitter percentage: stdDev normalized to vocal range
            const rawJitter = (stdDev / (avg || 1)) * 100;
            // Map 0-15% raw jitter into 0-100 stress score
            this.pitchJitter = Math.min(100, Math.round(rawJitter * 6.5));
        } else {
            this.pitchJitter = Math.max(0, this.pitchJitter - 2);
        }

        this.updateUiMetrics();
    }

    updateUiMetrics() {
        const stressElem = document.getElementById('voice-stress-pct');
        const tremorElem = document.getElementById('micro-tremor-label');
        const levelElem = document.getElementById('voice-level-label');

        if (stressElem) stressElem.innerText = `${Math.round(this.pitchJitter)}%`;

        if (tremorElem) {
            if (this.pitchJitter > 55) {
                tremorElem.innerText = "HIGH TREMOR";
                tremorElem.className = "red-text";
            } else if (this.pitchJitter > 30) {
                tremorElem.innerText = "ELEVATED";
                tremorElem.className = "amber-glow";
            } else {
                tremorElem.innerText = "STEADY";
                tremorElem.className = "green-text";
            }
        }

        if (levelElem) {
            const db = Math.round(this.currentVolume * 100);
            levelElem.innerText = `LEVEL: ${db}%`;
        }
    }

    // Autocorrelation algorithm for fundamental voice pitch detection
    autoCorrelate(buffer, sampleRate) {
        const SIZE = buffer.length;
        let rms = 0;

        for (let i = 0; i < SIZE; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.015) return -1; // Silence or background noise

        // Trim edges
        let r1 = 0, r2 = SIZE - 1, thres = 0.2;
        for (let i = 0; i < SIZE / 2; i++) {
            if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
        }
        for (let i = 1; i < SIZE / 2; i++) {
            if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }
        }

        const trimmed = buffer.slice(r1, r2);
        const c = new Array(trimmed.length).fill(0);

        for (let i = 0; i < trimmed.length; i++) {
            for (let j = 0; j < trimmed.length - i; j++) {
                c[i] += trimmed[j] * trimmed[j + i];
            }
        }

        let d = 0;
        while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < trimmed.length; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }

        let T0 = maxpos;
        if (maxpos === -1 || maxpos === 0) return -1;
        return sampleRate / T0;
    }

    drawSpectrum() {
        if (!this.spectrumCtx || !this.dataArray) return;
        const width = this.spectrumCanvas.width;
        const height = this.spectrumCanvas.height;

        this.spectrumCtx.clearRect(0, 0, width, height);

        const barCount = 36;
        const step = Math.floor(this.dataArray.length / barCount);
        const barWidth = (width / barCount) - 2;

        for (let i = 0; i < barCount; i++) {
            const val = this.dataArray[i * step] || 0;
            const barHeight = (val / 255) * height;
            const x = i * (barWidth + 2);
            const y = height - barHeight;

            // Color gradient based on stress
            if (this.pitchJitter > 55) {
                this.spectrumCtx.fillStyle = `rgba(255, 0, 85, ${0.4 + (val / 255) * 0.6})`;
            } else {
                this.spectrumCtx.fillStyle = `rgba(0, 243, 255, ${0.4 + (val / 255) * 0.6})`;
            }

            this.spectrumCtx.fillRect(x, y, barWidth, barHeight);
        }
    }

    // =========================================================================
    //   PROCEDURAL SOUND EFFECT SYNTHESIS (NO EXTERNAL MP3 NEEDED)
    // =========================================================================

    ensureAudioContext() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    // Heartbeat lub-dub sound for polygraph
    playHeartbeat() {
        if (!this.sfxEnabled) return;
        this.ensureAudioContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;

        // First thump (lub)
        this.triggerThump(now, 65, 0.12);
        // Second thump (dub)
        this.triggerThump(now + 0.14, 52, 0.16);
    }

    triggerThump(startTime, freq, duration) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(30, startTime + duration);

        gain.gain.setValueAtTime(0.4, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }

    // Interrogation tension riser during 5-second countdown
    playScanTension(fraction) {
        if (!this.sfxEnabled) return;
        this.ensureAudioContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        const baseFreq = 400 + fraction * 600; // 400Hz to 1000Hz
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    // Dramatic Emergency Siren for LIE DETECTED!
    playLieAlarm() {
        if (!this.sfxEnabled) return;
        this.ensureAudioContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';

        // High pitch siren warble
        for (let i = 0; i < 4; i++) {
            const t = now + i * 0.35;
            osc1.frequency.setValueAtTime(880, t);
            osc1.frequency.linearRampToValueAtTime(520, t + 0.17);
            osc1.frequency.linearRampToValueAtTime(880, t + 0.35);

            osc2.frequency.setValueAtTime(440, t);
            osc2.frequency.linearRampToValueAtTime(260, t + 0.17);
            osc2.frequency.linearRampToValueAtTime(440, t + 0.35);
        }

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.4);
        osc2.stop(now + 1.4);
    }

    // Futuristic Sci-Fi Confirmation Chime for TRUTH VERIFIED!
    playTruthChime() {
        if (!this.sfxEnabled) return;
        this.ensureAudioContext();
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 major chord

        notes.forEach((freq, idx) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            const startTime = now + idx * 0.08;
            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.7);
        });
    }

    // Voice Announcement (Text-to-Speech Interrogator Voice)
    speakVerdict(text, isLie = false) {
        console.log(`[AudioBiometrics] speakVerdict invoked: "${text}", isLie=${isLie}`);
        if (!('speechSynthesis' in window)) {
            console.warn("speechSynthesis not available in this browser");
            return;
        }

        try {
            // Chrome audio unlock
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }

            // Always resume speech synthesis in Chromium
            window.speechSynthesis.resume();
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            if (isLie) {
                utterance.pitch = 0.88; // Authoritative, serious interrogator voice
                utterance.rate = 0.90;
                utterance.volume = 1.0;
            } else {
                utterance.pitch = 1.02; // Clear, affirmative voice
                utterance.rate = 0.95;
                utterance.volume = 1.0;
            }

            const selectVoice = () => {
                const voices = window.speechSynthesis.getVoices();
                if (voices && voices.length > 0) {
                    const preferred = voices.find(v => v.lang.startsWith('en') && (
                        v.name.includes('Natural') || v.name.includes('Google') || 
                        v.name.includes('David') || v.name.includes('Zira') || 
                        v.name.includes('Samantha') || v.name.includes('Mark') ||
                        v.name.includes('English')
                    ));
                    if (preferred) utterance.voice = preferred;
                }
            };

            selectVoice();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = selectVoice;
            }

            utterance.onstart = () => console.log(`[AudioBiometrics] Voice announcement started: "${text}"`);
            utterance.onend = () => console.log(`[AudioBiometrics] Voice announcement completed`);
            utterance.onerror = (e) => console.warn(`[AudioBiometrics] Voice announcement error:`, e);

            // Prevent Chromium Garbage Collection bug
            window._currentUtterance = utterance;

            setTimeout(() => {
                try {
                    window.speechSynthesis.resume();
                    window.speechSynthesis.speak(utterance);
                } catch (err) {
                    console.error("speechSynthesis.speak error:", err);
                }
            }, 100);
        } catch (e) {
            console.warn("Speech synthesis error:", e);
        }
    }
}

// Global audio singleton
window.audioBio = new AudioBiometrics();
