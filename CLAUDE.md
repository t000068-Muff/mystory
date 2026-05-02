@AGENTS.md

# Bedtime stories

Theme-able Next.js app that generates a 4-page illustrated children's story from a prompt and narrates it word-by-word — manually (one sentence per spacebar press) or automatically (auto-advances through every page).

## Architecture

Single-page React app (`app/page.js`) backed by two API routes:

- `app/api/story/route.js` — POST `{ prompt }` → `{ title, pages: [{ sentences, imagePrompt, isMoral }] }`. Calls OpenRouter `openai/gpt-4o-mini` with `response_format: json_object`, an extractor that strips code fences and stray prose, and a schema check before returning.
- `app/api/image/route.js` — POST `{ prompt, themeStyle }` → `{ imageUrl }` (data URL). Calls OpenRouter `google/gemini-2.5-flash-image` with `modalities: ["image", "text"]`. The dreamy-storybook base style + the active theme's `imageStyle` are appended server-side.

Image fetches are issued **in parallel** from the client; the four images stream in independently while the user is already reading the first page.

## State & persistence

`app/page.js` owns all client state. Only three keys hit `localStorage` — everything else lives in IndexedDB.

| Key | Storage | Holds |
| --- | --- | --- |
| `mystory.theme` | localStorage | active theme key |
| `mystory.mode` | localStorage | reading mode (`manual` \| `auto`) |
| `mystory` (DB) → `stories` store | IndexedDB | saved stories with compressed images |

Saved stories store images as base64 JPEG (max 768 px, quality 0.82) — about 14× smaller than the raw model PNGs. There's a one-time migration that reads any pre-existing `localStorage.mystory.saved` payload, copies it into IndexedDB, and clears the legacy key.

## Themes

`THEMES` in `app/page.js` is the source of truth: `bg`, `fg`, `muted`, `swatch`, `imageStyle`. The current theme drives:
- Page palette (inline body styles set in a `useEffect`).
- Word-highlight color during narration (`accentColor` = `theme.swatch`).
- The per-image style suffix sent to the image route.

## Reading modes

Toggle radio next to the *Generate* button on the input screen. Persisted in `localStorage`.

- **Manual** — `keydown` for Space reveals one sentence at a time; the speak `useEffect` triggers narration of each newly-revealed sentence.
- **Auto** — when a story loads with mode `auto`, an effect kicks the first sentence. Each utterance's `onend` advances state (next sentence, or next page + first sentence) until the last sentence on page 4 finishes.

`modeRef` mirrors `readingMode` so the `onend` handler stays in sync without re-binding.

## Word-by-word highlight

`SpeechSynthesisUtterance.onboundary` fires per word with a `charIndex`. State is `(speakingPageIdx, speakingSentenceIdx, speakingCharIdx)`. `SentenceStack` tokenizes the active sentence and shifts the active token's color + adds a soft `text-shadow` glow. Other tokens stay at the theme's `fg`.

## Sentence layout

`SentenceStack` is a fixed-height masked window. The current sentence is always centered vertically. Translation is computed and **written to the DOM directly** in `useLayoutEffect` (not via React state) — avoids a stale-state class of bugs that bit us when navigating between stories.

## Conventions

- One file for the whole UI (`app/page.js`). Don't extract components unless they truly repeat — the file is intentionally flat for readability.
- The keydown listener is bound once on mount and reads from `stateRef.current` — keep it that way to avoid re-binding storms.
- Pages of a story are always exactly 4. The fourth has `isMoral: true` and renders with italic styling and a "— MORAL —" label above the SentenceStack.
- `OPENROUTER_API_KEY` is read server-side only. Never expose it to the client.
- Auto-update of the saved entry: after Save, a `useEffect` keyed on `(savedId, story)` patches in any newly-arrived images (already compressed) without re-compressing the ones already saved.

## Common gotchas

- **Next.js 16 is breaking-change territory.** Read `node_modules/next/dist/docs/` before assuming pre-15 behavior.
- `response_format: { type: "json_object" }` requires the system prompt to mention "JSON". The story system prompt does.
- The browser blocks some cross-origin image responses with `ERR_BLOCKED_BY_ORB` — we previously hit this with Pollinations. The current OpenRouter route returns base64 data URLs, which don't trip ORB.
- `speechSynthesis.cancel()` is called before every new utterance to interrupt the prior sentence cleanly. `cancelSpeech()` is the React-friendly version that also resets the speak-state triplet.
- The scroll container has `snap-y snap-mandatory`. After loading a saved story or resetting, the container's `scrollTop` must be reset (see the `useEffect` keyed on `story`).
- IndexedDB transactions auto-commit on tick; if you await between opening and using one, it can close. The helpers (`dbGet`, `dbPut`, etc.) each open a fresh DB connection per call to sidestep this.

## Running

```bash
npm install
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env.local
npm run dev   # localhost:3000
npm run build # production build sanity check
```
