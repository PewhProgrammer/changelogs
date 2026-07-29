import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const entriesDir = path.join(root, 'entries')
const assetsDir = path.join(entriesDir, 'assets')
const siteDir = path.join(root, 'site')

const schema = JSON.parse(await readFile(path.join(root, 'schema', 'entry.schema.json'), 'utf8'))
const requiredFields = schema.required
const knownFields = Object.keys(schema.properties)
const allowedTags = schema.properties.tags.items.enum

const errors = []
const fail = (file, message) => errors.push(`entries/${file}: ${message}`)

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

const files = (await readdir(entriesDir)).filter((name) => name.endsWith('.json')).sort()
if (files.length === 0) {
  console.error('entries/: no *.json entry files found')
  process.exit(1)
}

const entries = []
const seenVersions = new Map()

for (const file of files) {
  let entry
  try {
    entry = JSON.parse(await readFile(path.join(entriesDir, file), 'utf8'))
  } catch (error) {
    fail(file, `invalid JSON (${error.message})`)
    continue
  }

  if (!isPlainObject(entry)) {
    fail(file, 'entry must be a JSON object')
    continue
  }

  for (const field of requiredFields) {
    if (!isNonEmptyString(entry[field])) fail(file, `missing required field "${field}"`)
  }
  for (const key of Object.keys(entry)) {
    if (!knownFields.includes(key)) fail(file, `unknown field "${key}"`)
  }

  if (isNonEmptyString(entry.version) && entry.version !== path.basename(file, '.json')) {
    fail(file, `version "${entry.version}" does not match filename`)
  }

  if (isNonEmptyString(entry.date) && !isRealDate(entry.date)) {
    fail(file, `date "${entry.date}" is not a valid YYYY-MM-DD date`)
  }

  for (const field of ['repo', 'summary']) {
    if (entry[field] !== undefined && !isNonEmptyString(entry[field])) {
      fail(file, `${field} must be a non-empty string`)
    }
  }

  if (entry.tags !== undefined) {
    if (!Array.isArray(entry.tags)) {
      fail(file, 'tags must be an array')
    } else {
      for (const tag of entry.tags) {
        if (!allowedTags.includes(tag)) fail(file, `unknown tag "${tag}" (allowed: ${allowedTags.join(', ')})`)
      }
      if (new Set(entry.tags).size !== entry.tags.length) fail(file, 'tags must be unique')
    }
  }

  if (entry.image !== undefined) {
    if (!isNonEmptyString(entry.image) || !entry.image.startsWith('assets/')) {
      fail(file, 'image must be a path under assets/')
    } else if (!(await fileExists(path.join(entriesDir, entry.image)))) {
      fail(file, `image "${entry.image}" not found in entries/`)
    }
  }

  if (entry.sections !== undefined) {
    if (!Array.isArray(entry.sections)) {
      fail(file, 'sections must be an array')
    } else {
      entry.sections.forEach((section, index) => {
        const valid =
          isPlainObject(section) &&
          isNonEmptyString(section.heading) &&
          Array.isArray(section.items) &&
          section.items.length > 0 &&
          section.items.every(isNonEmptyString)
        if (!valid) fail(file, `sections[${index}] must be { heading, items } with non-empty strings`)
      })
    }
  }

  if (entry.links !== undefined) {
    if (!Array.isArray(entry.links)) {
      fail(file, 'links must be an array')
    } else {
      entry.links.forEach((link, index) => {
        const valid =
          isPlainObject(link) &&
          isNonEmptyString(link.label) &&
          isNonEmptyString(link.url) &&
          /^https?:\/\//.test(link.url)
        if (!valid) fail(file, `links[${index}] must be { label, url } with an http(s) url`)
      })
    }
  }

  if (isNonEmptyString(entry.version)) {
    if (seenVersions.has(entry.version)) {
      fail(file, `duplicate version "${entry.version}" (also in ${seenVersions.get(entry.version)})`)
    } else {
      seenVersions.set(entry.version, file)
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
