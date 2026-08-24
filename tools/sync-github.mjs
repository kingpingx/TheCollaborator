#!/usr/bin/env node
/**
 * Generates `public/data/repos-snapshot.json` — the offline fallback the app
 * renders when the live GitHub API is unreachable or rate-limited.
 *
 * Usage:
 *   node tools/sync-github.mjs                 # username read from app-config.ts
 *   node tools/sync-github.mjs --user=octocat  # or passed explicitly
 *   node tools/sync-github.mjs --full          # fetch READMEs for every repo
 *
 * Set GITHUB_TOKEN to raise the API budget from 60 requests/hour to 5000.
 * CI passes the workflow's automatic token, so the build always runs authenticated.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_FILE = resolve(ROOT, 'src/app/core/config/app-config.ts');
const OVERRIDES_FILE = resolve(ROOT, 'public/data/projects.json');
const OUTPUT_FILE = resolve(ROOT, 'public/data/repos-snapshot.json');

const API = 'https://api.github.com';
const CONCURRENCY = 4;
const README_MAX_BYTES = 60_000;
const GOOD_FIRST_LABEL = 'good first issue';

const args = process.argv.slice(2);
const flag = (name) => args.some((a) => a === `--${name}`);
const option = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const fetchAllReadmes = flag('full');

// --- helpers ---------------------------------------------------------------

let requestCount = 0;

async function api(path, { accept = 'application/vnd.github+json', raw = false } = {}) {
  const url = path.startsWith('http') ? path : `${API}${path}`;
  const headers = { Accept: accept, 'User-Agent': 'collaborator-sync' };
  if (token) headers.Authorization = `Bearer ${token}`;

  requestCount++;
  const res = await fetch(url, { headers });

  if (res.status === 404) return null;
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining === '0') {
      const reset = Number(res.headers.get('x-ratelimit-reset') ?? 0) * 1000;
      const mins = Math.max(0, Math.ceil((reset - Date.now()) / 60000));
      throw new Error(
        `GitHub rate limit reached after ${requestCount} requests. ` +
          `Resets in ~${mins} min. Set GITHUB_TOKEN to raise the limit to 5000/hour.`,
      );
    }
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);

  return raw ? res.text() : res.json();
}

/** Runs `worker` over `items` with a small fixed concurrency. */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

/** Reads `githubUsername` out of app-config.ts so there is one source of truth. */
async function usernameFromConfig() {
  if (!existsSync(CONFIG_FILE)) return '';
  const source = await readFile(CONFIG_FILE, 'utf8');
  const match = /githubUsername:\s*['"]([^'"]*)['"]/.exec(source);
  return match?.[1]?.trim() ?? '';
}

async function readOverrides() {
  if (!existsSync(OVERRIDES_FILE)) return {};
  try {
    return JSON.parse(await readFile(OVERRIDES_FILE, 'utf8'));
  } catch (err) {
    console.warn(`! projects.json could not be parsed, continuing without it: ${err.message}`);
    return {};
  }
}

/**
 * GitHub renders README links relative to the repo, so images arrive as paths
 * like `docs/screenshot.png`. Point them at raw.githubusercontent.com or they
 * 404 once the HTML is served from this site's origin.
 */
function absolutizeReadme(html, repo) {
  const rawBase = `https://raw.githubusercontent.com/${repo.full_name}/${repo.default_branch}/`;
  const blobBase = `${repo.html_url}/blob/${repo.default_branch}/`;

  return html
    .replace(/(<img[^>]+src=")(?!https?:|data:|#)([^"]+)"/gi, (_m, prefix, path) => {
      return `${prefix}${rawBase}${path.replace(/^\.?\//, '')}"`;
    })
    .replace(/(<a[^>]+href=")(?!https?:|mailto:|#)([^"]+)"/gi, (_m, prefix, path) => {
      return `${prefix}${blobBase}${path.replace(/^\.?\//, '')}"`;
    });
}

// --- per-repo enrichment ---------------------------------------------------

