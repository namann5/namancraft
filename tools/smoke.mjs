// Smoke test: loads a URL in headless Chrome, reports console errors + page errors.
// Usage: node tools/smoke.mjs http://localhost:4173/world
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const url = process.argv[2]
if (!url) {
  console.error('usage: node smoke.mjs <url>')
  process.exit(1)
}

const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]
const chrome = CHROME_PATHS.find((p) => fs.existsSync(p))
if (!chrome) throw new Error('chrome not found')

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-chrome-'))
const proc = spawn(chrome, [
  '--headless=new',
  '--disable-gpu-sandbox',
  '--no-first-run',
  `--user-data-dir=${userDataDir}`,
  '--remote-debugging-port=0',
  'about:blank',
])
proc.on('error', (e) => {
  console.error('chrome spawn failed:', e.message)
  process.exit(1)
})

const wsEndpoint = await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('chrome did not start')), 15000)
  proc.stderr.on('data', (d) => {
    const m = /ws:\/\/[^\s]+/.exec(d.toString())
    if (m) {
      clearTimeout(t)
      resolve(m[0])
    }
  })
})

const browserWs = new WebSocket(wsEndpoint)
await new Promise((res, rej) => { browserWs.onopen = res; browserWs.onerror = rej })

let msgId = 0
const pending = new Map()
const events = []
function send(method, params = {}, sessionId) {
  const id = ++msgId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    browserWs.send(JSON.stringify({ id, method, params, sessionId }))
  })
}
browserWs.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) {
      reject(new Error(JSON.stringify(msg.error)))
    } else {
      resolve(msg.result)
    }
  } else if (msg.method) {
    events.push(msg)
  }
}

const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Page.enable', {}, sessionId)
await send('Runtime.enable', {}, sessionId)
await send('Log.enable', {}, sessionId)

const errors = []
browserWs.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (!msg.sessionId || msg.sessionId !== sessionId) return
  if (msg.method === 'Runtime.exceptionThrown') {
    errors.push(msg.params.exceptionDetails?.exception?.description || JSON.stringify(msg.params).slice(0, 500))
  }
  if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error')) {
    errors.push(msg.params.args?.map((a) => a.value ?? a.description).join(' ').slice(0, 500))
  }
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
    // ignore favicon 404s and net errors for sourcemaps
    const text = msg.params.entry.text || ''
    if (!text.includes('favicon') && !text.includes('Failed to load resource')) {
      errors.push(text.slice(0, 500))
    }
  }
})

await send('Page.navigate', { url }, sessionId)

// wait for settle
await new Promise((r) => setTimeout(r, Number(process.env.SMOKE_WAIT_MS || 9000)))

const { result } = await send('Runtime.evaluate', { expression: 'document.title + " | canvas:" + document.querySelectorAll("canvas").length + " | bodyLen:" + document.body.innerText.length', returnByValue: true }, sessionId)

console.log(`URL: ${url}`)
console.log(`RESULT: ${result.value}`)
if (errors.length) {
  console.log(`ERRORS (${errors.length}):`)
  for (const err of [...new Set(errors)].slice(0, 10)) console.log(`  - ${err}`)
} else {
  console.log('ERRORS: none')
}

proc.kill()
process.exit(errors.length ? 1 : 0)
