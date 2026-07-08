import { CONFIG, CLOTHING_SLOTS, SHOP_ITEMS } from '../config/cfg.js'
import { calculateDays } from './utils.js'

class AchievementSystem {
  constructor(dataManager) {
    this.dm = dataManager
  }

  checkAchievements(ownerData) {
    const o = ownerData.owner
    if (!o) return
    const newAchievements = []
    o.petAchievements.totalCharm = this.dm.getTotalCharm(ownerData)
    o.petAchievements.survivalDays = Math.max(o.petAchievements.survivalDays || 0, calculateDays(o.petSys.startTimestamp))

    for (const [key, achievement] of Object.entries(CONFIG.ACHIEVEMENTS)) {
      if (o.petSys.achievements.includes(key)) continue
      let unlocked = false
      const ach = achievement

      if (ach.type === 'first_reach') {
        const statVal = o.petStats[ach.stat] || 0
        const reachedKey = `${key}_reached`
        if (statVal >= ach.value && !o.petSys.firstReach[reachedKey]) {
          o.petSys.firstReach[reachedKey] = true
          unlocked = true
        }
      } else if (ach.type === 'consecutive') {
        unlocked = this.dm.checkConsecutive(ownerData, ach.stat, ach.value, ach.count)
      } else if (ach.type === 'reach_zero') {
        unlocked = (o.petStats[ach.stat] || 0) <= 0
      } else if (ach.type === 'revive_from_zero') {
        const histKey = `${ach.stat}_revived`
        if (o.petSys.firstReach[histKey] && (o.petStats[ach.stat] || 0) > 0) {
          unlocked = true
        }
      } else if (ach.type === 'shop_buy') {
        unlocked = (o.petAchievements.shopBuyCount || 0) >= ach.target
      } else if (ach.type === 'shop_all') {
        unlocked = (o.petAchievements.shopBoughtItems?.length || 0) >= Object.keys(SHOP_ITEMS).length
      } else if (ach.type === 'clothes_count') {
        const count = o.petAchievements.clothesCount?.[ach.slot] || 0
        unlocked = count >= ach.target
      } else if (ach.type === 'full_mythic') {
        unlocked = CLOTHING_SLOTS.every(slot => o.petClothes[slot]?.rarity === 'mythic')
      } else if (ach.type === 'destroy_master') {
        unlocked = (o.petAchievements.destroyMasterCount || 0) >= ach.target
      } else if (ach.type === 'naked_days') {
        unlocked = (o.petAchievements.nakedDays || 0) >= ach.target
      } else if (ach.type === 'house') {
        unlocked = o.petHouse === ach.house
      } else {
        switch (key) {
          case 'first_pet':
          case 'pet_200':
          case 'pet_500':
            unlocked = (o.petAchievements.totalPet || 0) >= ach.target
            break
          case 'obedience_66':
          case 'obedience_299':
          case 'obedience_520':
          case 'obedience_888':
          case 'obedience_1314':
            unlocked = (o.obedience || 0) >= ach.target
            break
          case 'lewd_66':
          case 'lewd_299':
          case 'lewd_520':
          case 'lewd_888':
          case 'lewd_1314':
            unlocked = (o.lewd || 0) >= ach.target
            break
          case 'intimacy_299':
          case 'intimacy_520':
          case 'intimacy_666':
          case 'intimacy_999':
          case 'intimacy_1314':
            unlocked = (o.intimacy || 0) >= ach.target
            break
          case 'survivor_3':
          case 'survivor_30':
          case 'survivor_99':
          case 'survivor_520':
          case 'survivor_1314':
            unlocked = Math.max(o.petAchievements.survivalDays || 0, calculateDays(o.petSys.startTimestamp)) >= ach.target
            break
          case 'breaker_5':
          case 'breaker_10':
            unlocked = (o.petAchievements.clothesBroken || 0) >= ach.target
            break
          case 'charm_520':
          case 'charm_1314':
          case 'charm_3640':
            unlocked = (o.petAchievements.totalCharm || 0) >= ach.target
            break
        }
      }

      if (unlocked) {
        o.petSys.achievements.push(key)
        o.petSys.goldCoins += ach.reward
        newAchievements.push(ach)
      }
    }

    if (newAchievements.length > 0) {
      const achievementNames = newAchievements.map(a => `【${a.name}】`).join('、')
      this.dm.addLog(ownerData, `解锁成就：${achievementNames}`, '#ffcc00')
    }
  }
}

export default AchievementSystem