export function normalizeCatalogSearchToken(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isCatalogOptionMatch(option: string, query: string): boolean {
  const normalizedOption = normalizeCatalogSearchToken(option);
  const normalizedQuery = normalizeCatalogSearchToken(query);
  if (!normalizedQuery) return true;
  const collapsedOption = normalizedOption.replace(/\s+/g, "");
  const collapsedQuery = normalizedQuery.replace(/\s+/g, "");
  return normalizedOption.includes(normalizedQuery) || collapsedOption.includes(collapsedQuery);
}

