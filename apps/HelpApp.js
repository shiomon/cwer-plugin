import plugin from '../../../lib/plugins/plugin.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { CMD_PREFIX, GROUP_ONLY_MSG } from '../config/cfg.js'
import { renderTemplate } from '../model/html-inject.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const helpHtmlPath = path.resolve(__dirname, '../resources/help.html')

class HelpApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-帮助',
      dsc: '帮助指南',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: `^${CMD_PREFIX}帮助.*`, fnc: 'showHelp' }
      ]
    })
    this.sys = global.cwerSys
  }

  async showHelp(e) {
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    try {
      await renderTemplate(e, helpHtmlPath, '_help_temp.html', {}, 'cwerHelp')
    } catch (error) {
      logger.error('[Cwer] 帮助面板渲染失败:', error)
      await e.reply('帮助面板渲染失败，请稍后再试')
    }
  }
}

export default HelpApp
