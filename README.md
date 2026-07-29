# changelogs

A changelog site with zero build tooling. Every released version is one JSON file in `entries/`; a small Node script compiles them into a static page in `site/`.

## Quick Start

```bash
node scripts/build.mjs && python3 -m http.server 8000 -d site
```

Then open http://localhost:8000. Requires Node 18 or newer, no `npm install`.

## Adding a Version

```bash
node scripts/new-entry.mjs 0.4.0
```

This scaffolds `entries/0.4.0.json` with today's date. Fill it in, then run `node scripts/build.mjs`. The build validates every entry and fails loudly, naming the offending file, rather than silently dropping a malformed one.

When something ships in another repo, that repo adds one JSON file here (the `repo` field records where it came from). Automating that cross repo append is phase 2.

## Entry Format

One file per version, named `<version>.json`. The full schema lives in `schema/entry.schema.json`.

```json
{
  "version": "0.3.0",
  "date": "2026-07-24",
  "title": "Personal records from Garmin lap splits",
  "repo": "plain-personal",
  "summary": "Race efforts embedded inside longer runs now count as personal records.",
  "tags": ["new", "fixed"],
  "image": "assets/0.3.0-screenshot.png",
  "sections": [
    { "heading": "New", "items": ["Best effort times are derived from lap splits"] },
    { "heading": "Fixed", "items": ["Duplicate running events are removed"] }
  ],
  "links": [{ "label": "Commit", "url": "https://github.com/owner/repo/commit/sha" }]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `version` | yes | Must match the filename |
| `date` | yes | `YYYY-MM-DD`, the sort key (newest first, semver breaks ties) |
| `title` | yes | One line headline |
| `repo` | no | Which repo shipped it; powers the repository filter pills and `?repo=` deep links |
| `summary` | no | Short paragraph under the title |
| `tags` | no | Any of `new`, `improved`, `fixed`; rendered as badges |
| `image` | no | Screenshot path relative to `entries/`, must exist |
| `sections` | no | Headed bullet lists |
| `links` | no | Related commits or PRs |

## Screenshots

Drop images in `entries/assets/` and reference them as `assets/<name>.png` in the entry. The build copies them to `site/assets/`.

## Repo Layout

```
entries/          one JSON file per version, plus assets/
schema/           entry.schema.json, the entry shape
scripts/          build.mjs (compile + validate), new-entry.mjs (scaffold)
site/             static page; entries.json and assets/ are build output
```

`site/entries.json` and `site/assets/` are generated and gitignored.

## Phase 2

Not in this repo yet: hosting (GitHub Pages), a subdomain, a deploy workflow, and automated cross repo entry ingestion.
