// Dimension pixel checks: travels through each dimension and computes
// composited-screen color statistics so we can assert scenes actually
// render — not black, hue profile roughly matching each biome.
// Pure-node PNG analysis of CDP screenshots (RGBA8, non-interlaced).
// Usage: node tools/dim-check.mjs [url]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'

const url = process.argv[2] || 'http://localhost:4173/namancraft/'
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]
const chrome = CHROME_PATHS.find((p) => fs.existsSync(p))
if (!chrome) { console.error('chrome not found'); process.exit(1) }
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-chrome-'))
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
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params, sessionId }))
  })
}
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id)
    if (msg.error) reject(new Error(msg.error.message))
    else resolve(msg.result)
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
  if (r.exceptionDetails) return { __err: r.exceptionDetails.exception?.description }
  return r.result?.value
}

// ---- minimal PNG decode (truecolor RGB/RGBA, filter 0..4) --------------
function pngStats(buf) {
  let pos = 8
  let w = 0; let h = 0
  let bpp = 3
  const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    if (type === 'IHDR') {
      w = buf.readUInt32BE(pos + 8)
      h = buf.readUInt32BE(pos + 12)
      const bitDepth = buf[pos + 16]
      const colorType = buf[pos + 17]
      if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) return { err: `png ${bitDepth}b/ct${colorType} unsupported` }
      bpp = colorType === 6 ? 4 : 3
      pos += 12 + len
      continue
    }
    if (type === 'IDAT') idat.push(buf.subarray(pos + 8, pos + 8 + len))
    if (type === 'IEND') break
    pos += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const stride = w * bpp
  const out = Buffer.alloc(h * stride)
  let p = 0
  const paeth = (a, b2, c) => {
    const pa = Math.abs(b2 - c)
    const pb = Math.abs(a - c)
    const pc = Math.abs(a + b2 - 2 * c)
    if (pa <= pb && pa <= pc) return a
    if (pb <= pc) return b2
    return c
  }
  for (let y = 0; y < h; y += 1) {
    const filter = raw[p]; p += 1
    for (let x = 0; x < stride; x += 1) {
      const v = raw[p]; p += 1
      const left = x >= bpp ? out[y * stride + x - bpp] : 0
      const up = y > 0 ? out[(y - 1) * stride + x] : 0
      const ul = y > 0 && x >= bpp ? out[(y - 1) * stride + x - bpp] : 0
      let rec
      if (filter === 0) rec = v
      else if (filter === 1) rec = (v + left) & 255
      else if (filter === 2) rec = (v + up) & 255
      else if (filter === 3) rec = (v + ((left + up) >> 1)) & 255
      else rec = (v + paeth(left, up, ul)) & 255
      out[y * stride + x] = rec
    }
  }
  // stats on a sparse grid
  let r = 0; let g = 0; let b = 0; let lum = 0; let dark = 0; let warm = 0; let cool = 0
  const lums = []
  let n = 0
  for (let y = 0; y < h; y += 7) {
    for (let x = 0; x < w; x += 7) {
      const i = y * stride + x * bpp
      const R = out[i]; const G = out[i + 1]; const B = out[i + 2]
      r += R; g += G; b += B
      const L = 0.2126 * R + 0.7152 * G + 0.0722 * B
      lum += L; lums.push(L)
      if (L < 12) dark += 1
      if (R > B + 18) warm += 1
      if (B > R + 18) cool += 1
      n += 1
    }
  }
  lums.sort((a, b2) => a - b2)
  return {
    avgR: Math.round(r / n), avgG: Math.round(g / n), avgB: Math.round(b / n),
    lum: Math.round(lum / n), p90: Math.round(lums[Math.floor(n * 0.9)]),
    darkPct: Math.round((dark / n) * 100),
    warmPct: Math.round((warm / n) * 100),
    coolPct: Math.round((cool / n) * 100),
  }
}

async function screenStats(label) {
  // hide DOM overlays (pause scrim etc.) so we sample raw scene pixels
  await evalJs(`(() => {
    const root = document.querySelector('.bg-black')
    if (root) [...root.children].forEach((el, i) => { if (i > 0) el.style.display = 'none' })
    return 1
  })()`)
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
  const s = pngStats(Buffer.from(data, 'base64'))
  console.log(`${label}:`, JSON.stringify(s))
  return s
}

await sleep(9000)
await evalJs(`(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', code: 'KeyX' })); document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 1 })()`)
await sleep(1500)
await evalJs(`(() => { const p = [...document.querySelectorAll('button')].find(b => b.textContent.includes('PLAY WORLD')); if (p && !p.disabled) p.click(); return 1 })()`)
await sleep(2500)

const results = {}
results.overworld = await screenStats('overworld')

for (const dim of ['nether', 'end', 'skills', 'projects']) {
  await evalJs(`window.__nc.travel('${dim}')`)
  await sleep(3600)
  results[dim] = await screenStats(dim)
}

// sanity assertions
const checks = []
const add = (name, cond) => checks.push({ name, ok: Boolean(cond) })
add('overworld renders', results.overworld.lum > 30 && results.overworld.darkPct < 70)
add('nether warm/red', results.nether.avgR > results.nether.avgB && results.nether.warmPct > 25)
add('end purple-dark', results.end.avgB > results.end.avgG && results.end.lum < 60)
add('skills bright teal', results.skills.lum > 45)
add('projects night city', results.projects.lum < 75 && results.projects.darkPct < 80 && results.projects.coolPct > 20)

console.log('--- checks ---')
let failures = 0
for (const c of checks) {
  if (!c.ok) failures += 1
  console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`)
}
proc.kill()
process.exit(failures ? 1 : 0)
