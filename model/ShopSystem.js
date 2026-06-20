import { CONFIG, CLOTHING_DB, SHOP_ITEMS, COMMON_SETS, EQUIPMENT_RARITY, CLOTHING_SLOTS, generateRandomEffect, HOUSES, HOUSE_UPGRADE_ORDER } from '../config/cfg.js'
import { calculateDays } from './utils.js'

const SLOT_NAMES = {
  head: '头饰', upper: '上装', lower: '下装', bra: '胸罩', panty: '内裤', accessory: '饰品', shoes: '鞋子'
}

class ShopSystem {
  constructor(dataManager) {
    this.dm = dataManager
  }

  formatShopMessage(goldCoins, intimacy) {
    let msg = `【宠物商店】(当前金币: ${goldCoins})\n`
    msg += `指令格式: #宠物购买[商品名] / #宠物购买t[1-4]套装 / #宠物购买y[序号]换装\n\n`

    const allCommonBroken = this.allCommonBroken({ clothes: {} })

    msg += `【普通套装】\n`
    for (const [code, set] of Object.entries(COMMON_SETS)) {
      msg += `${code}: ${set.name} - ${set.cost}金币\n`
    }
    msg += `\n`

    if (allCommonBroken) {
      const clothingItems = []
      for (const [name, item] of Object.entries(SHOP_ITEMS)) {
        if (item.type === 'clothing') {
          const [firstSlot, firstIdx] = item.items[0].split(':')
          const clothingData = CLOTHING_DB[firstSlot][parseInt(firstIdx)]
          const rarity = EQUIPMENT_RARITY[clothingData.rarity]
          clothingItems.push({ name, cost: item.cost, desc: `${rarity.name}` })
        }
      }
      msg += `【稀有+换装】\n`
      clothingItems.forEach((item, index) => {
        msg += `y${index + 1}. ${item.name} (${item.desc}) - ${item.cost}币\n`
      })
    } else {
      msg += `【稀有+换装】🔒 需所有普通装破损后解锁\n`
    }

    msg += `\n【房子】\n`
    for (const [key, house] of Object.entries(HOUSES)) {
      if (key === 'broken') continue
      msg += `${house.emoji} ${house.name} - ${house.cost}金币\n`
    }

    return msg
  }

  allCommonBroken(data) {
    return CLOTHING_SLOTS.every(slot => {
      const c = data.clothes?.[slot]
      return !c || c.rarity === 'none' || (c.rarity === 'common' && (c.dur === undefined || c.dur <= 0))
    })
  }

  findShopItem(itemText) {
    if (SHOP_ITEMS[itemText]) return { name: itemText, ...SHOP_ITEMS[itemText] }
    return null
  }

  findShopItemByCode(code) {
    const setMatch = code.match(/^t(\d+)$/i)
    if (setMatch) {
      const key = `t${setMatch[1]}`
      if (COMMON_SETS[key]) return { name: COMMON_SETS[key].name, type: 'common_set', code: key, cost: COMMON_SETS[key].cost }
      return null
    }
    const yMatch = code.match(/^y(\d+)$/i)
    if (yMatch) {
      const index = parseInt(yMatch[1]) - 1
      const items = Object.entries(SHOP_ITEMS).filter(([, v]) => v.type === 'clothing')
      if (index < 0 || index >= items.length) return null
      const [name, item] = items[index]
      return { name, ...item }
    }
    return null
  }

  executePurchase(data, item, intimacy) {
    try {
      if (item.type === 'common_set') {
        return this.purchaseCommonSet(data, item)
      } else if (item.type === 'clothing') {
        return this.purchaseClothing(data, item)
      }
      return { success: false, message: '未知的商品类型' }
    } catch (error) {
      console.error('[Cwer] 购买商品失败:', error)
      return { success: false, message: `购买失败: ${error.message}` }
    }
  }

