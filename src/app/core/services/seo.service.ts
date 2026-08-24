import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const SITE = 'The Colloborator';

/** Sets per-route title and social metadata. */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  update(options: { title?: string; description?: string; url?: string }): void {
    const pageTitle = options.title ? `${options.title} · ${SITE}` : SITE;
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ property: 'og:title', content: pageTitle });

    if (options.description) {
      this.meta.updateTag({ name: 'description', content: options.description });
      this.meta.updateTag({ property: 'og:description', content: options.description });
    }
    if (options.url) {
      this.meta.updateTag({ property: 'og:url', content: options.url });
    }
  }
}
