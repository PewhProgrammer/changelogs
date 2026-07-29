import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const version = process.argv[2]
if (!version || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(version)) {
  console.error('Usage: node scripts/new-entry.mjs <version>')
  console.error('Example: node scripts/new-entry.mjs 0.4.0')
  process.exit(1)
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const file = path.join(root, 'entries', `${version}.json`)
if (existsSync(file)) {
  console.error(`entries/${version}.json already exists`)
  process.exit(1)
}

const now = new Date()
const pad = (value) => String(value).padStart(2, '0')
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

const stub = {
  version,
  date: today,
  title: 'TODO',
  repo: 'TODO',
  summary: 'TODO',
  tags: ['new'],
  sections: [{ heading: 'New', items: ['TODO'] }]
}

await writeFile(file, `${JSON.stringify(stub, null, 2)}\n`)
console.log(`Created entries/${version}.json, fill it in and run: node scripts/build.mjs`)
