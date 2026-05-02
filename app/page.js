"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";

function SentenceStack({
  sentences,
  visibleCount,
  isMoral,
  color,
  accentColor,
  speakingSentenceIdx,
  speakingCharIdx,
}) {
  const stackRef = useRef(null);

  useLayoutEffect(() => {
    if (!stackRef.current) return;
    if (visibleCount === 0) {
      stackRef.current.style.transform = "translate3d(0, 0, 0)";
      return;
    }
    const children = stackRef.current.querySelectorAll("[data-sentence]");
    const target = children[visibleCount - 1];
    if (!target) return;
    const off = -(target.offsetTop + target.offsetHeight / 2);
    stackRef.current.style.transform = `translate3d(0, ${off}px, 0)`;
  });

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: "26vh",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
      }}
    >
      <div
        ref={stackRef}
        className="absolute left-0 right-0 top-1/2 px-6"
        style={{
          transition: "transform 0.85s cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        {sentences.slice(0, visibleCount).map((s, j) => {
          const isSpeaking = j === speakingSentenceIdx;
          return (
            <p
              key={j}
              data-sentence
              className={`my-7 text-center font-extralight leading-snug ${
                isMoral
                  ? "text-2xl italic sm:text-3xl"
                  : "text-2xl sm:text-3xl md:text-[2.25rem]"
              }`}
              style={{ color }}
            >
              {isSpeaking
                ? tokenizeForReading(s).map((tok, k) => {
                    const active =
                      tok.isWord &&
                      speakingCharIdx >= tok.start &&
                      speakingCharIdx < tok.end;
                    return (
                      <span
                        key={k}
                        style={{
                          color: active ? accentColor : "inherit",
                          transition:
                            "color 0.15s ease, text-shadow 0.15s ease",
                          textShadow: active
                            ? `0 0 18px ${accentColor}66`
                            : "none",
                        }}
                      >
                        {tok.text}
                      </span>
                    );
                  })
                : s}
            </p>
          );
        })}
      </div>
    </div>
  );
}

