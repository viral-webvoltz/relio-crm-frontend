// Money is stored as integer minor units (cents); only convert at the UI edge.
export function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(minor / 100)
}

export const toMinor = (major: string) => Math.round(Number.parseFloat(major || '0') * 100)
export const toMajor = (minor: number) => (minor / 100).toFixed(2)
