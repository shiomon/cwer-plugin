import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, CMD_PREFIX, NO_PET_MSG, GROUP_ONLY_MSG } from '../config/cfg.js'
import { renderTemplate } from '../model/html-inject.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const shopHtmlPath = path.resolve(__dirname, '../resources/shop.html')

const BUY_ITEM_REG = new RegExp(`^${CMD_PREFIX}购买`)

class ShopApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-商店',
      dsc: '宠物商店与购买',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: `^${CMD_PREFIX}商店.*`, fnc: 'showShop' },
        { reg: `^${CMD_PREFIX}购买.*`, fnc: 'buyItem' }
      ]
    })
    this.sys = global.cwerSys
  }

  async showShop(e) {
    try {
      await renderTemplate(e, shopHtmlPath, '_shop_temp.html', {}, 'cwerShop')
    } catch (error) {
      console.error('[Cwer] 商店面板渲染失败:', error)
      await e.reply('商店面板渲染失败，请稍后再试')
    }
  }

  async buyItem(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const itemText = e.msg.replace(BUY_ITEM_REG, '').trim()
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const { ownerData, userData } = this.sys.dm.resolveOwnerData(groupId, userId)
    if (!ownerData || !ownerData.owner) return e.reply(NO_PET_MSG)
    ownerData._userId = userData.masterId || userId

    const item = this.sys.shop.findShopItemByCode(itemText) || this.sys.shop.findShopItem(itemText)
    if (!item) return e.reply('商店里没有这件商品，发送 #宠物商店 查看目录。')

    const currentMoney = ownerData.owner.petSys.goldCoins || 0
    if (currentMoney < item.cost) return e.reply(`金币不足！需要 ${item.cost} 金币，当前只有 ${currentMoney} 金币。`)

    const petData = this.sys.dm.extractPetData(ownerData)
    if (item.type === 'clothing' && !this.sys.shop.allCommonBroken(petData)) return e.reply('调教装尚未解锁！需所有普通装耐久归零后解锁')

    const result = item.type === 'common_set' || item.type === 'clothing'
      ? this.sys.shop.executePurchase(petData, item, ownerData.owner.intimacy || 0)
      : { success: false, message: '未知的商品类型' }

    if (!result.success) return e.reply(result.message)

    petData.sys.goldCoins = currentMoney - item.cost
    this.sys.dm.writePetData(ownerData, petData)
    this.sys.es.tickTime(ownerData, CONFIG.SHOP_TIME_COST)
    this.sys.dm.addLog(ownerData, result.logText, '#ff66ff')
    this.sys.dm.saveUserData(ownerData, groupId)

    await e.reply(`${result.message}\n(花费 ${item.cost} 金币，剩余 ${ownerData.owner.petSys.goldCoins} 金币)`)
  }
}

export default ShopApp
