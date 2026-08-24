import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { APP_CONFIG } from '../../core/config/app-config';
import { STATUS_META, PROJECT_STATUSES } from '../../core/models/project.model';
import { ProjectService } from '../../core/services/project.service';
import { SeoService } from '../../core/services/seo.service';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon],
  templateUrl: './about.html',
  host: { class: 'block' },
})
export class About {
  private readonly config = inject(APP_CONFIG);
  private readonly seo = inject(SeoService);

  protected readonly projects = inject(ProjectService);
  protected readonly ownerName = this.config.ownerName;
  protected readonly statuses = PROJECT_STATUSES.map((s) => STATUS_META[s]);

  protected readonly profileUrl = this.config.githubUsername.trim()
    ? `https://github.com/${this.config.githubUsername.trim()}`
    : null;

  protected readonly steps = [
    {
      icon: 'search',
      title: 'Find something that fits',
      body: 'Filter the project list by "open to contributors", or look for the good-first-issue links on any project page. Each one is scoped small enough to finish in a sitting.',
    },
    {
      icon: 'fork',
      title: 'Fork and branch',
      body: 'Fork the repo, branch off the default branch, and keep the change focused on one thing. Small pull requests get reviewed faster than large ones.',
    },
    {
      icon: 'issue',
      title: 'Say what you are doing',
      body: "Comment on the issue before you start, or open one if there isn't a matching issue yet. It avoids two people solving the same problem twice.",
    },
    {
      icon: 'heart',
      title: 'Open the pull request',
      body: 'Describe what changed and why. If it touches behaviour, note how you tested it. Questions in the PR are welcome — an unfinished PR you want feedback on is fine too.',
    },
  ];

  constructor() {
    this.seo.update({
      title: 'About',
      description: `How this showcase works, what the project statuses mean, and how to contribute to ${this.config.ownerName}'s projects.`,
    });
  }
}
