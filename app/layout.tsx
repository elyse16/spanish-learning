import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
});
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "¡Vocab! — Spanish Trainer",
  description: "Flashcards and spaced-repetition testing for Spanish vocabulary",
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-sm font-bold text-ink/70 transition hover:bg-white hover:text-ink"
    >
      {children}
    </Link>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body>
        <header className="sticky top-0 z-10 border-b-2 border-ink/5 bg-white/70 backdrop-blur">
          <nav className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-3">
            <Link
              href="/"
              className="mr-2 font-display text-xl font-700 text-tang"
              style={{ fontWeight: 700 }}
            >
              🌶️ ¡Vocab!
            </Link>
            <NavLink href="/">Dashboard</NavLink>
            <NavLink href="/add">Add words</NavLink>
            <NavLink href="/words">All words</NavLink>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
