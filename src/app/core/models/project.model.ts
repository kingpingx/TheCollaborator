import { GithubIssue, GithubLanguages } from './github.model';

export const PROJECT_STATUSES = [
  'live',
  'beta',
  'wip',
  'paused',
  'archived',
  'experiment',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface StatusMeta {
  id: ProjectStatus;
  label: string;
  description: string;
  /** Tailwind classes for the badge; tokens defined in styles.css. */
  classes: string;
  dot: string;
}

export const STATUS_META: Record<ProjectStatus, StatusMeta> = {
  live: {
    id: 'live',
    label: 'Live',
    description: 'Deployed and usable today.',
    classes: 'bg-live-soft text-live',
    dot: 'bg-live',
  },
  beta: {
    id: 'beta',
    label: 'Beta',
    description: 'Usable, still stabilising.',
    classes: 'bg-beta-soft text-beta',
    dot: 'bg-beta',
  },
  wip: {
    id: 'wip',
    label: 'In progress',
    description: 'Actively being built.',
    classes: 'bg-wip-soft text-wip',
    dot: 'bg-wip',
  },
  paused: {
    id: 'paused',
    label: 'Paused',
    description: 'On hold — open to being picked up.',
    classes: 'bg-paused-soft text-paused',
    dot: 'bg-paused',
  },
  archived: {
    id: 'archived',
    label: 'Archived',
    description: 'Read-only, kept for reference.',
    classes: 'bg-archived-soft text-archived',
    dot: 'bg-archived',
  },
  experiment: {
    id: 'experiment',
    label: 'Experiment',
    description: 'A sketch or proof of concept.',
    classes: 'bg-experiment-soft text-experiment',
    dot: 'bg-experiment',
  },
};

export interface ProjectMedia {
  type: 'image' | 'video';
  src: string;
  caption?: string;
}

/**
 * Hand-curated fields from `public/data/projects.json`. Everything is optional:
 * a repo with no override still renders from API data alone.
 */
export interface ProjectOverride {
  displayName?: string;
  tagline?: string;
  longDescription?: string;
  status?: ProjectStatus;
  demoUrl?: string;
  /**
   * Whether the demo may be rendered in an iframe. Cross-origin
   * `X-Frame-Options` is undetectable from JS, so this is a manual switch.
   */
  embeddable?: boolean;
  media?: ProjectMedia[];
  techStack?: string[];
  lookingForHelp?: boolean;
  helpNotes?: string;
  roadmap?: string[];
  /** Hide the repo's own README section on the detail page. */
  hideReadme?: boolean;
}

export interface OverridesFile {
  featured?: string[];
  hidden?: string[];
  overrides?: Record<string, ProjectOverride>;
}

/** The merged view the UI renders: API data + curated overrides. */
export interface Project {
  /** Repo name — the route parameter and the override key. */
  name: string;
  displayName: string;
  fullName: string;
  tagline: string;
  longDescription: string | null;

  status: ProjectStatus;
  /** True when status came from an override rather than being derived. */
  statusIsCurated: boolean;

  repoUrl: string;
  demoUrl: string | null;
  embeddable: boolean;
  media: ProjectMedia[];

  techStack: string[];
  primaryLanguage: string | null;
  languages: GithubLanguages;
  topics: string[];

  stars: number;
  forks: number;
  openIssues: number;
  license: string | null;

  createdAt: string;
  updatedAt: string;
  pushedAt: string;

  archived: boolean;
  isFork: boolean;
  featured: boolean;
  featureRank: number;

  lookingForHelp: boolean;
  helpNotes: string | null;
  roadmap: string[];
  goodFirstIssues: GithubIssue[];
  hasContributing: boolean;
  defaultBranch: string;

  readmeHtml: string | null;
}

export type SortKey = 'updated' | 'stars' | 'name';

export interface ProjectFilters {
  query: string;
  statuses: ProjectStatus[];
  languages: string[];
  helpWantedOnly: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: ProjectFilters = {
  query: '',
  statuses: [],
  languages: [],
  helpWantedOnly: false,
  sort: 'updated',
};
