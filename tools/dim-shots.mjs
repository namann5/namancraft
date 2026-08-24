// Dimension screenshots: boots the game, enters play, teleports through
// every dimension and captures a PNG of each for visual inspection.
// Usage: node tools/dim-shots.mjs [url] [outDir]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const url = process.argv[2] || 'http://localhost:4173/namancraft/'
const outDir = process.argv[3] || 'tools/shots'
fs.mkdirSync(outDir, { recursive: true })
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]
const chrome = CHROME_PATHS.find((p) => fs.existsSync(p))
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shots-chrome-'))
const proc = spawn(chrome, ['--headless=new', '--no-first-run', `--user-data-dir=${userDataDir}`, '--remote-debugging-port=0', '--window-size=1280,720', 'about:blank'])
const wsEndpoint = await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('chrome did not start')), 15000)
  proc.stderr.on('data', (d) => {
    const m = /ws:\/\/[^\s]+/.exec(d.toString())
    if (m) { clearTimeout(t); resolve(m[0]) }
  })
})
const ws = new WebSocket(wsEndpoint)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let msgId = 0
const pending = new Map()
function send(method, params = {}, sessionId) {
  const id = ++msgId
  return new Promise((resolve) => {
    pending.set(id, resolve)
    ws.send(JSON.stringify({ id, method, params, sessionId }))
  })
}
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    const resolve = pending.get(msg.id); pending.delete(msg.id); resolve(msg.result)
  }
}
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Page.enable', {}, sessionId)
await send('Runtime.enable', {}, sessionId)
await send('Page.navigate', { url }, sessionId)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true }, sessionId)
  return r.result?.value
}
async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
  fs.writeFileSync(path.join(outDir, `${name}.png`), Buffer.from(data, 'base64'))
  console.log('shot:', name)
}

await sleep(9000)
await evalJs(`(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', code: 'KeyX' })); document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 1 })()`)
await sleep(1500)
await evalJs(`(() => { const p = [...document.querySelectorAll('button')].find(b => b.textContent.includes('PLAY WORLD')); if (p && !p.disabled) p.click(); return 1 })()`)
await sleep(2500)
await shot('overworld')

for (const dim of ['nether', 'end', 'skills', 'projects']) {
  await evalJs(`window.__nc.travel('${dim}')`)
  await sleep(1400)
  await shot(`${dim}-traveling`)
  await sleep(2600)
  await shot(`${dim}`)
}

proc.kill()
process.exit(0)
