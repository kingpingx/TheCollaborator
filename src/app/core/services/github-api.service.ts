import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { APP_CONFIG } from '../config/app-config';
import { GithubIssue, GithubRepo, GithubUser } from '../models/github.model';

export type ApiFailure = 'rate-limited' | 'network' | 'not-found';

export class GithubApiError extends Error {
  constructor(readonly kind: ApiFailure) {
    super(`GitHub API request failed: ${kind}`);
    this.name = 'GithubApiError';
  }
}

interface CacheEntry<T> {
  fetchedAt: string;
  data: T;
}

const HEADERS = { Accept: 'application/vnd.github+json' };

/**
 * Thin wrapper over the public GitHub REST API.
 *
 * Unauthenticated callers get 60 requests per hour per IP, so this service is
 * deliberately frugal: the repo list is the only call made on load, and its
 * result is cached in localStorage. Per-repo detail (languages, READMEs) comes
 * from the build-time snapshot instead of burning requests at runtime.
 */
@Injectable({ providedIn: 'root' })
export class GithubApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  /** Every owned, non-private repo, newest activity first. One request. */
  listRepos(username: string): Observable<GithubRepo[]> {
    const url = `${this.config.apiBase}/users/${encodeURIComponent(username)}/repos`;
    return this.http
      .get<GithubRepo[]>(url, {
        headers: HEADERS,
        params: { type: 'owner', sort: 'updated', direction: 'desc', per_page: '100' },
        observe: 'response',
      })
      .pipe(
        map((res: HttpResponse<GithubRepo[]>) => res.body ?? []),
        catchError((err) => throwError(() => this.classify(err))),
      );
  }

  getUser(username: string): Observable<GithubUser> {
    const url = `${this.config.apiBase}/users/${encodeURIComponent(username)}`;
    return this.http
      .get<GithubUser>(url, { headers: HEADERS })
      .pipe(catchError((err) => throwError(() => this.classify(err))));
  }

  /**
   * Open issues labelled for newcomers. Pull requests share the issues
   * endpoint, so they are filtered out here.
   */
  listGoodFirstIssues(owner: string, repo: string): Observable<GithubIssue[]> {
    const url = `${this.config.apiBase}/repos/${owner}/${repo}/issues`;
    return this.http
      .get<GithubIssue[]>(url, {
        headers: HEADERS,
        params: {
          state: 'open',
          labels: 'good first issue',
          per_page: String(this.config.maxGoodFirstIssues),
        },
      })
      .pipe(
        map((issues) => (issues ?? []).filter((i) => !i.pull_request)),
        catchError((err) => throwError(() => this.classify(err))),
      );
  }

  /**
   * GitHub answers 403 (or 429) with `x-ratelimit-remaining: 0` when the
   * hourly budget is gone. Distinguishing that from a generic failure lets the
   * UI explain itself instead of just saying "something went wrong".
   */
  private classify(err: unknown): GithubApiError {
    if (err instanceof HttpErrorResponse) {
      const remaining = err.headers?.get('x-ratelimit-remaining');
      if ((err.status === 403 || err.status === 429) && remaining === '0') {
        return new GithubApiError('rate-limited');
      }
      if (err.status === 404) return new GithubApiError('not-found');
    }
    return new GithubApiError('network');
  }

  // --- localStorage cache -------------------------------------------------
  // Wrapped in try/catch throughout: storage throws outright in some privacy
  // modes, and a cache miss must never break the page.

  readCache<T>(key: string): CacheEntry<T> | null {
    try {
      const raw = localStorage.getItem(this.cacheKey(key));
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry<T>;
      const ageMs = Date.now() - new Date(entry.fetchedAt).getTime();
      if (ageMs > this.config.cacheTtlMinutes * 60_000) return null;
      return entry;
    } catch {
      return null;
    }
  }

  writeCache<T>(key: string, data: T): string {
    const fetchedAt = new Date().toISOString();
    try {
      localStorage.setItem(this.cacheKey(key), JSON.stringify({ fetchedAt, data }));
    } catch {
      /* quota exceeded or storage disabled — the app works without it */
    }
    return fetchedAt;
  }

  clearCache(key: string): void {
    try {
      localStorage.removeItem(this.cacheKey(key));
    } catch {
      /* ignore */
    }
  }

  private cacheKey(key: string): string {
    return `collaborator.cache.${key}`;
  }

  /** Never throws — used where a failed call should degrade, not propagate. */
  safe<T>(source: Observable<T>, fallback: T): Observable<T> {
    return source.pipe(catchError(() => of(fallback)));
  }
}
