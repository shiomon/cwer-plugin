import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import cfg from '../../../lib/config/config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginRoot = path.resolve(__dirname, '..')
const packagePath = path.join(pluginRoot, 'package.json')

let currentVersion = '1.0.3'

try {
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    if (pkg.version) currentVersion = pkg.version
  }
} catch {}

const yunzaiVer = `v${cfg.package.version}`

let yunzaiName = cfg.package.name
if (yunzaiName === 'miao-yunzai') {
  yunzaiName = 'Miao-Yunzai'
} else if (yunzaiName === 'yunzai') {
  yunzaiName = 'Yunzai-Bot'
} else if (yunzaiName === 'trss-yunzai') {
  yunzaiName = 'TRSS-Yunzai'
} else {
  yunzaiName = yunzaiName.charAt(0).toUpperCase() + yunzaiName.slice(1)
}

export const ver = 'v' + currentVersion
export const name = yunzaiName
export const yunzai = yunzaiVer