async function enrich(repo, wantsReadme) {
  const languages = (await api(`/repos/${repo.full_name}/languages`)) ?? {};

  const issues =
    (await api(
      `/repos/${repo.full_name}/issues?state=open&per_page=5` +
        `&labels=${encodeURIComponent(GOOD_FIRST_LABEL)}`,
    )) ?? [];

  let readmeHtml = null;
  let hasContributing = false;

  if (wantsReadme) {
    const html = await api(`/repos/${repo.full_name}/readme`, {
      accept: 'application/vnd.github.html+json',
      raw: true,
    });
    if (html) {
      const trimmed =
        html.length > README_MAX_BYTES ? `${html.slice(0, README_MAX_BYTES)}\n<p>…</p>` : html;
      readmeHtml = absolutizeReadme(trimmed, repo);
    }

    const contributing = await api(`/repos/${repo.full_name}/contents/CONTRIBUTING.md`);
    hasContributing = contributing !== null;
  }

  return {
    ...repo,
    languages,
    goodFirstIssues: (issues ?? [])
      .filter((i) => !i.pull_request)
      .map(({ id, number, title, html_url, state, comments, created_at, labels }) => ({
        id,
        number,
        title,
        html_url,
        state,
        comments,
        created_at,
        labels: (labels ?? []).map((l) => (typeof l === 'string' ? l : { name: l.name, color: l.color })),
      })),
    readmeHtml,
    hasContributing,
  };
}

/** Trim the API payload down to the fields the app declares. */
function slimRepo(repo) {
  return {
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    html_url: repo.html_url,
    homepage: repo.homepage,
    language: repo.language,
    topics: repo.topics ?? [],
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    open_issues_count: repo.open_issues_count,
    watchers_count: repo.watchers_count,
    archived: repo.archived,
    disabled: repo.disabled,
    fork: repo.fork,
    private: repo.private,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
    license: repo.license
      ? { key: repo.license.key, name: repo.license.name, spdx_id: repo.license.spdx_id }
      : null,
    default_branch: repo.default_branch,
  };
}

// --- main ------------------------------------------------------------------

async function main() {
  const username = option('user') || process.env.GITHUB_USERNAME || (await usernameFromConfig());

  if (!username) {
    console.error(
      '\n  No GitHub username configured.\n\n' +
        '  Set it in src/app/core/config/app-config.ts, or run:\n' +
        '    npm run sync:github -- --user=your-handle\n',
    );
    process.exitCode = 1;
    return;
  }

  if (!token) {
    console.warn(
      '! No GITHUB_TOKEN set — limited to 60 requests/hour.\n' +
        '  READMEs will only be fetched for featured and curated projects.',
    );
  }

  console.log(`> Syncing repositories for "${username}"…`);

  const user = await api(`/users/${encodeURIComponent(username)}`);
  if (!user) throw new Error(`GitHub has no user named "${username}".`);

  const repos = await api(
    `/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&direction=desc&per_page=100`,
  );
  if (!Array.isArray(repos)) throw new Error('Unexpected response for the repository list.');

  const overrides = await readOverrides();
  const hidden = new Set((overrides.hidden ?? []).map((n) => n.toLowerCase()));
  const curated = new Set(
    [...(overrides.featured ?? []), ...Object.keys(overrides.overrides ?? {})].map((n) =>
      n.toLowerCase(),
    ),
  );

  const visible = repos.filter((r) => !r.private && !hidden.has(r.name.toLowerCase()));
  console.log(`  ${visible.length} public repositories (${repos.length - visible.length} skipped)`);

  const enriched = await mapLimit(visible, CONCURRENCY, async (repo) => {
    const wantsReadme = fetchAllReadmes || !!token || curated.has(repo.name.toLowerCase());
    process.stdout.write(`  · ${repo.name}\n`);
    return enrich(slimRepo(repo), wantsReadme);
  });

  const snapshot = {
    generatedAt: new Date().toISOString(),
    username,
    user: {
      login: user.login,
      name: user.name,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
      bio: user.bio,
      public_repos: user.public_repos,
      followers: user.followers,
      location: user.location,
      blog: user.blog,
    },
    repos: enriched,
  };

  await mkdir(dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  const kb = Math.round(JSON.stringify(snapshot).length / 1024);
  const withReadme = enriched.filter((r) => r.readmeHtml).length;
  const withIssues = enriched.reduce((n, r) => n + r.goodFirstIssues.length, 0);

  console.log(
    `\n> Wrote public/data/repos-snapshot.json (${kb} kB)\n` +
      `  ${enriched.length} repos · ${withReadme} READMEs · ${withIssues} good first issues\n` +
      `  ${requestCount} API requests used${token ? ' (authenticated)' : ''}`,
  );
}

main().catch((err) => {
  console.error(`\n  Sync failed: ${err.message}\n`);
  process.exitCode = 1;
});
