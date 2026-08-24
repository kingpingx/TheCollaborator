import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { APP_CONFIG, appConfigValue } from '../config/app-config';
import { GithubRepo, RepoSnapshot } from '../models/github.model';
import { OverridesFile } from '../models/project.model';
import { ProjectService } from './project.service';

/** Minimal repo fixture — only the fields the merge actually reads. */
function repo(overrides: Partial<GithubRepo> = {}): GithubRepo {
  const now = new Date().toISOString();
  return {
    id: 1,
    name: 'sample-repo',
    full_name: 'tester/sample-repo',
    description: 'A sample repository.',
    html_url: 'https://github.com/tester/sample-repo',
    homepage: null,
    language: 'TypeScript',
    topics: [],
    stargazers_count: 3,
    forks_count: 1,
    open_issues_count: 2,
    watchers_count: 3,
    archived: false,
    disabled: false,
    fork: false,
    private: false,
    created_at: now,
    updated_at: now,
    pushed_at: now,
    license: null,
    default_branch: 'main',
    ...overrides,
  };
}

function snapshot(repos: GithubRepo[]): RepoSnapshot {
  return {
    generatedAt: '2026-01-01T00:00:00.000Z',
    username: 'tester',
    user: null,
    repos: repos.map((r) => ({
      ...r,
      languages: { TypeScript: 900, CSS: 100 },
      goodFirstIssues: [],
      readmeHtml: null,
      hasContributing: false,
    })),
  };
}

describe('ProjectService', () => {
  let service: ProjectService;
  let http: HttpTestingController;

  /**
   * Loads with no username configured, which skips the live API call and
   * exercises the snapshot fallback — the path that keeps the site usable
   * when GitHub is rate-limited.
   */
  async function loadWith(overrides: OverridesFile, snap: RepoSnapshot | null) {
    const done = service.load(true);
    http.expectOne(appConfigValue.overridesPath).flush(overrides);
    http.expectOne(appConfigValue.snapshotPath).flush(snap);
    await done;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...appConfigValue, githubUsername: '' } },
      ],
    });
    service = TestBed.inject(ProjectService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('falls back to the snapshot and reports why', async () => {
    await loadWith({}, snapshot([repo()]));

    expect(service.projects().length).toBe(1);
    expect(service.outcome().source).toBe('snapshot');
    expect(service.outcome().reason).toBe('not-configured');
  });

  it('survives both data files being missing', async () => {
    const done = service.load(true);
    http.expectOne(appConfigValue.overridesPath).flush(null, { status: 404, statusText: 'Nope' });
    http.expectOne(appConfigValue.snapshotPath).flush(null, { status: 404, statusText: 'Nope' });
    await done;

    expect(service.projects()).toEqual([]);
    expect(service.outcome().source).toBe('none');
    expect(service.loaded()).toBe(true);
  });

  it('humanises the repo name when no displayName is curated', async () => {
    await loadWith({}, snapshot([repo({ name: 'my_cool-app' })]));
    expect(service.projects()[0].displayName).toBe('My Cool App');
  });

  it('lets overrides win over the API data', async () => {
    await loadWith(
      {
        overrides: {
          'sample-repo': {
            displayName: 'Curated Name',
            tagline: 'Curated tagline',
            status: 'beta',
            techStack: ['Rust'],
          },
        },
      },
      snapshot([repo()]),
    );

    const project = service.projects()[0];
    expect(project.displayName).toBe('Curated Name');
    expect(project.tagline).toBe('Curated tagline');
    expect(project.status).toBe('beta');
    expect(project.statusIsCurated).toBe(true);
    expect(project.techStack).toEqual(['Rust']);
  });

  it('excludes hidden repos', async () => {
    await loadWith({ hidden: ['sample-repo'] }, snapshot([repo(), repo({ name: 'keeper', id: 2 })]));

    expect(service.projects().map((p) => p.name)).toEqual(['keeper']);
  });

  it('orders featured projects by their position in the featured list', async () => {
    await loadWith(
      { featured: ['second', 'first'] },
      snapshot([repo({ name: 'first', id: 1 }), repo({ name: 'second', id: 2 })]),
    );

    expect(service.featured().map((p) => p.name)).toEqual(['second', 'first']);
  });

  describe('derived status', () => {
    it('marks archived repos as archived', async () => {
      await loadWith({}, snapshot([repo({ archived: true })]));
      expect(service.projects()[0].status).toBe('archived');
    });

    it('marks a repo with a homepage as live', async () => {
      await loadWith({}, snapshot([repo({ homepage: 'https://example.com' })]));
      expect(service.projects()[0].status).toBe('live');
    });

    it('marks a recently pushed repo without a demo as in progress', async () => {
      await loadWith({}, snapshot([repo({ homepage: null })]));
      expect(service.projects()[0].status).toBe('wip');
    });

    it('marks a long-untouched repo as paused', async () => {
      const sixMonthsAgo = new Date(Date.now() - 180 * 86_400_000).toISOString();
      await loadWith({}, snapshot([repo({ pushed_at: sixMonthsAgo })]));
      expect(service.projects()[0].status).toBe('paused');
    });

    it('honours a status- topic without an override', async () => {
      await loadWith({}, snapshot([repo({ topics: ['angular', 'status-experiment'] })]));

      const project = service.projects()[0];
      expect(project.status).toBe('experiment');
      // The marker topic is not shown as a normal topic chip.
      expect(project.topics).toEqual(['angular']);
    });
  });

  it('adds a scheme to a bare homepage value', async () => {
    await loadWith({}, snapshot([repo({ homepage: 'example.com/app' })]));
    expect(service.projects()[0].demoUrl).toBe('https://example.com/app');
  });

  it('ignores a homepage that is not a URL', async () => {
    await loadWith({}, snapshot([repo({ homepage: 'coming soon' })]));
    expect(service.projects()[0].demoUrl).toBeNull();
  });

  it('derives the tech stack from languages, biggest first', async () => {
    await loadWith({}, snapshot([repo({ topics: [] })]));
    expect(service.projects()[0].techStack).toEqual(['TypeScript', 'CSS']);
  });

  describe('filtering', () => {
    beforeEach(async () => {
      await loadWith(
        {},
        snapshot([
          repo({ name: 'alpha', id: 1, language: 'TypeScript', archived: true }),
          repo({ name: 'beta', id: 2, language: 'Python', homepage: 'https://b.dev' }),
        ]),
      );
    });

    it('matches the search query against the name', () => {
      service.patchFilters({ query: 'alph' });
      expect(service.filteredProjects().map((p) => p.name)).toEqual(['alpha']);
    });

    it('filters by status', () => {
      service.patchFilters({ statuses: ['live'] });
      expect(service.filteredProjects().map((p) => p.name)).toEqual(['beta']);
    });

    it('filters by language', () => {
      service.patchFilters({ languages: ['Python'] });
      expect(service.filteredProjects().map((p) => p.name)).toEqual(['beta']);
    });

    it('sorts by name', () => {
      service.patchFilters({ sort: 'name' });
      expect(service.filteredProjects().map((p) => p.name)).toEqual(['alpha', 'beta']);
    });

    it('resets back to everything', () => {
      service.patchFilters({ query: 'nothing-matches-this' });
      expect(service.filteredProjects().length).toBe(0);

      service.resetFilters();
      expect(service.filteredProjects().length).toBe(2);
    });
  });
});
