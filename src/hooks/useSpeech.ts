import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useSpeech(voiceURI: string, rate: number) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const unlockAttempted = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speechRunRef = useRef(0);
  const retryTimers = useRef<number[]>([]);

  useEffect(() => {
    const hasBrowserSpeech = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    const hasAudioFallback = "Audio" in window;
    if (!hasBrowserSpeech && !hasAudioFallback) {
      setSupported(false);
      return;
    }
    setSupported(true);
    if (!hasBrowserSpeech) return;

    const loadVoices = () => {
      const nextVoices = window.speechSynthesis.getVoices();
      if (nextVoices.length > 0) setVoices(nextVoices);
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    retryTimers.current = [80, 250, 650, 1200, 2200].map((delay) => window.setTimeout(loadVoices, delay));

    const resume = () => {
      window.speechSynthesis.resume();
    };
    window.addEventListener("pointerdown", resume, { passive: true });
    window.addEventListener("touchend", resume, { passive: true });
    window.addEventListener("keydown", resume);

    return () => {
      retryTimers.current.forEach((timer) => window.clearTimeout(timer));
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("touchend", resume);
      window.removeEventListener("keydown", resume);
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    };
  }, []);

  const germanVoices = useMemo(
    () => voices.filter((voice) => voice.lang.toLowerCase().startsWith("de")),
    [voices],
  );

  const selectedVoice = useMemo(() => {
    const saved = voices.find((voice) => voice.voiceURI === voiceURI);
    const germanGermany = germanVoices.find((voice) => voice.lang.toLowerCase() === "de-de");
    return saved ?? germanGermany ?? germanVoices[0];
  }, [germanVoices, voiceURI, voices]);

  const speak = useCallback(
    (text: string) => {
      const cleanText = text.trim();
      if (!supported || !cleanText) return;

      const runId = speechRunRef.current + 1;
      speechRunRef.current = runId;
      audioRef.current?.pause();
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioRef.current = null;
      audioUrlRef.current = null;

      const playFallbackAudio = async () => {
        if (speechRunRef.current !== runId || !("Audio" in window)) return;
        try {
          setSpeaking(true);
          const response = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: cleanText, rate }),
          });
          if (!response.ok || speechRunRef.current !== runId) {
            setSpeaking(false);
            return;
          }

          const blob = await response.blob();
          if (speechRunRef.current !== runId) {
            setSpeaking(false);
            return;
          }

          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audioUrlRef.current = audioUrl;
          audio.onended = () => {
            if (audioUrlRef.current === audioUrl) {
              URL.revokeObjectURL(audioUrl);
              audioUrlRef.current = null;
            }
            if (speechRunRef.current === runId) setSpeaking(false);
          };
          audio.onerror = () => {
            if (audioUrlRef.current === audioUrl) {
              URL.revokeObjectURL(audioUrl);
              audioUrlRef.current = null;
            }
            if (speechRunRef.current === runId) setSpeaking(false);
          };
          await audio.play();
        } catch {
          if (speechRunRef.current === runId) setSpeaking(false);
        }
      };

      if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
        void playFallbackAudio();
        return;
      }

      const synth = window.speechSynthesis;
      unlockAttempted.current = true;
      synth.resume();
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = selectedVoice?.lang ?? "de-DE";
      utterance.rate = Math.min(1, Math.max(0.55, rate || 0.82));
      utterance.pitch = 1;
      utterance.volume = 1;
      if (selectedVoice) utterance.voice = selectedVoice;
      let started = false;
      utterance.onstart = () => {
        started = true;
        setSpeaking(true);
      };
      utterance.onend = () => {
        if (speechRunRef.current === runId) setSpeaking(false);
        if (utteranceRef.current === utterance) utteranceRef.current = null;
      };
      utterance.onerror = () => {
        if (utteranceRef.current === utterance) utteranceRef.current = null;
        void playFallbackAudio();
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);

      [0, 80, 250, 600].forEach((delay) => {
        window.setTimeout(() => {
          if (utteranceRef.current === utterance && synth.paused) synth.resume();
        }, delay);
      });

      window.setTimeout(() => {
        if (speechRunRef.current === runId && utteranceRef.current === utterance && !started && !synth.speaking) {
          synth.cancel();
          utteranceRef.current = null;
          void playFallbackAudio();
        }
      }, 900);
    },
    [rate, selectedVoice, supported],
  );

  return { voices, germanVoices, selectedVoice, speak, supported, speaking };
}
