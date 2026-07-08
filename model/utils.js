const _fnCache = new Map()

export function evalCondition(condition, stats) {
  let fn = _fnCache.get(condition)
  if (!fn) {
    fn = new Function(...Object.keys(stats), `return (${condition})`)
    _fnCache.set(condition, fn)
  }
  return fn(...Object.values(stats))
}

export function calculateDays(startTimestamp) {
  if (!startTimestamp) return 0
  return Math.max(1, Math.floor((Date.now() - startTimestamp) / 86400000))
}

export function beijingNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(new Date())
  const get = (type) => parts.find(p => p.type === type)?.value || '0'
  return new Date(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}+08:00`)
}

export function beijingDateString() {
  return beijingNow().toDateString()
}