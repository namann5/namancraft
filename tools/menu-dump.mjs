// Menu UI check: dumps menu text + button list, optionally clicks a button.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const url = process.argv[2]
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]
const chrome = CHROME_PATHS.find((p) => fs.existsSync(p))
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-chrome-'))
const proc = spawn(chrome, ['--headless=new', '--no-first-run', `--user-data-dir=${userDataDir}`, '--remote-debugging-port=0', 'about:blank'])
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
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params, sessionId }))
  })
}
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve } = pending.get(msg.id); pending.delete(msg.id); resolve(msg.result)
  }
}
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Page.enable', {}, sessionId)
await send('Runtime.enable', {}, sessionId)
await send('Page.navigate', { url }, sessionId)
await new Promise((r) => setTimeout(r, Number(process.env.SMOKE_WAIT_MS || 9000)))

async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true }, sessionId)
  return r.result?.value
}

const info = await evalJs(`(() => {
  const btns = [...document.querySelectorAll('button')].map(b => ({ t: b.textContent.trim().slice(0, 40), disabled: b.disabled }))
  return JSON.stringify({
    h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim()),
    splash: !!document.querySelector('.animate-mc-splash'),
    footerLinks: [...document.querySelectorAll('footer a')].map(a => a.textContent.trim()),
    btns,
    canvas: !!document.querySelector('canvas'),
  }, null, 1)
})()`)
console.log(info)

// click PLAY WORLD and watch for menu fade / toast
const clicked = await evalJs(`(() => {
  const play = [...document.querySelectorAll('button')].find(b => b.textContent.includes('PLAY WORLD'))
  if (!play) return 'no-play-button'
  if (play.disabled) return 'disabled'
  play.click(); return 'clicked'
})()`)
console.log('play:', clicked)
await new Promise((r) => setTimeout(r, 2500))
const after = await evalJs(`(() => {
  const menu = [...document.querySelectorAll('h1')].some(h => h.textContent.includes('NAMANCRAFT'))
  const menuOpacity = document.querySelector('.font-pixel') ? getComputedStyle(document.querySelector('h1')).opacity : 'gone'
  return JSON.stringify({ menuStillVisible: menu, titleOpacity: menuOpacity })
})()`)
console.log('after click:', after)
proc.kill()
process.exit(0)
