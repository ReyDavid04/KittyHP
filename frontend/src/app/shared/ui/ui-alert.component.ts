import { CommonModule } from '@angular/common';
import { Component, HostBinding, Input } from '@angular/core';

export type UiAlertTone = 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-ui-alert',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'block' },
  template: `<div class="ui-alert" [ngClass]="toneClass"><ng-content></ng-content></div>`,
})
export class UiAlertComponent {
  @Input() tone: UiAlertTone = 'info';

  @HostBinding('attr.role')
  get role(): 'alert' | 'status' {
    return this.tone === 'danger' ? 'alert' : 'status';
  }

  @HostBinding('attr.aria-live')
  get ariaLive(): 'assertive' | 'polite' {
    return this.tone === 'danger' ? 'assertive' : 'polite';
  }

  get toneClass(): string {
    return `ui-alert-${this.tone}`;
  }
}
