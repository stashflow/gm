import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const readBody = async (req: import("node:http").IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

export default defineConfig({
  plugins: [
    react(),
    {
      name: "gm-local-chat-api",
      configureServer(server) {
        server.middlewares.use("/api/local-chat", async (req, res) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Set OPENAI_API_KEY in .env, then restart the dev server." }));
        return;
      }

      try {
        const payload = JSON.parse(await readBody(req));
        const messages = Array.isArray(payload.messages) ? payload.messages.slice(-8) : [];
        const exercise = payload.exercise ?? {};

        const system = [
          "You are GM's 'Text with a local' German tutor.",
          "Act as the local persona while also grading the learner.",
          "The learner must communicate in German only. If the learner uses English or another language, missionComplete must be false.",
          "Keep the local reply at CEFR " + (exercise.level ?? "A1") + " unless the learner clearly exceeds it.",
          "Never solve the objective for the learner before they ask in German.",
          "If the learner says IDK or is stuck, give a tiny hint in English and one German starter phrase.",
          "Grade whether the objective is complete, whether the German was understandable, and provide one correction.",
          "Return only JSON with keys: reply, feedback, correction, missionComplete.",
        ].join("\n");

        const user = JSON.stringify({
          objective: exercise.objective,
          persona: exercise.persona,
          targetAnswer: exercise.targetAnswer,
          recentMessages: messages,
        });

        const response = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
            input: [
              { role: "system", content: system },
              { role: "user", content: user },
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
          }),
        });

        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error?.message ?? "OpenAI request failed.");
        }

        const outputText =
          json.output_text ??
          json.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content ?? []).find((item: { text?: string }) => item.text)
            ?.text;

        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(outputText ?? JSON.stringify({ reply: "Wie bitte?", feedback: "Try again in German.", correction: "", missionComplete: false }));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Local chat failed." }));
      }
    });
      },
    },
  ],
});
