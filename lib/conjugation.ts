// Conjugation practice catalog — pure data + helpers (no DB imports, so this is
// safe on the client too). The unit of practice is a VERB in a TENSE: you write
// its definition, then conjugate yo → tú → él → nosotros → ellos.

export type Person = "yo" | "tu" | "el" | "nosotros" | "ellos";
export type TenseId = "preterite" | "future" | "imperfect";

export const PERSONS: { key: Person; label: string }[] = [
  { key: "yo", label: "yo" },
  { key: "tu", label: "tú" },
  { key: "el", label: "él / ella / usted" },
  { key: "nosotros", label: "nosotros" },
  { key: "ellos", label: "ellos / ellas / ustedes" },
];

export const TENSES: { id: TenseId; label: string; blurb: string; emoji: string }[] = [
  { id: "preterite", label: "Past (preterite)", blurb: "completed past actions", emoji: "⏮️" },
  { id: "future", label: "Future", blurb: "what will happen", emoji: "⏭️" },
  { id: "imperfect", label: "Imperfect (past)", blurb: "used to / was ___ing", emoji: "🔁" },
];

export const TENSE_LABEL: Record<TenseId, string> = {
  preterite: "preterite (past)",
  future: "future",
  imperfect: "imperfect (past)",
};

export interface ConjSlot {
  kind: "definition" | "form";
  label: string;
  answers: string[];
}

export interface ConjVerb {
  key: string; // "verb:<slug>:<tense>"
  verb: string; // display
  kind: "regular" | "irregular";
  tense: TenseId;
  tenseLabel: string;
  slots: ConjSlot[];
}

type Forms = Record<Person, string>;

// --- English definitions (accepted answers), reused across tenses ---
const DEFS: Record<string, string[]> = {
  hablar: ["to speak", "to talk"],
  comer: ["to eat"],
  vivir: ["to live"],
  ser_ir: ["to be", "to go"],
  ser: ["to be", "was", "were"],
  ir: ["to go", "used to go", "would go"],
  ver: ["to see", "used to see"],
  tener: ["to have"],
  estar: ["to be"],
  hacer: ["to do", "to make"],
  poder: ["to be able", "to be able to", "can"],
  decir: ["to say", "to tell"],
  venir: ["to come"],
  dar: ["to give"],
  poner: ["to put", "to place"],
  saber: ["to know"],
  querer: ["to want", "to love"],
  leer: ["to read"],
  pedir: ["to ask for", "to order", "to request", "to ask"],
  salir: ["to leave", "to go out", "to exit"],
  haber: ["to have", "there to be"],
  caber: ["to fit"],
  valer: ["to be worth", "to cost"],
};

// --- Ending tables ---
const PRETERITE: Record<"ar" | "er" | "ir", Forms> = {
  ar: { yo: "é", tu: "aste", el: "ó", nosotros: "amos", ellos: "aron" },
  er: { yo: "í", tu: "iste", el: "ió", nosotros: "imos", ellos: "ieron" },
  ir: { yo: "í", tu: "iste", el: "ió", nosotros: "imos", ellos: "ieron" },
};
const FUTURE_ENDINGS: Forms = { yo: "é", tu: "ás", el: "á", nosotros: "emos", ellos: "án" };
const IMPERFECT_AR: Forms = { yo: "aba", tu: "abas", el: "aba", nosotros: "ábamos", ellos: "aban" };
const IMPERFECT_ERIR: Forms = { yo: "ía", tu: "ías", el: "ía", nosotros: "íamos", ellos: "ían" };

function formsFrom(base: string, endings: Forms): Forms {
  return Object.fromEntries(PERSONS.map((p) => [p.key, base + endings[p.key]])) as Forms;
}

function buildSlots(defs: string[], forms: Forms): ConjSlot[] {
  return [
    { kind: "definition", label: "meaning", answers: defs },
    ...PERSONS.map((p) => ({ kind: "form" as const, label: p.label, answers: [forms[p.key]] })),
  ];
}

function makeVerb(
  slug: string,
  verb: string,
  kind: "regular" | "irregular",
  tense: TenseId,
  forms: Forms
): ConjVerb {
  return {
    key: `verb:${slug}:${tense}`,
    verb,
    kind,
    tense,
    tenseLabel: TENSE_LABEL[tense],
    slots: buildSlots(DEFS[slug] ?? [], forms),
  };
}

