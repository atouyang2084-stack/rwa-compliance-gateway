export const ASSET_DECIMALS = 2

export function decimalToUnits(value, decimals = ASSET_DECIMALS) {
  const normalized = String(value).trim()
  const match = normalized.match(new RegExp(`^(0|[1-9]\\d*)(?:\\.(\\d{1,${decimals}}))?$`))
  if (!match) {
    throw new Error(`请输入最多 ${decimals} 位小数的正数金额`)
  }
  const fraction = (match[2] || '').padEnd(decimals, '0')
  const units = BigInt(match[1]) * (10n ** BigInt(decimals)) + BigInt(fraction || '0')
  if (units <= 0n) {
    throw new Error('金额必须大于 0')
  }
  return units.toString()
}

export function formatUnits(value, decimals = ASSET_DECIMALS) {
  const units = BigInt(value || '0')
  const scale = 10n ** BigInt(decimals)
  const whole = units / scale
  const fraction = (units % scale).toString().padStart(decimals, '0')
  return `${whole}.${fraction}`
}

export function minUnits(left, right) {
  const a = BigInt(left || '0')
  const b = BigInt(right || '0')
  return (a < b ? a : b).toString()
}

export function availableUnits(total, sold) {
  const remaining = BigInt(total || '0') - BigInt(sold || '0')
  return (remaining > 0n ? remaining : 0n).toString()
}

export function proportionalUnits(part, totalValue, totalUnits) {
  const denominator = BigInt(totalUnits || '0')
  if (denominator === 0n) return '0'
  return ((BigInt(part || '0') * BigInt(totalValue || '0')) / denominator).toString()
}

export function unitPrice(totalValue, totalUnits) {
  const denominator = BigInt(totalUnits || '0')
  if (denominator === 0n) return '0.00'
  const scaled = (BigInt(totalValue || '0') * 100n) / denominator
  return formatUnits(scaled.toString())
}
