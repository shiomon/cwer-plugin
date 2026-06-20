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

dm.initData()

const apps = {}
const files = fs.readdirSync(appsDir).filter(f => f.endsWith('.js'))
for (const file of files) {
  const mod = await import(`./apps/${file}`)
  if (mod.default) {
    const inst = new mod.default()
    apps[inst.name || file] = inst
  }
}

export { apps }