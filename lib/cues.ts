// Context/cue practice — pure data + helpers (client-safe, no DB). The learner
// reads an English sentence whose CONTEXT (not grammar) signals a Spanish tense,
// and produces the conjugated form. The point is the places English and Spanish
// disagree — especially preterite vs imperfect, which English says the same way.
//
// Each prompt is hand-authored around a specific verb so the sentence always
// reads naturally, but the ANSWER is looked up from the verified conjugation
// catalog (not hand-typed), so forms stay correct and accent-safe.

import {
  type Person,
  type TenseId,
  CONJ_VERB_BY_KEY,
  conjugatedForm,
  TENSE_LABEL,
} from "./conjugation";

interface CueSource {
  tense: TenseId;
  person: Person;
  slug: string; // must exist as verb:<slug>:<tense> in the catalog
  text: string; // English sentence with one "___" and "{v}" for the infinitive hint
  why: string; // the signal that points at this tense
}

const CUE_SOURCES: CueSource[] = [
  // ---------- PRESENT (habitual / current) ----------
  { tense: "present", person: "yo", slug: "hablar", text: "I ___ ({v}) Spanish with my neighbors every day.", why: "habitual present — “every day”" },
  { tense: "present", person: "yo", slug: "vivir", text: "These days I ___ ({v}) in Mexico City.", why: "present — a current, ongoing state" },
  { tense: "present", person: "nosotros", slug: "comer", text: "We usually ___ ({v}) dinner around eight.", why: "habitual present — “usually”" },
  { tense: "present", person: "yo", slug: "tener", text: "I ___ ({v}) three meetings today.", why: "present — true right now" },
  { tense: "present", person: "el", slug: "hacer", text: "She ___ ({v}) yoga every morning.", why: "habitual present — “every morning”" },
  { tense: "present", person: "yo", slug: "ir", text: "Every Friday I ___ ({v}) to the market.", why: "habitual present — “every Friday”" },
  { tense: "present", person: "yo", slug: "querer", text: "I ___ ({v}) a coffee, please.", why: "present — a want right now" },
  { tense: "present", person: "tu", slug: "poder", text: "You ___ ({v}) stay as long as you like.", why: "present — true right now" },
  { tense: "present", person: "yo", slug: "dormir", text: "I ___ ({v}) eight hours most nights.", why: "habitual present — “most nights”" },
  { tense: "present", person: "yo", slug: "conocer", text: "I ___ ({v}) a great taco place nearby.", why: "present — a current state (I know it)" },
  { tense: "present", person: "yo", slug: "preferir", text: "I ___ ({v}) the morning over the night.", why: "present — a standing preference" },

  // ---------- PRETERITE (a single completed event at a set time) ----------
  { tense: "preterite", person: "yo", slug: "comer", text: "Yesterday I ___ ({v}) three tacos at lunch.", why: "preterite — one finished action, “yesterday”" },
  { tense: "preterite", person: "yo", slug: "hacer", text: "Last night I ___ ({v}) dinner for everyone.", why: "preterite — a single completed event" },
  { tense: "preterite", person: "el", slug: "ver", text: "This morning she ___ ({v}) the doctor.", why: "preterite — a one-time, finished action" },
  { tense: "preterite", person: "nosotros", slug: "ver", text: "Last weekend we ___ ({v}) a great movie.", why: "preterite — a specific, finished time" },
  { tense: "preterite", person: "yo", slug: "decir", text: "I ___ ({v}) the truth last night.", why: "preterite — a single completed moment" },
  { tense: "preterite", person: "yo", slug: "poner", text: "This morning I ___ ({v}) the keys on the table and left.", why: "preterite — completed, in sequence" },
  { tense: "preterite", person: "yo", slug: "tener", text: "Last week I ___ ({v}) a terrible cold.", why: "preterite — a finished stretch, “last week”" },
  { tense: "preterite", person: "el", slug: "venir", text: "He ___ ({v}) to the party last Saturday.", why: "preterite — a one-time past event" },
  { tense: "preterite", person: "yo", slug: "leer", text: "Last night I ___ ({v}) the whole book.", why: "preterite — a completed action" },
  { tense: "preterite", person: "nosotros", slug: "comer", text: "Last weekend we ___ ({v}) at a new restaurant.", why: "preterite — a specific, finished time" },
  { tense: "preterite", person: "yo", slug: "pedir", text: "At the restaurant yesterday I ___ ({v}) the fish.", why: "preterite — one finished action" },

  // ---------- IMPERFECT (habit / used-to / ongoing in the past) ----------
  { tense: "imperfect", person: "yo", slug: "ir", text: "When I was a kid, I ___ ({v}) to my grandma’s every summer.", why: "imperfect — a childhood habit" },
  { tense: "imperfect", person: "yo", slug: "comer", text: "As a child I ___ ({v}) a lot of candy.", why: "imperfect — a repeated past habit" },
  { tense: "imperfect", person: "el", slug: "ser", text: "When he was young, he ___ ({v}) very shy.", why: "imperfect — a lasting past state" },
  { tense: "imperfect", person: "yo", slug: "ver", text: "Every Saturday I ___ ({v}) cartoons as a kid.", why: "imperfect — a repeated past routine" },
  { tense: "imperfect", person: "nosotros", slug: "comer", text: "Back then, we ___ ({v}) together every Sunday.", why: "imperfect — “every Sunday, back then”" },
  { tense: "imperfect", person: "yo", slug: "hablar", text: "At six years old, I only ___ ({v}) English.", why: "imperfect — an ongoing past state" },
  { tense: "imperfect", person: "nosotros", slug: "ir", text: "Every summer we ___ ({v}) to the beach.", why: "imperfect — a repeated past habit" },
  { tense: "imperfect", person: "yo", slug: "ser", text: "When I was little, I ___ ({v}) afraid of the dark.", why: "imperfect — a lasting childhood state" },

  // ---------- FUTURE ----------
  { tense: "future", person: "yo", slug: "salir", text: "Tomorrow I ___ ({v}) early for work.", why: "future — “tomorrow”" },
  { tense: "future", person: "yo", slug: "hacer", text: "This weekend I ___ ({v}) a big dinner.", why: "future — hasn’t happened yet" },
  { tense: "future", person: "nosotros", slug: "tener", text: "Next year we ___ ({v}) more time to travel.", why: "future — “next year”" },
  { tense: "future", person: "ellos", slug: "venir", text: "They ___ ({v}) to visit next month.", why: "future — “next month”" },
  { tense: "future", person: "yo", slug: "poder", text: "I ___ ({v}) help you tomorrow.", why: "future — “tomorrow”" },
  { tense: "future", person: "yo", slug: "decir", text: "I ___ ({v}) you my decision soon.", why: "future — “soon”" },
  { tense: "future", person: "tu", slug: "saber", text: "You ___ ({v}) the results next week.", why: "future — “next week”" },
  { tense: "future", person: "yo", slug: "poner", text: "I ___ ({v}) the money in the bank tomorrow.", why: "future — “tomorrow”" },
  { tense: "future", person: "nosotros", slug: "salir", text: "We ___ ({v}) for the airport at dawn.", why: "future — a plan not yet done" },

  // ---------- PRESENT PERFECT (experience / “already”, no set time) ----------
  { tense: "perfect", person: "yo", slug: "comer", text: "I ___ ({v}) here many times before.", why: "present perfect — “many times before”" },
  { tense: "perfect", person: "yo", slug: "ir", text: "I ___ ({v}) to Oaxaca twice already.", why: "present perfect — “already”" },
  { tense: "perfect", person: "nosotros", slug: "ver", text: "We ___ ({v}) that movie already.", why: "present perfect — “already”" },
  { tense: "perfect", person: "yo", slug: "hacer", text: "I ___ ({v}) my homework already.", why: "present perfect — “already”" },
  { tense: "perfect", person: "yo", slug: "escribir", text: "I ___ ({v}) three emails this morning.", why: "present perfect — recent, no exact time" },
  { tense: "perfect", person: "el", slug: "volver", text: "He ___ ({v}) home already.", why: "present perfect — “already”" },
  { tense: "perfect", person: "yo", slug: "decir", text: "I ___ ({v}) that a thousand times.", why: "present perfect — life experience so far" },
  { tense: "perfect", person: "yo", slug: "romper", text: "I ___ ({v}) my phone again.", why: "present perfect — just happened, still relevant" },
  { tense: "perfect", person: "nosotros", slug: "vivir", text: "We ___ ({v}) here for two years.", why: "present perfect — started in the past, still true" },
  { tense: "perfect", person: "yo", slug: "abrir", text: "I ___ ({v}) all the windows already.", why: "present perfect — “already”" },
];

export interface CuePrompt {
  sentence: string; // English, with "___" where the answer goes and "(infinitivo)" as a hint
  infinitive: string;
  answer: string;
  tenseLabel: string;
  why: string;
  subject: string; // the English subject, e.g. "I", "we"
}

const SUBJECT: Record<Person, string> = {
  yo: "I",
  tu: "you",
  el: "he / she",
  nosotros: "we",
  ellos: "they",
};

function toPrompt(src: CueSource): CuePrompt {
  const verb = CONJ_VERB_BY_KEY.get(`verb:${src.slug}:${src.tense}`);
  if (!verb) throw new Error(`cue: missing catalog entry verb:${src.slug}:${src.tense}`);
  return {
    sentence: src.text.replace("{v}", verb.verb),
    infinitive: verb.verb,
    answer: conjugatedForm(verb, src.person),
    tenseLabel: TENSE_LABEL[src.tense],
    why: src.why,
    subject: SUBJECT[src.person],
  };
}

// A session is a random, no-repeat sample across all tenses.
export function buildCueSession(n: number): CuePrompt[] {
  const shuffled = [...CUE_SOURCES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length)).map(toPrompt);
}
