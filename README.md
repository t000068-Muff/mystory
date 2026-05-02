# Bedtime stories

A minimalist, theme-able AI bedtime-story app. Type a prompt, get back a four-page illustrated short story — narrated aloud word-by-word, with the picture taking up the whole stage and the words scrolling gently underneath.

Live: <https://mystory-rosy.vercel.app>

## Features

- **Four-page micro-stories** — three pages of narrative, one page of moral. Stories are written in simple English aimed at ages 5–9.
- **Theatre-mode dreamy illustrations** — one image per page, taking ~⅔ of the screen, rendered in a soft children's-storybook watercolor style and faded into the background at the edges.
- **Two reading modes (toggle next to *Generate*)**
  - **Manual** — press <kbd>Space</kbd> to reveal each sentence, one at a time.
  - **Auto** — speaks every sentence on its own and turns the pages for you.
- **Word-by-word speech highlight** — each word lights up in the theme's accent color as it's spoken, driven by `SpeechSynthesisUtterance.onboundary`. Speech rate is slowed to `0.7` for kids.
- **Scrolling sentence window** — the active sentence is centered; older lines drift up and dissolve through a soft top/bottom mask.
- **Five subtle child-friendly themes** — Moonlit, Lavender, Glade, Ember, Rose. Each one swaps the background palette, the highlight color, and the lighting style fed to the image model.
- **Save / saved stories** — Save button appears next to *New story* once a story is generated; saving snapshots the story together with all of its illustrations. The burger menu (top-left) lists every saved story with always-visible ✕ delete buttons.
- **Compressed offline storage** — saved images are downsized to 768 px JPEG (~14× smaller) and persisted to **IndexedDB**, not localStorage. Roughly 50+ stories fit comfortably; reopening a saved story serves images directly from disk with no API call.
- **Mode + theme persisted** in `localStorage` (just the keys, not story data). Saves migrated automatically from any old localStorage payloads.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- React 19
- Tailwind CSS v4
- [OpenRouter](https://openrouter.ai) for both LLM and image generation
  - Story: `openai/gpt-4o-mini` (response_format: json_object)
  - Image: `google/gemini-2.5-flash-image` with `modalities: ["image", "text"]`
- Browser **Web Speech API** for narration
- **IndexedDB** for saved-story storage; canvas/JPEG for image compression on save

## Getting started

```bash
npm install
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env.local
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

| Name | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Required. OpenRouter key used for both text and image generation. |

## Deployment

This is a standard Next.js project; deploy to Vercel directly from GitHub.

1. Import the repo at <https://vercel.com/new>.
2. Add `OPENROUTER_API_KEY` to the project's environment variables (Production).
3. Deploy.

The image route uses `maxDuration = 60`. On Vercel **Hobby** the actual cap is 10s, which is usually enough but not guaranteed for image gen — Pro is recommended if you generate often.

## Project layout

```
app/
  api/
    story/route.js   # POST { prompt } -> { title, pages: [{ sentences, imagePrompt, isMoral }] }
    image/route.js   # POST { prompt, themeStyle } -> { imageUrl: data:image/... }
  globals.css        # Tailwind import + pop-up keyframe + radial edge-fade mask
  layout.js          # Root layout, Inter font
  page.js            # All UI: input, viewer, burger menu, themes, speech, IndexedDB
```

## How a story is generated

1. **Story API** asks `openai/gpt-4o-mini` with a system prompt that:
   - Targets reading age 5–9 with very simple English.
   - Demands strict JSON with 4 pages, the last marked `isMoral: true`.
   - Asks for a 25-word neutral image prompt per page (color/lighting come from the active theme, server-side).
2. **Image API** combines the page's image prompt with the base storybook style and the theme's lighting hint, then calls `google/gemini-2.5-flash-image`. The full image data URL is returned.
3. The client fires all four image requests in parallel as soon as the story arrives, so the text is readable immediately and pictures fill in.
4. When the user presses *Save*, each image is run through a canvas resizer (max 768 px, JPEG quality 0.82) and the whole entry is persisted to IndexedDB. Subsequent image loads update the saved entry in place.

## Acknowledgements

Built collaboratively with [Claude Code](https://claude.com/claude-code).
