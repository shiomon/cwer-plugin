import plugin from '../../../lib/plugins/plugin.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { HOUSES, CMD_PREFIX } from '../config/cfg.js'
import { renderTemplate } from '../model/html-inject.js'
import { calculateDays } from '../model/utils.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const listHtmlPath = path.resolve(__dirname, '../resources/list.html')

class ListApp extends plugin {
  constructor() {
    super({
      name: 'Cwer-列表',
      dsc: '群关系总览',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: `^${CMD_PREFIX}列表.*`, fnc: 'showList' }
      ]
    })
    this.sys = global.cwerSys
  }

  async showList(e) {
    const groupId = String(e.group_id)
    const relations = this.sys.dm.findAllRelations(groupId)

    if (relations.length === 0) {
      return e.reply('本群还没有任何宠物关系~')
    }

    const relList = []
    for (const rel of relations) {
      const ownerData = this.sys.dm.readUserData(groupId, rel.ownerId)
      if (!ownerData || !ownerData.owner) continue

      const o = ownerData.owner
      const isBonded = o.status === 'bonded'
      const intimacy = o.intimacy || 0

      relList.push({
        ownerName: o.ownerName || '主人',
        petName: o.petName || '宠物',
        status: isBonded ? '缔约' : '领养',
        intimacyLevel: this.sys.dm.getIntimacyLevel(intimacy),
        intimacy,
        survivalDays: calculateDays(o.petSys?.startTimestamp),
        house: HOUSES[o.petHouse] ? HOUSES[o.petHouse].emoji + ' ' + HOUSES[o.petHouse].name : '破败小屋',
        goldCoins: o.petSys?.goldCoins || 0
      })
    }

    relList.sort((a, b) => {
      if (a.status === '缔约' && b.status !== '缔约') return -1
      if (a.status !== '缔约' && b.status === '缔约') return 1
      return b.intimacy - a.intimacy
    })

    relList.forEach((r, i) => { r.rank = i + 1 })

    try {
      await renderTemplate(e, listHtmlPath, '_list_temp.html', { relations: relList, totalCount: relList.length }, 'cwerList')
    } catch (error) {
      console.error('[Cwer] 列表面板渲染失败:', error)
      await e.reply('列表面板渲染失败，请稍后再试')
    }
  }
}

export default ListApp
