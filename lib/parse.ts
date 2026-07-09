// Parse pasted vocab text into editable rows.
//
// The tutor's format is inconsistent, e.g.:
//   el/la prometido/a- the fiance
//   el programador
//   ingeniero de software
//   el gato- the cat
//
//   delgado- thin /skinny
//
// Strategy: skip blank lines; split each line on the FIRST "-" or ":" into
// spanish / english. Lines with no separator become a spanish-only row with an
// empty english field so the user can fill it in during the review step.

export interface ParsedRow {
  spanish: string;
  english: string;
}

export function parseVocab(input: string): ParsedRow[] {
  const rows: ParsedRow[] = [];

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // Find the first "-" or ":" separator.
    const dashIdx = line.indexOf("-");
    const colonIdx = line.indexOf(":");
    let sepIdx = -1;
    if (dashIdx === -1) sepIdx = colonIdx;
    else if (colonIdx === -1) sepIdx = dashIdx;
    else sepIdx = Math.min(dashIdx, colonIdx);

    if (sepIdx === -1) {
      rows.push({ spanish: line, english: "" });
    } else {
      const spanish = line.slice(0, sepIdx).trim();
      const english = line.slice(sepIdx + 1).trim();
      rows.push({ spanish, english });
    }
  }

  return rows;
}
