import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';

import { APP_CONFIG } from '../../core/config/app-config';
import { GithubIssue } from '../../core/models/github.model';
import { Project } from '../../core/models/project.model';
import { GithubApiService } from '../../core/services/github-api.service';
import { ProjectService } from '../../core/services/project.service';
import { SeoService } from '../../core/services/seo.service';
import { DemoFrame } from '../../shared/ui/demo-frame';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { SkeletonCard } from '../../shared/ui/skeleton-card';
import { StatusBadge } from '../../shared/ui/status-badge';
import { TechChip } from '../../shared/ui/tech-chip';
import { renderMiniMarkdown } from '../../shared/util/mini-markdown';

@Component({
  selector: 'app-project-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, StatusBadge, TechChip, DemoFrame, EmptyState, SkeletonCard],
  templateUrl: './project-detail.html',
  host: { class: 'block' },
})
export class ProjectDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(GithubApiService);
  private readonly seo = inject(SeoService);
  private readonly config = inject(APP_CONFIG);

  protected readonly projects = inject(ProjectService);

  private readonly routeName = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('name') ?? '')),
    { initialValue: '' },
  );

  protected readonly project = computed<Project | undefined>(() => {
    // Depend on the list so this recomputes once loading finishes.
    this.projects.projects();
    return this.projects.byName(this.routeName());
  });

  protected readonly notFound = computed(() => this.projects.loaded() && !this.project());

  /** Issues refreshed live for this one repo; falls back to the snapshot's. */
  private readonly liveIssues = signal<GithubIssue[] | null>(null);

  protected readonly goodFirstIssues = computed<GithubIssue[]>(
    () => this.liveIssues() ?? this.project()?.goodFirstIssues ?? [],
  );

  protected readonly description = computed(() =>
    renderMiniMarkdown(this.project()?.longDescription),
  );

  protected readonly languageBars = computed(() => {
    const languages = this.project()?.languages ?? {};
    const total = Object.values(languages).reduce((sum, n) => sum + n, 0);
    if (!total) return [];
    return Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, bytes]) => ({ name, percent: Math.round((bytes / total) * 1000) / 10 }));
  });

  protected readonly contributeLinks = computed(() => {
    const p = this.project();
    if (!p) return null;
    return {
      fork: `${p.repoUrl}/fork`,
      issues: `${p.repoUrl}/issues`,
      newIssue: `${p.repoUrl}/issues/new`,
      goodFirst: `${p.repoUrl}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`,
      contributing: `${p.repoUrl}/blob/${p.defaultBranch}/CONTRIBUTING.md`,
      readme: `${p.repoUrl}#readme`,
      star: p.repoUrl,
    };
  });

  constructor() {
    void this.projects.load();

    effect(() => {
      const project = this.project();
      if (!project) return;

      this.seo.update({
        title: project.displayName,
        description: project.tagline,
      });

      void this.refreshIssues(project);
    });
  }

  /**
   * One extra API call, only on the page that shows the result. Failures are
   * swallowed: the snapshot's issue list is already good enough.
   */
  private async refreshIssues(project: Project): Promise<void> {
    const owner = this.config.githubUsername.trim();
    if (!owner) return;

    this.api.listGoodFirstIssues(owner, project.name).subscribe({
      next: (issues) => this.liveIssues.set(issues),
      error: () => this.liveIssues.set(null),
    });
  }

  protected relative(iso: string): string {
    return this.projects.relativeTime(iso);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
