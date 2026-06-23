import plugin from '../../../lib/plugins/plugin.js'
import { CMD_PREFIX, NO_PET_MSG } from '../config/cfg.js'

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
      return e.reply(NO_PET_MSG)
    }

    let petData = null
    if (userData.pet && userData.pet.ownerId) {
      petData = userData
      petData._userId = userId
    } else if (userData.owner && userData.owner.petId) {
      petData = this.sys.dm.readUserData(groupId, userData.owner.petId)
      if (petData) petData._userId = userData.owner.petId
    }

    if (!petData) {
      return e.reply(NO_PET_MSG)
    }

    await this.sys.renderer.renderPanel(e, petData)
  }
}

export default PanelApp
