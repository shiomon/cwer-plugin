import fs from 'fs'

let html = fs.readFileSync('E:/临时登录/Yunzai/plugins/cwer-plugin/resources/panel.html', 'utf8')
let css = fs.readFileSync('E:/临时登录/Yunzai/plugins/cwer-plugin/resources/common.css', 'utf8')
let js = fs.readFileSync('E:/临时登录/Yunzai/plugins/cwer-plugin/resources/bg-loader.js', 'utf8')

html = html.replace('<!-- COMMON_CSS -->', '<style>' + css + '</style>')
html = html.replace('<!-- BG_LOADER -->', '<script>' + js + '</script>')

const d = {
  petName: '小梦', ownerName: '主人酱', statusText: '深深依恋着主人...',
  'stats.intimacy': '520', 'stats.obedience': '299', 'stats.lewd': '168',
  'stats.satiety': '72', 'stats.energy': '85', 'stats.pain': '45',
  'stats.sensitivity': '60', 'stats.hygiene': '90',
  location: '温暖的浴场', locationModifier: '洁+3 敏+3 痛-3',
  'trainBonusDetail': '1.20x1.10x1.05x1.10x1.10x1.00', 'trainBonus.toFixed(2)': '1.55',
  bondLabel: '缔约', 'house.emoji': '🏠', 'house.name': '温馨小屋',
  goldCoins: '156', survivalDays: '7', achievementsCount: '5', totalAchievements: '48',
  totalCharm: '120', totalEffectText: '涩+3 服+2',
  yunzaiName: 'Yunzai', yunzaiVer: 'v3.1.0', pluginVer: 'v1.0.0'
}

for (const [k, v] of Object.entries(d)) {
  html = html.split('{{' + k + '}}').join(v)
}

html = html.replace(/\{\{if petAvatar\}\}/g, '')
html = html.replace(/\{\{else\}\}[\s\S]*?\{\{\/if\}\}/g, '')
html = html.replace(/\{\{if location\}\}/g, '')
html = html.replace(/\{\{\/if\}\}/g, '')
html = html.replace(/\{\{each \w+ \w+\}\}/g, '')
html = html.replace(/\{\{\/each\}\}/g, '')
html = html.replace(/\{\{if \w+\.length === 0\}\}[\s\S]*?\{\{\/if\}\}/g, '')
html = html.replace(/\{\{if bondLabel === '缔约'\}\}/g, '')
html = html.replace(/\{\{if stats\.\w+ >= \d+ && stats\.\w+ <= \d+\}\}/g, '')
html = html.replace(/\{\{if stats\.\w+ >= \d+\}\}/g, '')
html = html.replace(/\{\{if stats\.\w+ <= \d+\}\}/g, '')
html = html.replace(/\{\{if clothes\[[^\]]+\]\.\w+[^}]*\}\}/g, '')
html = html.replace(/\{\{else if clothes\[[^\]]+\]\.\w+[^}]*\}\}/g, '')
html = html.replace(/\{\{if clothes\[[^\]]+\]\.dur > \d+\}\}/g, '')
html = html.replace(/\{\{@ log\.text\}\}/g, '互动日志')
html = html.replace(/\{\{clothes\[\w+\]\.\w+\}\}/g, '')
html = html.replace(/\{\{slot\.\w+\}\}/g, '')
html = html.replace(/\{\{log\.\w+\}\}/g, '')
html = html.replace(/\{\{a\.\w+\}\}/g, '')
html = html.replace(/\{\{t\.\w+\}\}/g, '')

fs.writeFileSync('C:/Users/shiom/Desktop/cwer-panel-preview.html', html, 'utf8')
console.log('Done')