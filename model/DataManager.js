import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { CONFIG, CLOTHING_DB, CLOTHING_SLOTS, LOCATIONS, HOUSES, COMMON_SETS, EQUIPMENT_RARITY, randomSkipSlots } from '../config/cfg.js'
import { calculateDays, beijingNow } from './utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(__dirname, '..')

function makeEmptySlot() {
  return { name: '未穿', rarity: 'none', charm: 0, dur: 0, effect: null }
}

function makeDefaultPetStats() {
  return {
    satiety: Math.floor(Math.random() * 61) + 20,
    energy: Math.floor(Math.random() * 61) + 20,
    hygiene: Math.floor(Math.random() * 61) + 20,
    pain: 0,
    sensitivity: Math.floor(Math.random() * 41) + 5
  }
}

function makeDefaultPetClothes() {
  const t1Set = COMMON_SETS.t1
  const clothes = {}
  for (const [slot, idx] of Object.entries(t1Set.items)) {
    const clothingData = CLOTHING_DB[slot]?.[idx]
    if (!clothingData) continue
    const fresh = { name: clothingData.name, rarity: clothingData.rarity }
    if (clothingData.rarity === 'common') fresh.dur = 100
    fresh.charm = 0
    fresh.effect = null
    clothes[slot] = fresh
  }
  randomSkipSlots(clothes, makeEmptySlot())
  return clothes
}

function makeDefaultPetSys() {
  return {
    startTimestamp: null,
    lastInteractTime: null,
    lastCheckDate: null,
    goldCoins: CONFIG.INITIAL_GOLD,
    statHistory: { pain: [], energy: [], satiety: [], sensitivity: [], hygiene: [] },
    firstReach: {},
    achievements: [],
    clothesBroken: 0,
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)].name
  }
}

function makeDefaultPetAchievements() {
  return { totalPet: 0, totalTrain: 0, totalHeal: 0, survivalDays: 0, clothesBroken: 0, totalCharm: 0, destroyMasterCount: 0, nakedDays: 0, shopBuyCount: 0, shopBoughtItems: [], clothesCount: {} }
}

class DataManager {
  _initDirs = new Set()
  _relCache = new Map()
  _REL_CACHE_TTL = 30 * 1000

  getDataDir(groupId) {
    return path.join(pluginRoot, 'data', groupId || 'default')
  }

  getDataPath(groupId, userId) {
    return path.join(this.getDataDir(groupId), `${userId}.json`)
  }

  initData() {
    const dataRoot = path.join(pluginRoot, 'data')
    if (!fs.existsSync(dataRoot)) {
      fs.mkdirSync(dataRoot, { recursive: true })
    }
  }

  initGroupDir(groupId) {
    if (this._initDirs.has(groupId)) return
    const dir = this.getDataDir(groupId)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    this._initDirs.add(groupId)
  }

  readUserData(groupId, userId) {
    this.initGroupDir(groupId)
    const dataPath = this.getDataPath(groupId, userId)
    try {
      if (!fs.existsSync(dataPath)) return null
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
      this.migrateData(data)
      data._userId = userId
      return data
    } catch (error) {
      logger.error('[Cwer] 读取数据失败:', error)
      return null
    }
  }

  saveUserData(data, groupId) {
    try {
      this.initGroupDir(groupId)
      const userId = data._userId
      if (!userId) {
        logger.error('[Cwer] 保存数据失败: 缺少_userId')
        return
      }
      if (data.owner && data.owner.petStats) {
        for (const s of ['satiety', 'energy', 'hygiene', 'pain', 'sensitivity']) {
          if (data.owner.petStats[s] !== undefined) {
            data.owner.petStats[s] = Math.max(0, Math.min(100, Math.round(data.owner.petStats[s] * 10) / 10))
          }
        }
        for (const s of ['intimacy', 'obedience', 'lewd']) {
          if (data.owner[s] !== undefined) {
            data.owner[s] = Math.max(0, Math.min(CONFIG.MAX_PROGRESS_STAT, Math.round(data.owner[s])))
          }
        }
      }
      const saveData = { ...data }
      delete saveData._userId
      const dataPath = this.getDataPath(groupId, userId)
      fs.writeFileSync(dataPath, JSON.stringify(saveData, null, 2))
      if (data.owner) this.invalidateRelCache(groupId)
    } catch (error) {
      logger.error('[Cwer] 保存数据失败:', error)
    }
  }


