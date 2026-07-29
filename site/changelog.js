const entriesRoot = document.getElementById('entries')
const rail = document.getElementById('rail')
const filters = document.getElementById('filters')

const entryDateFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
const railDateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })

const TAG_LABELS = { new: 'New', improved: 'Improved', fixed: 'Fixed' }

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value)
  node.append(...children)
  return node
}

function formatDate(format, isoDate) {
  return format.format(new Date(`${isoDate}T00:00:00Z`))
}

function renderEntry(entry) {
  const meta = el('div', { class: 'entry-meta' }, [
    el('a', { class: 'version-pill', href: `#${entry.version}` }, [entry.version]),
    el('time', { datetime: entry.date }, [formatDate(entryDateFormat, entry.date)])
  ])
  if (entry.repo) meta.append(el('span', { class: 'repo' }, [entry.repo]))

  const header = el('header', { class: 'entry-header' }, [
    meta,
    el('h2', { id: `title-${entry.version}` }, [entry.title])
  ])
  if (entry.tags?.length) {
    header.append(el('ul', { class: 'tags' }, entry.tags.map((tag) =>
      el('li', { class: `tag tag-${tag}` }, [TAG_LABELS[tag] ?? tag])
    )))
  }
  if (entry.summary) header.append(el('p', { class: 'summary' }, [entry.summary]))

  const article = el('article', {
    class: 'entry',
    id: entry.version,
    'data-repo': entry.repo ?? '',
    'aria-labelledby': `title-${entry.version}`
  }, [header])

  if (entry.image) {
    article.append(el('img', {
      class: 'screenshot',
      src: entry.image,
      alt: `Screenshot for ${entry.version}: ${entry.title}`,
      loading: 'lazy'
    }))
  }

  for (const section of entry.sections ?? []) {
    article.append(el('section', { class: 'entry-section' }, [
      el('h3', {}, [section.heading]),
      el('ul', {}, section.items.map((item) => el('li', {}, [item])))
    ]))
  }

  if (entry.links?.length) {
    const anchors = entry.links.map((link) => el('a', { href: link.url, rel: 'noreferrer' }, [link.label]))
    article.append(el('p', { class: 'entry-links' }, anchors.flatMap((anchor, index) => (index === 0 ? [anchor] : [' · ', anchor]))))
  }

  return article
}

function renderRailItem(entry) {
  return el('li', { 'data-repo': entry.repo ?? '' }, [
    el('a', { href: `#${entry.version}`, 'data-version': entry.version }, [
      el('span', { class: 'rail-version' }, [entry.version]),
      el('span', { class: 'rail-date' }, [formatDate(railDateFormat, entry.date)])
    ])
  ])
}

function applyFilter(repo) {
  for (const article of entriesRoot.querySelectorAll('article')) {
    article.hidden = repo !== null && article.dataset.repo !== repo
  }
  for (const item of rail.querySelectorAll('li')) {
    item.hidden = repo !== null && item.dataset.repo !== repo
  }
  for (const button of filters.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String((button.dataset.repo ?? null) === repo))
  }
  const url = new URL(location)
  if (repo === null) url.searchParams.delete('repo')
  else url.searchParams.set('repo', repo)
  history.replaceState(null, '', url)
}

function renderFilters(entries) {
  const repos = [...new Set(entries.map((entry) => entry.repo).filter(Boolean))].sort()
  if (repos.length < 2) return
  filters.replaceChildren(
    el('button', { type: 'button', 'aria-pressed': 'true' }, ['All']),
    ...repos.map((repo) => el('button', { type: 'button', 'data-repo': repo, 'aria-pressed': 'false' }, [repo]))
  )
  filters.hidden = false
  filters.addEventListener('click', (event) => {
    const button = event.target.closest('button')
    if (button) applyFilter(button.dataset.repo ?? null)
  })
}

function watchActiveEntry() {
  const links = new Map([...rail.querySelectorAll('a')].map((link) => [link.dataset.version, link]))
  const observer = new IntersectionObserver((observations) => {
    for (const observation of observations) {
      if (!observation.isIntersecting) continue
      for (const link of links.values()) link.removeAttribute('aria-current')
      links.get(observation.target.id)?.setAttribute('aria-current', 'true')
    }
  }, { rootMargin: '-10% 0px -70% 0px' })
  for (const article of entriesRoot.querySelectorAll('article')) observer.observe(article)
}

async function main() {
  let entries
  try {
    const response = await fetch('entries.json')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    entries = await response.json()
  } catch (error) {
    entriesRoot.replaceChildren(el('p', { class: 'load-error' }, [
      `Could not load entries.json (${error.message}). Run node scripts/build.mjs first.`
    ]))
    entriesRoot.removeAttribute('aria-busy')
    return
  }

  entriesRoot.replaceChildren(...entries.map(renderEntry))
  rail.replaceChildren(...entries.map(renderRailItem))
  entriesRoot.removeAttribute('aria-busy')
  renderFilters(entries)
  const requestedRepo = new URL(location).searchParams.get('repo')
  if (requestedRepo && entries.some((entry) => entry.repo === requestedRepo)) {
    applyFilter(requestedRepo)
  }
  watchActiveEntry()

  if (location.hash) {
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)))
    if (target) {
      target.scrollIntoView()
      Promise.allSettled([...entriesRoot.querySelectorAll('img')].map((img) => img.decode())).then(() => target.scrollIntoView())
    }
  }
}

main()
