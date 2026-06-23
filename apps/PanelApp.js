import plugin from '../../../lib/plugins/plugin.js'
import { CMD_PREFIX } from '../config/cfg.js'

class PanelApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-面板',
      dsc: '查看宠物面板',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: `^${CMD_PREFIX}面板.*`, fnc: 'showPanel' }
      ]
    })
    this.sys = global.cwerSys
  }

  async showPanel(e) {
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const userData = this.sys.dm.readUserData(groupId, userId)
    if (!userData) {
      return e.reply('你还没有宠物哦，\n可发 $领养 随机或 $领养@群友 也可 $抢@群友，\n如已被领养可发 $缔约主人')
    }

    let petData = null
    if (userData.owner && userData.owner.petId) {
      petData = this.sys.dm.readUserData(groupId, userData.owner.petId)
      if (petData) petData._userId = userData.owner.petId
    } else if (userData.pet && userData.pet.ownerId) {
      petData = userData
      petData._userId = userId
    }

    if (!petData) {
      return e.reply('你还没有宠物哦，\n可发 $领养 随机或 $领养@群友 也可 $抢@群友，\n如已被领养可发 $缔约主人')
    }

    await this.sys.renderer.renderPanel(e, petData)
  }
}

export default PanelApp
