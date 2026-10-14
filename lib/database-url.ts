export function normalizeDatabaseUrl(value: string) {
  const trimmed = value.trim();
  const startsWithQuote = trimmed.startsWith('"') || trimmed.startsWith("'");
  const hasMatchingQuotes =
    trimmed.length >= 2 &&
    startsWithQuote &&
    trimmed.at(-1) === trimmed[0];

  return hasMatchingQuotes ? trimmed.slice(1, -1).trim() : trimmed;
}
