import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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

let yunzaiName = 'Yunzai'
let yunzaiVer = 'v3'
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(pluginRoot, '../../../package.json'), 'utf8'))
  if (pkg?.version) yunzaiVer = 'v' + pkg.version
} catch {}

export const ver = 'v' + currentVersion
export const name = yunzaiName
export const yunzai = yunzaiVer
