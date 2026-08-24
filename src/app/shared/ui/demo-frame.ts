import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { Project, ProjectMedia } from '../../core/models/project.model';
import { Icon } from './icon';

type FrameState = 'idle' | 'loading' | 'ready' | 'blocked';

const LOAD_TIMEOUT_MS = 10_000;

/**
 * Renders a project's live demo.
 *
 * Embedding is opt-in per project (`embeddable` in projects.json) because a
 * cross-origin `X-Frame-Options`/`frame-ancestors` refusal is invisible to
 * JavaScript — the load event still fires, just on an error page. The timeout
 * below only catches sites that are slow or unreachable; the manual flag is
 * what actually prevents a blank box.
 *
 * Falls back to the screenshot gallery, then to a plain link.
 */
@Component({
  selector: 'app-demo-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    @if (hasAnything()) {
      <section class="border-line bg-surface overflow-hidden rounded-xl border">
        <header class="border-line bg-surface-2 flex items-center gap-3 border-b px-4 py-2.5">
          <div class="flex gap-1.5" aria-hidden="true">
            <span class="bg-danger/50 h-2.5 w-2.5 rounded-full"></span>
            <span class="bg-wip/50 h-2.5 w-2.5 rounded-full"></span>
            <span class="bg-live/50 h-2.5 w-2.5 rounded-full"></span>
          </div>
          @if (project().demoUrl) {
            <span class="text-subtle truncate font-mono text-xs">{{ displayUrl() }}</span>
          } @else {
            <span class="text-subtle truncate text-xs">Screenshots</span>
          }
          <div class="ml-auto flex items-center gap-1">
            @if (showFrame() && state() === 'ready') {
              <button
                type="button"
                (click)="reload()"
                class="text-subtle hover:text-content hover:bg-surface-3 inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                aria-label="Reload the demo"
                title="Reload"
              >
                <app-icon name="refresh" [size]="13" />
              </button>
            }
            @if (project().demoUrl) {
              <a
                [href]="project().demoUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-muted hover:text-brand hover:bg-surface-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
              >
                Open <app-icon name="external" [size]="12" />
              </a>
            }
          </div>
        </header>

        @if (showFrame()) {
          <div class="relative bg-white" [style.height.px]="height()">
            @if (state() === 'loading') {
              <div class="bg-surface absolute inset-0 flex items-center justify-center">
                <div class="text-subtle flex flex-col items-center gap-3">
                  <span
                    class="border-line border-t-brand h-6 w-6 animate-spin rounded-full border-2"
                  ></span>
                  <span class="text-xs">Loading the live demo…</span>
                </div>
              </div>
            }
            @if (state() === 'blocked') {
              <div class="bg-surface absolute inset-0 flex items-center justify-center px-6">
                <div class="max-w-sm text-center">
                  <div class="text-subtle mx-auto flex h-10 w-10 items-center justify-center">
                    <app-icon name="alert" [size]="24" />
                  </div>
                  <p class="text-content mt-2 text-sm font-medium">This demo won't embed here</p>
                  <p class="text-muted mt-1 text-xs leading-relaxed">
                    The site is slow to respond or refuses to be framed. It should still work in its
                    own tab.
                  </p>
                  <a
                    [href]="project().demoUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="bg-brand text-brand-fg hover:bg-brand-hover mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                  >
                    Open the demo <app-icon name="external" [size]="12" />
                  </a>
                </div>
              </div>
            }
            <iframe
              [src]="safeUrl()"
              [title]="project().displayName + ' live demo'"
              class="h-full w-full border-0"
              loading="lazy"
              referrerpolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              (load)="onLoad()"
            ></iframe>
          </div>
        } @else if (media().length) {
          <div class="p-3">
            <figure>
              @if (active(); as item) {
                @if (item.type === 'video') {
                  <video
                    [src]="item.src"
                    class="bg-surface-2 w-full rounded-lg"
                    controls
                    playsinline
                    preload="metadata"
                  ></video>
                } @else {
                  <img
                    [src]="item.src"
                    [alt]="item.caption || project().displayName + ' screenshot'"
                    class="bg-surface-2 w-full rounded-lg object-cover"
                    loading="lazy"
                  />
                }
                @if (item.caption) {
                  <figcaption class="text-subtle mt-2 px-1 text-xs">{{ item.caption }}</figcaption>
                }
              }
            </figure>

            @if (media().length > 1) {
              <div class="mt-3 flex gap-2 overflow-x-auto pb-1">
                @for (item of media(); track item.src; let i = $index) {
                  <button
                    type="button"
                    (click)="activeIndex.set(i)"
                    [attr.aria-label]="'Show media ' + (i + 1)"
                    [attr.aria-current]="i === activeIndex()"
                    class="h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors"
                    [class]="i === activeIndex() ? 'border-brand' : 'border-line hover:border-line-strong'"
                  >
                    @if (item.type === 'video') {
                      <span
                        class="bg-surface-2 text-subtle flex h-full w-full items-center justify-center"
                      >
                        <app-icon name="play" [size]="16" />
                      </span>
                    } @else {
                      <img [src]="item.src" alt="" class="h-full w-full object-cover" loading="lazy" />
                    }
                  </button>
                }
              </div>
            }
          </div>
        } @else {
          <div class="px-6 py-12 text-center">
            <p class="text-muted text-sm">
              @if (selfEmbedBlocked()) {
                You're already looking at it — this is the site embedded in itself.
              } @else {
                This demo opens in its own tab — it can't be embedded here.
              }
            </p>
            <a
              [href]="project().demoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="bg-brand text-brand-fg hover:bg-brand-hover mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              Open the live demo <app-icon name="external" [size]="14" />
            </a>
          </div>
        }
      </section>
    }
  `,
  host: { class: 'block' },
})
export class DemoFrame {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly project = input.required<Project>();
  readonly height = input(520);

  protected readonly state = signal<FrameState>('idle');
  protected readonly activeIndex = signal(0);
  /** Bumped to force the iframe to re-request the same URL. */
  private readonly reloadNonce = signal(0);
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly media = computed<ProjectMedia[]>(() => this.project().media ?? []);
  protected readonly active = computed<ProjectMedia | undefined>(
    () => this.media()[this.activeIndex()],
  );

  /**
   * True when this page is itself running inside a frame. Used only to stop a
   * self-demo from nesting: without it, opening this project *inside* the
   * embedded copy would embed another copy, and so on down.
   */
  private readonly nested = ((): boolean => {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      // Cross-origin parent — reading window.top throws, which itself means framed.
      return true;
    }
  })();

  protected readonly selfEmbedBlocked = computed(() => this.project().selfDemo && this.nested);

  protected readonly showFrame = computed(
    () => this.project().embeddable && !!this.project().demoUrl && !this.selfEmbedBlocked(),
  );

  protected readonly hasAnything = computed(
    () => !!this.project().demoUrl || this.media().length > 0,
  );

  protected readonly safeUrl = computed<SafeResourceUrl | null>(() => {
    if (!this.showFrame()) return null;
    const nonce = this.reloadNonce();
    const url = this.project().demoUrl!;
    const withNonce = nonce === 0 ? url : `${url}${url.includes('?') ? '&' : '?'}_r=${nonce}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(withNonce);
  });

  protected readonly displayUrl = computed(() => {
    const url = this.project().demoUrl;
    if (!url) return '';
    try {
      const parsed = new URL(url);
      return parsed.host + (parsed.pathname === '/' ? '' : parsed.pathname);
    } catch {
      return url;
    }
  });

  constructor() {
    effect(() => {
      // Re-arm whenever a new URL is requested.
      if (!this.safeUrl()) return;
      this.state.set('loading');
      this.arm();
    });

    this.destroyRef.onDestroy(() => this.clear());
  }

  protected onLoad(): void {
    this.clear();
    this.state.set('ready');
  }

  protected reload(): void {
    this.reloadNonce.update((n) => n + 1);
  }

  private arm(): void {
    this.clear();
    this.timer = setTimeout(() => {
      if (this.state() === 'loading') this.state.set('blocked');
    }, LOAD_TIMEOUT_MS);
  }

  private clear(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
