import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const [repo, flag, value] = process.argv.slice(2)
const usage = 'Usage: node scripts/write-summary.mjs <repo> --skip "<reason>" | --entry <version>'

if (!repo || !flag || !value) {
  console.error(usage)
  process.exit(1)
}

let entry
if (flag === '--skip') {
  entry = { action: 'skipped', reason: value }
} else if (flag === '--entry') {
  entry = { action: 'entry', version: value }
} else {
  console.error(usage)
  process.exit(1)
}

const runnerTemp = process.env.RUNNER_TEMP
if (!runnerTemp) {
  console.error('RUNNER_TEMP is required in the environment')
  process.exit(1)
}

const summaryPath = path.join(runnerTemp, 'changelog-run-summary.json')

let summary = {}
try {
  summary = JSON.parse(await readFile(summaryPath, 'utf8'))
} catch {
  // no summary yet, start fresh
}

summary[repo] = entry
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`)
console.log(`${repo}: ${JSON.stringify(entry)} -> ${summaryPath}`)
