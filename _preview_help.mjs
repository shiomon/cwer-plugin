import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const template = (await import('art-template')).default

const htmlSrc = path.join(__dirname, 'resources', 'help.html')
const cssPath = path.join(__dirname, 'resources', 'common.css')
const jsPath = path.join(__dirname, 'resources', 'bg-loader.js')

let htmlContent = fs.readFileSync(htmlSrc, 'utf8')
const css = fs.readFileSync(cssPath, 'utf8')
const js = fs.readFileSync(jsPath, 'utf8')

htmlContent = htmlContent.replace('<!-- COMMON_CSS -->', `<style>${css}</style>`)
htmlContent = htmlContent.replace('<!-- BG_LOADER -->', `<script>${js}</script>`)
htmlContent = htmlContent.replace('<!-- SUBTITLE -->', '$面板 $商店 $帮助 $成就 $列表丨#宠物面板/商店/帮助/成就/列表')
htmlContent = htmlContent.replace('<!-- FOOTER -->', 'Created By Yunzai &amp; cwer-plugin 3.0.1')

const outputPath = 'C:\\Users\\shiom\\Desktop\\help_preview.html'
fs.writeFileSync(outputPath, htmlContent, 'utf8')
console.log('Help preview generated: ' + outputPath)