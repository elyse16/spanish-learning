// Conjugation practice catalog — pure data + helpers (no DB imports, so this is
// safe on the client too). The unit of practice is a VERB: you write its
// definition, then conjugate it for yo → tú → él → nosotros → ellos (preterite).

export type Person = "yo" | "tu" | "el" | "nosotros" | "ellos";

export const PERSONS: { key: Person; label: string }[] = [
  { key: "yo", label: "yo" },
  { key: "tu", label: "tú" },
  { key: "el", label: "él / ella / usted" },
  { key: "nosotros", label: "nosotros" },
  { key: "ellos", label: "ellos / ellas / ustedes" },
];

export interface ConjSlot {
  kind: "definition" | "form";
  label: string; // "meaning" or the person label
  answers: string[]; // accepted answers (compared after normalization)
}

export interface ConjVerb {
  key: string; // "verb:<slug>:preterite"
  verb: string; // display, e.g. "tener" or "ser / ir"
  kind: "regular" | "irregular";
  tenseLabel: string;
  slots: ConjSlot[]; // definition, then the 5 persons in order
}

const TENSE_LABEL = "preterite (past)";

// --- Regular preterite endings by group ---
const PRETERITE_ENDINGS: Record<"ar" | "er" | "ir", Record<Person, string>> = {
  ar: { yo: "é", tu: "aste", el: "ó", nosotros: "amos", ellos: "aron" },
  er: { yo: "í", tu: "iste", el: "ió", nosotros: "imos", ellos: "ieron" },
  ir: { yo: "í", tu: "iste", el: "ió", nosotros: "imos", ellos: "ieron" },
};

interface VerbDef {
  verb: string;
  slug: string;
  kind: "regular" | "irregular";
  defs: string[];
  forms: Record<Person, string>;
}

const MODEL_VERBS: { verb: string; slug: string; group: "ar" | "er" | "ir"; stem: string; defs: string[] }[] = [
  { verb: "hablar", slug: "hablar", group: "ar", stem: "habl", defs: ["to speak", "to talk"] },
  { verb: "comer", slug: "comer", group: "er", stem: "com", defs: ["to eat"] },
  { verb: "vivir", slug: "vivir", group: "ir", stem: "viv", defs: ["to live"] },
];

const IRREGULARS: VerbDef[] = [
  { verb: "ser / ir", slug: "ser_ir", kind: "irregular", defs: ["to be", "to go"], forms: { yo: "fui", tu: "fuiste", el: "fue", nosotros: "fuimos", ellos: "fueron" } },
  { verb: "tener", slug: "tener", kind: "irregular", defs: ["to have"], forms: { yo: "tuve", tu: "tuviste", el: "tuvo", nosotros: "tuvimos", ellos: "tuvieron" } },
  { verb: "estar", slug: "estar", kind: "irregular", defs: ["to be"], forms: { yo: "estuve", tu: "estuviste", el: "estuvo", nosotros: "estuvimos", ellos: "estuvieron" } },
  { verb: "hacer", slug: "hacer", kind: "irregular", defs: ["to do", "to make"], forms: { yo: "hice", tu: "hiciste", el: "hizo", nosotros: "hicimos", ellos: "hicieron" } },
  { verb: "poder", slug: "poder", kind: "irregular", defs: ["to be able", "to be able to", "can"], forms: { yo: "pude", tu: "pudiste", el: "pudo", nosotros: "pudimos", ellos: "pudieron" } },
  { verb: "decir", slug: "decir", kind: "irregular", defs: ["to say", "to tell"], forms: { yo: "dije", tu: "dijiste", el: "dijo", nosotros: "dijimos", ellos: "dijeron" } },
  { verb: "venir", slug: "venir", kind: "irregular", defs: ["to come"], forms: { yo: "vine", tu: "viniste", el: "vino", nosotros: "vinimos", ellos: "vinieron" } },
  { verb: "ver", slug: "ver", kind: "irregular", defs: ["to see"], forms: { yo: "vi", tu: "viste", el: "vio", nosotros: "vimos", ellos: "vieron" } },
  { verb: "dar", slug: "dar", kind: "irregular", defs: ["to give"], forms: { yo: "di", tu: "diste", el: "dio", nosotros: "dimos", ellos: "dieron" } },
  { verb: "poner", slug: "poner", kind: "irregular", defs: ["to put", "to place"], forms: { yo: "puse", tu: "pusiste", el: "puso", nosotros: "pusimos", ellos: "pusieron" } },
  { verb: "saber", slug: "saber", kind: "irregular", defs: ["to know"], forms: { yo: "supe", tu: "supiste", el: "supo", nosotros: "supimos", ellos: "supieron" } },
  { verb: "querer", slug: "querer", kind: "irregular", defs: ["to want", "to love"], forms: { yo: "quise", tu: "quisiste", el: "quiso", nosotros: "quisimos", ellos: "quisieron" } },
  { verb: "leer", slug: "leer", kind: "irregular", defs: ["to read"], forms: { yo: "leí", tu: "leíste", el: "leyó", nosotros: "leímos", ellos: "leyeron" } },
  { verb: "pedir", slug: "pedir", kind: "irregular", defs: ["to ask for", "to order", "to request", "to ask"], forms: { yo: "pedí", tu: "pediste", el: "pidió", nosotros: "pedimos", ellos: "pidieron" } },
];

function buildSlots(defs: string[], forms: Record<Person, string>): ConjSlot[] {
  return [
    { kind: "definition", label: "meaning", answers: defs },
    ...PERSONS.map((p) => ({ kind: "form" as const, label: p.label, answers: [forms[p.key]] })),
  ];
}

export const CONJ_VERBS: ConjVerb[] = [
  ...MODEL_VERBS.map((mv) => {
    const forms = Object.fromEntries(
      PERSONS.map((p) => [p.key, mv.stem + PRETERITE_ENDINGS[mv.group][p.key]])
    ) as Record<Person, string>;
    return {
      key: `verb:${mv.slug}:preterite`,
      verb: mv.verb,
      kind: "regular" as const,
      tenseLabel: TENSE_LABEL,
      slots: buildSlots(mv.defs, forms),
    };
  }),
  ...IRREGULARS.map((iv) => ({
    key: `verb:${iv.slug}:preterite`,
    verb: iv.verb,
    kind: "irregular" as const,
    tenseLabel: TENSE_LABEL,
    slots: buildSlots(iv.defs, iv.forms),
  })),
];

export const CONJ_VERB_BY_KEY = new Map(CONJ_VERBS.map((v) => [v.key, v]));

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