  purchaseCommonSet(data, item) {
    const set = COMMON_SETS[item.code]
    if (!set) return { success: false, message: '套装不存在' }
    const clothingStr = []
    for (const [slot, idx] of Object.entries(set.items)) {
      const clothingData = CLOTHING_DB[slot]?.[idx]
      if (!clothingData) continue
      data.clothes[slot] = {
        name: clothingData.name,
        rarity: clothingData.rarity,
        dur: clothingData.rarity === 'common' ? 100 : undefined,
        charm: 0,
        effect: null
      }
      clothingStr.push(clothingData.name)
    }

    const allSlots = [...CLOTHING_SLOTS]
    const shuffled = allSlots.sort(() => Math.random() - 0.5)
    const skipSlots = new Set([shuffled[0], shuffled[1]])
    for (const slot of skipSlots) {
      data.clothes[slot] = { name: '未穿', rarity: 'none', charm: 0, dur: 0, effect: null }
    }

    return {
      success: true,
      message: `换上了【${set.name}】！耐久已刷新${clothingStr.join('、')}`,
      logText: `购买并换上了【${set.name}】！耐久已刷新`
    }
  }

  purchaseClothing(data, item) {
    if (!this.allCommonBroken(data)) {
      const wornSlots = CLOTHING_SLOTS.filter(slot => {
        const c = data.clothes[slot]
        return c && c.rarity === 'common' && (c.dur === undefined || c.dur > 0)
      })
      const wornNames = wornSlots.map(s => SLOT_NAMES[s]).join('、')
      return {
        success: false,
        message: `宠物身上还有${wornNames}未脱净，无法购买调教装！\n💡 提示：当所有普通装耐久归零后，商店将开放调教装购买权限。`
      }
    }

    const clothingStr = []
    const effectsApplied = []
    for (const itemSpec of item.items) {
      const [slot, index] = itemSpec.split(':')
      if (!CLOTHING_DB[slot]) continue
      const clothingData = CLOTHING_DB[slot][parseInt(index)]
      if (!clothingData) continue
      const newRarity = clothingData.rarity
      const rarityInfo = EQUIPMENT_RARITY[newRarity]
      if (!rarityInfo) continue
      const effect = generateRandomEffect(rarityInfo.effectCount)
      const charmRange = rarityInfo.charmRange
      const charm = charmRange
        ? charmRange[0] + Math.floor(Math.random() * (charmRange[1] - charmRange[0] + 1))
        : (rarityInfo.charm || 0)
      data.clothes[slot] = { name: clothingData.name, rarity: newRarity, charm, effect }
      if (!data.achievements.clothesCount) data.achievements.clothesCount = {}
      data.achievements.clothesCount[slot] = (data.achievements.clothesCount[slot] || 0) + 1
      clothingStr.push(clothingData.name)
      effectsApplied.push(effect)
    }

    for (const effect of effectsApplied) {
      for (const [stat, value] of Object.entries(effect)) {
        if (data.stats[stat] !== undefined) {
          data.stats[stat] = this.dm.clampStat(stat, data.stats[stat] + value)
        }
      }
    }

    data.achievements.totalCharm = this.dm.getTotalCharm(data)
    if (!data.achievements.shopBuyCount) data.achievements.shopBuyCount = 0
    data.achievements.shopBuyCount++

    if (clothingStr.length === 0) {
      return { success: false, message: '购买失败：商品数据异常' }
    }
    return {
      success: true,
      message: `购买并装备了【${clothingStr.join('、')}】！`,
      logText: `购买并装备了【${clothingStr.join('、')}】！`
    }
  }

  purchaseHouse(data, houseKey) {
    const house = HOUSES[houseKey]
    if (!house) return { success: false, message: '未知的房子类型' }
    const currentIndex = HOUSE_UPGRADE_ORDER.indexOf(data.house)
    const targetIndex = HOUSE_UPGRADE_ORDER.indexOf(houseKey)
    if (targetIndex <= currentIndex) {
      return { success: false, message: '你已经拥有这个或更好的房子了！' }
    }
    const currentHouse = HOUSES[data.house]
    const depreciation = Math.floor((currentHouse.cost || 0) * 0.6)
    const actualCost = house.cost - depreciation
    const currentMoney = data.sys.goldCoins || 0
    if (currentMoney < actualCost) {
      return { success: false, message: `金币不足！需要 ${actualCost} 金币（原价${house.cost}，折旧抵扣${depreciation}），当前只有 ${currentMoney} 金币。` }
    }
    data.house = houseKey
    data.sys.goldCoins = currentMoney - actualCost
    return {
      success: true,
      message: `入住${house.emoji}${house.name}！`,
      logText: `入住了${house.emoji}${house.name}！`,
      cost: house.cost,
      depreciation,
      actualCost
    }
  }

