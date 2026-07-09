# 🇪🇸 Spanish Vocab Trainer

A personal flashcard + spaced-repetition app for learning Spanish. Paste in new
words after each tutor lesson, then drill yourself (Spanish→English or
English→Spanish) until each word is mastered.

Built with Next.js 14 (App Router) + TypeScript + Tailwind, backed by Supabase
(Postgres), deployed on Vercel.

## How it works

- **Add words** (`/add`): paste the raw list from your lesson. Each line is split
  into Spanish/English on the first `-` or `:`. You review and fix an editable
  table before saving — lines with no translation are highlighted so you can fill
  them in.
- **Study** (`/study`): a fixed-size session (20 cards) of the cards due now for
  the direction you pick. Flip each card, then self-grade **Got it** / **Missed it**.
  Keyboard: `space` flips, `1` = missed, `2` = got it.
- **Spaced repetition**: simplified SM-2. Getting a card right pushes its next
  review further out; missing it resets it to tomorrow. Once a card's interval
  reaches 60 days it's marked **mastered** and drops out of normal sessions.
- Each word has two independent tracks (ES→EN and EN→ES), so mastering one
  direction doesn't master the other.

## One-time setup

### 1. Create a Supabase project
1. Go to [supabase.com](https://supabase.com), create a free project.
2. In the dashboard: **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and **Run**. This creates the
   `words` and `card_progress` tables.
3. Get your keys from **Project Settings → API**:
   - Project URL → `SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Run locally
```bash
cp .env.local.example .env.local   # then paste your two values in
npm install
npm run dev                        # http://localhost:3000
```

### 3. Deploy to Vercel
1. At [vercel.com](https://vercel.com), **Add New → Project** and import the
   `elyse16/spanish-learning` GitHub repo.
2. In the project's **Settings → Environment Variables**, add `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` (same values as `.env.local`).
3. Deploy. Every push to `main` redeploys automatically.

> The service role key is only ever used server-side (in `lib/supabase.ts` and
> the API routes) — it is never sent to the browser.

## Project layout

```
app/
  page.tsx            Dashboard (due counts, study buttons)
  add/page.tsx        Paste + parse + review + save
  study/              Flashcard session (client)
  words/page.tsx      Full word list with per-direction status
  api/
    words/            POST: bulk insert words + both direction cards
    session/          GET: cards due for a session
    review/           POST: apply SRS grade to a card
    stats/            GET: dashboard counts
lib/
  supabase.ts         Server-side Supabase client + types
  srs.ts              Simplified SM-2 scheduling
  parse.ts            Pasted-text → editable rows
supabase/schema.sql   Database schema (run once in Supabase)
scripts/verify-logic.ts  Quick offline check of parser + SRS (node scripts/verify-logic.ts)
```
