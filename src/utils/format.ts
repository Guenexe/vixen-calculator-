export const CURRENCY = '₱'

export function fmt(value: number, decimals = 2): string {
  return `${CURRENCY}${value.toLocaleString('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}