// ---------------- PRETERITE ----------------
const PRETERITE_VERBS: ConjVerb[] = [
  makeVerb("hablar", "hablar", "regular", "preterite", formsFrom("habl", PRETERITE.ar)),
  makeVerb("comer", "comer", "regular", "preterite", formsFrom("com", PRETERITE.er)),
  makeVerb("vivir", "vivir", "regular", "preterite", formsFrom("viv", PRETERITE.ir)),
  makeVerb("ser_ir", "ser / ir", "irregular", "preterite", { yo: "fui", tu: "fuiste", el: "fue", nosotros: "fuimos", ellos: "fueron" }),
  makeVerb("tener", "tener", "irregular", "preterite", { yo: "tuve", tu: "tuviste", el: "tuvo", nosotros: "tuvimos", ellos: "tuvieron" }),
  makeVerb("estar", "estar", "irregular", "preterite", { yo: "estuve", tu: "estuviste", el: "estuvo", nosotros: "estuvimos", ellos: "estuvieron" }),
  makeVerb("hacer", "hacer", "irregular", "preterite", { yo: "hice", tu: "hiciste", el: "hizo", nosotros: "hicimos", ellos: "hicieron" }),
  makeVerb("poder", "poder", "irregular", "preterite", { yo: "pude", tu: "pudiste", el: "pudo", nosotros: "pudimos", ellos: "pudieron" }),
  makeVerb("decir", "decir", "irregular", "preterite", { yo: "dije", tu: "dijiste", el: "dijo", nosotros: "dijimos", ellos: "dijeron" }),
  makeVerb("venir", "venir", "irregular", "preterite", { yo: "vine", tu: "viniste", el: "vino", nosotros: "vinimos", ellos: "vinieron" }),
  makeVerb("ver", "ver", "irregular", "preterite", { yo: "vi", tu: "viste", el: "vio", nosotros: "vimos", ellos: "vieron" }),
  makeVerb("dar", "dar", "irregular", "preterite", { yo: "di", tu: "diste", el: "dio", nosotros: "dimos", ellos: "dieron" }),
  makeVerb("poner", "poner", "irregular", "preterite", { yo: "puse", tu: "pusiste", el: "puso", nosotros: "pusimos", ellos: "pusieron" }),
  makeVerb("saber", "saber", "irregular", "preterite", { yo: "supe", tu: "supiste", el: "supo", nosotros: "supimos", ellos: "supieron" }),
  makeVerb("querer", "querer", "irregular", "preterite", { yo: "quise", tu: "quisiste", el: "quiso", nosotros: "quisimos", ellos: "quisieron" }),
  makeVerb("leer", "leer", "irregular", "preterite", { yo: "leí", tu: "leíste", el: "leyó", nosotros: "leímos", ellos: "leyeron" }),
  makeVerb("pedir", "pedir", "irregular", "preterite", { yo: "pedí", tu: "pediste", el: "pidió", nosotros: "pedimos", ellos: "pidieron" }),
];

// ---------------- FUTURE ----------------
// Regular: endings attach to the whole infinitive, so one model verb shows all.
const FUTURE_IRREGULAR_STEMS: { slug: string; verb: string; stem: string }[] = [
  { slug: "decir", verb: "decir", stem: "dir" },
  { slug: "hacer", verb: "hacer", stem: "har" },
  { slug: "poder", verb: "poder", stem: "podr" },
  { slug: "poner", verb: "poner", stem: "pondr" },
  { slug: "querer", verb: "querer", stem: "querr" },
  { slug: "saber", verb: "saber", stem: "sabr" },
  { slug: "salir", verb: "salir", stem: "saldr" },
  { slug: "tener", verb: "tener", stem: "tendr" },
  { slug: "venir", verb: "venir", stem: "vendr" },
  { slug: "haber", verb: "haber", stem: "habr" },
  { slug: "caber", verb: "caber", stem: "cabr" },
  { slug: "valer", verb: "valer", stem: "valdr" },
];
const FUTURE_VERBS: ConjVerb[] = [
  makeVerb("hablar", "hablar", "regular", "future", formsFrom("hablar", FUTURE_ENDINGS)),
  ...FUTURE_IRREGULAR_STEMS.map((v) =>
    makeVerb(v.slug, v.verb, "irregular", "future", formsFrom(v.stem, FUTURE_ENDINGS))
  ),
];

// ---------------- IMPERFECT ----------------
const IMPERFECT_VERBS: ConjVerb[] = [
  makeVerb("hablar", "hablar", "regular", "imperfect", formsFrom("habl", IMPERFECT_AR)),
  makeVerb("comer", "comer", "regular", "imperfect", formsFrom("com", IMPERFECT_ERIR)),
  makeVerb("ser", "ser", "irregular", "imperfect", { yo: "era", tu: "eras", el: "era", nosotros: "éramos", ellos: "eran" }),
  makeVerb("ir", "ir", "irregular", "imperfect", { yo: "iba", tu: "ibas", el: "iba", nosotros: "íbamos", ellos: "iban" }),
  makeVerb("ver", "ver", "irregular", "imperfect", { yo: "veía", tu: "veías", el: "veía", nosotros: "veíamos", ellos: "veían" }),
];

export const CONJ_VERBS: ConjVerb[] = [...PRETERITE_VERBS, ...FUTURE_VERBS, ...IMPERFECT_VERBS];
export const CONJ_VERB_BY_KEY = new Map(CONJ_VERBS.map((v) => [v.key, v]));

export function keysForTense(tense: TenseId): Set<string> {
  return new Set(CONJ_VERBS.filter((v) => v.tense === tense).map((v) => v.key));
}
export function tenseOfKey(key: string): TenseId | null {
  return CONJ_VERB_BY_KEY.get(key)?.tense ?? null;
}

// Perfect rounds before a verb graduates from guided to full-table mode.
export const FULL_TABLE_AT = 2;

/** Lowercase, trim, strip accents, and drop a leading "to " so definitions and
 *  forms match with or without accents / the English infinitive marker. */
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/^to\s+/, "");
}

export function slotCorrect(input: string, answers: string[]): boolean {
  const n = normalizeAnswer(input);
  return answers.some((a) => normalizeAnswer(a) === n);
}
