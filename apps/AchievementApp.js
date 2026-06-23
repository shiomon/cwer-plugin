import plugin from '../../../lib/plugins/plugin.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { CONFIG, CMD_PREFIX, NO_PET_MSG } from '../config/cfg.js'
import { renderTemplate } from '../model/html-inject.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const achHtmlPath = path.resolve(__dirname, '../resources/achievement.html')


class AchievementApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-成就',
      dsc: '查看成就',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: `^${CMD_PREFIX}成就.*`, fnc: 'showAchievements' }
      ]
    })
    this.sys = global.cwerSys
  }

  async showAchievements(e) {
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData) return e.reply(NO_PET_MSG)

    const petData = this.sys.getPetData(groupId, userData)
    if (!petData) return e.reply(NO_PET_MSG)

    const unlocked = petData.sys.achievements || []
    const total = Object.keys(CONFIG.ACHIEVEMENTS).length

    const achievements = []
    for (const [key, ach] of Object.entries(CONFIG.ACHIEVEMENTS)) {
      achievements.push({ key, name: ach.name, desc: ach.desc, reward: ach.reward, unlocked: unlocked.includes(key) })
    }

    try {
      await renderTemplate(e, achHtmlPath, '_ach_temp.html', { achievements, unlockedCount: unlocked.length, achievementCount: total }, 'cwerAch')
    } catch (error) {
      console.error('[Cwer] 成就面板渲染失败:', error)
      await e.reply('成就面板渲染失败，请稍后再试')
    }
  }

}

export default AchievementApp
