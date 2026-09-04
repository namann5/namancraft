// Multi-world travel test: boots the game, skips the intro, enters play,
// then drives window.__nc.travel() through every dimension and back,
// asserting the world swaps and the travel overlay phases run.
// Usage: node tools/travel-test.mjs [url]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const url = process.argv[2] || 'http://localhost:4173/namancraft/world'
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]
const chrome = CHROME_PATHS.find((p) => fs.existsSync(p))
if (!chrome) {
  console.error('chrome not found')
  process.exit(1)
}
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'travel-chrome-'))
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
const errors = []
const consoleLogs = []
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Page.enable', {}, sessionId)
await send('Runtime.enable', {}, sessionId)
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'warning' || msg.params.type === 'log')) {
    consoleLogs.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails?.exception?.description || 'exception')
  }
  if (msg.method === 'Log.entryAdded' && msg.params.entry?.level === 'error') {
    errors.push(msg.params.entry.text)
  }
})
await send('Log.enable', {}, sessionId)
await send('Page.navigate', { url }, sessionId)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)
  if (r.exceptionDetails) return { __err: r.exceptionDetails.exception?.description || 'eval error' }
  return r.result?.value
}

// let the intro start, then skip it and reach the menu
await sleep(Number(process.env.TRAVEL_WAIT_MS || 9000))
await evalJs('window.__NC_TRACE = true')
console.log('boot:', JSON.stringify(await evalJs('window.__nc ? window.__nc.state() : "no-hook"')))

// skip intro -> menu -> enter play via the real button
await evalJs(`(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', code: 'KeyX' })); document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 1 })()`)
await sleep(1600)
const playClicked = await evalJs(`(() => {
  const play = [...document.querySelectorAll('button')].find(b => b.textContent.includes('PLAY WORLD'))
  if (!play || play.disabled) return 'no-play-button'
  play.click(); return 'clicked'
})()`)
console.log('play:', playClicked)
await sleep(2600)
console.log('in-game:', JSON.stringify(await evalJs('window.__nc.state()')))

const DIMENSIONS = ['nether', 'end', 'skills', 'projects']
let failures = 0
for (const dim of DIMENSIONS) {
  const started = await evalJs(`window.__nc.travel('${dim}')`)
  console.log(`travel(${dim}) ->`, started)
  // poll until the store settles on the destination
  let st = null
  const seen = []
  for (let i = 0; i < 20; i += 1) {
    await sleep(250)
    st = await evalJs('window.__nc.state()')
    seen.push(`${st.world}/${st.phase}/t:${st.travel}`)
    if (st.world === dim && !st.travel) break
  }
  // NOTE: headless Chrome drops pointer lock during the scene swap, which
  // legitimately parks the game in 'paused' after arrival — accept both.
  const ok = st && st.world === dim && !st.travel && (st.phase === 'playing' || st.phase === 'paused')
  if (!ok) failures += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${dim}:`, JSON.stringify(st))
  if (!ok) console.log('  samples:', seen.join('\n          '))
}

// return home
await evalJs(`window.__nc.travel('overworld')`)
let home = null
for (let i = 0; i < 20; i += 1) {
  await sleep(250)
  home = await evalJs('window.__nc.state()')
  if (home.world === 'overworld' && !home.travel) break
}
const homeOk = home.world === 'overworld' && !home.travel && (home.phase === 'playing' || home.phase === 'paused')
if (!homeOk) failures += 1
console.log(`${homeOk ? 'PASS' : 'FAIL'} overworld:`, JSON.stringify(home))

const fatalErrors = errors.filter((t) => !/favicon|Autoplay|AudioContext|pointerlock/i.test(t))
console.log('page-errors:', fatalErrors.length ? fatalErrors.slice(0, 5) : 'none')
if (fatalErrors.length) failures += 1
console.log('trace:', consoleLogs.filter((l) => l.startsWith('[travel]')).join('\n') || 'none')

proc.kill()
process.exit(failures ? 1 : 0)
