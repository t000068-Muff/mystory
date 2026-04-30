@AGENTS.md

# Bedtime stories

Dark-themed Next.js app that generates a 4-page illustrated short story from a single prompt and reveals it sentence-by-sentence on spacebar, narrated by the Web Speech API.

## Architecture

Single-page React app (`app/page.js`) backed by two API routes:

- `app/api/story/route.js` — POST `{ prompt }` → `{ title, pages: [{ sentences, imagePrompt, isMoral }] }`. Calls OpenRouter `openai/gpt-4o-mini` with `response_format: json_object` and validates the schema before returning.
- `app/api/image/route.js` — POST `{ prompt }` → `{ imageUrl }` (data URL). Calls OpenRouter `google/gemini-2.5-flash-image` with `modalities: ["image", "text"]`. Comic-style suffix is appended server-side.

Image fetches are fired in parallel from the client after the story arrives so text appears immediately.

## Conventions

- One file for the whole UI (`app/page.js`). Don't extract components unless they truly repeat — the file is intentionally flat for readability.
- All client state lives in `app/page.js`. There's no global store.
- The keydown listener uses a `stateRef` to avoid re-binding on every render — keep it that way.
- `localStorage` key for saved stories is `mystory.saved`. Cap is `MAX_SAVED = 30`.
- `OPENROUTER_API_KEY` is read server-side only. Never expose it to the client.
- Pages of a story are always exactly 4. The fourth has `isMoral: true` and renders with italic styling and a "— MORAL —" label.

## Common gotchas

- **Next.js 16 is breaking-change territory.** Read `node_modules/next/dist/docs/` before assuming pre-15 behavior.
- The browser may block cross-origin image responses with `ERR_BLOCKED_BY_ORB` — that's why images come back from the server as data URLs, not direct upstream URLs.
- `response_format: { type: "json_object" }` requires the system prompt to mention "JSON". The story system prompt does.
- `speechSynthesis.cancel()` is called before every new utterance to interrupt the prior sentence cleanly.

## Running

```bash
npm install
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env.local
npm run dev   # localhost:3000
npm run build # production build sanity check
```
