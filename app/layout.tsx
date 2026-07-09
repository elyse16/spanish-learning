import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spanish Vocab Trainer",
  description: "Flashcards and spaced-repetition testing for Spanish vocabulary",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-brand">
              🇪🇸 Vocab
            </Link>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/add" className="text-sm text-slate-600 hover:text-slate-900">
              Add words
            </Link>
            <Link href="/words" className="text-sm text-slate-600 hover:text-slate-900">
              All words
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
