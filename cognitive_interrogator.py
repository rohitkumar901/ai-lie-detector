"""
=============================================================================
         COGNITIVE AI FORENSIC INTERROGATOR (THE THINKING BRAIN)
=============================================================================
Combines:
1. Google Gemini Generative Interrogator API (LLM Deep Psychological Analysis)
2. Local Cognitive Semantic Reasoning Engine (NLP Deception & Contradiction)
3. Biometric Telemetry Fusion (rPPG Heart Rate, Gaze, Facial Action Units)
=============================================================================
"""

import os
import json
import re

# Optional Gemini API integration
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False


class CognitiveAIInterrogator:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
        
        # Auto-load from .env file if available
        base_dir = os.path.dirname(os.path.abspath(__file__))
        env_file = os.path.join(base_dir, ".env")
        if not self.api_key and os.path.exists(env_file):
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip().startswith("GEMINI_API_KEY="):
                            self.api_key = line.strip().split("=", 1)[1].strip()
                            break
            except Exception:
                pass

        # Key is loaded securely from .env (ignored in git) or os.environ
        if not self.api_key:
            self.api_key = ""

        self.client = None
        if GENAI_AVAILABLE and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"[CognitiveAI] Gemini client init error: {e}")

    def set_api_key(self, api_key: str):
        """Allows user to set or update Gemini API key dynamically from frontend."""
        self.api_key = api_key.strip()
        if GENAI_AVAILABLE and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                return True
            except Exception as e:
                print(f"[CognitiveAI] Error setting API key: {e}")
                return False
        return False

    def evaluate(self, question: str, spoken_text: str, biometrics: dict, custom_key: str = None, case_context: dict = None) -> dict:
        """
        Main cognitive decision hub:
        Analyzes the semantic meaning of what the user spoke + question context + live biometrics + criminal case context.
        """
        # If user passed custom key in request, use it
        active_client = self.client
        if custom_key and GENAI_AVAILABLE:
            try:
                active_client = genai.Client(api_key=custom_key.strip())
            except Exception:
                active_client = self.client

        # If LLM API is configured, use Gemini's deep forensic thinking
        if active_client:
            try:
                result = self._evaluate_with_gemini(active_client, question, spoken_text, biometrics, case_context)
                if result:
                    return result
            except Exception as err:
                print(f"[CognitiveAI] Gemini API evaluation failed: {err}. Falling back to Local Cognitive Engine.")

        # Otherwise, run our Local Cognitive Semantic Reasoning Engine
        return self._evaluate_with_local_cognitive_engine(question, spoken_text, biometrics, case_context)

    # =========================================================================
    #   1. GOOGLE GEMINI 2.5 FORENSIC LLM INTERROGATOR
    # =========================================================================
    def _evaluate_with_gemini(self, client, question: str, spoken_text: str, biometrics: dict, case_context: dict = None) -> dict:
        crime_info = ""
        if case_context:
            crime_info = f"""
[CRIMINAL CASE CONTEXT]
- Case Number: {case_context.get('case_id', 'CBI-2026-X89')}
- Suspect: {case_context.get('suspect_name', 'Subject Alpha')} (Age: {case_context.get('suspect_age', 30)}, Gender: {case_context.get('suspect_gender', 'Male')})
- Crime Category: {case_context.get('crime_category', 'Criminal Investigation')}
- Allegation Brief: {case_context.get('crime_details', 'Interrogating subject regarding direct involvement and deceptive intent.')}
"""

        prompt = f"""
You are an elite CIA / CBI Forensic Polygraph & Deception Detection Interrogator.
Your job is to critically THINK, ANALYZE, and DETECT if the subject is LYING or telling the TRUTH in this criminal investigation.
{crime_info}
[INTERROGATION CONTEXT]
- Question Asked: "{question}"
- Spoken Answer from Subject: "{spoken_text}"

[LIVE BIOMETRIC TELEMETRY DURING ANSWER]
- Eye Contact Stability: {biometrics.get('eye_contact_score', 85)}% (Direct vs Averted Gaze)
- Heart Rate (rPPG): {biometrics.get('heart_rate_bpm', 72)} BPM (Baseline: {biometrics.get('baseline_bpm', 72)} BPM, Delta: {biometrics.get('delta_bpm', 0.0)} BPM)
- Micro-Expressions: {biometrics.get('micro_expression', 'NEUTRAL')} (AU4 Brow Furrow Tension: {biometrics.get('brow_tension', False)})
- Vocal Pitch Tremor / Jitter: {biometrics.get('voice_stress', 15)}%

[FORENSIC DECEPTION RULES]
1. Explicit Confession / Admission (e.g. "I did it", "Maine churaya tha", "I am lying"): MUST BE MARKED AS 'LIE'.
2. Contradiction to Question (e.g. answering "No" to "Are you telling the truth?"): MUST BE MARKED AS 'LIE'.
3. Psychological Over-promising / Swearing ("Kasam se", "I swear", "Honestly believe me", "Trust me"): Strong indicator of deception.
4. Evasive Deflection ("Why would I?", "Mujhe kya pata", "Who told you?"): Strong indicator of deception.
5. Biometric Contradiction: If the subject gives a calm denial but their heart rate jumped by >12 BPM or eye contact broke (<50%), their body is betraying their words -> 'LIE'.
6. If the answer is direct, calm, plausible, and biometrics remain steady -> 'TRUTH'.

Respond ONLY in strict, valid JSON format:
{{
  "verdict": "LIE" or "TRUTH",
  "confidence": 85,
  "reasoning": "Sharp 1-2 sentence forensic explanation of why this verdict was chosen.",
  "voice_verdict": "Sorry sir, you are lying." or "Yes, this is truth.",
  "deception_markers": ["marker 1", "marker 2"]
}}
"""
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        text_resp = response.text.strip()
        data = json.loads(text_resp)
        data["engine"] = "Google Gemini 2.5 Flash (Generative AI)"
        return data

    # =========================================================================
    #   2. LOCAL COGNITIVE SEMANTIC REASONING ENGINE (OFFLINE ML)
    # =========================================================================
    def _evaluate_with_local_cognitive_engine(self, question: str, spoken_text: str, biometrics: dict, case_context: dict = None) -> dict:
        text = spoken_text.strip().lower()
        q_lower = question.strip().lower()

        markers = []
        is_lie = False
        confidence = 82
        reasoning = ""

        # --- RULE 1: Direct Confessions & Admissions of Guilt ---
        confession_patterns = [
            r"\bi lied\b", r"\bi am lying\b", r"\bi'm lying\b", r"\bjhooth\b", r"\bjhuth\b",
            r"\bjhoot\b", r"\bjhooth bol\b", r"\bjhuth bol\b", r"\bjhuth bol raha\b",
            r"\bmaine churaya\b", r"\bmaine kiya\b", r"\bmaine hi kiya\b", r"\bi stole\b", r"\bi took it\b",
            r"\bi did it\b", r"\byes i did\b", r"\bhaan maine\b", r"\bha maine\b",
            r"\bguilty\b", r"\bmy bad\b", r"\bmy fault\b", r"\bsorry\b",
            r"\bnot speaking truth\b", r"\bnot telling truth\b", r"\bsach nahi hai\b", r"\bsach nahi\b"
        ]
        for cp in confession_patterns:
            if re.search(cp, text):
                is_lie = True
                confidence = 96
                markers.append(f"Direct Admission / Confession detected ('{cp}')")
                reasoning = "Subject directly admitted guilt or confirmed they were not speaking the truth."
                return {
                    "verdict": "LIE",
                    "confidence": confidence,
                    "reasoning": reasoning,
                    "voice_verdict": "Sorry sir, you are lying.",
                    "deception_markers": markers,
                    "engine": "Cognitive Forensic Semantic Engine (Local)"
                }

        # --- RULE 2: Contradiction with Question Context ---
        # e.g., Question: "Are you speaking the truth right now?" -> Answer: "No" / "Nahi"
        if "truth" in q_lower or "sach" in q_lower:
            negative_answers = [r"\bno\b", r"\bnope\b", r"\bnahi\b", r"\bnot really\b", r"\bkabhi nahi\b"]
            for na in negative_answers:
                if re.search(na, text) and len(text.split()) <= 4:
                    is_lie = True
                    confidence = 94
                    markers.append("Direct negative contradiction to truthfulness question")
                    reasoning = f"Subject explicitly responded '{text}' when asked if they were telling the truth."
                    return {
                        "verdict": "LIE",
                        "confidence": confidence,
                        "reasoning": reasoning,
                        "voice_verdict": "Sorry sir, you are lying.",
                        "deception_markers": markers,
                        "engine": "Cognitive Forensic Semantic Engine (Local)"
                    }

        # --- RULE 3: Psychological Over-Promising & Swearing (Emphatic Protestation) ---
        emphatic_words = [
            ("kasam se", "Excessive religious/moral swearing ('kasam se')"),
            ("bhagwan kasam", "Excessive oath invocation ('bhagwan kasam')"),
            ("i swear", "Emphatic swearing ('i swear')"),
            ("honestly", "Over-protesting honesty ('honestly')"),
            ("to be honest", "Unconscious honesty hedging ('to be honest')"),
            ("trust me", "Urgent persuasion plea ('trust me')"),
            ("believe me", "Urgent persuasion plea ('believe me')"),
            ("sach bol raha", "Forced credibility assertion ('sach bol raha')")
        ]
        emphatic_detected = False
        for phrase, label in emphatic_words:
            if phrase in text:
                markers.append(label)
                emphatic_detected = True

        # --- RULE 4: Evasive Deflections ---
        evasion_words = [
            ("why would i", "Deflective counter-questioning ('why would I')"),
            ("mujhe kya pata", "Feigned ignorance deflection ('mujhe kya pata')"),
            ("who told you", "Interrogation deflection ('who told you')"),
            ("kisi aur ne", "Blame shifting ('kisi aur ne')")
        ]
        evasion_detected = False
        for phrase, label in evasion_words:
            if phrase in text:
                markers.append(label)
                evasion_detected = True

        # --- RULE 5: Biometric Alignment (Heart Rate, Gaze, Micro-Expressions, Blink Burst) ---
        contact = biometrics.get('eye_contact_score', 85)
        delta_bpm = biometrics.get('delta_bpm', 0.0)
        brow_tension = biometrics.get('brow_tension', False)
        voice_stress = biometrics.get('voice_stress', 15)
        exam_blinks = biometrics.get('exam_blinks', biometrics.get('blink_count', 0))

        if exam_blinks >= 3:
            markers.append(f"Abnormal Ocular Flutter / Rapid Blink Burst ({exam_blinks} blinks >= 3 threshold)")
        if delta_bpm > 11.0:
            markers.append(f"Cardiovascular Tachycardia Spike (+{delta_bpm} BPM above baseline)")
        if contact < 50:
            markers.append(f"Severe Camera Eye Contact Loss ({contact}%)")
        if brow_tension:
            markers.append("AU4 Brow Furrowing / Acute Cognitive Strain")
        if voice_stress > 45:
            markers.append(f"High Vocal Frequency Micro-Tremor ({voice_stress}%)")

        # --- DECISION SYNTHESIS ---
        # Ground Rule: exam_blinks >= 3 -> FALSE / LIE, else TRUTH
        if exam_blinks >= 3:
            is_lie = True
            confidence = 95
            reasoning = f"Abnormal ocular flutter detected: Subject blinked {exam_blinks} times during examination, meeting/exceeding the 3-blink threshold! Excessive ocular flutter confirms deception."
        else:
            is_lie = False
            confidence = 92
            reasoning = f"Steady ocular stability verified: Subject blinked only {exam_blinks} time(s) (strictly within truthful threshold < 3 blinks). Steady gaze confirmed truth."

        return {
            "verdict": "LIE" if is_lie else "TRUTH",
            "confidence": confidence,
            "reasoning": reasoning,
            "voice_verdict": "Sorry sir, you are lying." if is_lie else "Yes, this is truth.",
            "deception_markers": markers,
            "engine": "Cognitive Forensic Semantic Engine (Local)"
        }


# Global singleton
cognitive_interrogator = CognitiveAIInterrogator()