  extractPetData(ownerData) {
    if (!ownerData || !ownerData.owner) return null
    const o = ownerData.owner
    return {
      _userId: o.petId,
      stats: o.petStats || {},
      clothes: o.petClothes || {},
      house: o.petHouse || 'broken',
      traits: o.petTraits || [],
      diary: o.petDiary || [],
      achievements: o.petAchievements || makeDefaultPetAchievements(),
      sys: o.petSys || makeDefaultPetSys(),
      owner: null,
      pet: {
        ownerId: ownerData._userId,
        ownerName: o.ownerName,
        ownerAvatar: o.ownerAvatar,
        petName: o.petName,
        petAvatar: o.petAvatar,
        status: o.status,
        createdAt: o.createdAt,
        bondedAt: o.bondedAt,
        intimacy: o.intimacy || 0,
        obedience: o.obedience || 0,
        lewd: o.lewd || 0
      }
    }
  }

  writePetData(ownerData, petData) {
    if (!ownerData.owner) return
    const o = ownerData.owner
    o.petStats = petData.stats
    o.petClothes = petData.clothes
    o.petHouse = petData.house
    o.petTraits = petData.traits
    o.petDiary = petData.diary
    o.petAchievements = petData.achievements
    o.petSys = petData.sys
    o.petId = petData._userId
    o.petName = petData.pet?.petName
    o.petAvatar = petData.pet?.petAvatar
    o.status = petData.pet?.status || o.status
    o.createdAt = petData.pet?.createdAt || o.createdAt
    o.bondedAt = petData.pet?.bondedAt || o.bondedAt
    o.intimacy = petData.pet?.intimacy ?? o.intimacy
    o.obedience = petData.pet?.obedience ?? o.obedience
    o.lewd = petData.pet?.lewd ?? o.lewd
  }

  findMasterId(groupId, petId) {
    const data = this.readUserData(groupId, petId)
    if (!data) return null
    if (data.masterId) return data.masterId
    if (data.owner && data.owner.petId) return petId
    return null
  }


  findRelationByPet(groupId, petId) {
    const masterId = this.findMasterId(groupId, petId)
    if (!masterId) return null
    const data = this.readUserData(groupId, masterId)
    if (data && data.owner && data.owner.petId === petId) {
      return { ownerId: masterId, petId }
    }
    return null
  }

  findAllRelations(groupId) {
    return this.findAllRelationsWithData(groupId).map(r => ({ ownerId: r.ownerId, petId: r.petId }))
  }

