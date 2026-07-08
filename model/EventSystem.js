import { CONFIG, LOCATIONS, RANDOM_EVENTS, CLOTHING_SLOTS } from '../config/cfg.js'
import { evalCondition, beijingDateString, calculateDays } from './utils.js'

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
  constructor(dataManager, achievementSystem) {
    this.dm = dataManager
    this.ach = achievementSystem
  }

  tickTime(ownerData, minutes = 1) {
    const decayTicks = Math.max(1, Math.floor(minutes / CONFIG.INTERACTION_TIME_COST))
    for (let i = 0; i < decayTicks; i++) {
      this.applyTickDecay(ownerData)
    }

    this.updateTraits(ownerData)
    this.checkDailyEvents(ownerData)
  }

  checkDailyEvents(ownerData) {
    const o = ownerData.owner
    if (!o) return
    const today = beijingDateString()
    if (o.petSys.lastCheckDate !== today) {
      o.petSys.lastCheckDate = today
      o.petAchievements.survivalDays = Math.max(o.petAchievements.survivalDays || 0, calculateDays(o.petSys.startTimestamp))
      this.dm.updateStatHistory(ownerData)
      o.petSys.location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)].name
      o.petStats.energy = this.dm.clampStat('energy', o.petStats.energy + CONFIG.DAILY_ENERGY_RECOVERY)
      o.petStats.satiety = this.dm.clampStat('satiety', o.petStats.satiety - CONFIG.DAILY_SATIETY_LOSS)
      for (const key in o.petStats) {
        o.petStats[key] = this.dm.clampStat(key, o.petStats[key])
      }
      this.dm.addLog(ownerData, `新的一天开始了。在 [${o.petSys.location}] 醒来。`, '#aaa')
      if (Math.random() < CONFIG.LOCATION_EVENT_CHANCE) {
        this.triggerRandomEvent(ownerData, 'location')
      }
      if (Math.random() < CONFIG.NIGHT_EVENT_CHANCE) {
        this.triggerNightEvent(ownerData)
      }
      if (this.ach) {
        this.ach.checkAchievements(ownerData)
      }
    }
  }

  applyTickDecay(ownerData) {
    const o = ownerData.owner
    if (!o) return
    const isBonded = o.status === 'bonded'
    const decay = CONFIG.TICK_DECAY
    for (const [stat, value] of Object.entries(decay)) {
      if (stat === 'pain' && !isBonded) continue
      if (o.petStats[stat] !== undefined) {
        o.petStats[stat] = this.dm.clampStat(stat, o.petStats[stat] + value)
      }
    }
  }

  triggerNightEvent(ownerData) {
    const event = getRandomWeightedItem(RANDOM_EVENTS.night)
    this.applyEventEffect(ownerData, event)
    this.dm.addLog(ownerData, `<span style="color:#9c27b0;font-weight:600">半夜事件</span>：${event.text}`, '#999')
  }

  triggerRandomEvent(ownerData, type) {
    const o = ownerData.owner
    if (!o) return
    if (type === 'day') {
      const event = getRandomWeightedItem(RANDOM_EVENTS.day)
      this.applyEventEffect(ownerData, event)
      this.dm.addLog(ownerData, `<span style="color:#ff9800;font-weight:600">随机事件</span>：${event.text}`, '#888')
    } else if (type === 'location') {
      const locationEvents = RANDOM_EVENTS.location[o.petSys.location] || []
      if (locationEvents.length > 0) {
        const event = getRandomWeightedItem(locationEvents)
        this.applyEventEffect(ownerData, event)
        this.dm.addLog(ownerData, `<span style="color:#2196f3;font-weight:600">地点事件</span>：${event.text}`, '#88aaff')
      }
    }
  }

  applyEventEffect(ownerData, event) {
    const o = ownerData.owner
    if (!o || !event.effect) return
    const isBonded = o.status === 'bonded'
    for (const [stat, value] of Object.entries(event.effect)) {
      if (stat === 'pain' && !isBonded) continue
      if (o.petStats[stat] !== undefined) {
        o.petStats[stat] = this.dm.clampStat(stat, o.petStats[stat] + value)
      }
    }
  }

  getLocationModifier(ownerData, action) {
    const o = ownerData.owner
    if (!o) return null
    const location = LOCATIONS.find(loc => loc.name === o.petSys.location)
    if (!location || !location.modifier) return null
    const modifier = {}
    for (const [key, value] of Object.entries(location.modifier)) {
      modifier[key] = Math.round(value * CONFIG.LOCATION_MODIFIER_FACTOR)
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

  updateTraits(ownerData) {
    const o = ownerData.owner
    if (!o) return
    const st = o.petStats
    const mergedStats = {
      ...st,
      intimacy: o.intimacy || 0,
      obedience: o.obedience || 0,
      lewd: o.lewd || 0
    }
    const counts = { 'trait-bad': 0, 'trait-good': 0, 'trait-lewd': 0 }
    const newTraits = []
    const sortedTraits = [...CONFIG.TRAITS].sort((a, b) => b.priority - a.priority)
    for (const trait of sortedTraits) {
      try {
        if (evalCondition(trait.condition, mergedStats)) {
          const css = trait.css
          const limit = CONFIG.TRAIT_LIMITS[css.replace('trait-', '')] || 5
          if (counts[css] < limit) {
            newTraits.push({ name: trait.name, css })
            counts[css]++
          }
        }
      } catch { continue }
    }
    const isClothesEmpty = (slot) => o.petClothes[slot]?.rarity === 'none' || (o.petClothes[slot]?.rarity === 'common' && o.petClothes[slot]?.dur <= 0)
    if (isClothesEmpty('upper') && isClothesEmpty('lower')) {
      newTraits.push({ name: '暴露', css: 'trait-lewd' })
    }
    const allEmpty = CLOTHING_SLOTS.every(isClothesEmpty)
    if (allEmpty) {
      newTraits.push({ name: '一丝不挂', css: 'trait-lewd' })
    }
    const hasMythic = Object.values(o.petClothes).some(item => item.rarity === 'mythic')
    if (hasMythic) {
      newTraits.push({ name: '神话装', css: 'trait-good' })
    }
    o.petTraits = newTraits
  }
}

export default EventSystem
