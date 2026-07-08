import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { CONFIG } from './config/cfg.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const template = (await import('art-template')).default

const htmlSrc = path.join(__dirname, 'resources', 'achievement.html')
const cssPath = path.join(__dirname, 'resources', 'common.css')
const jsPath = path.join(__dirname, 'resources', 'bg-loader.js')

let htmlContent = fs.readFileSync(htmlSrc, 'utf8')
const css = fs.readFileSync(cssPath, 'utf8')
const js = fs.readFileSync(jsPath, 'utf8')

htmlContent = htmlContent.replace('<!-- COMMON_CSS -->', `<style>${css}</style>`)
htmlContent = htmlContent.replace('<!-- BG_LOADER -->', `<script>${js}</script>`)
htmlContent = htmlContent.replace('<!-- SUBTITLE -->', '$面板 $商店 $帮助 $成就 $列表丨#宠物面板/商店/帮助/成就/列表')
htmlContent = htmlContent.replace('<!-- FOOTER -->', 'Created By Yunzai &amp; cwer-plugin 3.0.1')

const unlockedKeys = ['first_pet', 'pet_200', 'obedience_100', 'lewd_100', 'intimacy_100', 'survivor_7', 'shop_all']
const achievements = []
for (const [key, ach] of Object.entries(CONFIG.ACHIEVEMENTS)) {
  achievements.push({ key, name: ach.name, desc: ach.desc, reward: ach.reward, unlocked: unlockedKeys.includes(key) })
}

const data = { achievements, unlockedCount: unlockedKeys.length, achievementCount: Object.keys(CONFIG.ACHIEVEMENTS).length }
const rendered = template.render(htmlContent, data)

const outputPath = 'C:\\Users\\shiom\\Desktop\\achieve_preview.html'
fs.writeFileSync(outputPath, rendered, 'utf8')
console.log('Achievement preview generated: ' + outputPath)