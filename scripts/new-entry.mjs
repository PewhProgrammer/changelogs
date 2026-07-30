import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const version = process.argv[2]
if (!version || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(version)) {
  console.error('Usage: node scripts/new-entry.mjs <version>')
  console.error('Example: node scripts/new-entry.mjs 0.5.0')
  process.exit(1)
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const monthsDir = path.join(root, 'data', 'months')
mkdirSync(monthsDir, { recursive: true })

const taken = readdirSync(monthsDir, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .find((dirent) => existsSync(path.join(monthsDir, dirent.name, `${version}.json`)))
if (taken) {
  console.error(`data/months/${taken.name}/${version}.json already exists`)
  process.exit(1)
}

const now = new Date()
const pad = (value) => String(value).padStart(2, '0')
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
const month = today.slice(0, 7)

const stub = {
  version,
  date: today,
  title: 'TODO',
  repo: 'TODO',
  summary: 'TODO',
  tags: ['new'],
  sections: [{ heading: 'New', items: ['TODO'] }]
}

mkdirSync(path.join(monthsDir, month), { recursive: true })
await writeFile(path.join(monthsDir, month, `${version}.json`), `${JSON.stringify(stub, null, 2)}\n`)
console.log(`Created data/months/${month}/${version}.json, fill it in and run: node scripts/build.mjs`)
