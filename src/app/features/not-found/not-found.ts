import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SeoService } from '../../core/services/seo.service';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  template: `
    <div class="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p class="text-brand font-mono text-6xl font-extrabold tracking-tight">404</p>
      <h1 class="text-content mt-4 text-2xl font-bold tracking-tight">This page doesn't exist</h1>
      <p class="text-muted mt-3 max-w-md text-sm leading-relaxed">
        The link may be out of date, or the project it pointed to has been renamed or made private.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a
          routerLink="/"
          class="bg-brand text-brand-fg hover:bg-brand-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
        >
          <app-icon name="home" [size]="15" /> Back home
        </a>
        <a
          routerLink="/projects"
          class="border-line text-content hover:bg-surface-2 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
        >
          Browse projects
        </a>
      </div>
    </div>
  `,
  host: { class: 'block' },
})
export class NotFound {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.update({ title: 'Not found', description: 'This page does not exist.' });
  }
}
