import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, effect, inject } from '@angular/core';
import { UiConfirmToastService } from './ui-confirm-toast.service';
import { UiIconComponent } from './ui-icon.component';

@Component({
  selector: 'app-ui-confirm-toast',
  standalone: true,
  imports: [CommonModule, UiIconComponent],
  template: `
    <div *ngIf="confirmToast.request()" class="ui-confirm-toast-backdrop" aria-hidden="true"></div>
    <section
      *ngIf="confirmToast.request() as request"
      class="ui-toast ui-confirm-toast"
      [class.ui-toast-danger]="request.tone === 'danger'"
      [class.ui-toast-warning]="request.tone !== 'danger'"
      role="alertdialog"
      aria-modal="true"
      [attr.aria-labelledby]="titleId"
      [attr.aria-describedby]="request.message ? messageId : null"
    >
      <app-ui-icon [name]="request.tone === 'danger' ? 'delete' : 'warning'"></app-ui-icon>
      <div class="ui-confirm-toast-content">
        <strong [id]="titleId">{{ request.title }}</strong>
        <span *ngIf="request.message" [id]="messageId">{{ request.message }}</span>
      </div>
      <div class="ui-confirm-toast-actions">
        <button #cancelButton type="button" class="ui-button ui-button-secondary" (click)="confirmToast.resolve(false)">
          <span>{{ request.cancelLabel }}</span>
        </button>
        <button type="button" class="ui-button" [class.ui-button-danger]="request.tone === 'danger'" [class.ui-button-primary]="request.tone !== 'danger'" (click)="confirmToast.resolve(true)">
          <span>{{ request.confirmLabel }}</span>
        </button>
      </div>
    </section>
  `,
})
export class UiConfirmToastComponent {
  readonly confirmToast = inject(UiConfirmToastService);
  readonly titleId = 'ui-confirm-toast-title';
  readonly messageId = 'ui-confirm-toast-message';
  @ViewChild('cancelButton') private cancelButton?: ElementRef<HTMLButtonElement>;

  constructor() {
    effect(() => {
      const isOpen = Boolean(this.confirmToast.request());
      document.body.classList.toggle('ui-confirm-toast-open', isOpen);
      if (isOpen) window.setTimeout(() => this.cancelButton?.nativeElement.focus());
    });
  }

  @HostListener('document:keydown.escape')
  cancelOnEscape(): void {
    this.confirmToast.resolve(false);
  }

  @HostListener('document:keydown.control.enter', ['$event'])
  confirmOnShortcut(event: KeyboardEvent): void {
    if (!this.confirmToast.request()) return;
    event.preventDefault();
    this.confirmToast.resolve(true);
  }
}
