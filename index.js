import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import DataManager from './model/DataManager.js'
import EventSystem from './model/EventSystem.js'
import InteractionEngine from './model/InteractionEngine.js'
import ShopSystem from './model/ShopSystem.js'
import AchievementSystem from './model/AchievementSystem.js'
import PanelRenderer from './model/PanelRenderer.js'
import { CONFIG, getUserColor } from './config/cfg.js'
import { ver } from './components/Version.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appsDir = path.join(__dirname, 'apps')
const pkgVersion = ver.replace(/^v/, '')

const dm = new DataManager()
const ach = new AchievementSystem(dm)
const es = new EventSystem(dm, ach)
const ie = new InteractionEngine(es, dm)
const shop = new ShopSystem(dm)
const renderer = new PanelRenderer(dm)

function checkCooldown(petSys) {
  const now = Date.now()
  if (petSys.lastInteractTime && now - petSys.lastInteractTime < CONFIG.INTERACTION_COOLDOWN) {
    return Math.ceil((CONFIG.INTERACTION_COOLDOWN - (now - petSys.lastInteractTime)) / 1000)
  }
  return null
}

function postInteraction(ownerData, result, groupId) {
  es.tickTime(ownerData, CONFIG.INTERACTION_TIME_COST)
  dm.applyHouseBonus(ownerData)
  ach.checkAchievements(ownerData)
  if (result) dm.addLog(ownerData, result.logText, result.logColor)
  dm.saveUserData(ownerData, groupId)
}

global.cwerSys = { dm, es, ie, shop, ach, renderer, checkCooldown, postInteraction, getUserColor }

dm.initData()

const apps = {}
const files = fs.readdirSync(appsDir).filter(f => f.endsWith('.js'))
for (const file of files) {
  try {
    const mod = await import(`./apps/${file}`)
    if (mod.default) {
      apps[file.replace('.js', '')] = mod.default
    }
  } catch (err) {
    logger.error(`cwer-plugin 加载失败: ${file}`)
    logger.error(err)
  }
}

logger.info(`cwer-plugin v${pkgVersion} 加载完成`)

export { apps }
