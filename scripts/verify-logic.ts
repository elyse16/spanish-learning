import { parseVocab } from "../lib/parse.ts";
import { nextState } from "../lib/srs.ts";

const sample = `el/la prometido/a- the fiance
el programador
ingeniero de software
el gato- the cat


delgado- thin /skinny`;

console.log("=== parseVocab ===");
const rows = parseVocab(sample);
for (const r of rows) {
  console.log(JSON.stringify(r));
}
console.log(`rows: ${rows.length} (expected 5, blank lines skipped)`);

console.log("\n=== nextState (SRS) ===");
const now = new Date("2026-07-08T12:00:00Z");
const fresh = { interval_days: 0, ease_factor: 2.5, repetitions: 0 };
const got1 = nextState(fresh, true, now);
console.log("new + got it:", got1.interval_days, "day →", got1.due_at, "mastered:", got1.mastered);
const got2 = nextState({ interval_days: got1.interval_days, ease_factor: got1.ease_factor, repetitions: got1.repetitions }, true, now);
console.log("again + got it:", got2.interval_days, "days →", got2.due_at);
const missed = nextState({ interval_days: 30, ease_factor: 2.5, repetitions: 5 }, false, now);
console.log("missed (was 30d):", missed.interval_days, "day, ease", missed.ease_factor.toFixed(2), "→ due", missed.due_at);
const bigWin = nextState({ interval_days: 40, ease_factor: 2.5, repetitions: 6 }, true, now);
console.log("40d + got it:", bigWin.interval_days, "days, mastered:", bigWin.mastered, "(>=60 → mastered)");
