import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Version from '../components/Version.js'
import { injectAssets } from '../model/html-inject.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const helpHtmlPath = path.resolve(__dirname, '../resources/help.html')
const tempDir = path.resolve(__dirname, '../data')
const tempHelpPath = path.join(tempDir, '_help_temp.html')

class HelpApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-帮助',
      dsc: '帮助指南',
      event: 'message.group',
      priority: 5000,
      rule: [
        { reg: '^(?:#宠物|\\$)帮助$', fnc: 'showHelp' }
      ]
    })
    this.sys = global.cwerSys
  }

  async showHelp(e) {
    try {
      let htmlContent = fs.readFileSync(helpHtmlPath, 'utf8')
      htmlContent = injectAssets(htmlContent)
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
      fs.writeFileSync(tempHelpPath, htmlContent, 'utf8')

      const renderData = {
        tplFile: tempHelpPath,
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
      const img = await puppeteer.screenshot('cwerHelp', renderData)
      if (img) {
        await e.reply(img)
      } else {
        await e.reply('帮助面板渲染失败，请稍后再试')
      }
    } catch (error) {
      console.error('[Cwer] 帮助面板渲染失败:', error)
      await e.reply('帮助面板渲染失败，请稍后再试')
    }
  }
}

export default HelpApp
