import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';

import { APP_CONFIG } from '../../core/config/app-config';
import { GithubIssue } from '../../core/models/github.model';
import { Project } from '../../core/models/project.model';
import { ProjectService } from '../../core/services/project.service';
import { Icon } from './icon';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Community feature ideas for one project.
 *
 * There is no backend here, so a submitted idea becomes a pre-filled GitHub
 * issue: the form composes the title, body and label into a `/issues/new` URL
 * and hands the visitor off to GitHub. Ideas are read back from the same
 * place — open issues carrying the configured label — which is what lets them
 * be listed below without anything to store.
 *
 * The submitter's email goes into the issue body for attribution, as asked.
 * It is deliberately not rendered in the list: the GitHub handle is shown
 * instead, so no address gets harvested off this page.
 */
@Component({
  selector: 'app-feature-ideas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <section class="border-line bg-surface rounded-xl border p-6">
      <div class="flex items-start gap-3">
        <span
          class="bg-brand-soft text-brand flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        >
          <app-icon name="sparkles" [size]="18" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 class="text-content text-lg font-bold tracking-tight">Feature ideas</h2>
          <p class="text-muted mt-1 text-sm leading-relaxed">
            Anyone can propose a feature for this project. Ideas become issues on the repository, so
            they stay attached to the code and can be discussed in the open.
          </p>
        </div>
      </div>

      <!-- Existing ideas -->
      @if (ideas().length) {
        <ul class="mt-6 space-y-2">
          @for (idea of ideas(); track idea.id) {
            <li>
              <a
                [href]="idea.html_url"
                target="_blank"
                rel="noopener noreferrer"
                class="border-line hover:border-brand/40 hover:bg-surface-2 flex items-start gap-3 rounded-lg border p-3 transition-colors"
              >
                <span class="text-brand mt-0.5 shrink-0">
                  <app-icon name="sparkles" [size]="14" />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="text-content block text-sm font-medium">{{ idea.title }}</span>
                  <span class="text-subtle mt-0.5 block text-xs">
                    #{{ idea.number }}
                    @if (idea.user?.login) {
                      · suggested by {{ idea.user!.login }}
                    }
                    · {{ relative(idea.created_at) }}
                    @if (idea.comments) {
                      · {{ idea.comments }} {{ idea.comments === 1 ? 'reply' : 'replies' }}
                    }
                  </span>
                </span>
                <app-icon name="external" [size]="13" />
              </a>
            </li>
          }
        </ul>
      } @else {
        <p class="border-line text-subtle mt-6 rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          No ideas yet — yours would be the first.
        </p>
      }

      <!-- Suggest form -->
      <div class="border-line mt-6 border-t pt-5">
        @if (!formOpen()) {
          <button
            type="button"
            (click)="formOpen.set(true)"
            class="bg-brand text-brand-fg hover:bg-brand-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            <app-icon name="sparkles" [size]="14" /> Suggest a feature
          </button>
        } @else {
          <form (submit)="submit($event)" novalidate>
            <div class="space-y-4">
              <div>
                <label [for]="ids.title" class="text-content block text-xs font-semibold">
                  What should it do?
                </label>
                <input
                  [id]="ids.title"
                  type="text"
                  [value]="title()"
                  (input)="title.set($any($event.target).value)"
                  placeholder="Add a dark mode toggle"
                  maxlength="120"
                  class="border-line bg-bg text-content placeholder:text-subtle focus:border-brand mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                  [class.border-danger]="showErrors() && !titleValid()"
                  [attr.aria-invalid]="showErrors() && !titleValid()"
                />
                @if (showErrors() && !titleValid()) {
                  <p class="text-danger mt-1 text-xs">Give the idea a short title.</p>
                }
              </div>

              <div>
                <label [for]="ids.detail" class="text-content block text-xs font-semibold">
                  Any detail? <span class="text-subtle font-normal">(optional)</span>
                </label>
                <textarea
                  [id]="ids.detail"
                  rows="4"
                  [value]="detail()"
                  (input)="detail.set($any($event.target).value)"
                  placeholder="What problem does it solve? How would you expect it to work?"
                  maxlength="2000"
                  class="border-line bg-bg text-content placeholder:text-subtle focus:border-brand mt-1.5 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                ></textarea>
              </div>

              <div>
                <label [for]="ids.email" class="text-content block text-xs font-semibold">
                  Your email
                </label>
                <input
                  [id]="ids.email"
                  type="email"
                  [value]="email()"
                  (input)="email.set($any($event.target).value)"
                  placeholder="you@example.com"
                  autocomplete="email"
                  class="border-line bg-bg text-content placeholder:text-subtle focus:border-brand mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                  [class.border-danger]="showErrors() && !emailValid()"
                  [attr.aria-invalid]="showErrors() && !emailValid()"
                  [attr.aria-describedby]="ids.emailHelp"
                />
                @if (showErrors() && !emailValid()) {
                  <p class="text-danger mt-1 text-xs">Enter an email so the idea can be credited.</p>
                } @else {
                  <p [id]="ids.emailHelp" class="text-subtle mt-1 text-xs leading-relaxed">
                    Recorded in the issue so the idea is credited to you. The list above shows GitHub
                    usernames, never email addresses.
                  </p>
                }
              </div>
            </div>

            <div class="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                class="bg-brand text-brand-fg hover:bg-brand-hover inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              >
                Open it on GitHub <app-icon name="external" [size]="13" />
              </button>
              <button
                type="button"
                (click)="cancel()"
                class="text-muted hover:text-content text-sm font-medium"
              >
                Cancel
              </button>
            </div>

            <p class="text-subtle mt-4 text-xs leading-relaxed">
              This opens GitHub with the issue already written — you review it and press Submit
              there, so nothing is sent without you seeing it. A GitHub account is needed to post.
              @if (!canLabel()) {
                Ideas appear in the list above once {{ ownerName }} tags them
                <code class="font-mono">{{ label }}</code
                >.
              }
            </p>
          </form>
        }
      </div>
    </section>
  `,
  host: { class: 'block' },
})
export class FeatureIdeas {
  private readonly config = inject(APP_CONFIG);
  private readonly projects = inject(ProjectService);

  readonly project = input.required<Project>();
  /** Live-refreshed ideas, when the detail page managed to fetch them. */
  readonly live = input<GithubIssue[] | null>(null);

  protected readonly label = this.config.featureLabel;
  protected readonly ownerName = this.config.ownerName;

  protected readonly formOpen = signal(false);
  protected readonly title = signal('');
  protected readonly detail = signal('');
  protected readonly email = signal('');
  protected readonly showErrors = signal(false);

  /** Unique ids so labels stay bound if the component ever appears twice. */
  private static seq = 0;
  protected readonly ids = ((n) => ({
    title: `fi-title-${n}`,
    detail: `fi-detail-${n}`,
    email: `fi-email-${n}`,
    emailHelp: `fi-email-help-${n}`,
  }))(FeatureIdeas.seq++);

  protected readonly ideas = computed(() => this.live() ?? this.project().featureIdeas ?? []);

  protected readonly titleValid = computed(() => this.title().trim().length >= 3);
  protected readonly emailValid = computed(() => EMAIL_RE.test(this.email().trim()));

  /**
   * GitHub silently drops the `labels` parameter for anyone without write
   * access to the repo, so for most visitors the label has to be applied by
   * the maintainer afterwards. The form says so rather than implying the idea
   * will show up here immediately.
   */
  protected readonly canLabel = computed(() => false);

  constructor() {
    // Reset the form when navigating between projects.
    effect(() => {
      this.project();
      this.formOpen.set(false);
      this.showErrors.set(false);
      this.title.set('');
      this.detail.set('');
      this.email.set('');
    });
  }

  protected relative(iso: string): string {
    return this.projects.relativeTime(iso);
  }

  protected cancel(): void {
    this.formOpen.set(false);
    this.showErrors.set(false);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.showErrors.set(true);
    if (!this.titleValid() || !this.emailValid()) return;

    window.open(this.issueUrl(), '_blank', 'noopener,noreferrer');
    this.cancel();
  }

  /** Composes the pre-filled GitHub issue. */
  private issueUrl(): string {
    const detail = this.detail().trim();
    const body = [
      '### The idea',
      '',
      detail || '_(no extra detail given)_',
      '',
      '### Proposed by',
      '',
      this.email().trim(),
      '',
      '---',
      `Suggested via the Collaborator showcase for **${this.project().displayName}**.`,
    ].join('\n');

    const params = new URLSearchParams({
      title: this.title().trim(),
      body,
      labels: this.label,
    });

    return `${this.project().repoUrl}/issues/new?${params.toString()}`;
  }
}
