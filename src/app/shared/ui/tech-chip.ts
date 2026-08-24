import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-tech-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="border-line bg-surface-2 text-muted inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] leading-5 whitespace-nowrap"
    >
      {{ label() }}
    </span>
  `,
  host: { class: 'inline-flex' },
})
export class TechChip {
  readonly label = input.required<string>();
}
