import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dataDir = path.join(root, 'data')
const monthsDir = path.join(dataDir, 'months')
const assetsDir = path.join(dataDir, 'assets')
const siteDir = path.join(root, 'site')

const schema = JSON.parse(await readFile(path.join(root, 'schema', 'entry.schema.json'), 'utf8'))
const requiredFields = schema.required
const knownFields = Object.keys(schema.properties)
const allowedTags = schema.properties.tags.items.enum

const errors = []
const fail = (label, message) => errors.push(`${label}: ${message}`)

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

async function fileExists(target) {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

let monthDirents
try {
  monthDirents = await readdir(monthsDir, { withFileTypes: true })
} catch {
  console.error('data/months: directory not found')
  process.exit(1)
}

const months = []
for (const dirent of monthDirents) {
  if (dirent.name.startsWith('.')) continue
  if (dirent.isDirectory() && /^\d{4}-\d{2}$/.test(dirent.name)) {
    months.push(dirent.name)
  } else {
    fail(`data/months/${dirent.name}`, 'only YYYY-MM month directories belong here')
  }
}
months.sort()

const files = []
for (const month of months) {
  for (const name of (await readdir(path.join(monthsDir, month))).sort()) {
    if (name.startsWith('.')) continue
    if (name.endsWith('.json')) {
      files.push({ month, name })
    } else {
      fail(`data/months/${month}/${name}`, 'only <version>.json entry files belong here')
    }
  }
}

if (files.length === 0 && errors.length === 0) {
  console.error('data/months: no *.json entry files found')
  process.exit(1)
}

const entries = []
const seenVersions = new Map()

for (const { month, name } of files) {
  const label = `data/months/${month}/${name}`
  let entry
  try {
    entry = JSON.parse(await readFile(path.join(monthsDir, month, name), 'utf8'))
  } catch (error) {
    fail(label, `invalid JSON (${error.message})`)
    continue
  }

  if (!isPlainObject(entry)) {
    fail(label, 'entry must be a JSON object')
    continue
  }

  for (const field of requiredFields) {
    if (!isNonEmptyString(entry[field])) fail(label, `missing required field "${field}"`)
  }
  for (const key of Object.keys(entry)) {
    if (!knownFields.includes(key)) fail(label, `unknown field "${key}"`)
  }

  if (isNonEmptyString(entry.version) && entry.version !== path.basename(name, '.json')) {
    fail(label, `version "${entry.version}" does not match filename`)
  }

  if (isNonEmptyString(entry.date)) {
    if (!isRealDate(entry.date)) {
      fail(label, `date "${entry.date}" is not a valid YYYY-MM-DD date`)
    } else if (entry.date.slice(0, 7) !== month) {
      fail(label, `date "${entry.date}" does not match month folder "${month}"`)
    }
  }

  for (const field of ['repo', 'summary']) {
    if (entry[field] !== undefined && !isNonEmptyString(entry[field])) {
      fail(label, `${field} must be a non-empty string`)
    }
  }

  if (entry.tags !== undefined) {
    if (!Array.isArray(entry.tags)) {
      fail(label, 'tags must be an array')
    } else {
      for (const tag of entry.tags) {
        if (!allowedTags.includes(tag)) fail(label, `unknown tag "${tag}" (allowed: ${allowedTags.join(', ')})`)
      }
      if (new Set(entry.tags).size !== entry.tags.length) fail(label, 'tags must be unique')
    }
  }

  if (entry.image !== undefined) {
    if (!isNonEmptyString(entry.image) || !entry.image.startsWith('assets/')) {
      fail(label, 'image must be a path under assets/')
    } else if (!(await fileExists(path.join(dataDir, entry.image)))) {
      fail(label, `image "${entry.image}" not found in data/`)
    }
  }

  if (entry.sections !== undefined) {
    if (!Array.isArray(entry.sections)) {
      fail(label, 'sections must be an array')
    } else {
      entry.sections.forEach((section, index) => {
        const valid =
          isPlainObject(section) &&
          isNonEmptyString(section.heading) &&
          Array.isArray(section.items) &&
          section.items.length > 0 &&
          section.items.every(isNonEmptyString)
        if (!valid) fail(label, `sections[${index}] must be { heading, items } with non-empty strings`)
      })
    }
  }

  if (entry.links !== undefined) {
    if (!Array.isArray(entry.links)) {
      fail(label, 'links must be an array')
    } else {
      entry.links.forEach((link, index) => {
        const valid =
          isPlainObject(link) &&
          isNonEmptyString(link.label) &&
          isNonEmptyString(link.url) &&
          /^https?:\/\//.test(link.url)
        if (!valid) fail(label, `links[${index}] must be { label, url } with an http(s) url`)
      })
    }
  }

  if (isNonEmptyString(entry.version)) {
    if (seenVersions.has(entry.version)) {
      fail(label, `duplicate version "${entry.version}" (also in ${seenVersions.get(entry.version)})`)
    } else {
      seenVersions.set(entry.version, `data/months/${month}/${name}`)
    }
  }

  entries.push(entry)
}

if (errors.length > 0) {
  for (const error of errors) console.error(error)
  process.exit(1)
}

function compareVersionsDesc(a, b) {
  const aParts = a.split('.')
  const bParts = b.split('.')
  const length = Math.max(aParts.length, bParts.length)
  for (let i = 0; i < length; i += 1) {
    const aPart = aParts[i] ?? '0'
    const bPart = bParts[i] ?? '0'
    const aNumber = Number(aPart)
    const bNumber = Number(bPart)
    if (Number.isNaN(aNumber) || Number.isNaN(bNumber)) {
      const compared = bPart.localeCompare(aPart)
      if (compared !== 0) return compared
    } else if (aNumber !== bNumber) {
      return bNumber - aNumber
    }
  }
  return 0
}

entries.sort((a, b) => b.date.localeCompare(a.date) || compareVersionsDesc(a.version, b.version))

await mkdir(siteDir, { recursive: true })
await writeFile(path.join(siteDir, 'entries.json'), `${JSON.stringify(entries, null, 2)}\n`)

await rm(path.join(siteDir, 'assets'), { recursive: true, force: true })
if (await fileExists(assetsDir)) {
  await cp(assetsDir, path.join(siteDir, 'assets'), { recursive: true })
}

console.log(`${entries.length} entries -> site/entries.json`)
