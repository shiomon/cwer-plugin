import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const template = (await import('art-template')).default

const htmlSrc = path.join(__dirname, 'resources', 'panel.html')
const cssPath = path.join(__dirname, 'resources', 'common.css')
const jsPath = path.join(__dirname, 'resources', 'bg-loader.js')

let htmlContent = fs.readFileSync(htmlSrc, 'utf8')
const css = fs.readFileSync(cssPath, 'utf8')
const js = fs.readFileSync(jsPath, 'utf8')

htmlContent = htmlContent.replace('<!-- COMMON_CSS -->', `<style>${css}</style>`)
htmlContent = htmlContent.replace('<!-- BG_LOADER -->', `<script>${js}</script>`)
htmlContent = htmlContent.replace('<!-- FOOTER -->', 'Created By Yunzai &amp; cwer-plugin 3.0.1')

const testData = {
  petName: '初ོ夏ꦿ℘ღ',
  petAvatar: '',
  ownerName: '阿初',
  ownerAvatar: '',
  statusText: '心情愉悦',
  traits: [
    { name: '贪吃', css: 'trait-bad' },
    { name: '敏感体质', css: 'trait-lewd' },
    { name: '乖巧', css: 'trait-good' }
  ],
  stats: {
    satiety: 72,
    energy: 85,
    pain: 45,
    sensitivity: 88,
    hygiene: 60
  },
  intimacy: 520,
  obedience: 131,
  lewd: 277,
  bondLabel: '缔约',
  house: { emoji: '&#x1F3E0;', name: '温馨小屋' },
  slotList: [
    { key: 'head', label: '头饰' },
    { key: 'top', label: '上衣' },
    { key: 'bottom', label: '下装' },
    { key: 'socks', label: '袜子' },
    { key: 'shoes', label: '鞋子' },
    { key: 'accessory', label: '饰品' }
  ],
  clothes: {
    head: { name: '猫耳发箍', isEmpty: false, rarity: 'rare', rarityName: '稀有', rarityColor: '#2196f3', charm: 5, dur: 80, effectText: '亲+2 敏+3' },
    top: { name: '女仆装', isEmpty: false, rarity: 'epic', rarityName: '史诗', rarityColor: '#9c27b0', charm: 12, dur: 65, effectText: '服+3 涩+5' },
    bottom: { name: '蕾丝裙', isEmpty: false, rarity: 'rare', rarityName: '稀有', rarityColor: '#2196f3', charm: 8, dur: 40, effectText: '涩+4 敏+2' },
    socks: { name: '白丝袜', isEmpty: false, rarity: 'common', rarityName: '普通', rarityColor: '#9e9e9e', charm: 3, dur: 25, effectText: '敏+1' },
    shoes: { name: '未穿', isEmpty: true, rarity: 'none', rarityName: '', rarityColor: '#aaa', charm: 0, dur: 0, effectText: '' },
    accessory: { name: '项圈', isEmpty: false, rarity: 'legendary', rarityName: '传说', rarityColor: '#ff9800', charm: 20, dur: 100, effectText: '服+8 涩+6 亲+3' }
  },
  totalCharm: 48,
  totalEffectText: '亲+5 服+11 涩+15 敏+6',
  logs: [
    { time: '06-29 14:32', text: '阿初投喂了初ོ夏ꦿ℘ღ，饱食+25', color: '#43a047' },
    { time: '06-29 14:28', text: '初ོ夏ꦿ℘ღ向阿初撒娇，亲密+4', color: '#e91e63' },
    { time: '06-29 14:15', text: '阿初调教了初ོ夏ꦿ℘ღ，服从+6', color: '#ff6d00' },
    { time: '06-29 13:50', text: '初ོ夏ꦿ℘ღ的房屋温馨小屋已折旧', color: '#757575' },
    { time: '06-29 13:30', text: '阿初给初ོ夏ꦿ℘ღ买了项圈', color: '#ff9800' }
  ],
  achievements: [
    { name: '初见', cls: 'ach-special' },
    { name: '依恋', cls: 'ach-special' }
  ],
  achievementsCount: 2,
  totalAchievements: 15,
  goldCoins: 156,
  survivalDays: 31,
  location: '卧室',
  locationModifier: '亲+2 敏+1',
  trainBonus: 1.05,
  trainBonusDetail: '体1.0×饱1.0×痛1.0×敏1.0×洁1.0×装1.0×房1.0'
}

const rendered = template.render(htmlContent, testData)
const outputPath = 'C:\\Users\\shiom\\Desktop\\panel_preview.html'
fs.writeFileSync(outputPath, rendered, 'utf8')
console.log('Preview generated: ' + outputPath)