import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

import { APP_CONFIG } from '../config/app-config';
import {
  DataSource,
  GithubRepo,
  LoadOutcome,
  RepoSnapshot,
  SnapshotRepo,
} from '../models/github.model';
import {
  EMPTY_FILTERS,
  OverridesFile,
  PROJECT_STATUSES,
  Project,
  ProjectFilters,
  ProjectOverride,
  ProjectStatus,
} from '../models/project.model';
import { GithubApiError, GithubApiService } from './github-api.service';

const DAY_MS = 86_400_000;
const NOT_FEATURED = Number.MAX_SAFE_INTEGER;
const LIVE_TIMEOUT_MS = 8_000;

/**
 * Owns all project state.
 *
 * Data comes from three places, merged in one pass:
 *   1. the live GitHub API (freshest, but rate-limited to 60/hr per IP),
 *   2. `repos-snapshot.json` written at build time (the always-available
 *      fallback, and the source of per-repo detail like READMEs),
 *   3. `projects.json`, the hand-curated overrides that make a project look
 *      deliberate rather than auto-generated.
 *
 * Overrides always win. If the live call fails the snapshot renders instead,
 * so a visitor never lands on an empty page.
 */
@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(GithubApiService);
  private readonly config = inject(APP_CONFIG);

  private readonly _projects = signal<Project[]>([]);
  private readonly _loading = signal(false);
  private readonly _loaded = signal(false);
  private readonly _outcome = signal<LoadOutcome>({
    source: 'none',
    fetchedAt: null,
    reason: null,
  });

  readonly projects = this._projects.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly outcome = this._outcome.asReadonly();

  readonly isConfigured = computed(() => this.config.githubUsername.trim().length > 0);

  readonly filters = signal<ProjectFilters>({ ...EMPTY_FILTERS });

  readonly featured = computed(() =>
    this._projects()
      .filter((p) => p.featured)
      .sort((a, b) => a.featureRank - b.featureRank),
  );

  readonly stats = computed(() => {
    const all = this._projects();
    return {
      total: all.length,
      live: all.filter((p) => p.status === 'live' || p.status === 'beta').length,
      helpWanted: all.filter((p) => p.lookingForHelp || p.goodFirstIssues.length > 0).length,
      stars: all.reduce((sum, p) => sum + p.stars, 0),
      languages: new Set(all.map((p) => p.primaryLanguage).filter(Boolean)).size,
    };
  });

  /** Languages present across all projects, most common first. */
  readonly availableLanguages = computed(() => {
    const counts = new Map<string, number>();
    for (const p of this._projects()) {
      if (p.primaryLanguage) counts.set(p.primaryLanguage, (counts.get(p.primaryLanguage) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  });

  /** Statuses actually in use, so the filter bar never shows empty options. */
  readonly availableStatuses = computed(() => {
    const present = new Set(this._projects().map((p) => p.status));
    return PROJECT_STATUSES.filter((s) => present.has(s));
  });

  readonly filteredProjects = computed(() => {
    const { query, statuses, languages, helpWantedOnly, sort } = this.filters();
    const q = query.trim().toLowerCase();

    const matches = this._projects().filter((p) => {
      if (statuses.length && !statuses.includes(p.status)) return false;
      if (languages.length && (!p.primaryLanguage || !languages.includes(p.primaryLanguage)))
        return false;
      if (helpWantedOnly && !p.lookingForHelp && p.goodFirstIssues.length === 0) return false;
      if (!q) return true;

      return (
        p.displayName.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.techStack.some((t) => t.toLowerCase().includes(q)) ||
        p.topics.some((t) => t.toLowerCase().includes(q))
      );
    });

    return matches.sort((a, b) => {
      switch (sort) {
        case 'stars':
          return b.stars - a.stars || a.displayName.localeCompare(b.displayName);
        case 'name':
          return a.displayName.localeCompare(b.displayName);
        default:
          return new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime();
      }
    });
  });

  byName(name: string): Project | undefined {
    const wanted = name.toLowerCase();
    return this._projects().find((p) => p.name.toLowerCase() === wanted);
  }

  patchFilters(patch: Partial<ProjectFilters>): void {
    this.filters.update((f) => ({ ...f, ...patch }));
  }

  resetFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
  }

  /** Loads once per session unless `force` is set. */
  async load(force = false): Promise<void> {
    if (this._loading()) return;
    if (this._loaded() && !force) return;

    this._loading.set(true);
    try {
      const [overrides, snapshot] = await Promise.all([this.readOverrides(), this.readSnapshot()]);
      const { repos, outcome } = await this.resolveRepos(snapshot, force);

      const enrichment = new Map<string, SnapshotRepo>(
        (snapshot?.repos ?? []).map((r) => [r.name.toLowerCase(), r]),
      );

      const hidden = new Set((overrides.hidden ?? []).map((n) => n.toLowerCase()));
      const featured = (overrides.featured ?? []).map((n) => n.toLowerCase());

      this._projects.set(
        repos
          .filter((r) => !r.private && !hidden.has(r.name.toLowerCase()))
          .map((repo) =>
            this.toProject(
              repo,
              enrichment.get(repo.name.toLowerCase()),
              overrides.overrides?.[repo.name],
              featured.indexOf(repo.name.toLowerCase()),
            ),
          ),
      );
      this._outcome.set(outcome);
      this._loaded.set(true);
    } finally {
      this._loading.set(false);
    }
  }

  /** Discards the cache and re-reads from the live API. */
  async refresh(): Promise<void> {
    this.api.clearCache(this.cacheKey());
    await this.load(true);
  }

  // --- sources ------------------------------------------------------------

  private cacheKey(): string {
    return `repos.${this.config.githubUsername.toLowerCase()}`;
  }

  private async readOverrides(): Promise<OverridesFile> {
    return this.readJson<OverridesFile>(this.config.overridesPath, {});
  }

  private async readSnapshot(): Promise<RepoSnapshot | null> {
    return this.readJson<RepoSnapshot | null>(this.config.snapshotPath, null);
  }

  /** Static JSON under `public/`; a missing file is a normal, non-fatal state. */
  private readJson<T>(path: string, fallback: T): Promise<T> {
    return firstValueFrom(this.http.get<T>(path).pipe(catchError(() => of(fallback))));
  }

  /**
   * Live first, then the localStorage cache, then the build-time snapshot.
   * Each step records why it fell through so the UI can say so.
   */
  private async resolveRepos(
    snapshot: RepoSnapshot | null,
    force: boolean,
  ): Promise<{ repos: GithubRepo[]; outcome: LoadOutcome }> {
    const username = this.config.githubUsername.trim();
    const useSnapshot = (reason: LoadOutcome['reason']): { repos: GithubRepo[]; outcome: LoadOutcome } => ({
      repos: snapshot?.repos ?? [],
      outcome: {
        source: snapshot ? 'snapshot' : 'none',
        fetchedAt: snapshot?.generatedAt ?? null,
        reason,
      },
    });

    if (!username) return useSnapshot('not-configured');

    if (!force) {
      const cached = this.api.readCache<GithubRepo[]>(this.cacheKey());
      if (cached) {
        return {
          repos: cached.data,
          outcome: { source: 'cache', fetchedAt: cached.fetchedAt, reason: null },
        };
      }
    }

    try {
      const repos = await firstValueFrom(
        this.api.listRepos(username).pipe(timeout(LIVE_TIMEOUT_MS)),
      );
      const fetchedAt = this.api.writeCache(this.cacheKey(), repos);
      return { repos, outcome: { source: 'live', fetchedAt, reason: null } };
    } catch (err) {
      const kind = err instanceof GithubApiError ? err.kind : 'network';
      return useSnapshot(kind === 'not-found' ? 'not-found' : kind === 'rate-limited' ? 'rate-limited' : 'network');
    }
  }

  // --- merge --------------------------------------------------------------

  private toProject(
    repo: GithubRepo,
    snap: SnapshotRepo | undefined,
    override: ProjectOverride | undefined,
    featuredIndex: number,
  ): Project {
    const languages = snap?.languages ?? {};
    const topics = repo.topics ?? [];
    const demoUrl = override?.demoUrl ?? this.normalizeUrl(repo.homepage);
    const curatedStatus = override?.status ?? this.statusFromTopics(topics);

    return {
      name: repo.name,
      displayName: override?.displayName ?? this.humanize(repo.name),
      fullName: repo.full_name,
      tagline: override?.tagline ?? repo.description ?? 'No description yet.',
      longDescription: override?.longDescription ?? null,

      status: curatedStatus ?? this.deriveStatus(repo, demoUrl),
      statusIsCurated: !!curatedStatus,

      repoUrl: repo.html_url,
      demoUrl,
      embeddable: override?.embeddable ?? false,
      media: override?.media ?? [],

      techStack: override?.techStack ?? this.deriveTechStack(repo, languages, topics),
      primaryLanguage: repo.language,
      languages,
      topics: topics.filter((t) => !t.startsWith('status-')),

      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      license: repo.license?.spdx_id ?? repo.license?.name ?? null,

      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      pushedAt: repo.pushed_at,

      archived: repo.archived,
      isFork: repo.fork,
      featured: featuredIndex >= 0,
      featureRank: featuredIndex >= 0 ? featuredIndex : NOT_FEATURED,

      lookingForHelp: override?.lookingForHelp ?? (snap?.goodFirstIssues?.length ?? 0) > 0,
      helpNotes: override?.helpNotes ?? null,
      roadmap: override?.roadmap ?? [],
      goodFirstIssues: snap?.goodFirstIssues ?? [],
      hasContributing: snap?.hasContributing ?? false,
      defaultBranch: repo.default_branch || 'main',

      readmeHtml: override?.hideReadme ? null : (snap?.readmeHtml ?? null),
    };
  }

  /** A repo can declare its own status with a `status-live` style topic. */
  private statusFromTopics(topics: string[]): ProjectStatus | null {
    for (const topic of topics) {
      const candidate = topic.replace(/^status-/, '') as ProjectStatus;
      if (topic.startsWith('status-') && PROJECT_STATUSES.includes(candidate)) return candidate;
    }
    return null;
  }

  /**
   * Best guess when nothing is curated — recency and a live URL are the signals.
   *
   * "Archived" is only ever claimed when GitHub actually says so: an old repo
   * is not an abandoned one, and mislabelling it reads as a statement about
   * the project that its owner never made. Everything quiet falls back to
   * "paused", which is the honest reading of "no recent pushes".
   */
  private deriveStatus(repo: GithubRepo, demoUrl: string | null): ProjectStatus {
    if (repo.archived) return 'archived';
    if (demoUrl) return 'live';
    const ageDays = (Date.now() - new Date(repo.pushed_at).getTime()) / DAY_MS;
    return ageDays <= 45 ? 'wip' : 'paused';
  }

  private deriveTechStack(
    repo: GithubRepo,
    languages: Record<string, number>,
    topics: string[],
  ): string[] {
    const fromLanguages = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);

    const stack = fromLanguages.length ? fromLanguages : repo.language ? [repo.language] : [];
    const extras = topics
      .filter((t) => !t.startsWith('status-'))
      .map((t) => this.humanize(t))
      .filter((t) => !stack.some((s) => s.toLowerCase() === t.toLowerCase()));

    return [...stack, ...extras].slice(0, 6);
  }

  /** `my-cool-app` / `my_cool_app` -> `My Cool App`. */
  private humanize(name: string): string {
    // Domain-style names (kingpingx.github.io) are already the display name —
    // splitting them on dots and title-casing produces nonsense.
    if (/^[\w-]+(\.[\w-]+){1,}$/.test(name)) return name;

    return name
      .replace(/[-_]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** GitHub's `homepage` is free text and often missing its scheme. */
  private normalizeUrl(url: string | null): string | null {
    const trimmed = url?.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
    return null;
  }

  /** Human-readable label for where the rendered data came from. */
  sourceLabel(outcome: LoadOutcome = this._outcome()): string {
    const when = outcome.fetchedAt ? this.relativeTime(outcome.fetchedAt) : null;
    const from: Record<DataSource, string> = {
      live: 'Live from GitHub',
      cache: 'Cached',
      snapshot: 'From last build',
      none: 'No data',
    };
    return when ? `${from[outcome.source]} · ${when}` : from[outcome.source];
  }

  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(diff)) return '';
    const mins = Math.round(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.round(months / 12)}y ago`;
  }
}
