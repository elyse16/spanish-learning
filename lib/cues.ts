// Context/cue practice — pure data + helpers (client-safe, no DB). The learner
// reads an English sentence whose CONTEXT (not grammar) signals a Spanish tense,
// and produces the conjugated form. The point is the places English and Spanish
// disagree — especially preterite vs imperfect, which English says the same way.

import {
  PERSONS,
  type Person,
  type TenseId,
  type ConjVerb,
  verbsForTense,
  conjugatedForm,
  TENSE_LABEL,
} from "./conjugation";

// Verbs that read oddly in a generic cue sentence ("every morning I fit").
const CUE_EXCLUDE = new Set(["haber", "caber", "valer"]);

export interface CueTemplate {
  tense: TenseId;
  person: Person;
  // English sentence; "{v}" is replaced with "(infinitivo)", and the learner
  // fills the blank right before it with the Spanish form.
  text: string;
  why: string; // the signal that points at this tense
}

export const CUE_TEMPLATES: CueTemplate[] = [
  // PRESENT — habitual / current
  { tense: "present", person: "yo", text: "These days, I ___ ({v}) every morning.", why: "habitual present — “these days / every morning”" },
  { tense: "present", person: "nosotros", text: "We usually ___ ({v}) on weekends.", why: "habitual present — “usually”" },
  { tense: "present", person: "ellos", text: "They always ___ ({v}) at this hour.", why: "present — “always, right now”" },
  { tense: "present", person: "tu", text: "You ___ ({v}) every day, right?", why: "habitual present — “every day”" },

  // PRETERITE — a single, completed event at a specific time
  { tense: "preterite", person: "yo", text: "Yesterday I ___ ({v}).", why: "preterite — one finished action, “yesterday”" },
  { tense: "preterite", person: "el", text: "Last night she ___ ({v}) for the first time.", why: "preterite — a single completed event" },
  { tense: "preterite", person: "nosotros", text: "Last weekend we ___ ({v}) downtown.", why: "preterite — a specific, finished time" },
  { tense: "preterite", person: "yo", text: "This morning I ___ ({v}) and then left.", why: "preterite — completed, in sequence" },

  // IMPERFECT — habit / used-to / ongoing in the past
  { tense: "imperfect", person: "yo", text: "When I was a kid, I always ___ ({v}).", why: "imperfect — a childhood habit" },
  { tense: "imperfect", person: "el", text: "Back then, he ___ ({v}) every Sunday.", why: "imperfect — a repeated past habit" },
  { tense: "imperfect", person: "nosotros", text: "We used to ___ ({v}) every summer.", why: "imperfect — “used to”" },
  { tense: "imperfect", person: "yo", text: "Every day back then, I ___ ({v}).", why: "imperfect — ongoing / repeated past" },

  // FUTURE
  { tense: "future", person: "yo", text: "Tomorrow I ___ ({v}).", why: "future — “tomorrow”" },
  { tense: "future", person: "ellos", text: "Next week they ___ ({v}).", why: "future — “next week”" },
  { tense: "future", person: "nosotros", text: "Someday we ___ ({v}).", why: "future — “someday”" },
  { tense: "future", person: "tu", text: "You ___ ({v}) later, I promise.", why: "future — “later”" },

  // PRESENT PERFECT — have + participle
  { tense: "perfect", person: "yo", text: "I ___ ({v}) three times already this week.", why: "present perfect — “already, this week”" },
  { tense: "perfect", person: "nosotros", text: "We ___ ({v}) already, so we can relax.", why: "present perfect — “already”" },
  { tense: "perfect", person: "yo", text: "I ___ ({v}) many times before.", why: "present perfect — “before, many times”" },
];

export interface CuePrompt {
  sentence: string; // English, with "___ (infinitivo)" where the answer goes
  infinitive: string; // the Spanish infinitive shown as a hint
  answer: string; // expected conjugated form
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

function cueVerbs(tense: TenseId): ConjVerb[] {
  return verbsForTense(tense).filter((v) => !CUE_EXCLUDE.has(v.key.split(":")[1]));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Build one prompt: a random template, filled with a random verb available for
// that template's tense.
export function buildCuePrompt(): CuePrompt {
  const t = pick(CUE_TEMPLATES);
  const verb = pick(cueVerbs(t.tense));
  return {
    sentence: t.text.replace("{v}", verb.verb),
    infinitive: verb.verb,
    answer: conjugatedForm(verb, t.person),
    tenseLabel: TENSE_LABEL[t.tense],
    why: t.why,
    subject: SUBJECT[t.person],
  };
}

export function buildCueSession(n: number): CuePrompt[] {
  return Array.from({ length: n }, () => buildCuePrompt());
}
