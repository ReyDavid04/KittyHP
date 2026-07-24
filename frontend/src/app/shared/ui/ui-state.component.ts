import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input } from '@angular/core';

export type UiStateKind = 'loading' | 'empty' | 'error';
export type UiStateSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-ui-state',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'block' },
  template: `
    <div class="ui-state content-center gap-2" [ngClass]="sizeClass">
      <span
        *ngIf="kind === 'loading'"
        class="mb-1 size-6 animate-spin rounded-full border-2 border-line-strong border-t-brand-800"
        aria-hidden="true"
      ></span>
      <ng-content select="[uiStateIcon]"></ng-content>
      <strong *ngIf="title" class="ui-section-title">{{ title }}</strong>
      <span *ngIf="message" class="max-w-xl text-sm text-ink-muted">{{ message }}</span>
      <ng-content></ng-content>
    </div>
  `,
})
export class UiStateComponent {
  @Input() kind: UiStateKind = 'empty';
  @Input() size: UiStateSize = 'md';
  @Input() title = '';
  @Input() message = '';

  @HostBinding('attr.role')
  get role(): 'alert' | 'status' {
    return this.kind === 'error' ? 'alert' : 'status';
  }

  @HostBinding('attr.aria-live')
  get ariaLive(): 'assertive' | 'polite' {
    return this.kind === 'error' ? 'assertive' : 'polite';
  }

  get sizeClass(): string {
    return { sm: 'min-h-44', md: 'min-h-52', lg: 'min-h-72' }[this.size];
  }
}
