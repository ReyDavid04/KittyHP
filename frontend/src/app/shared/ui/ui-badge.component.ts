import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type UiBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-ui-badge',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'inline-flex' },
  template: `
    <span class="ui-badge" [ngClass]="toneClass">
      <span *ngIf="dot" class="size-1.5 rounded-full" [ngClass]="dotClass" aria-hidden="true"></span>
      <ng-content></ng-content>
    </span>
  `,
})
export class UiBadgeComponent {
  @Input() tone: UiBadgeTone = 'neutral';
  @Input() dot = false;

  get toneClass(): string {
    return `ui-badge-${this.tone}`;
  }

  get dotClass(): string {
    return {
      neutral: 'bg-ink-muted',
      info: 'bg-brand-800',
      success: 'bg-success',
      warning: 'bg-warning',
      danger: 'bg-danger',
    }[this.tone];
  }
}
