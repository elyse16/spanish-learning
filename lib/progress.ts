import type { CardProgress } from "./supabase";

// A word moves through three learning stages. Because each word has two
// direction cards (es->en and en->es), a word's overall stage is its
// *least-advanced* direction — so "Mastered" means you've truly nailed both
// directions, not just one.

export type Stage = "new" | "learning" | "mastered";

export const STAGE_ORDER: Record<Stage, number> = {
  new: 0,
  learning: 1,
  mastered: 2,
};

type CardLike = Pick<CardProgress, "mastered" | "interval_days" | "repetitions">;

export function cardStage(c: CardLike): Stage {
  if (c.mastered) return "mastered";
  if (c.interval_days > 0 || c.repetitions > 0) return "learning";
  return "new";
}

export function wordStage(cards: CardLike[]): Stage {
  if (cards.length === 0) return "new";
  return cards
    .map(cardStage)
    .reduce((a, b) => (STAGE_ORDER[a] <= STAGE_ORDER[b] ? a : b));
}

export interface ProgressCounts {
  new: number;
  learning: number;
  mastered: number;
  total: number;
}

/** Bucket words by stage from a flat list of card_progress rows. */
export function bucketByStage(
  cards: (CardLike & { word_id: string })[]
): ProgressCounts {
  const byWord = new Map<string, CardLike[]>();
  for (const c of cards) {
    const list = byWord.get(c.word_id) ?? [];
    list.push(c);
    byWord.set(c.word_id, list);
  }

  const counts: ProgressCounts = { new: 0, learning: 0, mastered: 0, total: 0 };
  for (const list of byWord.values()) {
    counts[wordStage(list)] += 1;
    counts.total += 1;
  }
  return counts;
}
