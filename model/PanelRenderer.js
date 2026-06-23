import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { CONFIG, EQUIPMENT_RARITY, CLOTHING_SLOTS, SLOT_NAMES, HOUSES, LOCATIONS } from '../config/cfg.js'
import { calculateDays } from './utils.js'
import { renderTemplate } from './html-inject.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const htmlSrc = path.join(__dirname, '..', 'resources', 'panel.html')

const STAT_NAMES = {
  lewd: '涩', obedience: '服', intimacy: '亲', pain: '痛', sensitivity: '敏', satiety: '饱', energy: '体', hygiene: '洁'
}

class PanelRenderer {
  constructor(dataManager) {
    this.dm = dataManager
  }

  buildRenderData(data) {
    const st = data.stats
    const pet = data.pet
    const isBonded = pet?.status === 'bonded'
    const house = HOUSES[data.house] || HOUSES.broken

    const slotList = CLOTHING_SLOTS.map(key => ({ key, label: SLOT_NAMES[key] || key }))

    const clothes = {}
    let totalCharm = 0
    let totalEffects = {}
    for (const slot of CLOTHING_SLOTS) {
      const item = data.clothes[slot]
      if (!item) continue
      const rarityInfo = EQUIPMENT_RARITY[item.rarity]
      const isEmpty = item.rarity === 'none' || (item.rarity === 'common' && item.dur !== undefined && item.dur <= 0)
      const charm = item.charm || 0
      if (!isEmpty) totalCharm += charm
      if (item.effect && !isEmpty) {
        for (const [stat, val] of Object.entries(item.effect)) {
          totalEffects[stat] = (totalEffects[stat] || 0) + val
        }
      }
      clothes[slot] = {
        name: isEmpty ? '未穿' : item.name,
        isEmpty,
        rarity: item.rarity,
        rarityName: item.rarity !== 'none' ? rarityInfo?.name : '',
        rarityColor: rarityInfo?.color || '#aaa',
        charm,
        dur: item.dur,
        effectText: (item.effect && !isEmpty) ? Object.entries(item.effect).map(([k, v]) => `${STAT_NAMES[k] || k}${v > 0 ? '+' : ''}${v}`).join(' ') : ''
      }
    }

    const totalEffectText = Object.entries(totalEffects).map(([k, v]) => `${STAT_NAMES[k] || k}${v > 0 ? '+' : ''}${v}`).join(' ')

    const statusText = this.generateStatusText(st, pet)
    const unlockedAchievements = this.getUnlockedAchievements(data)

    const traits = (data.traits || []).map(t => {
      if (typeof t === 'object') return t
      return { name: t, css: 'trait-good' }
    })

    const locationObj = LOCATIONS.find(loc => loc.name === data.sys.location)
    let locationModifier = ''
    if (locationObj && locationObj.modifier) {
      locationModifier = Object.entries(locationObj.modifier).map(([k, v]) => `${STAT_NAMES[k] || k}${v > 0 ? '+' : ''}${v}`).join(' ')
    }

    const { bonus: trainBonus, detail: bonusParts } = this.dm.getTrainBonusSync(data)
    const trainBonusDetail = bonusParts.join('×')

    const intimacy = pet?.intimacy || 0
    const obedience = pet?.obedience || 0
    const lewd = pet?.lewd || 0

    return {

      petName: pet?.petName || '宠物',
      petAvatar: pet?.petAvatar || '',
      ownerName: pet?.ownerName || '主人',
      statusText,
      traits,
      stats: st,
      intimacy,
      obedience,
      lewd,
      bondLabel: isBonded ? '缔约' : '领养',
      house,
      slotList,
      clothes,
      totalCharm,
      totalEffectText,
      logs: data.diary || [],
      achievements: unlockedAchievements,
      achievementsCount: (data.sys.achievements || []).length,
      totalAchievements: Object.keys(CONFIG.ACHIEVEMENTS).length,
      goldCoins: data.sys.goldCoins || 0,
      survivalDays: calculateDays(data.sys.startTimestamp),
      location: data.sys.location || '',
      locationModifier,
      trainBonus,
      trainBonusDetail
    }
  }

  generateStatusText(stats, pet) {
    const mergedStats = {
      ...stats,
      intimacy: pet?.intimacy || 0,
      obedience: pet?.obedience || 0,
      lewd: pet?.lewd || 0
    }
    for (const entry of [...CONFIG.STATUS_TEXTS].sort((a, b) => b.priority - a.priority)) {
      try {
        const fn = new Function(...Object.keys(mergedStats), `return (${entry.condition})`)
        if (fn(...Object.values(mergedStats))) return entry.text
      } catch { continue }
    }
    return '正在适应中...'
  }

  getUnlockedAchievements(data) {
    const result = []
    for (const key of (data.sys.achievements || [])) {
      const ach = CONFIG.ACHIEVEMENTS[key]
      if (ach) result.push({ name: ach.name, cls: 'ach-special' })
    }
    return result
  }

  async renderPanel(e, data) {
    try {
      const renderData = this.buildRenderData(data)
      await renderTemplate(e, htmlSrc, '_panel_temp.html', renderData, 'cwerPanel')
    } catch (error) {
      console.error('[Cwer] 面板渲染失败:', error)
      await e.reply('面板渲染失败，请稍后再试。')
    }
  }
}

export default PanelRenderer
