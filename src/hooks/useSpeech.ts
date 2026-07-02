import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useSpeech(voiceURI: string, rate: number) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const unlockAttempted = useRef(false);

  useEffect(() => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setSupported(false);
      return;
    }

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    const fallback = window.setTimeout(loadVoices, 350);

    return () => {
      window.clearTimeout(fallback);
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const germanVoices = useMemo(
    () => voices.filter((voice) => voice.lang.toLowerCase().startsWith("de")),
    [voices],
  );

  const selectedVoice = useMemo(() => {
    const saved = voices.find((voice) => voice.voiceURI === voiceURI);
    const germanGermany = germanVoices.find((voice) => voice.lang.toLowerCase() === "de-de");
    return saved ?? germanGermany ?? germanVoices[0] ?? voices[0];
  }, [germanVoices, voiceURI, voices]);

  const speak = useCallback(
    (text: string) => {
      const cleanText = text.trim();
      if (!supported || !cleanText || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;

      if (!unlockAttempted.current) {
        unlockAttempted.current = true;
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = selectedVoice?.lang ?? "de-DE";
      utterance.rate = Math.min(1.1, Math.max(0.55, rate || 0.82));
      utterance.pitch = 1;
      utterance.volume = 1;
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
      window.setTimeout(() => {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      }, 0);
    },
    [rate, selectedVoice, supported],
  );

  return { voices, germanVoices, selectedVoice, speak, supported, speaking };
}
