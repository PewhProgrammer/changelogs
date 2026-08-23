import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const token = process.env.CROSS_REPO_PAT
if (!token) {
  console.error('CROSS_REPO_PAT is required in the environment')
  process.exit(1)
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const state = JSON.parse(await readFile(path.join(root, '.changelog-state.json'), 'utf8'))
const workDir = path.join(root, '..', 'work')
mkdirSync(workDir, { recursive: true })

for (const [repo, config] of Object.entries(state.repos)) {
  const branch = config.defaultBranch
  if (!branch) {
    console.error(`${repo}: no defaultBranch in .changelog-state.json`)
    process.exit(1)
  }

  const url = `https://x-access-token:${token}@github.com/PewhProgrammer/${repo}.git`
  console.log(`Cloning ${repo} (${branch})...`)
  execFileSync('git', ['clone', '--quiet', '--branch', branch, url, path.join(workDir, repo)], {
    stdio: ['ignore', 'inherit', 'inherit']
  })
}

console.log(`Synced ${Object.keys(state.repos).length} repos into work/`)
