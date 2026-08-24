import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Icon } from './icon';

/**
 * Shown while `githubUsername` is still blank. The app is fully functional
 * before it is set — this just says what to do next.
 */
@Component({
  selector: 'app-setup-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="border-brand/30 bg-brand-soft/50 rounded-xl border border-dashed p-6">
      <div class="flex items-start gap-3">
        <span class="text-brand mt-0.5">
          <app-icon name="settings" [size]="20" />
        </span>
        <div class="min-w-0">
          <h3 class="text-content text-sm font-semibold">One thing left to set up</h3>
          <p class="text-muted mt-1.5 text-sm leading-relaxed">
            Add your GitHub handle to
            <code class="bg-surface-2 border-line rounded border px-1.5 py-0.5 font-mono text-xs">
              src/app/core/config/app-config.ts
            </code>
            and this page will fill itself in from your repositories.
          </p>
          <pre
            class="border-line bg-surface text-content mt-3 overflow-x-auto rounded-lg border p-3 font-mono text-xs"
          ><code>export const appConfigValue: AppConfig = {{ '{' }}
  githubUsername: 'your-handle',   // &lt;- here
  ...
{{ '}' }};</code></pre>
          <p class="text-subtle mt-3 text-xs">
            Then run <code class="font-mono">npm run sync:github</code> to generate the offline
            snapshot.
          </p>
        </div>
      </div>
    </div>
  `,
  host: { class: 'block' },
})
export class SetupNotice {}