  findAllRelationsWithData(groupId) {
    const cached = this._relCache.get(groupId)
    if (cached && Date.now() - cached.time < this._REL_CACHE_TTL) return cached.data
    this.initGroupDir(groupId)
    const dir = this.getDataDir(groupId)
    const results = []
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const userId = file.replace('.json', '')
        const data = this.readUserData(groupId, userId)
        if (data && data.owner && data.owner.petId) {
          results.push({ ownerId: userId, petId: data.owner.petId, ownerData: data })
        }
      }
    } catch {}
    this._relCache.set(groupId, { data: results, time: Date.now() })
    return results
  }

  invalidateRelCache(groupId) {
    this._relCache.delete(groupId)
  }

  setupOwnerRelation(ownerData, petData, ownerName, petName, petAvatar, ownerAvatar) {
    ownerData.owner = {
      petId: petData._userId,
      petName,
      petAvatar,
      ownerName,
      ownerAvatar,
      status: 'claimed',
      createdAt: Date.now(),
      bondedAt: null,
      intimacy: Math.floor(Math.random() * 30),
      obedience: Math.floor(Math.random() * 30),
      lewd: Math.floor(Math.random() * 30),
      petStats: petData.stats || makeDefaultPetStats(),
      petClothes: petData.clothes || makeDefaultPetClothes(),
      petHouse: petData.house || 'broken',
      petTraits: petData.traits || [],
      petDiary: petData.diary || [],
      petAchievements: petData.achievements || makeDefaultPetAchievements(),
      petSys: petData.sys || makeDefaultPetSys()
    }

  }

  setupPetMasterLink(groupId, ownerId, petId) {
    const petFileData = this.readUserData(groupId, petId) || { _userId: petId }
    petFileData.masterId = ownerId
    petFileData._userId = petId
    this.saveUserData(petFileData, groupId)
  }

  resolveOwnerData(groupId, userId) {
    const userData = this.readUserData(groupId, userId)
    if (!userData) return { ownerData: null, userData }
    if (userData.owner && userData.owner.petId) {
      return { ownerData: userData, userData }
    }
    if (userData.masterId) {
      const ownerData = this.readUserData(groupId, userData.masterId)
      if (ownerData && ownerData.owner) {
        ownerData._userId = userData.masterId
        return { ownerData, userData }
      }
    }
    return { ownerData: null, userData }
  }

  clearOwnerRelation(data) {
    data.owner = null
  }


  migrateData(data) {
    if (data.owner && data.owner.petStats) {
      if (!data.owner.petClothes) data.owner.petClothes = makeDefaultPetClothes()
      if (!data.owner.petHouse) data.owner.petHouse = 'broken'
      if (!data.owner.petTraits) data.owner.petTraits = []
      if (!data.owner.petDiary) data.owner.petDiary = []
      if (!data.owner.petAchievements) data.owner.petAchievements = makeDefaultPetAchievements()
      if (!data.owner.petSys) data.owner.petSys = makeDefaultPetSys()
      for (const slot of CLOTHING_SLOTS) {
        if (!data.owner.petClothes[slot]) data.owner.petClothes[slot] = makeEmptySlot()
      }
      if (data.owner.petName && /^\d+$/.test(data.owner.petName)) data.owner.petName = null
      if (data.owner.ownerName && /^\d+$/.test(data.owner.ownerName)) data.owner.ownerName = null
      return
    }
    if (data.owner === undefined) data.owner = null
    if (data.masterId === undefined) data.masterId = null
  }

  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val))
  }

  clampStat(statName, value) {
    const limit = CONFIG.STAT_LIMITS[statName] || 100
    return this.clamp(value, 0, limit)
  }


  addLog(data, text, color = '#ccc') {
    const petSys = data.owner?.petSys
    if (!petSys) return
    const now = beijingNow()
    const h = now.getHours().toString().padStart(2, '0')
    const m = now.getMinutes().toString().padStart(2, '0')
    const day = calculateDays(petSys.startTimestamp)
    const timeStr = `${day}日 ${h}:${m}`
    if (!data.owner.petDiary) data.owner.petDiary = []
    data.owner.petDiary.unshift({ time: timeStr, text, color })
    if (data.owner.petDiary.length > CONFIG.MAX_LOGS) {
      data.owner.petDiary = data.owner.petDiary.slice(0, CONFIG.MAX_LOGS)
    }
  }

  updateStatHistory(data) {
    const petSys = data.owner?.petSys
    const petStats = data.owner?.petStats
    const petClothes = data.owner?.petClothes
    const petAchievements = data.owner?.petAchievements
    if (!petSys || !petStats) return
    if (!petSys.statHistory) petSys.statHistory = { pain: [], energy: [], satiety: [], sensitivity: [], hygiene: [] }
    if (!petSys.firstReach) petSys.firstReach = {}
    for (const stat of ['pain', 'energy', 'satiety', 'sensitivity', 'hygiene']) {
      if (!petSys.statHistory[stat]) petSys.statHistory[stat] = []
      const prevVal = petSys.statHistory[stat].length > 0 ? petSys.statHistory[stat][petSys.statHistory[stat].length - 1] : null
      if (prevVal !== null && prevVal <= 0 && petStats[stat] > 0) {
        petSys.firstReach[`${stat}_revived`] = true
      }
      petSys.statHistory[stat].push(petStats[stat])
      if (petSys.statHistory[stat].length > 10) {
        petSys.statHistory[stat].shift()
      }
    }
    if (petClothes && petAchievements) {
      const allNaked = CLOTHING_SLOTS.every(slot => {
        const c = petClothes[slot]
        return !c || c.rarity === 'none' || (c.rarity === 'common' && c.dur <= 0)
      })
      if (allNaked) {
        petAchievements.nakedDays = (petAchievements.nakedDays || 0) + 1
      } else {
        petAchievements.nakedDays = 0
      }
    }
  }

  checkConsecutive(data, stat, value, count) {
    const petSys = data.owner?.petSys
    if (!petSys) return false
    const history = petSys.statHistory?.[stat] || []
    if (history.length < count) return false
    for (let i = history.length - count; i < history.length; i++) {
      if (history[i] !== value) return false
    }
    return true
  }

  getTotalCharm(data) {
    const petClothes = data.owner?.petClothes || data.clothes
    if (!petClothes) return 0
    let total = 0
    for (const slot of CLOTHING_SLOTS) {
      if (petClothes[slot]?.rarity !== 'none' && petClothes[slot]?.rarity !== 'common') {
        total += petClothes[slot]?.charm || 0
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
    const s = data.owner?.petStats
    if (!s) return { bonus: 1, detail: ['1.00'] }
    const isBonded = data.owner?.status === 'bonded'
    const petClothes = data.owner?.petClothes || {}
    const parts = []
    parts.push(this._statBonus(s.satiety, CONFIG.SATIETY_OPTIMAL_MIN, CONFIG.SATIETY_OPTIMAL_MAX, 2))
    parts.push(this._statBonus(s.energy, CONFIG.ENERGY_OPTIMAL_MIN, CONFIG.ENERGY_OPTIMAL_MAX, 1))
    if (isBonded) {
      parts.push(this._statBonus(s.pain, CONFIG.PAIN_OPTIMAL_MIN, CONFIG.PAIN_OPTIMAL_MAX, 1))
    }
    parts.push(this._statBonus(s.sensitivity, CONFIG.SENSITIVITY_OPTIMAL_MIN, CONFIG.SENSITIVITY_OPTIMAL_MAX, 1))
    parts.push(this._statBonus(s.hygiene, CONFIG.HYGIENE_OPTIMAL_MIN, CONFIG.HYGIENE_OPTIMAL_MAX, 1))
    let clothingBonus = 0
    for (const slot of CLOTHING_SLOTS) {
      const item = petClothes[slot]
      if (item && item.rarity !== 'none' && item.rarity !== 'common' && item.effect) {
        const rarity = EQUIPMENT_RARITY[item.rarity]
        if (rarity) clothingBonus += (rarity.multiplier - 1.0) * 0.1
      }
    }
    parts.push(clothingBonus)
    const bonus = 1 + parts.reduce((a, b) => a + b, 0)
    const detailLabels = []
    detailLabels.push(`饱${(1 + parts[0]).toFixed(1)}`)
    detailLabels.push(`体${(1 + parts[1]).toFixed(1)}`)
    let pi = 2
    if (isBonded) {
      detailLabels.push(`痛${(1 + parts[pi]).toFixed(1)}`)
      pi++
    }
    detailLabels.push(`敏${(1 + parts[pi]).toFixed(1)}`)
    pi++
    detailLabels.push(`洁${(1 + parts[pi]).toFixed(1)}`)
    pi++
    detailLabels.push(`装${(1 + parts[pi]).toFixed(1)}`)
    pi++
    const houseObj = HOUSES[data.owner?.petHouse]
    const houseGoldBonus = houseObj?.bonus?.goldBonus || 0
    const houseIntimacyPct = houseObj?.bonus?.intimacyPct || 0
    if (houseGoldBonus || houseIntimacyPct) {
      detailLabels.push(`房+${houseGoldBonus}金${houseIntimacyPct ? `/${houseIntimacyPct}%亲` : ''}`)
    }
    const detail = detailLabels
    return { bonus, detail }
  }

  getIntimacyLevel(intimacy) {
    let level = CONFIG.INTIMACY_LEVELS[0]
    for (const l of CONFIG.INTIMACY_LEVELS) {
      if (intimacy >= l.min) level = l
    }
    return level.name
  }

  getEvasionChance(obedience) {
    for (const tier of CONFIG.EVASION_TIERS) {
      if (obedience <= tier.max) return tier.chance
    }
    return 0
  }

  applyHouseBonus(data) {
    if (!data.owner) return
    const house = HOUSES[data.owner.petHouse]
    if (!house || !house.bonus) return
    if (house.bonus.intimacyPct && data.owner.intimacy > 0) {
      const gain = Math.max(1, Math.floor(data.owner.intimacy * house.bonus.intimacyPct / 100))
      data.owner.intimacy = Math.min(CONFIG.MAX_PROGRESS_STAT, data.owner.intimacy + gain)
    }
  }



}

export { makeDefaultPetSys, makeDefaultPetAchievements }
export default DataManager
