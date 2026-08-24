import { InjectionToken } from '@angular/core';

export interface AppConfig {
  /**
   * The GitHub account whose repositories are showcased.
   *
   * Leave empty and the app still boots — every view falls back to a
   * "configure your username" state instead of erroring.
   */
  readonly githubUsername: string;

  /** Base URL for the GitHub REST API. */
  readonly apiBase: string;

  /** How long a successful live API response stays usable in localStorage. */
  readonly cacheTtlMinutes: number;

  /** Path (relative to base href) of the build-time snapshot fallback. */
  readonly snapshotPath: string;

  /** Path (relative to base href) of the hand-curated overrides file. */
  readonly overridesPath: string;

  /** Owner's display name, used in the header, footer and About page. */
  readonly ownerName: string;

  /** How many "good first issues" to list on a project page. */
  readonly maxGoodFirstIssues: number;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export const appConfigValue: AppConfig = {
  // TODO: set this to your GitHub handle — it is the only required value.
  githubUsername: '',

  apiBase: 'https://api.github.com',
  cacheTtlMinutes: 30,
  snapshotPath: 'data/repos-snapshot.json',
  overridesPath: 'data/projects.json',
  ownerName: 'Prabal Pandey',
  maxGoodFirstIssues: 5,
};
