import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ProjectService } from '../../core/services/project.service';
import { Icon } from './icon';

/**
 * A quiet line explaining where the rendered data came from, and why, when the
 * live API wasn't used. Only speaks up when there is something worth saying.
 */
@Component({
  selector: 'app-data-source-note',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (message(); as text) {
      <p class="text-subtle flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        @if (isDegraded()) {
          <app-icon name="alert" [size]="12" />
        }
        <span>{{ text }}</span>
        <button
          type="button"
          (click)="refresh()"
          [disabled]="busy()"
          class="text-brand hover:text-brand-hover inline-flex items-center gap-1 font-medium disabled:opacity-50"
        >
          <app-icon name="refresh" [size]="11" />
          {{ busy() ? 'Refreshing…' : 'Refresh' }}
        </button>
      </p>
    }
  `,
  host: { class: 'block' },
})
export class DataSourceNote {
  private readonly projects = inject(ProjectService);

  protected readonly busy = signal(false);

  protected readonly isDegraded = computed(() => {
    const reason = this.projects.outcome().reason;
    return reason === 'rate-limited' || reason === 'network' || reason === 'not-found';
  });

  protected readonly message = computed(() => {
    const outcome = this.projects.outcome();
    if (!this.projects.loaded() || outcome.source === 'none') return null;

    const base = this.projects.sourceLabel(outcome);
    switch (outcome.reason) {
      case 'rate-limited':
        return `GitHub's hourly request limit is used up, so this is the last build's data. ${base}.`;
      case 'network':
        return `Couldn't reach GitHub just now, so this is the last build's data. ${base}.`;
      case 'not-found':
        return `That GitHub account couldn't be found. Showing the last build's data. ${base}.`;
      case 'not-configured':
        return null;
      default:
        return outcome.source === 'live' ? null : `${base}.`;
    }
  });

  protected async refresh(): Promise<void> {
    this.busy.set(true);
    try {
      await this.projects.refresh();
    } finally {
      this.busy.set(false);
    }
  }
}
