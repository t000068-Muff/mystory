export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_STYLE =
  "dreamy children's storybook illustration, soft watercolor, whimsical, gentle painterly brushwork, ethereal soft lighting, magical, as if imagined by a child";

export async function POST(req) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENROUTER_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let prompt;
  let themeStyle = "";
  try {
    const body = await req.json();
    prompt = body.prompt;
    themeStyle = typeof body.themeStyle === "string" ? body.themeStyle : "";
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (typeof prompt !== "string" || !prompt.trim()) {
    return Response.json({ error: "Prompt is required." }, { status: 400 });
  }

  const fullPrompt = [prompt, BASE_STYLE, themeStyle]
    .filter(Boolean)
    .join(". ");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: fullPrompt }],
      modalities: ["image", "text"],
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
  const imageUrl =
    data?.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  return Response.json({ imageUrl });
}
