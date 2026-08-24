import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Icon } from './icon';

@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="border-line bg-surface/60 rounded-xl border border-dashed px-6 py-14 text-center">
      <div
        class="bg-surface-2 text-subtle mx-auto flex h-12 w-12 items-center justify-center rounded-full"
      >
        <app-icon [name]="icon()" [size]="22" />
      </div>
      <h3 class="text-content mt-4 text-base font-semibold">{{ title() }}</h3>
      @if (message()) {
        <p class="text-muted mx-auto mt-1.5 max-w-md text-sm leading-relaxed">{{ message() }}</p>
      }
      <div class="mt-5 flex justify-center">
        <ng-content />
      </div>
    </div>
  `,
  host: { class: 'block' },
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input<string | null>(null);
  readonly icon = input('inbox');
}
