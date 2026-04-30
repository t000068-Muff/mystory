"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageIdx, setPageIdx] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const pageRefs = useRef([]);
  const stateRef = useRef({ pageIdx: 0, revealed: 0, story: null });
  stateRef.current = { pageIdx, revealed, story };

  const generate = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setStory(null);
    setPageIdx(0);
    setRevealed(0);

    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");

      const initial = {
        ...data,
        pages: data.pages.map((p) => ({
          ...p,
          imageUrl: null,
          imageLoading: true,
          imageFailed: false,
        })),
      };
      setStory(initial);
      setLoading(false);

      data.pages.forEach((page, i) => {
        fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: page.imagePrompt }),
        })
          .then((r) => r.json())
          .then(({ imageUrl }) => {
            setStory((s) => {
              if (!s) return s;
              const pages = [...s.pages];
              pages[i] = {
                ...pages[i],
                imageUrl,
                imageLoading: false,
                imageFailed: !imageUrl,
              };
              return { ...s, pages };
            });
          })
          .catch(() => {
            setStory((s) => {
              if (!s) return s;
              const pages = [...s.pages];
              pages[i] = {
                ...pages[i],
                imageLoading: false,
                imageFailed: true,
              };
              return { ...s, pages };
            });
          });
      });
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }, [prompt, loading]);

  useEffect(() => {
    function onKey(e) {
      if (e.code !== "Space" && e.key !== " ") return;
      if (e.repeat) return;
      const tag = e.target?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      const { story: s, pageIdx: p, revealed: r } = stateRef.current;
      if (!s) return;
      e.preventDefault();
      const page = s.pages[p];
      if (r < page.sentences.length) {
        setRevealed((x) => Math.min(x + 1, page.sentences.length));
      } else if (p < s.pages.length - 1) {
        const next = p + 1;
        setPageIdx(next);
        setRevealed(0);
        pageRefs.current[next]?.scrollIntoView({ behavior: "smooth" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function reset() {
    setStory(null);
    setPrompt("");
    setPageIdx(0);
    setRevealed(0);
    setError("");
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-neutral-800 border-t-neutral-100" />
          <p className="mt-6 text-sm tracking-wide text-neutral-500">
            Composing your story…
          </p>
        </div>
      </main>
    );
  }

  if (!story) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-2xl">
          <h1 className="text-5xl font-extralight tracking-tight">
            Bedtime stories
          </h1>
          <p className="mt-3 text-sm text-neutral-500">
            Describe a story. Get four illustrated pages, revealed by the
            spacebar.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
            }}
            placeholder="A lighthouse keeper who has never seen the sea…"
            rows={5}
            className="mt-10 w-full resize-none rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-base text-neutral-100 placeholder:text-neutral-600 outline-none transition-colors focus:border-neutral-600"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-neutral-600">
              ⌘ + Enter to generate
            </span>
            <button
              onClick={generate}
              disabled={!prompt.trim()}
              className="rounded-lg bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Generate
            </button>
          </div>
          {error && (
            <div className="mt-6 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <div className="h-screen snap-y snap-mandatory overflow-y-auto">
      {story.pages.map((page, i) => {
        const visibleCount =
          i < pageIdx ? page.sentences.length : i === pageIdx ? revealed : 0;
        return (
          <section
            key={i}
            ref={(el) => (pageRefs.current[i] = el)}
            className="relative flex h-screen snap-start flex-col items-center justify-center px-6 py-12"
          >
            <div className="flex w-full max-w-3xl flex-col items-center justify-center gap-10">
              <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900 shadow-2xl">
                {page.imageUrl && (
                  <img
                    src={page.imageUrl}
                    alt=""
                    className="h-full w-full animate-fade-in object-cover"
                  />
                )}
                {page.imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-800 border-t-neutral-500" />
                  </div>
                )}
              </div>

              <div className="flex min-h-[200px] w-full flex-col items-center justify-center space-y-5 text-center">
                {page.isMoral && (
                  <div className="text-[10px] uppercase tracking-[0.4em] text-neutral-500">
                    — Moral —
                  </div>
                )}
                {page.sentences.slice(0, visibleCount).map((s, j) => (
                  <p
                    key={j}
                    className={`animate-fade-up font-light leading-snug text-neutral-100 ${
                      page.isMoral
                        ? "text-2xl italic sm:text-3xl"
                        : "text-2xl sm:text-3xl md:text-[2.5rem]"
                    }`}
                  >
                    {s}
                  </p>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <div className="pointer-events-none fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 text-xs text-neutral-500">
        <span>
          {pageIdx + 1} / {story.pages.length}
        </span>
        <span className="text-neutral-700">·</span>
        <span className="flex items-center gap-1.5">
          press
          <kbd className="rounded border border-neutral-700 bg-neutral-900/80 px-2 py-0.5 text-[10px] tracking-wide">
            SPACE
          </kbd>
        </span>
      </div>

      <button
        onClick={reset}
        className="fixed top-6 right-6 text-xs tracking-wide text-neutral-500 transition-colors hover:text-neutral-100"
      >
        ← New story
      </button>
    </div>
  );
}
