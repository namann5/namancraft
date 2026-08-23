// Screenshot a URL in headless Chrome using the built-in --screenshot flow.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const url = process.argv[2]
const out = process.argv[3] || 'shot.png'
const waitMs = Number(process.env.SHOT_WAIT_MS || 14000)
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]
const chrome = CHROME_PATHS.find((p) => fs.existsSync(p))
if (!chrome) throw new Error('chrome not found')

const args = [
  '--headless=new',
  '--disable-gpu-sandbox',
  '--no-first-run',
  '--hide-scrollbars',
  `--screenshot=${path.resolve(out)}`,
  '--window-size=1600,900',
  `--timeout=${waitMs}`,
  url,
]
const proc = spawn(chrome, args)
proc.stderr.on('data', () => {})
proc.on('close', () => {
  if (fs.existsSync(out) && fs.statSync(out).size > 1000) {
    console.log(`saved ${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`)
  } else {
    console.log('screenshot failed')
    process.exit(1)
  }
})
