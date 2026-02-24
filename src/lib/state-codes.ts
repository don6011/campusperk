/**
 * US state name ↔ abbreviation mapping for case-insensitive, format-tolerant matching.
 */

const STATE_MAP: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
};

const ABBREV_TO_NAME = Object.fromEntries(
  Object.entries(STATE_MAP).map(([name, code]) => [code, name])
);

/**
 * Normalize any state input (full name or abbreviation) to a 2-letter uppercase code.
 * Returns null if unrecognized.
 */
export function toStateCode(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Already a 2-letter code?
  const upper = trimmed.toUpperCase();
  if (upper.length === 2 && ABBREV_TO_NAME[upper]) return upper;

  // Full name lookup
  const code = STATE_MAP[trimmed];
  return code ?? null;
}

/**
 * Check if two state strings match (case-insensitive, abbreviation-tolerant).
 */
export function statesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const codeA = toStateCode(a);
  const codeB = toStateCode(b);
  if (!codeA || !codeB) return false;
  return codeA === codeB;
}

/**
 * Check if two city strings match (case-insensitive, trimmed).
 */
export function citiesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
