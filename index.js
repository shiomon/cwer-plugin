import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import DataManager from './model/DataManager.js'
import EventSystem from './model/EventSystem.js'
import InteractionEngine from './model/InteractionEngine.js'
import ShopSystem from './model/ShopSystem.js'
import PanelRenderer from './model/PanelRenderer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appsDir = path.join(__dirname, 'apps')

const dm = new DataManager()
const es = new EventSystem(dm)
const ie = new InteractionEngine(es, dm)
const shop = new ShopSystem(dm)
const renderer = new PanelRenderer(dm)

es.shop = shop

global.cwerSys = { dm, es, ie, shop, renderer }

global.cwerSys.getPetData = function getPetData(groupId, userData) {
  if (userData.owner && userData.owner.petId) {
    const petData = dm.readUserData(groupId, userData.owner.petId)
    if (petData) { petData._userId = userData.owner.petId; return petData }
  }
  return null
}

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

logger.info(`cwer-plugin v2.0.0 加载完成`)

export { apps }