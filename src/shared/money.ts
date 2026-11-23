const MAX_CENTS = 99_999_999;

/**
 * Parses what a person types as a price: "45", "45,5", "45,50", "R$ 1.234,56", "45.50".
 * Returns integer cents, or null when it is not a valid amount.
 */
export function parseMoneyInput(text: string): number | null {
  let cleaned = text.replace(/R\$/gi, '').replace(/\s/g, '');
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }
  const cents = Math.round(Number(cleaned) * 100);
  return cents <= MAX_CENTS ? cents : null;
}

/** 4500 → "45,00" (for pre-filling inputs). */
export function formatMoneyInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
