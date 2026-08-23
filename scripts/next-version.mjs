import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { compareVersionsDesc } from './lib/versions.mjs'

const bump = process.argv[2]
if (!['major', 'minor', 'patch'].includes(bump)) {
  console.error('Usage: node scripts/next-version.mjs <major|minor|patch>')
  process.exit(1)
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const monthsDir = path.join(root, 'data', 'months')

const versions = []
for (const month of await readdir(monthsDir)) {
  if (month.startsWith('.')) continue
  const monthPath = path.join(monthsDir, month)
  for (const name of await readdir(monthPath)) {
    if (!name.endsWith('.json')) continue
    try {
      const entry = JSON.parse(await readFile(path.join(monthPath, name), 'utf8'))
      if (typeof entry.version === 'string') versions.push(entry.version)
    } catch {
      // ignore malformed entries here, build.mjs is the source of truth for validation
    }
  }
}

versions.sort(compareVersionsDesc)
const current = versions[0] ?? '0.0.0'
const parts = current.split('.').map((part) => Number(part) || 0)
while (parts.length < 3) parts.push(0)

if (bump === 'major') {
  parts[0] += 1
  parts[1] = 0
  parts[2] = 0
} else if (bump === 'minor') {
  parts[1] += 1
  parts[2] = 0
} else {
  parts[2] += 1
}

console.log(parts.join('.'))
