/**
 * =============================================================================
 *   POLYGRAPH OSCILLOGRAPH (MULTI-CHANNEL WAVEFORM RENDERER)
 * =============================================================================
 * Simulates and renders real-time scrolling polygraph needles:
 *   - Pulse / Cardio (ECG)
 *   - Voice Tension (Jitter)
 *   - Eye & Blink Tension
 *   - Combined Deception Index
 */

class PolygraphRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.maxPoints = 220;

        // Waveform history queues
        this.cardioWave = new Array(this.maxPoints).fill(0);
        this.voiceWave = new Array(this.maxPoints).fill(0);
        this.eyeWave = new Array(this.maxPoints).fill(0);
        this.lieWave = new Array(this.maxPoints).fill(0);

        this.pulsePhase = 0;
        this.lastHeartbeatTime = 0;

        if (this.canvas) {
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            this.startLoop();
        }
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width || 500;
        this.canvas.height = 150;
    }

    startLoop() {
        const render = () => {
            this.updateData();
            this.draw();
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    updateData() {
        const now = Date.now();
        const stress = window.lieEngine ? window.lieEngine.currentStress : 15;
        const blinkActive = window.faceTracker ? window.faceTracker.isBlinking : false;
        const voiceJitter = window.audioBio ? window.audioBio.pitchJitter : 10;

        // 1. Real rPPG Heart Rate & ECG pulse integration
        const realBpm = (window.faceTracker && window.faceTracker.heartRateBPM) 
            ? window.faceTracker.heartRateBPM 
            : (65 + (stress / 100) * 50);

        const beatInterval = (60 / Math.max(45, Math.min(160, realBpm))) * 1000;

        this.pulsePhase += (2 * Math.PI) / (beatInterval / 16.6); // ~60fps step
        if (this.pulsePhase > 2 * Math.PI) {
            this.pulsePhase -= 2 * Math.PI;
            if (now - this.lastHeartbeatTime > 350 && window.audioBio) {
                window.audioBio.playHeartbeat();
                this.lastHeartbeatTime = now;
            }
        }

        // Combine synthetic QRS spike with real optical rPPG skin pulse wave
        let ecgSynth = 0;
        const p = this.pulsePhase;
        if (p > 1.2 && p < 1.4) {
            ecgSynth = -0.2;
        } else if (p >= 1.4 && p <= 1.6) {
            ecgSynth = 1.0 + (stress / 80);
        } else if (p > 1.6 && p < 1.8) {
            ecgSynth = -0.35;
        } else if (p > 2.2 && p < 2.6) {
            ecgSynth = 0.25;
        } else {
            ecgSynth = Math.sin(p * 2) * 0.04;
        }

        let ecgValue = ecgSynth;
        if (window.faceTracker && Math.abs(window.faceTracker.pulseWaveValue) > 0.02) {
            ecgValue = (window.faceTracker.pulseWaveValue * 0.6) + (ecgSynth * 0.5);
        }

        // 2. Eye Tension Wave (spikes on blink or eye aversion)
        let eyeValue = (Math.random() - 0.5) * 0.08;
        if (blinkActive) eyeValue = 0.85;

        // 3. Voice Tension Wave
        const voiceVal = ((voiceJitter / 100) * 0.8) + (Math.sin(now / 150) * (voiceJitter / 200));

        // 4. Lie probability rolling value
        const lieVal = stress / 100;

        // Push to queues
        this.pushValue(this.cardioWave, ecgValue);
        this.pushValue(this.voiceWave, voiceVal);
        this.pushValue(this.eyeWave, eyeValue);
        this.pushValue(this.lieWave, lieVal);
    }

    pushValue(array, val) {
        array.push(val);
        if (array.length > this.maxPoints) {
            array.shift();
        }
    }

    draw() {
        if (!this.ctx || !this.canvas) return;
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.ctx.clearRect(0, 0, w, h);

        // Draw Polygraph Paper Grid lines
        this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
        this.ctx.lineWidth = 1;

        const gridStep = 24;
        for (let x = 0; x < w; x += gridStep) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
            this.ctx.stroke();
        }
        for (let y = 0; y < h; y += gridStep) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(w, y);
            this.ctx.stroke();
        }

        // Draw channels in designated vertical sections
        // Channel 1: Cardio (top quarter, center y = 30)
        this.drawWave(this.cardioWave, '#ff0055', 30, 22);

        // Channel 2: Voice Tension (second quarter, center y = 65)
        this.drawWave(this.voiceWave, '#00f3ff', 65, 20);

        // Channel 3: Eye / Blink (third quarter, center y = 100)
        this.drawWave(this.eyeWave, '#ffaa00', 100, 20);

        // Channel 4: Deception Index (bottom, center y = 132)
        this.drawWave(this.lieWave, '#ff00ea', 132, 16);
    }

    drawWave(data, color, centerY, amplitude) {
        const w = this.canvas.width;
        const step = w / (this.maxPoints - 1);

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1.8;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 6;

        for (let i = 0; i < data.length; i++) {
            const x = i * step;
            const y = centerY - (data[i] * amplitude);

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        // Draw active stylus needle at latest point
        const lastX = (data.length - 1) * step;
        const lastY = centerY - (data[data.length - 1] * amplitude);
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.polygraphRenderer = new PolygraphRenderer('polygraph-canvas');
});
