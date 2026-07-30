# AGENTS.md

This repository is the changelog for my personal projects. If you are reading this, you have most likely just committed and pushed work in another repository (plain-personal, rocky-agent, or a future one) and now need to record what shipped. Your job here: add exactly one entry, validate it, push it.

## The Short Version

```bash
node scripts/new-entry.mjs <version>
# edit data/months/<YYYY-MM>/<version>.json
node scripts/build.mjs
git add data/ && git commit && git push
```

No `npm install`. The scripts have zero dependencies and need Node 18 or newer.

## Picking a Version

- List `data/months/` and match the existing scheme (currently `0.x.y`). Feature work bumps minor, a batch of small fixes bumps patch.
- Versions are unique across all repos; the changelog is one shared version line, not one line per repo.
- The filename must equal the `version` field (`0.5.0.json` contains `"version": "0.5.0"`), and the file lives in the month folder matching its `date` (`data/months/2026-08/0.5.0.json`). `new-entry.mjs` puts it in the right place; the build rejects mismatches, wrong month folders and duplicates.
- The site sorts by `date` descending with semver as the tiebreak, so multiple entries on one day are fine.

## Filling the Entry

Required: `version`, `date` (`YYYY-MM-DD`, the day the work shipped), `title`. Everything else is optional but a good entry has all of it. Full schema in `schema/entry.schema.json`; the build rejects unknown fields.

- `repo`: the exact source repository name. This drives the filter pills on the site, so spell it the same way every time.
- `tags`: subset of `new`, `improved`, `fixed`. Nothing else validates.
- `sections`: headed bullet lists, conventionally New / Improved / Fixed. Write items as user visible changes, one short sentence each.
- `links`: commit URLs with full SHAs from the repository you just pushed.
- Source everything from the real git history you just created. No invented features, no placeholder text, no padding. A three line entry beats an embellished one.

Example:

```json
{
  "version": "0.5.0",
  "date": "2026-08-02",
  "title": "Weather aware run planning",
  "repo": "plain-personal",
  "summary": "The runs page suggests time slots based on the forecast.",
  "tags": ["new", "fixed"],
  "image": "assets/0.5.0-run-planner.jpg",
  "sections": [
    { "heading": "New", "items": ["Run planner suggests slots from the 48 hour forecast"] },
    { "heading": "Fixed", "items": ["Timezone drift no longer shifts runs logged after 23:00"] }
  ],
  "links": [
    { "label": "Commit abc1234", "url": "https://github.com/PewhProgrammer/plain-personal/commit/<full sha>" }
  ]
}
```

## Screenshots

Optional but valuable. Put the file in `data/assets/`, name it `<version>-<slug>.jpg`, reference it as `"image": "assets/<version>-<slug>.jpg"`. The build fails if the file does not exist.

Rules, in priority order:

1. **This repository is public.** No real names other than mine, no addresses, no phone numbers, no financial details. Personal dashboards leak: event timelines and calendars show companions and travel, generated documents show recipients. If a feature renders documents, produce the screenshot with placeholder data (Mustermann style) through the same code path; never screenshot real output. Inspect every pixel before committing.
2. The site has a dark theme. Flatten transparency; `sips` PDF rendering keeps an alpha channel, so convert document renders to JPEG.
3. Keep files small. JPEG for photographic or dashboard content, roughly under 500 KB.

## Validating

```bash
node scripts/build.mjs
```

Must exit 0. It checks required fields, date validity, the tag set, filename versus version, the month folder versus the date, duplicates, unknown fields, and that the image exists. It also writes `site/entries.json` and copies `site/assets/`; both are gitignored build output. Never commit them and never edit them by hand.

Preview if you want to look at it:

```bash
node scripts/build.mjs && python3 -m http.server 8000 -d site
```

## Committing

- Commit only files under `data/`.
- A branch plus PR to `main` is the default; a direct commit to `main` is acceptable for a single clean entry if you have push access.
- Commit message in the style of `feat: add 0.5.0 entry for plain-personal run planner`.

## Do Not

- Rewrite or renumber existing entries. Typo fixes are fine; history rewrites are not.
- Invent tags or JSON fields.
- Commit `site/entries.json`, `site/assets/`, or anything generated.
- Weaken the build validation to make a malformed entry pass. Fix the entry.
