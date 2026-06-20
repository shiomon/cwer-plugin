import { CONFIG, LOCATIONS, RANDOM_EVENTS, CLOTHING_SLOTS } from '../config/cfg.js'
import { evalCondition, beijingDateString } from './utils.js'

function getRandomWeightedItem(items) {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0)
  let random = Math.random() * totalWeight
  for (const item of items) {
    random -= (item.weight || 1)
    if (random <= 0) return item
  }
  return items[0]
}

class EventSystem {
  constructor(dataManager) {
    this.dm = dataManager
    this.shop = null
  }

  tickTime(data, minutes) {
    this.applyTickDecay(data)
    if (Math.random() < 0.15) {
      this.triggerRandomEvent(data, 'day')
    }
    this.updateTraits(data)
    this.checkDailyEvents(data)
  }

  checkDailyEvents(data) {
    const today = beijingDateString()
    if (data.sys.lastCheckDate !== today) {
      data.sys.lastCheckDate = today
      data.achievements.survivalDays = (data.achievements.survivalDays || 0) + 1
      const allNaked = CLOTHING_SLOTS.every(slot => !data.clothes[slot] || data.clothes[slot].rarity === 'none' || (data.clothes[slot].rarity === 'common' && data.clothes[slot].dur <= 0))
      if (allNaked) {
        data.achievements.nakedDays = (data.achievements.nakedDays || 0) + 1
      } else {
        data.achievements.nakedDays = 0
      }
      data.sys.location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)].name
      data.stats.energy = this.dm.clampStat('energy', data.stats.energy + CONFIG.DAILY_ENERGY_RECOVERY)
      data.stats.satiety = this.dm.clampStat('satiety', data.stats.satiety - CONFIG.DAILY_SATIETY_LOSS)
      data.stats = this.dm.clampAllStats(data.stats)
      this.dm.addLog(data, `新的一天开始了。在 [${data.sys.location}] 醒来。`, '#aaa')
      if (Math.random() < 0.4) {
        this.triggerRandomEvent(data, 'location')
      }
      if (Math.random() < CONFIG.NIGHT_EVENT_CHANCE) {
        this.triggerNightEvent(data)
      }
      if (this.shop) {
        this.shop.checkAchievements(data)
      }
    }
  }

  applyTickDecay(data) {
    const decay = CONFIG.TICK_DECAY
    for (const [stat, value] of Object.entries(decay)) {
      if (data.stats[stat] !== undefined) {
        data.stats[stat] = this.dm.clampStat(stat, data.stats[stat] + value)
      }
    }
  }

  triggerNightEvent(data) {
    const event = getRandomWeightedItem(RANDOM_EVENTS.night)
    this.applyEventEffect(data, event)
    this.dm.addLog(data, `<span style="color:#9c27b0;font-weight:600">半夜事件</span>：${event.text}`, '#999')
  }

  triggerRandomEvent(data, type) {
    if (type === 'day') {
      const event = getRandomWeightedItem(RANDOM_EVENTS.day)
      this.applyEventEffect(data, event)
      this.dm.addLog(data, `<span style="color:#ff9800;font-weight:600">随机事件</span>：${event.text}`, '#888')
    } else if (type === 'location') {
      const locationEvents = RANDOM_EVENTS.location[data.sys.location] || []
      if (locationEvents.length > 0) {
        const event = getRandomWeightedItem(locationEvents)
        this.applyEventEffect(data, event)
        this.dm.addLog(data, `<span style="color:#2196f3;font-weight:600">地点事件</span>：${event.text}`, '#88aaff')
      }
    }
  }

  applyEventEffect(data, event) {
    if (!event.effect) return
    for (const [stat, value] of Object.entries(event.effect)) {
      if (data.stats[stat] !== undefined) {
        data.stats[stat] = this.dm.clampStat(stat, data.stats[stat] + value)
      }
    }
  }

  getLocationModifier(data, action) {
    const location = LOCATIONS.find(loc => loc.name === data.sys.location)
    if (!location || !location.modifier) return null
    const modifier = {}
    for (const [key, value] of Object.entries(location.modifier)) {
      modifier[key] = Math.round(value * 0.3)
    }
    return modifier
  }

  applyModifier(stats, modifier) {
    for (const [stat, value] of Object.entries(modifier)) {
      if (stats[stat] !== undefined) {
        stats[stat] += value
      }
    }
  }

  updateTraits(data) {
    const st = data.stats
    const counts = { 'trait-bad': 0, 'trait-good': 0, 'trait-lewd': 0 }
    const newTraits = []
    const sortedTraits = [...CONFIG.TRAITS].sort((a, b) => b.priority - a.priority)
    for (const trait of sortedTraits) {
      try {
        if (evalCondition(trait.condition, st)) {
          const css = trait.css
          const limit = CONFIG.TRAIT_LIMITS[css.replace('trait-', '')] || 5
          if (counts[css] < limit) {
            newTraits.push({ name: trait.name, css })
            counts[css]++
          }
        }
      } catch { continue }
    }
    const isClothesEmpty = (slot) => data.clothes[slot]?.rarity === 'none' || (data.clothes[slot]?.rarity === 'common' && data.clothes[slot]?.dur <= 0)
    if (isClothesEmpty('upper') && isClothesEmpty('lower')) {
      newTraits.push({ name: '暴露', css: 'trait-lewd' })
    }
    const allEmpty = CLOTHING_SLOTS.every(isClothesEmpty)
    if (allEmpty) {
      newTraits.push({ name: '一丝不挂', css: 'trait-lewd' })
    }
    const hasMythic = Object.values(data.clothes).some(item => item.rarity === 'mythic')
    if (hasMythic) {
      newTraits.push({ name: '神话装', css: 'trait-good' })
    }
    data.traits = newTraits
  }
}

export default EventSystem