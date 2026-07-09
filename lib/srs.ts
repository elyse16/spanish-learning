import type { CardProgress } from "./supabase";

// Simplified SM-2 spaced repetition, self-graded with two outcomes.
// "Got it" schedules the card further out; "Missed it" resets it to tomorrow.

export const MASTERED_INTERVAL_DAYS = 60;

export interface SrsUpdate {
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  due_at: string; // ISO timestamp
  last_reviewed_at: string; // ISO timestamp
  mastered: boolean;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Compute the next SRS state for a card given whether the user got it right.
 * `now` is injectable so the logic is deterministic and testable.
 */
export function nextState(
  card: Pick<CardProgress, "interval_days" | "ease_factor" | "repetitions">,
  gotIt: boolean,
  now: Date = new Date()
): SrsUpdate {
  let { interval_days, ease_factor, repetitions } = card;

  if (!gotIt) {
    repetitions = 0;
    interval_days = 1;
    ease_factor = Math.max(1.3, ease_factor - 0.2);
  } else {
    repetitions += 1;
    if (interval_days <= 0) {
      // First correct answer on a brand-new card.
      interval_days = 1;
    } else {
      interval_days = Math.max(1, Math.round(interval_days * ease_factor));
    }
    ease_factor = Math.min(3.0, ease_factor + 0.1);
  }

  const due = addDays(now, interval_days);

  return {
    interval_days,
    ease_factor,
    repetitions,
    due_at: due.toISOString(),
    last_reviewed_at: now.toISOString(),
    mastered: interval_days >= MASTERED_INTERVAL_DAYS,
  };
}
