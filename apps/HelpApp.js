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
        await e.reply(this.getTextHelp())
      }
    } catch (error) {
      console.error('[Cwer] 帮助面板渲染失败:', error)
      await e.reply(this.getTextHelp())
    }
  }

  getTextHelp() {
    return `【宠物养成 - 帮助指南】

💡 所有指令均支持 #宠物xxx 和 $xxx 两种前缀

📋 关系指令：
  $领养@群友 - 指定领养(70%概率，失败+嘲讽)
  $领养 - 随机领养(70%概率，失败+嘲讽)
  $抢@群友 - 抢别人宠物(未缔约)
  $缔约 - 缔约(亲密≥299)
  $同意 - 同意缔约请求
  $不同意 - 拒绝缔约请求
  $解除 - 解除关系(30分钟冷却)

💕 宠爱(双方)：$投喂 $洗澡 $陪玩 $摸头 $拥抱 $送礼物
🔥 调教(缔约后)：$挠痒 $狗叫 $羞辱 $鞭打 $打脸 $打屁股 $禁闭 $振动 $滴蜡
  强制：$强制鞭打 $强制禁闭 $强制羞辱
🐾 宠物自主：$撒娇 $生气气 $讨好 $献媚 $求关注 $告状 $勾引 $冷战 $嘲讽
🛒 商店：$商店 $购买t1~t4 $购买y序号 $买房f1~f3
📊 查看：$面板 $成就 $列表`
  }
}

export default HelpApp
