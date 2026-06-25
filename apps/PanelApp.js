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

    const { ownerData, userData } = this.sys.dm.resolveOwnerData(groupId, userId)
    if (!ownerData || !ownerData.owner) return e.reply(NO_PET_MSG)

    const petData = this.sys.dm.extractPetData(ownerData)
    petData._userId = userData.masterId || ownerData.owner.petId
    return await this.sys.renderer.renderPanel(e, petData, ownerData)
  }
}

export default PanelApp
