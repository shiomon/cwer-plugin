import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG, HOUSES } from '../config/cfg.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Version from '../components/Version.js'
import { injectAssets } from '../model/html-inject.js'
import { calculateDays } from '../model/utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const listHtmlPath = path.resolve(__dirname, '../resources/list.html')
const tempDir = path.resolve(__dirname, '../data')
const tempListPath = path.join(tempDir, '_list_temp.html')

class ListApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-列表',
      dsc: '群关系总览',
      event: 'message.group',
      priority: 5000,
      rule: [
        { reg: '^(?:#宠物|\\$)列表$', fnc: 'showList' }
      ]
    })
    this.sys = global.cwerSys
  }

  async showList(e) {
    const groupId = String(e.group_id)
    const relations = this.sys.dm.findAllRelations(groupId)

    if (relations.length === 0) {
      return e.reply('本群还没有任何宠物关系~')
    }

    const relList = []
    for (const rel of relations) {
      const data = this.sys.dm.readData(groupId, rel.ownerId, rel.petId)
      if (!data) continue

      relList.push({
        ownerName: data.relation.ownerName || rel.ownerId,
        petName: data.relation.petName || rel.petId,
        status: data.relation.status === 'bonded' ? '缔约' : '领养',
        intimacyLevel: this.sys.dm.getIntimacyLevel(data.stats.intimacy),
        intimacy: data.stats.intimacy,
        survivalDays: calculateDays(data.sys.startTimestamp),
        house: HOUSES[data.house]?.emoji + ' ' + HOUSES[data.house]?.name || '破败小屋',
        goldCoins: data.sys.goldCoins || 0
      })
    }

    relList.sort((a, b) => {
      if (a.status === '缔约' && b.status !== '缔约') return -1
      if (a.status !== '缔约' && b.status === '缔约') return 1
      return b.intimacy - a.intimacy
    })

    relList.forEach((r, i) => { r.rank = i + 1 })

    try {
      let htmlContent = fs.readFileSync(listHtmlPath, 'utf8')
      htmlContent = injectAssets(htmlContent)
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
      fs.writeFileSync(tempListPath, htmlContent, 'utf8')

      const renderData = {
        tplFile: tempListPath,
        relations: relList,
        totalCount: relList.length,
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
      const img = await puppeteer.screenshot('cwerList', renderData)
      if (img) {
        await e.reply(img)
      } else {
        await e.reply('列表面板渲染失败，请稍后再试')
      }
    } catch (error) {
      console.error('[Cwer] 列表面板渲染失败:', error)
      await e.reply('列表面板渲染失败，请稍后再试')
    }
  }
}

export default ListApp
