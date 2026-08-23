import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repo = process.argv[2]
if (!repo) {
  console.error('Usage: node scripts/repo-diff.mjs <repo>')
  process.exit(1)
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const state = JSON.parse(await readFile(path.join(root, '.changelog-state.json'), 'utf8'))
const config = state.repos[repo]
if (!config) {
  console.error(`${repo}: not found in .changelog-state.json`)
  process.exit(1)
}

const repoDir = path.join(root, '..', 'work', repo)
const from = config.lastProcessedSha
const RECORD_SEP = '\x1e'
const FIELD_SEP = '\x1f'

const to = execFileSync('git', ['-C', repoDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()

if (to === from) {
  console.log(JSON.stringify({ repo, from, to, hasChanges: false, commits: [] }, null, 2))
  process.exit(0)
}

const format = RECORD_SEP + ['%H', '%an', '%aI', '%s'].join(FIELD_SEP)
const log = execFileSync(
  'git',
  ['-C', repoDir, 'log', `${from}..${to}`, `--format=${format}`, '--name-only'],
  { encoding: 'utf8' }
)

const commits = log
  .split(RECORD_SEP)
  .map((record) => record.trim())
  .filter((record) => record.length > 0)
  .map((record) => {
    const [headerLine, ...rest] = record.split('\n')
    const [sha, author, date, subject] = headerLine.split(FIELD_SEP)
    const filesChanged = rest.filter((line) => line.trim().length > 0)
    return { sha, author, date, subject, filesChanged }
  })

console.log(JSON.stringify({ repo, from, to, hasChanges: commits.length > 0, commits }, null, 2))
