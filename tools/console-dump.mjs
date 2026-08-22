// Full console dump for debugging.
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
const logs = []
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve } = pending.get(msg.id); pending.delete(msg.id); resolve(msg.result)
    return
  }
  if (!msg.method || !msg.sessionId) return
  if (msg.method === 'Runtime.consoleAPICalled') {
    logs.push(`[console.${msg.params.type}] ${msg.params.args?.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 400)}`)
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    logs.push(`[exception] ${(msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text || '').slice(0, 600)}`)
  }
  if (msg.method === 'Log.entryAdded') {
    logs.push(`[log.${msg.params.entry.level}] ${String(msg.params.entry.text).slice(0, 300)} ${msg.params.entry.url || ''}`)
  }
  if (msg.method === 'Runtime.executionContextCreated') {
    logs.push('[ctx created]')
  }
}
const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
await send('Page.enable', {}, sessionId)
await send('Runtime.enable', {}, sessionId)
await send('Log.enable', {}, sessionId)
logs.push(`NAVIGATE ${url}`)
await send('Page.navigate', { url }, sessionId)
await new Promise((r) => setTimeout(r, 10000))
const { result } = await send('Runtime.evaluate', {
  expression: `JSON.stringify({
    readyState: document.readyState,
    rootChildren: document.getElementById('root')?.children.length,
    htmlLen: document.getElementById('root')?.innerHTML.length,
    scripts: [...document.scripts].map(s => ({src: s.src.split('/').slice(-2).join('/'), loaded: !s.textContent})).length,
  })`,
  returnByValue: true,
}, sessionId)
console.log(result.value)
console.log('--- ALL LOGS ---')
for (const l of logs.slice(0, 50)) console.log(l)
proc.kill()
