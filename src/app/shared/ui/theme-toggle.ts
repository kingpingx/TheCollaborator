import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ThemeService } from '../../core/services/theme.service';
import { Icon } from './icon';

@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button
      type="button"
      (click)="theme.toggle()"
      [attr.aria-label]="label()"
      [attr.title]="label()"
      class="border-line text-muted hover:bg-surface-2 hover:text-content inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors"
    >
      <app-icon [name]="isDark() ? 'sun' : 'moon'" [size]="17" />
    </button>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  protected readonly isDark = computed(() => this.theme.theme() === 'dark');
  protected readonly label = computed(() =>
    this.isDark() ? 'Switch to light theme' : 'Switch to dark theme',
  );
}
