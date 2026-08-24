import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import {
  PROJECT_STATUSES,
  ProjectStatus,
  STATUS_META,
  SortKey,
} from '../../core/models/project.model';
import { ProjectService } from '../../core/services/project.service';
import { SeoService } from '../../core/services/seo.service';
import { DataSourceNote } from '../../shared/ui/data-source-note';
import { EmptyState } from '../../shared/ui/empty-state';
import { Icon } from '../../shared/ui/icon';
import { ProjectCard } from '../../shared/ui/project-card';
import { SetupNotice } from '../../shared/ui/setup-notice';
import { SkeletonCard } from '../../shared/ui/skeleton-card';

@Component({
  selector: 'app-projects',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, ProjectCard, SkeletonCard, EmptyState, SetupNotice, DataSourceNote],
  templateUrl: './projects.html',
  host: { class: 'block' },
})
export class Projects {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly projects = inject(ProjectService);
  protected readonly statusMeta = STATUS_META;
  protected readonly allStatuses = PROJECT_STATUSES;
  protected readonly skeletons = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  protected readonly filtersOpen = signal(false);

  protected readonly sortOptions: Array<{ value: SortKey; label: string }> = [
    { value: 'updated', label: 'Recently updated' },
    { value: 'stars', label: 'Most stars' },
    { value: 'name', label: 'Name (A–Z)' },
  ];

  protected readonly results = this.projects.filteredProjects;

  protected readonly activeFilterCount = computed(() => {
    const f = this.projects.filters();
    return f.statuses.length + f.languages.length + (f.helpWantedOnly ? 1 : 0);
  });

  protected readonly hasActiveFilters = computed(
    () => this.activeFilterCount() > 0 || this.projects.filters().query.trim().length > 0,
  );

  constructor() {
    this.seo.update({
      title: 'Projects',
      description: 'Every project, with its current status, tech stack and contribution openings.',
    });

    // URL is the source of truth on entry, so filtered views stay shareable.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const statuses = (params.get('status') ?? '')
        .split(',')
        .filter((s): s is ProjectStatus => PROJECT_STATUSES.includes(s as ProjectStatus));
      const languages = (params.get('lang') ?? '').split(',').filter(Boolean);
      const sort = (params.get('sort') ?? 'updated') as SortKey;

      this.projects.patchFilters({
        query: params.get('q') ?? '',
        statuses,
        languages,
        helpWantedOnly: params.get('help') === '1',
        sort: this.sortOptions.some((o) => o.value === sort) ? sort : 'updated',
      });
    });
  }

  protected onSearch(value: string): void {
    this.projects.patchFilters({ query: value });
    this.syncUrl();
  }

  protected toggleStatus(status: ProjectStatus): void {
    const current = this.projects.filters().statuses;
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    this.projects.patchFilters({ statuses: next });
    this.syncUrl();
  }

  protected toggleLanguage(language: string): void {
    const current = this.projects.filters().languages;
    const next = current.includes(language)
      ? current.filter((l) => l !== language)
      : [...current, language];
    this.projects.patchFilters({ languages: next });
    this.syncUrl();
  }

  protected toggleHelpWanted(): void {
    this.projects.patchFilters({ helpWantedOnly: !this.projects.filters().helpWantedOnly });
    this.syncUrl();
  }

  protected setSort(value: string): void {
    this.projects.patchFilters({ sort: value as SortKey });
    this.syncUrl();
  }

  protected clearAll(): void {
    this.projects.resetFilters();
    this.syncUrl();
  }

  /** Mirrors filter state into the query string; empty values are dropped. */
  private syncUrl(): void {
    const f = this.projects.filters();
    void this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: {
        q: f.query.trim() || null,
        status: f.statuses.length ? f.statuses.join(',') : null,
        lang: f.languages.length ? f.languages.join(',') : null,
        help: f.helpWantedOnly ? '1' : null,
        sort: f.sort === 'updated' ? null : f.sort,
      },
      queryParamsHandling: 'merge',
    });
  }
}
