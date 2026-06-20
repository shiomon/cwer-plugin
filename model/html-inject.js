import fs from 'fs'
import path from 'path'

const __dirname = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'))
const pluginRoot = path.resolve(__dirname, '..')
const cssPath = path.join(pluginRoot, 'resources', 'common.css')
const jsPath = path.join(pluginRoot, 'resources', 'bg-loader.js')

export function injectAssets(htmlContent) {
  let css = ''
  let js = ''
  try { css = fs.readFileSync(cssPath, 'utf8') } catch {}
  try { js = fs.readFileSync(jsPath, 'utf8') } catch {}
  htmlContent = htmlContent.replace('<!-- COMMON_CSS -->', `<style>${css}</style>`)
  htmlContent = htmlContent.replace('<!-- BG_LOADER -->', `<script>${js}</script>`)
  return htmlContent
}