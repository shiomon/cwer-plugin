import plugin from '../../../lib/plugins/plugin.js'
import { HOUSES, CMD_PREFIX, NO_PET_MSG } from '../config/cfg.js'

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

    const { ownerData, userData } = this.sys.dm.resolveOwnerData(groupId, userId)
    if (!ownerData || !ownerData.owner) return e.reply(NO_PET_MSG)
    ownerData._userId = userData.masterId || userId

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

    const petData = this.sys.dm.extractPetData(ownerData)
    const result = this.sys.shop.purchaseHouse(petData, targetKey)
    if (!result.success) return e.reply(result.message)

    this.sys.dm.writePetData(ownerData, petData)
    this.sys.dm.addLog(ownerData, result.logText, '#66ccff')
    this.sys.dm.saveUserData(ownerData, groupId)

    await e.reply(`${result.message}\n(花费 ${result.cost} 金币，折旧抵扣 ${result.depreciation} 金币，实付 ${result.actualCost} 金币，剩余 ${ownerData.owner.petSys.goldCoins} 金币)`)
  }
}

export default HouseApp
