import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border-line bg-surface rounded-xl border p-5" aria-hidden="true">
      <div class="flex items-start justify-between gap-3">
        <div class="shimmer h-5 w-2/5 rounded"></div>
        <div class="shimmer h-5 w-16 rounded-full"></div>
      </div>
      <div class="mt-3 space-y-2">
        <div class="shimmer h-3 w-full rounded"></div>
        <div class="shimmer h-3 w-4/5 rounded"></div>
      </div>
      <div class="mt-4 flex gap-1.5">
        <div class="shimmer h-5 w-14 rounded-md"></div>
        <div class="shimmer h-5 w-12 rounded-md"></div>
        <div class="shimmer h-5 w-16 rounded-md"></div>
      </div>
      <div class="mt-5 flex gap-4">
        <div class="shimmer h-3 w-10 rounded"></div>
        <div class="shimmer h-3 w-10 rounded"></div>
        <div class="shimmer h-3 w-14 rounded"></div>
      </div>
    </div>
  `,
  host: { class: 'block' },
})
export class SkeletonCard {
  /** Purely decorative; screen readers get the "loading" status from the list. */
  readonly label = input('Loading');
}
