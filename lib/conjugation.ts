// Conjugation practice catalog — pure data + helpers (no DB imports, so this is
// safe to use from client components too). Each "card" is verb + tense + person
// → the correct conjugated form. Regular forms come from ending rules applied to
// model verbs; irregular forms are stored explicitly.

export type Person = "yo" | "tu" | "el" | "nosotros" | "ellos";

export const PERSONS: { key: Person; label: string }[] = [
  { key: "yo", label: "yo" },
  { key: "tu", label: "tú" },
  { key: "el", label: "él / ella / usted" },
  { key: "nosotros", label: "nosotros" },
  { key: "ellos", label: "ellos / ellas / ustedes" },
];

export interface ConjCard {
  key: string; // stable id, e.g. "reg:hablar:preterite:yo"
  kind: "regular" | "irregular";
  verb: string; // display, e.g. "hablar" or "ser / ir"
  tense: string; // "preterite"
  tenseLabel: string; // "preterite (past)"
  person: Person;
  personLabel: string;
  answer: string; // correct, accented form
}

// --- Regular preterite: endings by verb group ---
const PRETERITE_ENDINGS: Record<"ar" | "er" | "ir", Record<Person, string>> = {
  ar: { yo: "é", tu: "aste", el: "ó", nosotros: "amos", ellos: "aron" },
  er: { yo: "í", tu: "iste", el: "ió", nosotros: "imos", ellos: "ieron" },
  ir: { yo: "í", tu: "iste", el: "ió", nosotros: "imos", ellos: "ieron" },
};

const MODEL_VERBS: { verb: string; group: "ar" | "er" | "ir"; stem: string }[] = [
  { verb: "hablar", group: "ar", stem: "habl" },
  { verb: "comer", group: "er", stem: "com" },
  { verb: "vivir", group: "ir", stem: "viv" },
];

// --- Irregular preterites (stored forms) ---
const IRREGULARS: { verb: string; slug: string; forms: Record<Person, string> }[] = [
  { verb: "ser / ir", slug: "ser_ir", forms: { yo: "fui", tu: "fuiste", el: "fue", nosotros: "fuimos", ellos: "fueron" } },
  { verb: "tener", slug: "tener", forms: { yo: "tuve", tu: "tuviste", el: "tuvo", nosotros: "tuvimos", ellos: "tuvieron" } },
  { verb: "estar", slug: "estar", forms: { yo: "estuve", tu: "estuviste", el: "estuvo", nosotros: "estuvimos", ellos: "estuvieron" } },
  { verb: "hacer", slug: "hacer", forms: { yo: "hice", tu: "hiciste", el: "hizo", nosotros: "hicimos", ellos: "hicieron" } },
  { verb: "poder", slug: "poder", forms: { yo: "pude", tu: "pudiste", el: "pudo", nosotros: "pudimos", ellos: "pudieron" } },
  { verb: "decir", slug: "decir", forms: { yo: "dije", tu: "dijiste", el: "dijo", nosotros: "dijimos", ellos: "dijeron" } },
  { verb: "venir", slug: "venir", forms: { yo: "vine", tu: "viniste", el: "vino", nosotros: "vinimos", ellos: "vinieron" } },
  { verb: "ver", slug: "ver", forms: { yo: "vi", tu: "viste", el: "vio", nosotros: "vimos", ellos: "vieron" } },
  { verb: "dar", slug: "dar", forms: { yo: "di", tu: "diste", el: "dio", nosotros: "dimos", ellos: "dieron" } },
  { verb: "poner", slug: "poner", forms: { yo: "puse", tu: "pusiste", el: "puso", nosotros: "pusimos", ellos: "pusieron" } },
  { verb: "saber", slug: "saber", forms: { yo: "supe", tu: "supiste", el: "supo", nosotros: "supimos", ellos: "supieron" } },
  { verb: "querer", slug: "querer", forms: { yo: "quise", tu: "quisiste", el: "quiso", nosotros: "quisimos", ellos: "quisieron" } },
  { verb: "leer", slug: "leer", forms: { yo: "leí", tu: "leíste", el: "leyó", nosotros: "leímos", ellos: "leyeron" } },
  { verb: "pedir", slug: "pedir", forms: { yo: "pedí", tu: "pediste", el: "pidió", nosotros: "pedimos", ellos: "pidieron" } },
];

const TENSE_LABEL = "preterite (past)";

export const CONJ_CARDS: ConjCard[] = [
  ...MODEL_VERBS.flatMap((mv) =>
    PERSONS.map((p) => ({
      key: `reg:${mv.verb}:preterite:${p.key}`,
      kind: "regular" as const,
      verb: mv.verb,
      tense: "preterite",
      tenseLabel: TENSE_LABEL,
      person: p.key,
      personLabel: p.label,
      answer: mv.stem + PRETERITE_ENDINGS[mv.group][p.key],
    }))
  ),
  ...IRREGULARS.flatMap((iv) =>
    PERSONS.map((p) => ({
      key: `irr:${iv.slug}:preterite:${p.key}`,
      kind: "irregular" as const,
      verb: iv.verb,
      tense: "preterite",
      tenseLabel: TENSE_LABEL,
      person: p.key,
      personLabel: p.label,
      answer: iv.forms[p.key],
    }))
  ),
];

export const CONJ_CARD_BY_KEY = new Map(CONJ_CARDS.map((c) => [c.key, c]));

/** Lowercase, trim, and strip accents so answers match with or without accents. */
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function isConjCorrect(input: string, answer: string): boolean {
  return normalizeAnswer(input) === normalizeAnswer(answer);
}
