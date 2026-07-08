import plugin from '../../../lib/plugins/plugin.js'
import { CMD_PREFIX, NO_PET_MSG, GROUP_ONLY_MSG } from '../config/cfg.js'

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
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const groupId = String(e.group_id)
    const userId = String(e.user_id)

    const userData = this.sys.dm.readUserData(groupId, userId)

    if (userData && userData.owner && userData.owner.petId) {
      userData._userId = userId
      const petData = this.sys.dm.extractPetData(userData)
      petData._userId = userData.owner.petId
      return await this.sys.renderer.renderPanel(e, petData, userData)
    }

    if (userData && userData.masterId) {
      const ownerData = this.sys.dm.readUserData(groupId, userData.masterId)
      if (ownerData && ownerData.owner && ownerData.owner.petId === userId) {
        ownerData._userId = userData.masterId
        const petData = this.sys.dm.extractPetData(ownerData)
        petData._userId = userId
        return await this.sys.renderer.renderPanel(e, petData, ownerData)
      }
    }

    return e.reply(NO_PET_MSG)
  }
}

export default PanelApp
