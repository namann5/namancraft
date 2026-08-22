// GitHub Pages SPA fallback: serve index.html for unknown routes.
import { copyFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
console.log('wrote dist/404.html')