  checkAchievements(data) {
    const newAchievements = []
    data.achievements.totalCharm = this.dm.getTotalCharm(data)
    data.achievements.survivalDays = Math.max(data.achievements.survivalDays || 0, calculateDays(data.sys.startTimestamp))
    this.dm.updateStatHistory(data)

    for (const [key, achievement] of Object.entries(CONFIG.ACHIEVEMENTS)) {
      if (data.sys.achievements.includes(key)) continue
      let unlocked = false
      const ach = achievement

      if (ach.type === 'first_reach') {
        const statVal = data.stats[ach.stat] || 0
        const reachedKey = `${key}_reached`
        if (statVal >= ach.value && !data.sys.firstReach[reachedKey]) {
          data.sys.firstReach[reachedKey] = true
          unlocked = true
        }
      } else if (ach.type === 'consecutive') {
        unlocked = this.dm.checkConsecutive(data, ach.stat, ach.value, ach.count)
      } else if (ach.type === 'reach_zero') {
        unlocked = (data.stats[ach.stat] || 0) <= 0
      } else if (ach.type === 'revive_from_zero') {
        const histKey = `${ach.stat}_revived`
        if (data.sys.firstReach[histKey] && (data.stats[ach.stat] || 0) > 0) {
          unlocked = true
        }
      } else if (ach.type === 'shop_buy') {
        unlocked = (data.achievements.shopBuyCount || 0) >= ach.target
      } else if (ach.type === 'shop_all') {
        unlocked = (data.achievements.shopBuyCount || 0) >= Object.keys(SHOP_ITEMS).length
      } else if (ach.type === 'clothes_count') {
        const count = data.achievements.clothesCount?.[ach.slot] || 0
        unlocked = count >= ach.target
      } else if (ach.type === 'full_mythic') {
        unlocked = CLOTHING_SLOTS.every(slot => data.clothes[slot]?.rarity === 'mythic')
      } else if (ach.type === 'destroy_master') {
        unlocked = (data.achievements.destroyMasterCount || 0) >= ach.target
      } else if (ach.type === 'naked_days') {
        unlocked = (data.achievements.nakedDays || 0) >= ach.target
      } else if (ach.type === 'house') {
        unlocked = data.house === ach.house
      } else {
        switch (key) {
          case 'first_pet':
          case 'pet_200':
          case 'pet_500':
            unlocked = (data.achievements.totalPet || 0) >= ach.target
            break
          case 'obedience_66':
          case 'obedience_299':
          case 'obedience_520':
          case 'obedience_888':
          case 'obedience_1314':
            unlocked = (data.stats.obedience || 0) >= ach.target
            break
          case 'lewd_66':
          case 'lewd_299':
          case 'lewd_520':
          case 'lewd_888':
          case 'lewd_1314':
            unlocked = (data.stats.lewd || 0) >= ach.target
            break
          case 'intimacy_299':
          case 'intimacy_520':
          case 'intimacy_888':
          case 'intimacy_1314':
            unlocked = (data.stats.intimacy || 0) >= ach.target
            break
          case 'survivor_3':
          case 'survivor_30':
          case 'survivor_99':
          case 'survivor_520':
          case 'survivor_1314':
            unlocked = Math.max(data.achievements.survivalDays || 0, calculateDays(data.sys.startTimestamp)) >= ach.target
            break
          case 'breaker_5':
          case 'breaker_10':
            unlocked = (data.achievements.clothesBroken || 0) >= ach.target
            break
          case 'charm_520':
          case 'charm_1314':
          case 'charm_3640':
            unlocked = (data.achievements.totalCharm || 0) >= ach.target
            break
        }
      }

      if (unlocked) {
        data.sys.achievements.push(key)
        data.sys.goldCoins += ach.reward
        newAchievements.push(ach)
      }
    }

    if (newAchievements.length > 0) {
      const achievementNames = newAchievements.map(a => `【${a.name}】`).join('、')
      this.dm.addLog(data, `解锁成就：${achievementNames}`, '#ffcc00')
    }
  }
}

export default ShopSystem