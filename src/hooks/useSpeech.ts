import { useEffect, useMemo, useState } from "react";

export function useSpeech(voiceURI: string, rate: number) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const germanVoices = useMemo(
    () => voices.filter((voice) => voice.lang.toLowerCase().startsWith("de")),
    [voices],
  );

  const selectedVoice = useMemo(() => {
    const saved = voices.find((voice) => voice.voiceURI === voiceURI);
    return saved ?? germanVoices[0] ?? voices[0];
  }, [germanVoices, voiceURI, voices]);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedVoice?.lang ?? "de-DE";
    utterance.rate = rate;
    utterance.pitch = 1;
    if (selectedVoice) utterance.voice = selectedVoice;
    window.speechSynthesis.speak(utterance);
  };

  return { voices, germanVoices, selectedVoice, speak };
}
