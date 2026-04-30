import { Fredoka } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "My Story - A Fun Place for Kids!",
  description: "A simple, fun, and friendly website made just for kids.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fredoka.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-fredoka)]">
        {children}
      </body>
    </html>
  );
}
