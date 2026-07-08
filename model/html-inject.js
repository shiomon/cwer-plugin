import fs from 'fs'
import path from 'path'
import { ver, name, yunzai } from '../components/Version.js'

const __dirname = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))
const pluginRoot = path.resolve(__dirname, '..')
const cssPath = path.join(pluginRoot, 'resources', 'common.css')
const jsPath = path.join(pluginRoot, 'resources', 'bg-loader.js')

const SUBTITLE = '$面板 $商店 $帮助 $成就 $列表丨#宠物面板/商店/帮助/成就/列表'
const FOOTER = `Created By ${name} ${yunzai} &amp; cwer-plugin ${ver}`

let _cachedCss = null
let _cachedJs = null

export function injectAssets(htmlContent) {
  if (_cachedCss === null) {
    try { _cachedCss = fs.readFileSync(cssPath, 'utf8') } catch { _cachedCss = '' }
  }
  if (_cachedJs === null) {
    try { _cachedJs = fs.readFileSync(jsPath, 'utf8') } catch { _cachedJs = '' }
  }
  htmlContent = htmlContent.replace('<!-- COMMON_CSS -->', `<style>${_cachedCss}</style>`)
  htmlContent = htmlContent.replace('<!-- BG_LOADER -->', `<script>${_cachedJs}</script>`)
  htmlContent = htmlContent.replace('<!-- SUBTITLE -->', SUBTITLE)
  htmlContent = htmlContent.replace('<!-- FOOTER -->', FOOTER)
  return htmlContent
}

const tempDir = path.join(pluginRoot, 'html')

export async function renderTemplate(e, htmlSrcPath, tempFileName, renderData, screenshotKey) {
  let htmlContent = fs.readFileSync(htmlSrcPath, 'utf8')
  htmlContent = injectAssets(htmlContent)
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

  const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const tempPath = path.join(tempDir, `${uniqueId}_${tempFileName}`)
  fs.writeFileSync(tempPath, htmlContent, 'utf8')

  renderData.tplFile = tempPath
  renderData.pluginVer = ver
  renderData.yunzaiName = name
  renderData.yunzaiVer = yunzai
  renderData.imgType = 'jpeg'
  renderData.quality = 100
  renderData.pageGotoParams = { waitUntil: 'networkidle0' }
  renderData.beforeScreenshot = async (page) => {
    await page.waitForFunction('window.__cwerReady === true', { timeout: 10000 }).catch(() => {})
    const body = await page.$('#container') || await page.$('body')
    const box = await body.boundingBox()
    if (box) await page.setViewport({ width: Math.ceil(box.width) + 60, height: Math.ceil(box.height) + 100 })
  }

  try {
    const puppeteer = (await import('../../../lib/puppeteer/puppeteer.js')).default
    const img = await puppeteer.screenshot(screenshotKey, renderData)
    if (img) {
      await e.reply(img)
    } else {
      await e.reply('面板渲染失败，请稍后再试')
    }
  } finally {
    fs.unlink(tempPath, () => {})
  }
}
