import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(__dirname, '..')
const packagePath = path.join(pluginRoot, 'package.json')

let currentVersion = '1.0.0'

try {
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    if (pkg.version) currentVersion = pkg.version
  }
} catch {}

let yunzaiName = 'Yunzai'
try {
  const cfg = (await import('../../../lib/config/config.js')).default
  if (cfg?.name) yunzaiName = cfg.name
} catch {}

export const ver = currentVersion
export const name = yunzaiName
export const yunzai = yunzaiName