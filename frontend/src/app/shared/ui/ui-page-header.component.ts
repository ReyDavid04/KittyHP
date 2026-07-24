import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ui-page-header',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'block' },
  template: `
    <header class="ui-page-header justify-between" [class.border-b-0]="flush" [class.shadow-none]="flush">
      <div class="flex min-w-0 items-center gap-3 max-md:w-full">
        <ng-content select="[uiHeaderLeading]"></ng-content>
        <div class="flex min-w-0 items-baseline gap-2.5 max-md:grid max-md:gap-0.5">
          <h1 class="ui-page-title">{{ title }}</h1>
          <span *ngIf="description" class="ui-page-description min-w-0 overflow-hidden text-ellipsis">{{ description }}</span>
          <ng-content select="[uiHeaderMeta]"></ng-content>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2 empty:hidden max-md:w-full max-md:justify-start">
        <ng-content></ng-content>
      </div>
    </header>
  `,
})
export class UiPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() flush = false;
}
