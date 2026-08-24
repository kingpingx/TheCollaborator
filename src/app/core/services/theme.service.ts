import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'collaborator.theme';

/**
 * Light/dark toggle backed by localStorage.
 *
 * The initial class is applied by an inline script in index.html so there is
 * no flash before Angular boots; this service reads the same key and takes
 * over from there.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<Theme>(this.initial());

  /** True only while the user has expressed no preference of their own. */
  readonly followsSystem = signal(this.read() === null);

  constructor() {
    effect(() => this.apply(this.theme()));
    this.watchSystem();
  }

  toggle(): void {
    this.followsSystem.set(false);
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.write(next);
  }

  set(theme: Theme): void {
    this.followsSystem.set(false);
    this.theme.set(theme);
    this.write(theme);
  }

  private apply(theme: Theme): void {
    this.document.documentElement.classList.toggle('dark', theme === 'dark');
    this.document.documentElement.style.colorScheme = theme;
  }

  /** Track the OS setting until the user picks a side explicitly. */
  private watchSystem(): void {
    const mq = this.systemQuery();
    mq?.addEventListener?.('change', (e) => {
      if (this.followsSystem()) this.theme.set(e.matches ? 'dark' : 'light');
    });
  }

  private initial(): Theme {
    const stored = this.read();
    if (stored) return stored;
    return this.systemQuery()?.matches ? 'dark' : 'light';
  }

  /**
   * `matchMedia` is absent in jsdom and in some embedded webviews, so this is
   * feature-detected rather than assumed — a missing implementation just means
   * "no system preference", not a crash on boot.
   */
  private systemQuery(): MediaQueryList | null {
    const view = this.document.defaultView;
    if (typeof view?.matchMedia !== 'function') return null;
    try {
      return view.matchMedia('(prefers-color-scheme: dark)');
    } catch {
      return null;
    }
  }

  private read(): Theme | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'dark' || value === 'light' ? value : null;
    } catch {
      return null;
    }
  }

  private write(theme: Theme): void {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage blocked — the choice just won't persist */
    }
  }
}
