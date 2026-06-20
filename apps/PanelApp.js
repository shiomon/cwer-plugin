import plugin from '../../../lib/plugins/plugin.js'
import { CONFIG } from '../config/cfg.js'

class PanelApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-面板',
      dsc: '查看宠物面板',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: '^([#＃]宠物|\\$)面板.*', fnc: 'showPanel' }
      ]
    })
    this.sys = global.cwerSys
  }

  async showPanel(e) {
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

    await this.sys.renderer.renderPanel(e, data)
  }
}

export default PanelApp