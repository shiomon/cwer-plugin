import plugin from '../../../lib/plugins/plugin.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { CONFIG, COMMON_SETS, SHOP_ITEMS, HOUSES, CMD_PREFIX, NO_PET_MSG } from '../config/cfg.js'
import { renderTemplate } from '../model/html-inject.js'

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
    const itemText = e.msg.replace(BUY_ITEM_REG, '').trim()
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData) return e.reply(NO_PET_MSG)

    const petData = this.sys.getPetData(groupId, userData)
    if (!petData) return e.reply(NO_PET_MSG)

    const item = this.sys.shop.findShopItemByCode(itemText) || this.sys.shop.findShopItem(itemText)
    if (!item) return e.reply('商店里没有这件商品，发送 #宠物商店 查看目录。')

    const currentMoney = petData.sys.goldCoins || 0
    if (currentMoney < item.cost) return e.reply(`金币不足！需要 ${item.cost} 金币，当前只有 ${currentMoney} 金币。`)

    if (item.type === 'clothing' && !this.sys.shop.allCommonBroken(petData)) return e.reply('调教装尚未解锁！需所有普通装耐久归零后解锁')

    const result = item.type === 'common_set' || item.type === 'clothing'
      ? this.sys.shop.executePurchase(petData, item, petData.pet?.intimacy || 0)
      : { success: false, message: '未知的商品类型' }

    if (!result.success) return e.reply(result.message)

    petData.sys.goldCoins = currentMoney - item.cost
    this.sys.es.tickTime(petData, CONFIG.SHOP_TIME_COST)
    this.sys.dm.addLog(petData, result.logText, '#ff66ff')
    this.sys.dm.saveUserData(petData, groupId)

    await e.reply(`${result.message}\n(花费 ${item.cost} 金币，剩余 ${petData.sys.goldCoins} 金币)`)
  }
}

export default ShopApp