const STORAGE_KEY = "mystory.saved";
const THEME_KEY = "mystory.theme";
const MODE_KEY = "mystory.mode";
const DB_NAME = "mystory";
const DB_VERSION = 1;
const STORE = "stories";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGetAll() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const list = req.result || [];
      list.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(entry) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function dbDelete(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function compressImage(dataUrl, maxSize = 768, quality = 0.82) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof window === "undefined") {
      resolve(dataUrl || null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const THEMES = {
  moonlit: {
    label: "Moonlit",
    bg: "#0d1429",
    fg: "#e3eafa",
    muted: "#7d8dac",
    swatch: "#a3b3d9",
    imageStyle:
      "soft moonlight, silvery blue tones, gentle nighttime glow, hush of midnight",
  },
  lavender: {
    label: "Lavender",
    bg: "#1c1429",
    fg: "#ece2f7",
    muted: "#8b7da6",
    swatch: "#c3a8e0",
    imageStyle:
      "lavender twilight, soft purple haze, magical dusk, gentle violet light",
  },
  glade: {
    label: "Glade",
    bg: "#0c1a18",
    fg: "#dceae4",
    muted: "#75948a",
    swatch: "#9ec9b8",
    imageStyle:
      "mossy forest glade, soft greens, dappled golden sunlight through leaves",
  },
  ember: {
    label: "Ember",
    bg: "#1c130d",
    fg: "#f3e6d6",
    muted: "#a08770",
    swatch: "#d6ad7a",
    imageStyle:
      "warm firelight, golden amber glow, cozy storybook hearth, honeyed lighting",
  },
  rose: {
    label: "Rose",
    bg: "#1f1018",
    fg: "#f3dfe7",
    muted: "#a87d8e",
    swatch: "#d99ab0",
    imageStyle:
      "rose-petal twilight, soft pink hues, dreamy tender light, blush pastel",
  },
};
const DEFAULT_THEME = "moonlit";

async function migrateLegacyLocalStorage() {
  if (typeof window === "undefined") return 0;
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return 0;
  }
  if (!raw) return 0;
  let items;
  try {
    items = JSON.parse(raw);
  } catch {
    return 0;
  }
  if (!Array.isArray(items) || items.length === 0) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    return 0;
  }
  let migrated = 0;
  for (const item of items) {
    try {
      await dbPut(item);
      migrated++;
    } catch {}
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return migrated;
}

async function compressStoryImages(story) {
  const pages = await Promise.all(
    story.pages.map(async (p) => ({
      sentences: p.sentences,
      imagePrompt: p.imagePrompt,
      isMoral: !!p.isMoral,
      imageUrl: p.imageUrl ? await compressImage(p.imageUrl) : null,
    })),
  );
  return { title: story.title, pages };
}

function tokenizeForReading(text) {
  const tokens = [];
  let cursor = 0;
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > cursor) {
      tokens.push({
        text: text.slice(cursor, m.index),
        start: cursor,
        end: m.index,
        isWord: false,
      });
    }
    tokens.push({
      text: m[0],
      start: m.index,
      end: m.index + m[0].length,
      isWord: true,
    });
    cursor = m.index + m[0].length;
  }
  if (cursor < text.length) {
    tokens.push({
      text: text.slice(cursor),
      start: cursor,
      end: text.length,
      isWord: false,
    });
  }
  return tokens;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageIdx, setPageIdx] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedList, setSavedList] = useState([]);
  const [themeKey, setThemeKey] = useState(DEFAULT_THEME);
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [savePrompt, setSavePrompt] = useState("");
  const [saveError, setSaveError] = useState("");
  const [speakingPageIdx, setSpeakingPageIdx] = useState(-1);
  const [speakingSentenceIdx, setSpeakingSentenceIdx] = useState(-1);
  const [speakingCharIdx, setSpeakingCharIdx] = useState(-1);
  const [readingMode, setReadingMode] = useState("manual");
  const modeRef = useRef("manual");
  modeRef.current = readingMode;

  const cancelSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingPageIdx(-1);
    setSpeakingSentenceIdx(-1);
    setSpeakingCharIdx(-1);
  }, []);
  const pageRefs = useRef([]);
  const scrollRef = useRef(null);
  const theme = THEMES[themeKey] || THEMES[DEFAULT_THEME];
  const stateRef = useRef({ pageIdx: 0, revealed: 0, story: null });
  stateRef.current = { pageIdx, revealed, story };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await migrateLegacyLocalStorage();
        const list = await dbGetAll();
        if (!cancelled) setSavedList(list);
      } catch {}
    })();
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved && THEMES[saved]) setThemeKey(saved);
      const mode = localStorage.getItem(MODE_KEY);
      if (mode === "auto" || mode === "manual") setReadingMode(mode);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(MODE_KEY, readingMode);
    }
  }, [readingMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_KEY, themeKey);
    }
    if (typeof document !== "undefined") {
      const t = THEMES[themeKey] || THEMES[DEFAULT_THEME];
      document.body.style.background = t.bg;
      document.body.style.color = t.fg;
    }
  }, [themeKey]);

  useEffect(() => {
    if (!story || revealed === 0) return;
    const sentence = story.pages[pageIdx]?.sentences?.[revealed - 1];
    if (
      !sentence ||
      typeof window === "undefined" ||
      !window.speechSynthesis
    ) {
      return;
    }
    window.speechSynthesis.cancel();
    setSpeakingPageIdx(pageIdx);
    setSpeakingSentenceIdx(revealed - 1);
    setSpeakingCharIdx(0);

    const u = new SpeechSynthesisUtterance(sentence);
    u.rate = 0.7;
    u.pitch = 1.0;
    u.volume = 1.0;
    u.onboundary = (e) => {
      if (e.name === "word" || e.name === "sentence") {
        setSpeakingCharIdx(e.charIndex);
      }
    };
    const finish = (didError) => {
      setSpeakingCharIdx(-1);
      setSpeakingSentenceIdx(-1);
      setSpeakingPageIdx(-1);
      if (didError || modeRef.current !== "auto") return;
      const { story: s, pageIdx: p, revealed: r } = stateRef.current;
      if (!s) return;
      const page = s.pages[p];
      setTimeout(() => {
        if (modeRef.current !== "auto") return;
        const cur = stateRef.current;
        if (!cur.story) return;
        if (r < page.sentences.length) {
          setRevealed((x) => Math.min(x + 1, page.sentences.length));
        } else if (p < s.pages.length - 1) {
          const next = p + 1;
          setPageIdx(next);
          setRevealed(1);
          pageRefs.current[next]?.scrollIntoView({ behavior: "smooth" });
        }
      }, 350);
    };
    u.onend = () => finish(false);
    u.onerror = () => finish(true);
    window.speechSynthesis.speak(u);
  }, [revealed, pageIdx, story]);

  useEffect(() => {
    if (!story || !scrollRef.current) return;
    scrollRef.current.scrollTo({ top: 0, behavior: "auto" });
  }, [story]);

  useEffect(() => {
    if (!story || readingMode !== "auto" || pageIdx !== 0 || revealed !== 0) {
      return;
    }
    const t = setTimeout(() => {
      setRevealed((r) => (r === 0 ? 1 : r));
    }, 600);
    return () => clearTimeout(t);
  }, [story, readingMode, pageIdx, revealed]);

  const fetchImagesFor = useCallback((pages, themeStyle) => {
    pages.forEach((page, i) => {
      if (page.imageUrl) return;
      fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: page.imagePrompt, themeStyle }),
      })
        .then((r) => r.json())
        .then(({ imageUrl }) => {
          setStory((s) => {
            if (!s) return s;
            const ps = [...s.pages];
            ps[i] = {
              ...ps[i],
              imageUrl: imageUrl || null,
              imageLoading: false,
              imageFailed: !imageUrl,
            };
            return { ...s, pages: ps };
          });
        })
        .catch(() => {
          setStory((s) => {
            if (!s) return s;
            const ps = [...s.pages];
            ps[i] = { ...ps[i], imageLoading: false, imageFailed: true };
            return { ...s, pages: ps };
          });
        });
    });
  }, []);

  const generate = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    cancelSpeech();
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
      setSavePrompt(prompt);
      setIsSaved(false);
      setSavedId(null);
      setSaveError("");
      setLoading(false);
      fetchImagesFor(data.pages, theme.imageStyle);
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  }, [prompt, loading, fetchImagesFor, theme.imageStyle]);

  const openSaved = useCallback(
    (entry) => {
      cancelSpeech();
      setMenuOpen(false);
      setError("");
      setSaveError("");
      setPageIdx(0);
      setRevealed(0);
      setIsSaved(true);
      setSavedId(entry.id);
      setSavePrompt(entry.title);
      const initial = {
        title: entry.story.title,
        pages: entry.story.pages.map((p) => ({
          ...p,
          imageUrl: p.imageUrl || null,
          imageLoading: !p.imageUrl,
          imageFailed: false,
        })),
      };
      setStory(initial);
      const needsFetch = entry.story.pages.some((p) => !p.imageUrl);
      if (needsFetch) {
        fetchImagesFor(entry.story.pages, theme.imageStyle);
      }
    },
    [fetchImagesFor, theme.imageStyle],
  );

  const saveCurrent = useCallback(async () => {
    if (!story || isSaved) return;
    const title = (savePrompt || story.title || "Untitled").trim();
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      const compressed = await compressStoryImages(story);
      const entry = {
        id,
        title,
        savedAt: new Date().toISOString(),
        story: compressed,
      };
      await dbPut(entry);
      const list = await dbGetAll();
      setSavedList(list);
      setSavedId(id);
      setIsSaved(true);
      setSaveError("");
    } catch (e) {
      setSaveError(`Couldn't save: ${e?.message || "unknown error"}`);
    }
  }, [story, isSaved, savePrompt]);

  useEffect(() => {
    if (!savedId || !story) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await dbGet(savedId);
        if (!existing || cancelled) return;
        const updates = [];
        for (let i = 0; i < story.pages.length; i++) {
          const cur = story.pages[i];
          const saved = existing.story.pages[i];
          if (saved?.imageUrl) continue;
          if (!cur?.imageUrl) continue;
          const compressed = await compressImage(cur.imageUrl);
          if (cancelled) return;
          updates.push({ idx: i, imageUrl: compressed });
        }
        if (updates.length === 0) return;
        const updatedPages = existing.story.pages.map((p, i) => {
          const u = updates.find((x) => x.idx === i);
          return u ? { ...p, imageUrl: u.imageUrl } : p;
        });
        const updated = {
          ...existing,
          story: { ...existing.story, pages: updatedPages },
        };
        await dbPut(updated);
        if (cancelled) return;
        const list = await dbGetAll();
        if (!cancelled) setSavedList(list);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [savedId, story]);

  const deleteSaved = useCallback(
    async (id) => {
      try {
        await dbDelete(id);
        const list = await dbGetAll();
        setSavedList(list);
        if (savedId === id) {
          setSavedId(null);
          setIsSaved(false);
        }
      } catch {}
    },
    [savedId],
  );

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
        cancelSpeech();
        pageRefs.current[next]?.scrollIntoView({ behavior: "smooth" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function reset() {
    cancelSpeech();
    setStory(null);
    setPrompt("");
    setPageIdx(0);
    setRevealed(0);
    setError("");
    setIsSaved(false);
    setSavedId(null);
    setSavePrompt("");
    setSaveError("");
  }

  const burgerAndMenu = (
    <>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Menu"
        className="fixed top-6 left-6 z-30 flex h-10 w-10 items-center justify-center rounded-md transition-colors"
        style={{ color: theme.muted }}
      >
        <span className="flex flex-col gap-[5px]">
          <span className="block h-px w-5 bg-current" />
          <span className="block h-px w-5 bg-current" />
          <span className="block h-px w-5 bg-current" />
        </span>
      </button>

      {menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm animate-fade-in"
          />
          <aside
            className="fixed top-0 left-0 z-30 flex h-screen w-80 flex-col border-r px-6 py-8 shadow-2xl"
            style={{
              background: theme.bg,
              color: theme.fg,
              borderColor: `${theme.muted}33`,
            }}
          >
            <div className="mb-8 flex items-center justify-between">
              <h2
                className="text-xs font-medium uppercase tracking-[0.3em]"
                style={{ color: theme.muted }}
              >
                Saved stories
              </h2>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
                style={{ color: theme.muted }}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto -mx-2">
              {savedList.length === 0 ? (
                <p className="px-2 text-sm text-neutral-600">
                  No stories saved yet. Stories are saved automatically when
                  you generate them.
                </p>
              ) : (
                <ul className="space-y-1">
                  {savedList.map((entry) => (
                    <li
                      key={entry.id}
                      className="group flex items-start justify-between gap-2 rounded-md px-2 py-3 hover:bg-neutral-900"
                    >
                      <button
                        onClick={() => openSaved(entry)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm font-light text-neutral-100 line-clamp-2">
                          {entry.title}
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-600">
                          {new Date(entry.savedAt).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => deleteSaved(entry.id)}
                        aria-label="Delete"
                        title="Delete"
                        className="shrink-0 self-center rounded p-1.5 text-sm transition-colors"
                        style={{ color: theme.muted }}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 border-t border-neutral-900 pt-6">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-neutral-500">
                Theme
              </h3>
              <div className="flex flex-wrap gap-3">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => setThemeKey(key)}
                    title={t.label}
                    aria-label={t.label}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={`block h-7 w-7 rounded-full transition-transform group-hover:scale-110 ${
                        themeKey === key
                          ? "ring-2 ring-offset-2 ring-offset-neutral-950"
                          : ""
                      }`}
                      style={{
                        background: t.swatch,
                        boxShadow: `0 0 12px ${t.swatch}55`,
                        ...(themeKey === key
                          ? { ringColor: t.swatch }
                          : {}),
                      }}
                    />
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500 group-hover:text-neutral-300">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        {burgerAndMenu}
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
        {burgerAndMenu}
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
            className="mt-10 w-full resize-none rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-base font-light text-neutral-100 placeholder:text-neutral-600 outline-none transition-colors focus:border-neutral-600"
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <div
              className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/40 p-1 text-xs"
              role="radiogroup"
              aria-label="Reading mode"
            >
              <button
                type="button"
                role="radio"
                aria-checked={readingMode === "manual"}
                onClick={() => setReadingMode("manual")}
                className={`rounded px-3 py-1 transition-colors ${
                  readingMode === "manual"
                    ? "bg-neutral-100 text-neutral-950"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
                title="Reveal one sentence per spacebar press"
              >
                Manual
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={readingMode === "auto"}
                onClick={() => setReadingMode("auto")}
                className={`rounded px-3 py-1 transition-colors ${
                  readingMode === "auto"
                    ? "bg-neutral-100 text-neutral-950"
                    : "text-neutral-400 hover:text-neutral-100"
                }`}
                title="Read continuously through every page"
              >
                Auto
              </button>
            </div>
            <button
              onClick={generate}
              disabled={!prompt.trim()}
              className="rounded-lg bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Generate
            </button>
          </div>
          <div className="mt-2 text-[11px] text-neutral-600">
            {readingMode === "auto"
              ? "Auto: reads every sentence on its own and turns the pages for you."
              : "Manual: press space to reveal each sentence."}
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
    <div
      ref={scrollRef}
      className="h-screen snap-y snap-mandatory overflow-y-auto"
    >
      {burgerAndMenu}
      {story.pages.map((page, i) => {
        const visibleCount =
          i < pageIdx ? page.sentences.length : i === pageIdx ? revealed : 0;
        return (
          <section
            key={i}
            ref={(el) => (pageRefs.current[i] = el)}
            className="relative flex h-screen snap-start flex-col items-center px-4"
          >
            <div className="flex h-full w-full max-w-5xl flex-col items-center justify-center gap-2">
              <div className="flex flex-1 items-center justify-center w-full">
                <div
                  className="relative mx-auto aspect-square"
                  style={{ height: "min(66vh, 92vw)" }}
                >
                  {page.imageUrl && (
                    <img
                      src={page.imageUrl}
                      alt=""
                      className="fade-edges h-full w-full animate-fade-in object-contain"
                    />
                  )}
                  {page.imageLoading && !page.imageUrl && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="h-8 w-8 animate-spin rounded-full border-2"
                        style={{
                          borderColor: `${theme.muted}33`,
                          borderTopColor: theme.muted,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex w-full flex-col items-center pb-12">
                {page.isMoral && (
                  <div
                    className="mb-3 text-[10px] uppercase tracking-[0.4em]"
                    style={{ color: theme.muted }}
                  >
                    — Moral —
                  </div>
                )}
                <SentenceStack
                  sentences={page.sentences}
                  visibleCount={visibleCount}
                  isMoral={page.isMoral}
                  color={theme.fg}
                  accentColor={theme.swatch}
                  speakingSentenceIdx={
                    speakingPageIdx === i ? speakingSentenceIdx : -1
                  }
                  speakingCharIdx={speakingCharIdx}
                />
              </div>
            </div>
          </section>
        );
      })}

      <div
        className="pointer-events-none fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 text-xs"
        style={{ color: theme.muted }}
      >
        <span>
          {pageIdx + 1} / {story.pages.length}
        </span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span className="flex items-center gap-1.5">
          press
          <kbd
            className="rounded border px-2 py-0.5 text-[10px] tracking-wide"
            style={{
              borderColor: `${theme.muted}55`,
              background: `${theme.fg}08`,
            }}
          >
            SPACE
          </kbd>
        </span>
      </div>

      <div className="fixed top-6 right-6 z-10 flex items-center gap-5 text-xs tracking-wide">
        {!isSaved && (
          <button
            onClick={saveCurrent}
            className="rounded-md px-3 py-1.5 transition-colors"
            style={{
              color: theme.fg,
              border: `1px solid ${theme.muted}55`,
              background: `${theme.fg}10`,
            }}
          >
            Save story
          </button>
        )}
        {isSaved && (
          <span style={{ color: theme.muted }}>✓ Saved</span>
        )}
        <button
          onClick={reset}
          className="transition-colors"
          style={{ color: theme.muted }}
        >
          ← New story
        </button>
      </div>

      {saveError && (
        <div
          className="fixed bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-lg border px-4 py-2 text-xs"
          style={{
            color: theme.fg,
            borderColor: `${theme.muted}55`,
            background: theme.bg,
          }}
        >
          {saveError}
        </div>
      )}
    </div>
  );
}
