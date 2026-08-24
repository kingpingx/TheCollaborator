import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { APP_CONFIG } from '../../core/config/app-config';
import { ProjectService } from '../../core/services/project.service';
import { SeoService } from '../../core/services/seo.service';
import { DataSourceNote } from '../../shared/ui/data-source-note';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { ProjectCard } from '../../shared/ui/project-card';
import { SetupNotice } from '../../shared/ui/setup-notice';
import { SkeletonCard } from '../../shared/ui/skeleton-card';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Icon,
    ProjectCard,
    SkeletonCard,
    EmptyState,
    SetupNotice,
    DataSourceNote,
  ],
  templateUrl: './home.html',
  host: { class: 'block' },
})
export class Home {
  private readonly config = inject(APP_CONFIG);
  private readonly seo = inject(SeoService);

  protected readonly projects = inject(ProjectService);
  protected readonly ownerName = this.config.ownerName;

  protected readonly stats = this.projects.stats;

  /** Featured if curated; otherwise the six most recently touched. */
  protected readonly highlights = computed(() => {
    const featured = this.projects.featured();
    if (featured.length) return featured.slice(0, 6);
    return [...this.projects.projects()]
      .sort((a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime())
      .slice(0, 6);
  });

  protected readonly isCurated = computed(() => this.projects.featured().length > 0);

  protected readonly helpWanted = computed(() =>
    this.projects
      .projects()
      .filter((p) => p.lookingForHelp || p.goodFirstIssues.length > 0)
      .slice(0, 3),
  );

  protected readonly skeletons = [0, 1, 2, 3, 4, 5];

  constructor() {
    this.seo.update({
      description: `A showcase of ${this.config.ownerName}'s open-source projects — what they are, what state they're in, live demos, and how to contribute.`,
    });
  }
}
