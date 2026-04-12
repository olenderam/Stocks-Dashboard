export const VAT_RATE = 0.23;
export const VAT_MULTIPLIER = 1 + VAT_RATE;

export function roundPrice(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateGrossFromNet(net: number): number {
  return roundPrice(net * VAT_MULTIPLIER);
}

export function sanitizeCompanyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
