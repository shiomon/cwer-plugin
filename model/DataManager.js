import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { CONFIG, CLOTHING_DB, CLOTHING_PRESETS, CLOTHING_SLOTS, SLOT_NAMES, LOCATIONS, EQUIPMENT_RARITY, HOUSES, COMMON_SETS } from '../config/cfg.js'
import { calculateDays, beijingNow } from './utils.js'
import { injectAssets } from './html-inject.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(__dirname, '..')
const htmlSrc = path.join(pluginRoot, 'resources', 'panel.html')

function makeEmptySlot() {
  return { name: '未穿', rarity: 'none', charm: 0, dur: 0, effect: null }
}

class DataManager {
  getDataDir(groupId) {
    return path.join(pluginRoot, 'data', groupId || 'default')
  }

  getDataPath(groupId, ownerId, petId) {
    return path.join(this.getDataDir(groupId), `${ownerId}_${petId}.json`)
  }

  initData() {
    const dataRoot = path.join(pluginRoot, 'data')
    if (!fs.existsSync(dataRoot)) {
      fs.mkdirSync(dataRoot, { recursive: true })
    }
  }

  initGroupDir(groupId) {
    const dir = this.getDataDir(groupId)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  findRelationByPet(groupId, petId) {
    this.initGroupDir(groupId)
    const dir = this.getDataDir(groupId)
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const [owner, pet] = file.replace('.json', '').split('_')
        if (pet === petId) {
          return { ownerId: owner, petId: pet }
        }
      }
    } catch {}
    return null
  }

  findRelationByOwner(groupId, ownerId) {
    this.initGroupDir(groupId)
    const dir = this.getDataDir(groupId)
    const results = []
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const [owner, pet] = file.replace('.json', '').split('_')
        if (owner === ownerId) {
          results.push({ ownerId: owner, petId: pet })
        }
      }
    } catch {}
    return results
  }

  findAllRelations(groupId) {
    this.initGroupDir(groupId)
    const dir = this.getDataDir(groupId)
    const results = []
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const [owner, pet] = file.replace('.json', '').split('_')
        results.push({ ownerId: owner, petId: pet })
      }
    } catch {}
    return results
  }

  resetData(groupId, ownerId, petId) {
    this.initGroupDir(groupId)
    const t1Set = COMMON_SETS.t1
    const clothes = {}
    for (const [slot, idx] of Object.entries(t1Set.items)) {
      const clothingData = CLOTHING_DB[slot]?.[idx]
      if (!clothingData) continue
      const fresh = { name: clothingData.name, rarity: clothingData.rarity }
      if (clothingData.rarity === 'common') {
        fresh.dur = 100
      }
      fresh.charm = 0
      fresh.effect = null
      clothes[slot] = fresh
    }

    const allSlots = [...CLOTHING_SLOTS]
    const shuffled = allSlots.sort(() => Math.random() - 0.5)
    const skipSlots = new Set([shuffled[0], shuffled[1]])
    for (const slot of skipSlots) {
      clothes[slot] = makeEmptySlot()
    }

    const defaultData = {
      relation: {
        ownerId,
        petId,
        ownerName: '',
        petName: '',
        petAvatar: '',
        ownerAvatar: '',
        status: 'claimed',
        evading: false,
        coldWar: false,
        coldWarUntil: null,
        createdAt: Date.now(),
        bondedAt: null
      },
      stats: {
        satiety: Math.floor(Math.random() * 61) + 20,
        energy: Math.floor(Math.random() * 61) + 20,
        hygiene: Math.floor(Math.random() * 61) + 20,
        pain: 0,
        sensitivity: Math.floor(Math.random() * 41) + 5,
        lewd: Math.floor(Math.random() * 30),
        obedience: Math.floor(Math.random() * 30),
        intimacy: Math.floor(Math.random() * 30)
      },
      clothes,
      house: 'broken',
      traits: [],
      diary: [],
      achievements: { totalPet: 0, totalTrain: 0, totalHeal: 0, survivalDays: 0, clothesBroken: 0, totalCharm: 0 },
      sys: {
        startTimestamp: null,
        lastInteractTime: null,
        lastCheckDate: null,
        goldCoins: CONFIG.INITIAL_GOLD,
        statHistory: { pain: [], energy: [], satiety: [], sensitivity: [], hygiene: [] },
        firstReach: {},
        achievements: [],
        clothesBroken: 0
      }
    }
    this.saveData(defaultData, groupId)
    return defaultData
  }

  readData(groupId, ownerId, petId) {
    this.initGroupDir(groupId)
    const dataPath = this.getDataPath(groupId, ownerId, petId)
    try {
      if (!fs.existsSync(dataPath)) {
        return null
      }
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
      this.migrateData(data)
      return data
    } catch (error) {
      console.error('[Cwer] 读取数据失败:', error)
      return null
    }
  }

  migrateData(data) {
    if (!data.relation) data.relation = {}
    if (data.relation.evading === undefined) data.relation.evading = false
    if (data.relation.coldWar === undefined) data.relation.coldWar = false
    if (data.relation.coldWarUntil === undefined) data.relation.coldWarUntil = null
    if (!data.stats) data.stats = {}
    for (const key of ['satiety', 'energy', 'hygiene', 'pain', 'sensitivity', 'lewd', 'obedience', 'intimacy']) {
      if (data.stats[key] === undefined) data.stats[key] = 0
    }
    if (!data.clothes) data.clothes = {}
    for (const slot of CLOTHING_SLOTS) {
      if (!data.clothes[slot]) data.clothes[slot] = makeEmptySlot()
      if (data.clothes[slot].rarity === 'none') data.clothes[slot] = makeEmptySlot()
      if (data.clothes[slot].rarity === 'common' && data.clothes[slot].dur !== undefined && data.clothes[slot].dur <= 0) {
        data.clothes[slot] = makeEmptySlot()
      }
    }
    if (!data.house) data.house = 'broken'
    if (!data.traits) data.traits = []
    if (!data.diary) data.diary = []
    if (!data.achievements) data.achievements = { totalPet: 0, totalTrain: 0, totalHeal: 0, survivalDays: 0, clothesBroken: 0, totalCharm: 0 }
    if (!data.sys) data.sys = {}
    if (data.sys.goldCoins === undefined) data.sys.goldCoins = CONFIG.INITIAL_GOLD
    if (!data.sys.achievements) data.sys.achievements = []
    if (!data.sys.statHistory) data.sys.statHistory = { pain: [], energy: [], satiety: [], sensitivity: [], hygiene: [] }
    if (!data.sys.firstReach) data.sys.firstReach = {}
  }

  saveData(data, groupId) {
    try {
      this.initGroupDir(groupId)
      const dataPath = this.getDataPath(groupId, data.relation.ownerId, data.relation.petId)
      const pctStats = ['satiety', 'energy', 'hygiene', 'pain', 'sensitivity']
      for (const s of pctStats) {
        if (data.stats[s] !== undefined) {
          data.stats[s] = Math.max(0, Math.min(100, Math.round(data.stats[s] * 10) / 10))
        }
      }
      for (const s of ['lewd', 'obedience', 'intimacy']) {
        if (data.stats[s] !== undefined) {
          data.stats[s] = Math.max(0, Math.min(1314, Math.round(data.stats[s])))
        }
      }
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2))
    } catch (error) {
      console.error('[Cwer] 保存数据失败:', error)
    }
  }

  deleteData(groupId, ownerId, petId) {
    try {
      const dataPath = this.getDataPath(groupId, ownerId, petId)
      if (fs.existsSync(dataPath)) {
        fs.unlinkSync(dataPath)
      }
    } catch (error) {
      console.error('[Cwer] 删除数据失败:', error)
    }
  }

  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val))
  }

  clampStat(statName, value) {
    const limit = CONFIG.STAT_LIMITS[statName] || 100
    return this.clamp(value, 0, limit)
  }

  clampAllStats(stats) {
    const clampedStats = {}
    for (const key in stats) {
      clampedStats[key] = this.clampStat(key, stats[key])
    }
    return clampedStats
  }

  addLog(data, text, color = '#ccc') {
    const now = beijingNow()
    const h = now.getHours().toString().padStart(2, '0')
    const m = now.getMinutes().toString().padStart(2, '0')
    const day = calculateDays(data.sys.startTimestamp)
    const timeStr = `${day}日 ${h}:${m}`
    if (!data.diary) data.diary = []
    data.diary.unshift({ time: timeStr, text, color })
    if (data.diary.length > CONFIG.MAX_LOGS) {
      data.diary = data.diary.slice(0, CONFIG.MAX_LOGS)
    }
  }

  updateStatHistory(data) {
    if (!data.sys.statHistory) data.sys.statHistory = { pain: [], energy: [], satiety: [], sensitivity: [], hygiene: [] }
    if (!data.sys.firstReach) data.sys.firstReach = {}
    for (const stat of ['pain', 'energy', 'satiety', 'sensitivity', 'hygiene']) {
      if (!data.sys.statHistory[stat]) data.sys.statHistory[stat] = []
      const prevVal = data.sys.statHistory[stat].length > 0 ? data.sys.statHistory[stat][data.sys.statHistory[stat].length - 1] : null
      if (prevVal !== null && prevVal <= 0 && data.stats[stat] > 0) {
        data.sys.firstReach[`${stat}_revived`] = true
      }
      data.sys.statHistory[stat].push(data.stats[stat])
      if (data.sys.statHistory[stat].length > 10) {
        data.sys.statHistory[stat].shift()
      }
    }

    const allNaked = CLOTHING_SLOTS.every(slot => {
      const c = data.clothes[slot]
      return !c || c.rarity === 'none' || (c.rarity === 'common' && c.dur <= 0)
    })
    if (allNaked) {
      data.achievements.nakedDays = (data.achievements.nakedDays || 0) + 1
    } else {
      data.achievements.nakedDays = 0
    }
  }

  checkConsecutive(data, stat, value, count) {
    const history = data.sys.statHistory?.[stat] || []
    if (history.length < count) return false
    for (let i = history.length - count; i < history.length; i++) {
      if (history[i] !== value) return false
    }
    return true
  }

  getTotalCharm(data) {
    let total = 0
    for (const slot of CLOTHING_SLOTS) {
      if (data.clothes[slot]?.rarity !== 'none' && data.clothes[slot]?.rarity !== 'common') {
        total += data.clothes[slot]?.charm || 0
      }
    }
    return total
  }

  _statBonus(val, optMin, optMax, weight = 1) {
    if (val <= 0) return 0
    const baseBonus = weight === 2 ? 0.2 : 0.1
    const nonOptBonus = weight === 2 ? 0.05 : 0.025
    if (val >= optMin && val <= optMax) return baseBonus
    return nonOptBonus
  }

  getTrainBonusSync(data) {
    let bonus = 1.0
    const s = data.stats
    const isBonded = data.relation.status.startsWith('bonded')
    bonus += this._statBonus(s.satiety, CONFIG.SATIETY_OPTIMAL_MIN, CONFIG.SATIETY_OPTIMAL_MAX, 2)
    bonus += this._statBonus(s.energy, CONFIG.ENERGY_OPTIMAL_MIN, CONFIG.ENERGY_OPTIMAL_MAX, 1)
    if (isBonded) {
      bonus += this._statBonus(s.pain, CONFIG.PAIN_OPTIMAL_MIN, CONFIG.PAIN_OPTIMAL_MAX, 1)
    }
    bonus += this._statBonus(s.sensitivity, CONFIG.SENSITIVITY_OPTIMAL_MIN, CONFIG.SENSITIVITY_OPTIMAL_MAX, 1)
    bonus += this._statBonus(s.hygiene, CONFIG.HYGIENE_OPTIMAL_MIN, CONFIG.HYGIENE_OPTIMAL_MAX, 1)
    for (const slot of CLOTHING_SLOTS) {
      const item = data.clothes[slot]
      if (item && item.rarity !== 'none' && item.rarity !== 'common' && item.effect) {
        const rarity = EQUIPMENT_RARITY[item.rarity]
        if (rarity) bonus += (rarity.multiplier - 1.0) * 0.1
      }
    }
    return bonus
  }

  getTrainBonusDetail(data) {
    const parts = []
    const s = data.stats
    const isBonded = data.relation.status.startsWith('bonded')
    parts.push((1 + this._statBonus(s.satiety, CONFIG.SATIETY_OPTIMAL_MIN, CONFIG.SATIETY_OPTIMAL_MAX, 2)).toFixed(2))
    parts.push((1 + this._statBonus(s.energy, CONFIG.ENERGY_OPTIMAL_MIN, CONFIG.ENERGY_OPTIMAL_MAX, 1)).toFixed(2))
    if (isBonded) {
      parts.push((1 + this._statBonus(s.pain, CONFIG.PAIN_OPTIMAL_MIN, CONFIG.PAIN_OPTIMAL_MAX, 1)).toFixed(2))
    }
    parts.push((1 + this._statBonus(s.sensitivity, CONFIG.SENSITIVITY_OPTIMAL_MIN, CONFIG.SENSITIVITY_OPTIMAL_MAX, 1)).toFixed(2))
    parts.push((1 + this._statBonus(s.hygiene, CONFIG.HYGIENE_OPTIMAL_MIN, CONFIG.HYGIENE_OPTIMAL_MAX, 1)).toFixed(2))
    let clothingBonus = 0
    for (const slot of CLOTHING_SLOTS) {
      const item = data.clothes[slot]
      if (item && item.rarity !== 'none' && item.rarity !== 'common' && item.effect) {
        const rarity = EQUIPMENT_RARITY[item.rarity]
        if (rarity) clothingBonus += (rarity.multiplier - 1.0) * 0.1
      }
    }
    parts.push((1 + clothingBonus).toFixed(2))
    return parts
  }

  getIntimacyLevel(intimacy) {
    let level = CONFIG.INTIMACY_LEVELS[0]
    for (const l of CONFIG.INTIMACY_LEVELS) {
      if (intimacy >= l.min) level = l
    }
    return level.name
  }

  getBondTier(intimacy) {
    if (intimacy >= CONFIG.BOND_TIERS.bonded.minIntimacy) return 'bonded'
    return null
  }

  getEvasionChance(obedience) {
    for (const tier of CONFIG.EVASION_TIERS) {
      if (obedience <= tier.max) return tier.chance
    }
    return 0
  }

  applyHouseBonus(data) {
    const house = HOUSES[data.house]
    if (!house || !house.bonus) return
    if (house.bonus.intimacyPct && data.stats.intimacy > 0) {
      const gain = Math.max(1, Math.floor(data.stats.intimacy * house.bonus.intimacyPct / 100))
      data.stats.intimacy = this.clampStat('intimacy', data.stats.intimacy + gain)
    }
  }

  getHouseGoldBonus(data) {
    const house = HOUSES[data.house]
    return house?.bonus?.goldBonus || 0
  }

  stripTrainingClothes(data) {
    for (const slot of CLOTHING_SLOTS) {
      const r = data.clothes[slot]?.rarity
      if (r === 'rare' || r === 'epic' || r === 'mythic') {
        data.clothes[slot] = makeEmptySlot()
      }
    }
  }

  replaceOwnerName(text, data) {
    return text.replace(/宠物/g, data.relation.petName || '宠物').replace(/主人/g, data.relation.ownerName || '主人')
  }

  computeDiffParts(statsBefore, statsAfter) {
    const pctNames = { satiety: '饱', energy: '体', hygiene: '洁', pain: '疼', sensitivity: '敏' }
    const progNames = { lewd: '涩', obedience: '服', intimacy: '亲' }
    const parts = []
    for (const [k, label] of Object.entries(pctNames)) {
      const d = Math.round((statsAfter[k] - statsBefore[k]) * 10) / 10
      if (Math.abs(d) > 0.01) parts.push(`${label}${d > 0 ? '+' : ''}${d}%`)
    }
    for (const [k, label] of Object.entries(progNames)) {
      const d = Math.round(statsAfter[k] - statsBefore[k])
      if (d !== 0) parts.push(`${label}${d > 0 ? '+' : ''}${d}`)
    }
    return parts
  }

  formatTime(mins) {
    const h = Math.floor(mins / 60).toString().padStart(2, '0')
    const m = (mins % 60).toString().padStart(2, '0')
    return `${h}:${m}`
  }
}

export default DataManager