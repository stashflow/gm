type RequestLike = {
  method?: string;
  body?: unknown;
};

type ResponseLike = {
  status(code: number): ResponseLike;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
  send(body: Buffer): void;
};

const parseBody = (body: unknown) => {
  const payload = typeof body === "string" ? JSON.parse(body) : (body as { text?: unknown; rate?: unknown });
  return {
    text: typeof payload?.text === "string" ? payload.text.trim().slice(0, 600) : "",
    rate: typeof payload?.rate === "number" ? payload.rate : 0.82,
  };
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "Set OPENAI_API_KEY in your deployment environment." });
    return;
  }

  try {
    const { text, rate } = parseBody(req.body);
    if (!text) {
      res.status(400).json({ error: "Missing text." });
      return;
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
        voice: process.env.OPENAI_TTS_VOICE ?? "cedar",
        input: text,
        speed: Math.min(1.1, Math.max(0.65, rate || 0.82)),
        instructions: "Speak clear Standard German for an A1/A2 learner. Use natural pronunciation, short pauses, and a calm teacher pace.",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      res.status(response.status).json({ error: errorText || "Text to speech failed." });
      return;
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(audio);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Text to speech failed." });
  }
}
