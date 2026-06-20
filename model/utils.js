export function evalCondition(condition, stats) {
  const fn = new Function(...Object.keys(stats), `return (${condition})`)
  return fn(...Object.values(stats))
}

export function calculateDays(startTimestamp) {
  if (!startTimestamp) return 0
  return Math.max(1, Math.floor((Date.now() - startTimestamp) / 86400000))
}

export function beijingNow() {
  const offset = 8 * 60
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + offset * 60000)
}

export function beijingDateString() {
  return beijingNow().toDateString()
}