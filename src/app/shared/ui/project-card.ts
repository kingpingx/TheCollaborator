import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Project } from '../../core/models/project.model';
import { ProjectService } from '../../core/services/project.service';
import { Icon } from './icon';
import { StatusBadge } from './status-badge';
import { TechChip } from './tech-chip';

@Component({
  selector: 'app-project-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, StatusBadge, TechChip],
  template: `
    <article
      class="group border-line bg-surface hover:border-brand/40 relative flex h-full flex-col rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5"
      [style.box-shadow]="'var(--shadow-card)'"
    >
      <div class="flex items-start justify-between gap-3">
        <h3 class="text-content min-w-0 text-base leading-snug font-semibold">
          <!-- Stretched link: the whole card is clickable, but only this is in the tab order. -->
          <a
            [routerLink]="['/projects', project().name]"
            class="after:absolute after:inset-0 after:content-['']"
          >
            {{ project().displayName }}
          </a>
        </h3>
        <app-status-badge [status]="project().status" />
      </div>

      <p class="text-muted mt-2 line-clamp-2 text-sm leading-relaxed">
        {{ project().tagline }}
      </p>

      @if (project().techStack.length) {
        <div class="mt-4 flex flex-wrap gap-1.5">
          @for (tech of visibleTech(); track tech) {
            <app-tech-chip [label]="tech" />
          }
          @if (hiddenTechCount() > 0) {
            <span class="text-subtle self-center text-[11px]">+{{ hiddenTechCount() }}</span>
          }
        </div>
      }

      <!--
        Stats and markers are separate rows: at card width they cannot share
        one line without individual items wrapping mid-label.
      -->
      <div class="mt-auto pt-4">
        <div class="text-subtle flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          @if (project().stars > 0) {
            <span class="inline-flex items-center gap-1 whitespace-nowrap" title="Stars">
              <app-icon name="star" [size]="13" />
              {{ project().stars }}
            </span>
          }
          @if (project().forks > 0) {
            <span class="inline-flex items-center gap-1 whitespace-nowrap" title="Forks">
              <app-icon name="fork" [size]="13" />
              {{ project().forks }}
            </span>
          }
          <span
            class="inline-flex items-center gap-1 whitespace-nowrap"
            [title]="'Last push: ' + project().pushedAt"
          >
            <app-icon name="clock" [size]="13" />
            {{ lastPush() }}
          </span>
        </div>

        @if (project().demoUrl || needsHelp()) {
          <div class="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            @if (project().demoUrl) {
              <span
                class="bg-live-soft text-live inline-flex items-center gap-1 rounded-full px-2 py-0.5 whitespace-nowrap"
                title="Has a live demo"
              >
                <app-icon name="play" [size]="11" />
                Demo
              </span>
            }
            @if (needsHelp()) {
              <span
                class="bg-brand-soft text-brand inline-flex items-center gap-1 rounded-full px-2 py-0.5 whitespace-nowrap"
                title="Open to contributions"
              >
                <app-icon name="users" [size]="11" />
                Help wanted
              </span>
            }
          </div>
        }
      </div>
    </article>
  `,
  host: { class: 'block h-full' },
})
export class ProjectCard {
  private readonly projects = inject(ProjectService);

  readonly project = input.required<Project>();
  readonly maxTech = input(4);

  protected readonly visibleTech = computed(() => this.project().techStack.slice(0, this.maxTech()));
  protected readonly hiddenTechCount = computed(() =>
    Math.max(0, this.project().techStack.length - this.maxTech()),
  );
  protected readonly needsHelp = computed(
    () => this.project().lookingForHelp || this.project().goodFirstIssues.length > 0,
  );
  protected readonly lastPush = computed(() => this.projects.relativeTime(this.project().pushedAt));
}
