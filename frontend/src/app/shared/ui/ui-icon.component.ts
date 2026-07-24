import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type UiIconName =
  | 'add'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'close'
  | 'delete'
  | 'download'
  | 'edit'
  | 'first-page'
  | 'last-page'
  | 'save'
  | 'view';

@Component({
  selector: 'app-ui-icon',
  standalone: true,
  imports: [CommonModule],
  host: {
    class: 'inline-grid size-4 shrink-0 place-items-center',
    'aria-hidden': 'true',
  },
  template: `
    <svg class="block size-full fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.75]" viewBox="0 0 24 24" focusable="false">
      <ng-container [ngSwitch]="name">
        <path *ngSwitchCase="'add'" d="M12 5v14M5 12h14"></path>
        <path *ngSwitchCase="'check'" d="m5 12.5 4.2 4.2L19 7"></path>
        <path *ngSwitchCase="'chevron-left'" d="m15 18-6-6 6-6"></path>
        <path *ngSwitchCase="'chevron-right'" d="m9 18 6-6-6-6"></path>
        <path *ngSwitchCase="'close'" d="M6 6l12 12M18 6 6 18"></path>
        <path *ngSwitchCase="'delete'" d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"></path>
        <g *ngSwitchCase="'download'">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4"></path>
          <path d="M5 19h14"></path>
        </g>
        <g *ngSwitchCase="'edit'">
          <path d="m4 20 4.2-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z"></path>
          <path d="m14.8 6.4 2.8 2.8"></path>
        </g>
        <g *ngSwitchCase="'first-page'">
          <path d="m16 6-6 6 6 6"></path>
          <path d="M6 6v12"></path>
        </g>
        <g *ngSwitchCase="'last-page'">
          <path d="m8 6 6 6-6 6"></path>
          <path d="M18 6v12"></path>
        </g>
        <g *ngSwitchCase="'save'">
          <path d="M5 4h11l3 3v13H5Z"></path>
          <path d="M8 4v6h8V4M8 16h8"></path>
        </g>
        <g *ngSwitchCase="'view'">
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path>
          <circle cx="12" cy="12" r="2.8"></circle>
        </g>
      </ng-container>
    </svg>
  `,
})
export class UiIconComponent {
  @Input({ required: true }) name!: UiIconName;
}
