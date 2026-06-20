import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { CONFIG, EQUIPMENT_RARITY, CLOTHING_SLOTS, HOUSES, LOCATIONS, getUserColor } from '../config/cfg.js'
import { calculateDays } from './utils.js'
import { injectAssets } from './html-inject.js'
import Version from '../components/Version.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(__dirname, '..')
const htmlSrc = path.join(pluginRoot, 'resources', 'panel.html')
const tempDir = path.join(pluginRoot, 'data')
const tempHtmlPath = path.join(tempDir, '_panel_temp.html')

const SLOT_NAMES = {
  head: '头饰', upper: '上装', lower: '下装', bra: '胸罩', panty: '内裤', accessory: '饰品', shoes: '鞋子'
}

const STAT_NAMES = {
  lewd: '涩', obedience: '服', intimacy: '亲', pain: '痛', sensitivity: '敏', satiety: '饱', energy: '体', hygiene: '洁'
}

class PanelRenderer {
  constructor(dataManager) {
    this.dm = dataManager
  }

  buildRenderData(data, htmlPath) {
    const st = data.stats
    const rel = data.relation
    const isBonded = rel.status === 'bonded'
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

    const statusText = this.generateStatusText(st)
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

    const trainBonus = this.dm.getTrainBonusSync(data)
    const bonusParts = this.dm.getTrainBonusDetail(data)
    const trainBonusDetail = bonusParts.join('×')

    return {
      tplFile: htmlPath,
      petName: rel.petName || '宠物',
      petAvatar: rel.petAvatar || '',
      ownerName: rel.ownerName || '主人',
      statusText,
      traits,
      stats: st,
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
      trainBonusDetail,
      pluginVer: Version.ver,
      yunzaiName: Version.name,
      yunzaiVer: Version.yunzai
    }
  }

  generateStatusText(stats) {
    for (const entry of [...CONFIG.STATUS_TEXTS].sort((a, b) => b.priority - a.priority)) {
      try {
        const fn = new Function(...Object.keys(stats), `return (${entry.condition})`)
        if (fn(...Object.values(stats))) return entry.text
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
      let htmlContent = fs.readFileSync(htmlSrc, 'utf8')
      htmlContent = injectAssets(htmlContent)

      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8')

      const renderData = this.buildRenderData(data, tempHtmlPath)
      renderData.imgType = 'jpeg'
      renderData.quality = 100
      renderData.pageGotoParams = { waitUntil: 'networkidle0' }
      renderData.beforeScreenshot = async (page) => {
        await page.waitForFunction('window.__cwerReady === true', { timeout: 10000 }).catch(() => {})
        const body = await page.$('#container') || await page.$('body')
        const box = await body.boundingBox()
        if (box) {
          await page.setViewport({ width: Math.ceil(box.width) + 60, height: Math.ceil(box.height) + 100 })
        }
      }

      const puppeteer = (await import('../../../lib/puppeteer/puppeteer.js')).default
      const img = await puppeteer.screenshot('cwerPanel', renderData)

      if (img) {
        await e.reply(img)
      } else {
        await e.reply('面板出图失败，请检查 Puppeteer 配置。')
      }
    } catch (error) {
      console.error('[Cwer] 面板渲染失败:', error)
      await e.reply('面板渲染失败，请稍后再试。')
    }
  }
}

export default PanelRenderer
