export const runtime = "nodejs";
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a literary short-story writer. Produce a 4-page micro-story from the user's prompt.

Pages 1-3: narrative arc — setup, development, turning point. Each page has 3-5 short, evocative, standalone sentences.
Page 4: a brief moral or reflection — 2-3 sentences distilling the meaning of the story.

For every page, also write a vivid, concrete image prompt describing the scene visually: subject, setting, mood, composition. Under 25 words. The image will be rendered as a comic panel.

Return ONLY a single JSON object — no commentary, no code fences, no preamble. Schema:
{"title":"string","pages":[
  {"sentences":["...","..."],"imagePrompt":"..."},
  {"sentences":["...","..."],"imagePrompt":"..."},
  {"sentences":["...","..."],"imagePrompt":"..."},
  {"sentences":["...","..."],"imagePrompt":"...","isMoral":true}
]}`;

function extractJson(text) {
  if (!text) return null;
  let s = String(text).trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return s.slice(start, end + 1);
}

function validate(parsed) {
  return (
    parsed &&
    Array.isArray(parsed.pages) &&
    parsed.pages.length === 4 &&
    parsed.pages.every(
      (p) =>
        Array.isArray(p.sentences) &&
        p.sentences.length > 0 &&
        typeof p.imagePrompt === "string",
    )
  );
}

export async function POST(req) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENROUTER_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let prompt;
  try {
    ({ prompt } = await req.json());
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    return Response.json({ error: "Prompt is required." }, { status: 400 });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return Response.json(
      { error: `OpenRouter (${res.status}): ${text.slice(0, 300)}` },
      { status: 502 },
    );
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "";
  const json = extractJson(content);
  if (!json) {
    return Response.json(
      { error: "Story generation returned non-JSON." },
      { status: 502 },
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    return Response.json(
      { error: "Story generation returned invalid JSON." },
      { status: 502 },
    );
  }

  if (!validate(parsed)) {
    return Response.json(
      { error: "Story did not match expected schema." },
      { status: 502 },
    );
  }

  return Response.json(parsed);
}
