import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, COMMON_SETS, SHOP_ITEMS, HOUSES } from '../config/cfg.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Version from '../components/Version.js'
import { injectAssets } from '../model/html-inject.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const shopHtmlPath = path.resolve(__dirname, '../resources/shop.html')
const tempDir = path.resolve(__dirname, '../data')
const tempShopPath = path.join(tempDir, '_shop_temp.html')

class ShopApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-商店',
      dsc: '宠物商店与购买',
      event: 'message.group',
      priority: 5000,
      rule: [
        { reg: '^(?:#宠物|\\$)商店$', fnc: 'showShop' },
        { reg: '^(?:#宠物|\\$)购买', fnc: 'buyItem' }
      ]
    })
    this.sys = global.cwerSys
  }

  async showShop(e) {
    const groupId = String(e.group_id)
    try {
      let htmlContent = fs.readFileSync(shopHtmlPath, 'utf8')
      htmlContent = injectAssets(htmlContent)
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
      fs.writeFileSync(tempShopPath, htmlContent, 'utf8')

      const renderData = {
        tplFile: tempShopPath,
        pluginVer: Version.ver,
        yunzaiName: Version.name,
        yunzaiVer: Version.yunzai,
        imgType: 'jpeg',
        quality: 100,
        pageGotoParams: { waitUntil: 'networkidle0' },
        beforeScreenshot: async (page) => {
          await page.waitForFunction('window.__cwerReady === true', { timeout: 10000 }).catch(() => {})
          const body = await page.$('#container') || await page.$('body')
          const box = await body.boundingBox()
          if (box) {
            await page.setViewport({ width: Math.ceil(box.width) + 60, height: Math.ceil(box.height) + 100 })
          }
        }
      }

      const puppeteer = (await import('../../../lib/puppeteer/puppeteer.js')).default
      const img = await puppeteer.screenshot('cwerShop', renderData)
      if (img) {
        await e.reply(img)
      } else {
        const data = this.findAnyData(groupId)
        const msg = this.sys.shop.formatShopMessage(data?.sys?.goldCoins || 0, data?.stats?.intimacy || 0)
        await e.reply(msg)
      }
    } catch (error) {
      console.error('[Cwer] 商店面板渲染失败:', error)
      const data = this.findAnyData(groupId)
      const msg = this.sys.shop.formatShopMessage(data?.sys?.goldCoins || 0, data?.stats?.intimacy || 0)
      await e.reply(msg)
    }
  }

  async buyItem(e) {
    const itemText = e.msg.replace(/^(?:#宠物|\$)购买/, '').trim()
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

    if (!data) return e.reply('你还没有任何宠物关系')

    const item = this.sys.shop.findShopItemByCode(itemText) || this.sys.shop.findShopItem(itemText)
    if (!item) return e.reply('商店里没有这件商品，发送 #宠物商店 查看目录。')

    const currentMoney = data.sys.goldCoins || 0
    if (currentMoney < item.cost) {
      return e.reply(`金币不足！需要 ${item.cost} 金币，当前只有 ${currentMoney} 金币。`)
    }

    if (item.type === 'clothing' && !this.sys.shop.allCommonBroken(data)) {
      return e.reply('调教装尚未解锁！需所有普通装耐久归零后解锁')
    }

    const result = item.type === 'common_set' || item.type === 'clothing'
      ? this.sys.shop.executePurchase(data, item, data.stats.intimacy)
      : { success: false, message: '未知的商品类型' }

    if (!result.success) return e.reply(result.message)

    data.sys.goldCoins = currentMoney - item.cost
    this.sys.es.tickTime(data, CONFIG.SHOP_TIME_COST)
    this.sys.dm.addLog(data, result.logText, '#ff66ff')
    this.sys.dm.saveData(data, groupId)

    await e.reply(`${result.message}\n(花费 ${item.cost} 金币，剩余 ${data.sys.goldCoins} 金币)`)
  }

  findAnyData(groupId) {
    const rels = this.sys.dm.findAllRelations(groupId)
    for (const rel of rels) {
      const data = this.sys.dm.readData(groupId, rel.ownerId, rel.petId)
      if (data) return data
    }
    return null
  }
}

export default ShopApp