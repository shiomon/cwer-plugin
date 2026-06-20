import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG } from '../config/cfg.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ver, name, yunzai } from '../components/Version.js'
import { injectAssets } from '../model/html-inject.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const achHtmlPath = path.resolve(__dirname, '../resources/achievement.html')
const tempDir = path.resolve(__dirname, '../data')
const tempAchPath = path.join(tempDir, '_ach_temp.html')

class AchievementApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-成就',
      dsc: '查看成就',
      event: 'message.group',
      priority: 5000,
      rule: [
        { reg: '^(?:#宠物|\\$)成就$', fnc: 'showAchievements' }
      ]
    })
    this.sys = global.cwerSys
  }

  async showAchievements(e) {
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

    const unlocked = data.sys.achievements || []
    const total = Object.keys(CONFIG.ACHIEVEMENTS).length

    const achievements = []
    for (const [key, ach] of Object.entries(CONFIG.ACHIEVEMENTS)) {
      achievements.push({
        key,
        name: ach.name,
        desc: ach.desc,
        reward: ach.reward,
        unlocked: unlocked.includes(key)
      })
    }

    try {
      let htmlContent = fs.readFileSync(achHtmlPath, 'utf8')
      htmlContent = injectAssets(htmlContent)
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
      fs.writeFileSync(tempAchPath, htmlContent, 'utf8')

      const renderData = {
        tplFile: tempAchPath,
        achievements,
        unlockedCount: unlocked.length,
        achievementCount: total,
        pluginVer: ver,
        yunzaiName: name,
        yunzaiVer: yunzai,
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
      const img = await puppeteer.screenshot('cwerAch', renderData)
      if (img) {
        await e.reply(img)
      } else {
        await e.reply('成就面板渲染失败，请稍后再试')
      }
    } catch (error) {
      console.error('[Cwer] 成就面板渲染失败:', error)
      await e.reply('成就面板渲染失败，请稍后再试')
    }
  }
}

export default AchievementApp
