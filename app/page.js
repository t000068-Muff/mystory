"use client";

import { useState } from "react";

const friends = [
  { emoji: "🦁", name: "Leo the Lion", color: "bg-yellow-200" },
  { emoji: "🐘", name: "Ellie the Elephant", color: "bg-pink-200" },
  { emoji: "🐢", name: "Toby the Turtle", color: "bg-green-200" },
  { emoji: "🦊", name: "Felix the Fox", color: "bg-orange-200" },
  { emoji: "🐧", name: "Pip the Penguin", color: "bg-sky-200" },
  { emoji: "🦄", name: "Luna the Unicorn", color: "bg-purple-200" },
];

const colors = [
  "from-pink-300 via-yellow-200 to-sky-300",
  "from-green-300 via-blue-200 to-purple-300",
  "from-orange-300 via-pink-200 to-red-300",
  "from-sky-300 via-green-200 to-yellow-300",
];

export default function Home() {
  const [colorIndex, setColorIndex] = useState(0);
  const [clicked, setClicked] = useState(null);

  return (
    <main
      className={`flex flex-1 flex-col items-center justify-center bg-gradient-to-br ${colors[colorIndex]} px-6 py-12 transition-colors duration-700`}
    >
      <header className="text-center">
        <h1 className="text-5xl sm:text-7xl font-bold text-white drop-shadow-[3px_3px_0_rgba(0,0,0,0.2)]">
          🌈 My Story 🌟
        </h1>
        <p className="mt-4 text-xl sm:text-2xl text-white font-medium drop-shadow-md">
          A fun place for curious kids!
        </p>
      </header>

      <button
        onClick={() => setColorIndex((i) => (i + 1) % colors.length)}
        className="mt-8 rounded-full bg-white px-8 py-4 text-xl font-bold text-pink-500 shadow-lg hover:scale-110 active:scale-95 transition-transform"
      >
        🎨 Change Colors!
      </button>

      <section className="mt-12 w-full max-w-4xl">
        <h2 className="text-center text-3xl sm:text-4xl font-bold text-white drop-shadow-md mb-6">
          Meet our friends! 🐾
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {friends.map((f, i) => (
            <button
              key={f.name}
              onClick={() => setClicked(i)}
              className={`${f.color} rounded-3xl p-6 shadow-lg hover:scale-105 active:scale-95 transition-transform text-center cursor-pointer`}
            >
              <div className="text-6xl sm:text-7xl">{f.emoji}</div>
              <div className="mt-2 text-lg font-bold text-gray-800">
                {f.name}
              </div>
              {clicked === i && (
                <div className="mt-2 text-2xl">👋 Hi there!</div>
              )}
            </button>
          ))}
        </div>
      </section>

      <footer className="mt-16 text-center text-white/90 font-medium">
        Made with 💖 for awesome kids
      </footer>
    </main>
  );
}
