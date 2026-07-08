import plugin from '../../../lib/plugins/plugin.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { HOUSES, CMD_PREFIX, GROUP_ONLY_MSG } from '../config/cfg.js'
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
    if (!e.group_id) return e.reply(GROUP_ONLY_MSG)
    const groupId = String(e.group_id)
    const relations = this.sys.dm.findAllRelationsWithData(groupId)

    const relList = []
    let bondedCount = 0
    let claimedCount = 0

    for (const { ownerData } of relations) {
      if (!ownerData || !ownerData.owner) continue

      const o = ownerData.owner
      const isBonded = o.status === 'bonded'
      const intimacy = o.intimacy || 0
      const obedience = o.obedience || 0

      if (isBonded) bondedCount++
      else claimedCount++

      relList.push({
        ownerName: o.ownerName || '主人',
        petName: o.petName || '宠物',
        status: isBonded ? 'bonded' : 'claimed',
        intimacyLevel: this.sys.dm.getIntimacyLevel(intimacy),
        intimacy,
        obedience,
        lewd: o.lewd || 0,
        survivalDays: calculateDays(o.petSys?.startTimestamp),
        house: HOUSES[o.petHouse] ? HOUSES[o.petHouse].emoji + ' ' + HOUSES[o.petHouse].name : '破败小屋',
        goldCoins: o.petSys?.goldCoins || 0,

        evasion: isBonded ? 0 : this.sys.dm.getEvasionChance(obedience)
      })
    }

    relList.sort((a, b) => {
      if (a.status === 'bonded' && b.status !== 'bonded') return -1
      if (a.status !== 'bonded' && b.status === 'bonded') return 1
      return b.intimacy - a.intimacy
    })

    relList.forEach((r, i) => { r.rank = i + 1 })

    try {
      await renderTemplate(e, listHtmlPath, '_list_temp.html', {
        relations: relList,
        totalCount: relList.length,
        bondedCount,
        claimedCount
      }, 'cwerList')
    } catch (error) {
      logger.error('[Cwer] 列表面板渲染失败:', error)
      await e.reply('列表面板渲染失败，请稍后再试')
    }
  }
}

export default ListApp
