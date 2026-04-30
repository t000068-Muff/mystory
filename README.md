# Bedtime stories

A minimalist, dark-themed AI bedtime-story generator. Type a prompt, get back a four-page illustrated short story you reveal one sentence at a time with the spacebar — narrated aloud as it appears.

## Features

- **Four-page micro-stories** — three pages of narrative, one page of moral.
- **Comic-style illustrations** — one contextual image per page.
- **Spacebar reveal** — each press surfaces one sentence, with a soft pop-up animation; once a page is full, the next press scrolls to the next page.
- **Slow text-to-speech** — every revealed sentence is read aloud via the browser's `speechSynthesis` (`rate = 0.85`).
- **Auto-save** — stories are saved to `localStorage` keyed by the user's prompt.
- **Saved stories panel** — burger menu (top-left) lists every saved story; click to reload, ✕ to delete.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- React 19
- Tailwind CSS v4
- [OpenRouter](https://openrouter.ai) for both LLM and image generation
  - Text: `openai/gpt-4o-mini`
  - Images: `google/gemini-2.5-flash-image`

## Getting started

```bash
npm install
echo "OPENROUTER_API_KEY=sk-or-v1-..." > .env.local
npm run dev
```

Then open <http://localhost:3000>.

## Environment variables

| Name | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Required. OpenRouter key used for both text and image generation. |

## Deployment

The app is a standard Next.js project and deploys to Vercel without changes. Set `OPENROUTER_API_KEY` in the Vercel project settings before the first deploy. The image route uses `maxDuration = 60`, so a Pro plan is recommended if you expect long image generations.

## Project layout

```
app/
  api/
    story/route.js   # POST: prompt -> { title, pages: [{ sentences, imagePrompt, isMoral }] }
    image/route.js   # POST: imagePrompt -> { imageUrl: data:image/... }
  globals.css        # tailwind import + pop-up animation + edge-fade mask
  layout.js          # root layout, Inter font
  page.js            # the entire UI: input, viewer, burger menu, speech, persistence
```
