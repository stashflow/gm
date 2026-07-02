type LocalMessage = {
  role: "local" | "learner" | "coach";
  text: string;
};

type RequestLike = {
  method?: string;
  body?: unknown;
};

type ResponseLike = {
  status(code: number): ResponseLike;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
};

const buildPayload = (body: unknown) => {
  const payload = typeof body === "string" ? JSON.parse(body) : (body as { exercise?: Record<string, unknown>; messages?: LocalMessage[] });
  const exercise = payload?.exercise ?? {};
  const messages = Array.isArray(payload?.messages) ? payload.messages.slice(-8) : [];

  const system = [
    "You are GM's 'Text with a local' German tutor.",
    "Act as the local persona while also grading the learner.",
    "The learner must communicate in German only. If the learner uses English or another language, missionComplete must be false.",
    `Keep the local reply at CEFR ${exercise.level ?? "A1"} unless the learner clearly exceeds it.`,
    "Never solve the objective for the learner before they ask in German.",
    "If the learner says IDK or is stuck, give a tiny hint in English and one German starter phrase.",
    "Grade whether the objective is complete, whether the German was understandable, and provide one correction.",
    "Return only JSON with keys: reply, feedback, correction, missionComplete.",
  ].join("\n");

  return {
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    input: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify({
          objective: exercise.objective,
          persona: exercise.persona,
          targetAnswer: exercise.targetAnswer,
          recentMessages: messages,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "local_text_grade",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            reply: { type: "string" },
            feedback: { type: "string" },
            correction: { type: "string" },
            missionComplete: { type: "boolean" },
          },
          required: ["reply", "feedback", "correction", "missionComplete"],
        },
      },
    },
  };
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(500).json({ error: "Set OPENAI_API_KEY in your deployment environment." });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(buildPayload(req.body)),
    });
    const json = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: json.error?.message ?? "OpenAI request failed." });
      return;
    }

    const outputText =
      json.output_text ??
      json.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? []).find((item: { text?: string }) => item.text)
        ?.text;

    res
      .status(200)
      .json(
        outputText
          ? JSON.parse(outputText)
          : { reply: "Wie bitte?", feedback: "Try again in German.", correction: "", missionComplete: false },
      );
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Local chat failed." });
  }
}
