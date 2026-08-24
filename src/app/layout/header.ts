import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { APP_CONFIG } from '../core/config/app-config';
import { Icon } from '../shared/ui/icon';
import { ThemeToggle } from '../shared/ui/theme-toggle';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Icon, ThemeToggle],
  template: `
    <header
      class="border-line bg-bg/80 sticky top-0 z-40 border-b backdrop-blur-md supports-[backdrop-filter]:bg-bg/70"
    >
      <div class="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <a routerLink="/" class="group flex items-center gap-2.5" aria-label="The Colloborator, home">
          <span
            class="bg-brand text-brand-fg flex h-8 w-8 items-center justify-center rounded-lg font-bold"
          >
            <app-icon name="sparkles" [size]="17" />
          </span>
          <span class="text-content text-[15px] font-bold tracking-tight">The Colloborator</span>
        </a>

        <nav class="ml-4 hidden items-center gap-1 sm:flex" aria-label="Main">
          @for (link of links; track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="!text-content bg-surface-2"
              [routerLinkActiveOptions]="{ exact: link.exact }"
              class="text-muted hover:text-content rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {{ link.label }}
            </a>
          }
        </nav>

        <div class="ml-auto flex items-center gap-2">
          @if (profileUrl()) {
            <a
              [href]="profileUrl()"
              target="_blank"
              rel="noopener noreferrer"
              class="border-line text-muted hover:bg-surface-2 hover:text-content hidden h-9 w-9 items-center justify-center rounded-lg border transition-colors sm:inline-flex"
              aria-label="GitHub profile"
              title="GitHub profile"
            >
              <app-icon name="github" [size]="17" />
            </a>
          }
          <app-theme-toggle />

          <button
            type="button"
            (click)="menuOpen.set(!menuOpen())"
            class="border-line text-muted hover:bg-surface-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors sm:hidden"
            [attr.aria-expanded]="menuOpen()"
            aria-controls="mobile-nav"
            aria-label="Toggle navigation"
          >
            <app-icon [name]="menuOpen() ? 'close' : 'menu'" [size]="18" />
          </button>
        </div>
      </div>

      @if (menuOpen()) {
        <nav id="mobile-nav" class="border-line bg-bg border-t sm:hidden" aria-label="Main">
          <div class="space-y-1 px-4 py-3">
            @for (link of links; track link.path) {
              <a
                [routerLink]="link.path"
                routerLinkActive="!text-content bg-surface-2"
                [routerLinkActiveOptions]="{ exact: link.exact }"
                (click)="menuOpen.set(false)"
                class="text-muted hover:text-content block rounded-lg px-3 py-2 text-sm font-medium"
              >
                {{ link.label }}
              </a>
            }
            @if (profileUrl()) {
              <a
                [href]="profileUrl()"
                target="_blank"
                rel="noopener noreferrer"
                class="text-muted hover:text-content flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
              >
                <app-icon name="github" [size]="15" /> GitHub profile
              </a>
            }
          </div>
        </nav>
      }
    </header>
  `,
  host: { class: 'block' },
})
export class Header {
  private readonly config = inject(APP_CONFIG);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);

  protected readonly links = [
    { path: '/', label: 'Home', exact: true },
    { path: '/projects', label: 'Projects', exact: false },
    { path: '/about', label: 'About', exact: false },
  ];

  protected profileUrl(): string | null {
    const user = this.config.githubUsername.trim();
    return user ? `https://github.com/${user}` : null;
  }

  constructor() {
    // Close the mobile menu whenever navigation completes.
    this.router.events.subscribe(() => this.menuOpen.set(false));
  }
}
