import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  username: z.string().min(1).max(39),
  counts: z.object({ followers: z.number(), following: z.number(), mutuals: z.number(), notFollowingBack: z.number(), notMutuals: z.number() }),
  selected: z.array(z.object({ login: z.string().max(39), category: z.string().max(40) })).max(300),
});

export type Insights = { summary: string; recommendations: { login: string; reason: string }[] };

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "recommendations"],
  properties: {
    summary: { type: "string" },
    recommendations: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["login", "reason"], properties: { login: { type: "string" }, reason: { type: "string" } } },
    },
  },
};

export const summarizeConnections = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<{ ok: true; insights: Insights } | { ok: false; error: string }> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, error: "AI isn't set up yet." };
    const prompt = `GitHub user @${data.username} follow stats: ${JSON.stringify(data.counts)}.
Selected accounts (login + category):
${data.selected.map((s) => `- ${s.login} (${s.category})`).join("\n")}

Write a short, friendly 2-4 sentence summary of their follow relationships based on the stats and selection. Then recommend up to 8 of the selected accounts worth reviewing (e.g. not following back, one-sided), each with a one-sentence reason. Only use logins from the list. This is current state, not unfollow history. Never tell them to do anything automatically.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "insights", strict: true, schema } },
      }),
    });
    if (!res.ok || !res.body) {
      let msg = "The AI couldn't respond right now. Please try again later.";
      try { const j = await res.json(); msg = j?.error?.message || j?.message || msg; } catch {}
      if (res.status === 402) msg = "AI credits have run out for this app. " + msg;
      if (res.status === 429) msg = "Too many AI requests right now. Wait a minute and try again.";
      return { ok: false, error: msg };
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") text += ev.delta;
          if (ev.type === "response.refusal.delta" || ev.type === "error" || ev.type === "response.failed") return { ok: false, error: "The AI declined or failed to answer this request." };
        } catch {}
      }
    }
    try {
      const parsed = JSON.parse(text) as Insights;
      const allowed = new Set(data.selected.map((s) => s.login.toLowerCase()));
      parsed.recommendations = parsed.recommendations.filter((r) => allowed.has(r.login.toLowerCase()));
      return { ok: true, insights: parsed };
    } catch { return { ok: false, error: "The AI returned an unreadable answer. Please try again." }; }
  });
