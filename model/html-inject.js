import fs from 'fs'
import path from 'path'
import { ver, name, yunzai } from '../components/Version.js'

const __dirname = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))
const pluginRoot = path.resolve(__dirname, '..')
const cssPath = path.join(pluginRoot, 'resources', 'common.css')
const jsPath = path.join(pluginRoot, 'resources', 'bg-loader.js')

const SUBTITLE = '$面板 $商店 $帮助 $成就 $列表丨#宠物面板/商店/帮助/成就/列表'
const FOOTER = `Created By ${name} ${yunzai} &amp; cwer-plugin ${ver}`

export function injectAssets(htmlContent) {
  let css = ''
  let js = ''
  try { css = fs.readFileSync(cssPath, 'utf8') } catch {}
  try { js = fs.readFileSync(jsPath, 'utf8') } catch {}
  htmlContent = htmlContent.replace('<!-- COMMON_CSS -->', `<style>${css}</style>`)
  htmlContent = htmlContent.replace('<!-- BG_LOADER -->', `<script>${js}</script>`)
  htmlContent = htmlContent.replace('<!-- SUBTITLE -->', SUBTITLE)
  htmlContent = htmlContent.replace('<!-- FOOTER -->', FOOTER)
  return htmlContent
}
