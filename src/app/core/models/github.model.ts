/**
 * The subset of the GitHub REST API surface this app actually reads.
 * Only fields we use are declared — the real payloads are far larger.
 */

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  archived: boolean;
  disabled: boolean;
  fork: boolean;
  private: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  license: { key: string; name: string; spdx_id: string | null } | null;
  default_branch: string;
}

export interface GithubIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  comments: number;
  created_at: string;
  labels: Array<{ name: string; color: string } | string>;
  /** Present on pull requests; used to filter them out of issue lists. */
  pull_request?: unknown;
}

export interface GithubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  location: string | null;
  blog: string | null;
}

/** Languages endpoint returns a map of language name -> bytes of code. */
export type GithubLanguages = Record<string, number>;

/**
 * Build-time snapshot written by `tools/sync-github.mjs`. Serves as the
 * offline/rate-limited fallback so visitors never see an empty page.
 */
export interface RepoSnapshot {
  generatedAt: string;
  username: string;
  user: GithubUser | null;
  repos: SnapshotRepo[];
}

export interface SnapshotRepo extends GithubRepo {
  languages: GithubLanguages;
  goodFirstIssues: GithubIssue[];
  readmeHtml: string | null;
  hasContributing: boolean;
}

/** Where the currently-rendered data came from. Surfaced in the UI. */
export type DataSource = 'live' | 'cache' | 'snapshot' | 'none';

export interface LoadOutcome {
  source: DataSource;
  /** When the underlying data was produced. */
  fetchedAt: string | null;
  /** Set when the live call failed; explains the fallback to the user. */
  reason: 'rate-limited' | 'network' | 'not-configured' | 'not-found' | null;
}
