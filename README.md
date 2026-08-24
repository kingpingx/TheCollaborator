# The Colloborator

### 🔗 [kingpingx.github.io/TheColloborator](https://kingpingx.github.io/TheColloborator/)

**The Colloborator is a website that showcases my GitHub projects.**

A GitHub profile is a list of repository names. It doesn't tell you which
projects are finished and which are half-built, which ones you can actually
try right now, or which ones would welcome your help. The Colloborator is the
page that answers those questions.

For every project it shows:

- **What it is** — a real description, not just the repo name.
- **What state it's in** — Live, Beta, In progress, Paused, Archived or
  Experiment, so nobody wastes time on something abandoned.
- **A working demo** — playable in an embedded frame right on the page where
  the project can be embedded, or as screenshots and a direct link where it
  can't.
- **How to contribute** — open "good first issues" pulled live from GitHub,
  plus fork, open-an-issue and contributing-guide links, and a plain-English
  note about what specifically needs doing.

### It keeps itself up to date

The project list is read straight from the GitHub API, so pushing a new
repository is enough to make it appear here — there's no list to maintain by
hand. A small curated file adds the things GitHub can't store (status, demo
URL, screenshots, what needs help), and those always win over the API.

That's the whole idea: **the boring parts stay automatic, and you only hand-write
the parts that make a project look worth someone's time.**

---

Built with Angular 22 (standalone, signals, zoneless) and Tailwind CSS v4.
No backend, no database, no analytics — it deploys as static files.

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
cross-origin framing refusal is invisible to JavaScript, so this cannot be
detected automatically and you would get a blank box. Projects that can't be
embedded fall back to the screenshot gallery, then to a plain "open in new tab"
button.

## Feature ideas

Every project page carries a **Feature ideas** panel where anyone can propose a
new feature, and where ideas already proposed are listed.

There is no backend, so GitHub Issues *is* the store:

- **Submitting** — the form takes a title, optional detail, and an email
  (required). It composes those into a pre-filled `issues/new` URL and opens
  GitHub, where the visitor reviews and presses Submit. Nothing is sent without
  them seeing it.
- **Attribution** — the email is written into the issue body, so you can always
  see who ideated it.
- **Listing** — the panel reads open issues labelled `enhancement` back out of
  the API and shows them, credited to the proposer's **GitHub username**. The
  email is deliberately never rendered on the page; publishing addresses on a
  public site invites scraping.

One wrinkle worth knowing: GitHub ignores the `labels` URL parameter for anyone
without write access to the repo. So an outside suggestion arrives unlabelled
and won't appear in the list until you tag it `enhancement`. The form says as
much rather than implying it shows up instantly.

Change the label or how many are listed via `featureLabel` and `maxFeatureIdeas`
in `src/app/core/config/app-config.ts`.

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
2. **Settings → Pages → Build and deployment → Source: `GitHub Actions`**.
3. Push to `main`, or re-run the last workflow.

> **Pick `GitHub Actions`, not `Deploy from a branch`.** The branch option
> hands the repository to Jekyll, which renders this README as the site: you
> get a page that returns 200 but is not the app, and every deep link and
> `data/*.json` request 404s. If the deployed page's `<head>` contains
> `<meta name="generator" content="Jekyll ...">` and no `<app-root>`, that is
> what happened.
>
> Enabling Pages has to be done by hand once — it cannot be automated from the
> workflow. `actions/configure-pages` with `enablement: true` fails with
> *"Resource not accessible by integration"*, because creating a Pages site
> needs admin rights that `GITHUB_TOKEN` is never granted. Until Pages is
> enabled the build job passes and only the deploy job fails, with
> *"Failed to create deployment (status: 404)"*.

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
