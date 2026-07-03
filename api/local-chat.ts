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
    "The local is Lukas, a patient, friendly Berlin local who likes football. Use any supplied localMemory as continuity.",
    "The local persona replies in simple German only.",
    "The coach feedback is always in clear English. Never explain grammar in German.",
    "The learner must communicate in German only. If the learner uses English or another language, missionComplete must be false and feedback must say in English: 'Use German only here.'",
    `Keep the local reply at CEFR ${exercise.level ?? "A1"} and use vocabulary likely taught by this objective.`,
    "Never solve the objective for the learner before they attempt it in German.",
    "If the learner says IDK or is stuck, feedback should give one tiny English hint and correction should give one short German starter phrase.",
    "Grade whether the objective is complete, whether the German was understandable, and provide one short correction.",
    "Use scene, tags, targetAnswer, and acceptableAnswers as private grading context. Do not reveal the full answer unless the learner has tried or asked for help.",
    "reply: German only, as the local.",
    "feedback: English only, friendly and short.",
    "correction: English label plus German phrase if needed, for example: 'Try: Ich heiße Sam.'",
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
          scene: exercise.scene,
          skillId: exercise.skillId,
          persona: exercise.persona,
          targetAnswer: exercise.targetAnswer,
          acceptableAnswers: exercise.acceptableAnswers,
          localMemory: exercise.localMemory,
          tags: exercise.tags,
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
