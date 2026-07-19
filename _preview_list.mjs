import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const template = (await import('art-template')).default

const htmlSrc = path.join(__dirname, 'resources', 'list.html')
const cssPath = path.join(__dirname, 'resources', 'common.css')
const jsPath = path.join(__dirname, 'resources', 'bg-loader.js')

let htmlContent = fs.readFileSync(htmlSrc, 'utf8')
const css = fs.readFileSync(cssPath, 'utf8')
const js = fs.readFileSync(jsPath, 'utf8')

htmlContent = htmlContent.replace('<!-- COMMON_CSS -->', `<style>${css}</style>`)
htmlContent = htmlContent.replace('<!-- BG_LOADER -->', `<script>${js}</script>`)
htmlContent = htmlContent.replace('<!-- SUBTITLE -->', '$面板 $商店 $帮助 $成就 $列表丨#宠物面板/商店/帮助/成就/列表')
htmlContent = htmlContent.replace('<!-- FOOTER -->', 'Created By Yunzai &amp; cwer-plugin 3.0.2')

const testData = {
  totalCount: 5,
  bondedCount: 3,
  claimedCount: 2,
  relations: [
    { rank: 1, ownerName: '阿初', petName: '初ོ夏ꦿ℘ღ', status: 'bonded', house: '温馨小屋', intimacyLevel: '依恋', intimacy: 520, survivalDays: 31, evasion: 0 },
    { rank: 2, ownerName: '小明', petName: '小白', status: 'bonded', house: '豪华公寓', intimacyLevel: '热恋', intimacy: 880, survivalDays: 45, evasion: 0 },
    { rank: 3, ownerName: '小红', petName: '喵喵', status: 'bonded', house: '破纸箱', intimacyLevel: '好感', intimacy: 156, survivalDays: 12, evasion: 0 },
    { rank: 4, ownerName: '小刚', petName: '旺财', status: 'claimed', house: '破纸箱', intimacyLevel: '初识', intimacy: 35, survivalDays: 3, evasion: 15 },
    { rank: 5, ownerName: '小李', petName: '豆豆', status: 'claimed', house: '破纸箱', intimacyLevel: '好感', intimacy: 99, survivalDays: 8, evasion: 5 }
  ]
}

const rendered = template.render(htmlContent, testData)
const outputPath = 'C:\\Users\\shiom\\Desktop\\list_preview.html'
fs.writeFileSync(outputPath, rendered, 'utf8')
console.log('List preview generated: ' + outputPath)