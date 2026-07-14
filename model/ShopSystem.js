import { CONFIG, CLOTHING_DB, SHOP_ITEMS, COMMON_SETS, EQUIPMENT_RARITY, CLOTHING_SLOTS, SLOT_NAMES, generateRandomEffect, HOUSES, HOUSE_UPGRADE_ORDER, randomSkipSlots } from '../config/cfg.js'


class ShopSystem {
  constructor(dataManager) {
    this.dm = dataManager
  }

  allCommonBroken(data) {
    return CLOTHING_SLOTS.every(slot => {
      const c = data.clothes?.[slot]
      return !c || c.rarity === 'none' || c.rarity !== 'common' || (c.dur !== undefined && c.dur <= 0)
    })
  }

  findShopItem(itemText) {
    if (SHOP_ITEMS[itemText]) return { name: itemText, ...SHOP_ITEMS[itemText] }
    for (const [code, set] of Object.entries(COMMON_SETS)) {
      if (set.name === itemText) return { name: set.name, type: 'common_set', code, cost: set.cost }
    }
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
      const items = Object.keys(SHOP_ITEMS).sort().filter(k => SHOP_ITEMS[k].type === 'clothing')
      if (index < 0 || index >= items.length) return null
      const name = items[index]
      return { name, ...SHOP_ITEMS[name] }
    }
    return null
  }

  executePurchase(data, item) {
    try {
      if (item.type === 'common_set') {
        return this.purchaseCommonSet(data, item)
      } else if (item.type === 'clothing') {
        return this.purchaseClothing(data, item)
      }
      return { success: false, message: '未知的商品类型' }
    } catch (error) {
      logger.error('[Cwer] 购买商品失败:', error)
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

    randomSkipSlots(data.clothes, { name: '未穿', rarity: 'none', charm: 0, dur: 0, effect: null })

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
        return c && c.rarity === 'common' && c.dur !== undefined && c.dur > 0
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
    if (!data.achievements.shopBoughtItems) data.achievements.shopBoughtItems = []
    if (!data.achievements.shopBoughtItems.includes(item.name)) data.achievements.shopBoughtItems.push(item.name)

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
    const depreciation = Math.floor((currentHouse.cost || 0) * CONFIG.HOUSE_DEPRECIATION_RATE)
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


}

export default ShopSystem
