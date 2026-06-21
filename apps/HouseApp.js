import plugin from '../../../lib/plugins/plugin.js'
import { HOUSES, HOUSE_UPGRADE_ORDER, CONFIG, CMD_PREFIX } from '../config/cfg.js'

const FLOOR_MAP = { 'f1': 'cozy', 'f2': 'luxury', 'f3': 'palace' }
const BUY_HOUSE_REG = new RegExp(`^${CMD_PREFIX}买房`)

class HouseApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-房子',
      dsc: '购买升级房子',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: `^${CMD_PREFIX}买房.*`, fnc: 'buyHouse' }
      ]
    })
    this.sys = global.cwerSys
  }

  async buyHouse(e) {
    const input = e.msg.replace(BUY_HOUSE_REG, '').trim().toLowerCase()
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const asOwner = this.sys.dm.findRelationByOwner(groupId, userId)
    const asPet = this.sys.dm.findRelationByPet(groupId, userId)

    let data = null
    if (asOwner.length > 0) {
      data = this.sys.dm.readData(groupId, asOwner[0].ownerId, asOwner[0].petId)
    } else if (asPet) {
      data = this.sys.dm.readData(groupId, asPet.ownerId, asPet.petId)
    }

    if (!data) {
      return e.reply('请先领养宠物或者做别人的宠物，领养发送$领养或者@群友$抢')
    }

    let targetKey = FLOOR_MAP[input] || null
    if (!targetKey) {
      for (const [key, house] of Object.entries(HOUSES)) {
        if (key === 'broken') continue
        if (house.name === input || house.emoji + house.name === input) {
          targetKey = key
          break
        }
      }
    }
    if (!targetKey) {
      const available = Object.entries(HOUSES)
        .filter(([k]) => k !== 'broken')
        .map(([k, h]) => {
          const fKey = Object.entries(FLOOR_MAP).find(([, v]) => v === k)
          return fKey ? `${fKey[0]} ${h.emoji}${h.name}` : `${h.emoji}${h.name}`
        }).join('、')
      return e.reply(`未知的房子类型！可选：${available}`)
    }

    const result = this.sys.shop.purchaseHouse(data, targetKey)
    if (!result.success) return e.reply(result.message)

    this.sys.dm.addLog(data, result.logText, '#66ccff')
    this.sys.dm.saveData(data, groupId)

    await e.reply(`${result.message}\n(花费 ${result.cost} 金币，折旧抵扣 ${result.depreciation} 金币，实付 ${result.actualCost} 金币，剩余 ${data.sys.goldCoins} 金币)`)
  }
}

export default HouseApp
