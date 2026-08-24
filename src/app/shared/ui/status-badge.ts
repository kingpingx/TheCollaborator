import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ProjectStatus, STATUS_META } from '../../core/models/project.model';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap"
      [class]="meta().classes + ' ' + sizeClasses()"
      [attr.title]="meta().description"
    >
      <span class="h-1.5 w-1.5 rounded-full" [class]="meta().dot"></span>
      {{ meta().label }}
    </span>
  `,
  host: { class: 'inline-flex' },
})
export class StatusBadge {
  readonly status = input.required<ProjectStatus>();
  readonly size = input<'sm' | 'md'>('sm');

  protected readonly meta = computed(() => STATUS_META[this.status()]);
  protected readonly sizeClasses = computed(() =>
    this.size() === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs',
  );
}
