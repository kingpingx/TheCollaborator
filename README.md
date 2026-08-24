# Collaborator

A self-updating showcase for GitHub projects — what each one is, what state it's
in, a demo you can try, and a clear on-ramp for anyone who wants to contribute.

The project list is read live from the GitHub API, so a new repository appears
without editing this site. A small curated file adds the context GitHub does not
store: status, demo URL, screenshots, and what specifically needs doing.

Built with Angular 22 (standalone, signals, zoneless) and Tailwind CSS v4.
No backend, no analytics.

## Getting started

Requires **Node 22.22.3+ or 24.15+** (Angular 22's engine constraint).

```bash
npm install
npm start          # http://localhost:4200
```

The app boots with no configuration and shows a "configure your username"
notice until you do the one required step below.

### 1. Set your GitHub handle

`src/app/core/config/app-config.ts`:

```ts
export const appConfigValue: AppConfig = {
  githubUsername: 'your-handle',   // <- the only required value
  ownerName: 'Your Name',
  ...
};
```

### 2. Generate the offline snapshot

```bash
npm run sync:github
```

This writes `public/data/repos-snapshot.json`. See
[Why a snapshot](#why-a-snapshot) below for what it is for.

## Curating a project

Everything hand-written lives in [`public/data/projects.json`](public/data/projects.json),
keyed by repository name. Every field is optional — a repo with no entry still
renders from its API data alone.

```jsonc
{
  "featured": ["my-best-project"],       // pinned to the home page, in order
  "hidden":   ["some-fork"],             // never shown anywhere
  "overrides": {
    "my-best-project": {
      "displayName": "My Best Project",
      "tagline": "The one line shown on the card.",
      "longDescription": "Supports **bold**, `code`, [links](https://x.com) and - lists.",
      "status": "live",
      "demoUrl": "https://example.com",
      "embeddable": true,
      "media": [{ "type": "image", "src": "media/shot-1.png", "caption": "…" }],
      "techStack": ["Angular", "Node"],
      "lookingForHelp": true,
      "helpNotes": "Needs a test suite and Linux packaging.",
      "roadmap": ["Offline support", "Keyboard shortcuts"]
    }
  }
}
```

Screenshots go in `public/media/`. The file itself carries a `_help` block
documenting every field.

### Statuses

`live` · `beta` · `wip` · `paused` · `archived` · `experiment`

Set it in `projects.json`, or tag the repository with a topic like `status-live`
to keep the setting with the repo. If neither is present it is inferred from
whether the repo is archived, whether it has a homepage URL, and how recently it
was pushed to.

### Embedded demos

`embeddable: true` renders the demo in an iframe on the project page. Leave it
off if the site sends `X-Frame-Options` or a `frame-ancestors` CSP — a
cross-origin refusal is invisible to JavaScript, so this cannot be detected
automatically and you would get a blank box. Projects that can't be embedded
fall back to the screenshot gallery, then to a plain "open in new tab" button.

## Why a snapshot

GitHub allows **60 unauthenticated API requests per hour per IP**, which a public
page would burn through quickly. So there are two sources:

- **Live** — one request for the repo list on load, cached in `localStorage` for
  30 minutes.
- **Snapshot** — `public/data/repos-snapshot.json`, generated at build time and
  shipped with the site. It also supplies the per-repo detail (languages,
  READMEs, good-first-issues) that would otherwise cost a request each.

If the live call is rate-limited or the network is down, the page renders from
the snapshot and says so quietly under the project list instead of showing an
error. CI regenerates the snapshot on every deploy using the workflow's token,
which raises the budget to 5000 requests/hour.

## Deploying to GitHub Pages

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and
publishes on every push to `main`, plus once daily so the snapshot stays fresh.

1. Push this repository to GitHub.
2. **Settings → Pages → Source: GitHub Actions**.
3. Push to `main`.

The workflow derives `--base-href` from the repository name, so it works whether
you deploy to `user.github.io/collaborator/` or to a root domain. It also copies
`index.html` to `404.html`, which is what makes deep links like
`/projects/my-app` survive a refresh — GitHub Pages has no SPA rewrite rule.

For a custom domain, add `public/CNAME` containing the domain; the workflow
detects it and switches the base href to `/`.

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Dev server on :4200 |
| `npm run build` | Production build to `dist/collaborator/browser` |
| `npm test` | Unit tests (vitest) |
| `npm run sync:github` | Regenerate the offline snapshot |
| `npm run format` | Prettier over `src/` and `tools/` |

`sync:github` accepts `--user=handle` to override the configured username and
`--full` to fetch READMEs for every repo rather than just the curated ones.

## Layout

```
src/app/
  core/         config, models, services (GitHub API, project merge, theme, SEO)
  layout/       header, footer
  features/     home, projects, project-detail, about, not-found
  shared/ui/    cards, badges, chips, demo frame, empty/loading states
public/data/    projects.json (curated) · repos-snapshot.json (generated)
tools/          sync-github.mjs
```

The merge logic — API data plus curated overrides — lives in
`core/services/project.service.ts` and is the piece worth reading first.
