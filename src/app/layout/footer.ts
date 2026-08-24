import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { APP_CONFIG } from '../core/config/app-config';
import { Icon } from '../shared/ui/icon';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  template: `
    <footer class="border-line mt-20 border-t">
      <div
        class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      >
        <div>
          <p class="text-content flex items-center gap-2 text-sm font-semibold">
            <span class="bg-brand text-brand-fg flex h-6 w-6 items-center justify-center rounded-md">
              <app-icon name="sparkles" [size]="13" />
            </span>
            The Colloborator
          </p>
          <p class="text-subtle mt-2 max-w-sm text-xs leading-relaxed">
            An open showcase of {{ ownerName }}'s projects — what they are, where they stand, and
            how to help. Contributions are genuinely welcome.
          </p>
        </div>

        <div class="flex flex-col gap-3 text-sm sm:items-end">
          <nav class="flex flex-wrap gap-4" aria-label="Footer">
            <a routerLink="/projects" class="text-muted hover:text-content transition-colors"
              >Projects</a
            >
            <a routerLink="/about" class="text-muted hover:text-content transition-colors">About</a>
            @if (profileUrl) {
              <a
                [href]="profileUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-muted hover:text-content inline-flex items-center gap-1.5 transition-colors"
              >
                <app-icon name="github" [size]="14" /> GitHub
              </a>
            }
          </nav>
          <p class="text-subtle text-xs">
            &copy; {{ year }} {{ ownerName }} · Built with Angular &amp; Tailwind
          </p>
        </div>
      </div>
    </footer>
  `,
  host: { class: 'block' },
})
export class Footer {
  private readonly config = inject(APP_CONFIG);

  protected readonly year = new Date().getFullYear();
  protected readonly ownerName = this.config.ownerName;
  protected readonly profileUrl = this.config.githubUsername.trim()
    ? `https://github.com/${this.config.githubUsername.trim()}`
    : null;
}
