import { Injectable, signal } from '@angular/core';

export interface UiConfirmToastRequest {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning';
}

interface ActiveUiConfirmToast extends UiConfirmToastRequest {
  resolve: (confirmed: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class UiConfirmToastService {
  private readonly activeRequest = signal<ActiveUiConfirmToast | null>(null);
  readonly request = this.activeRequest.asReadonly();

  confirm(request: UiConfirmToastRequest): Promise<boolean> {
    this.resolve(false);
    return new Promise<boolean>((resolve) => {
      this.activeRequest.set({
        confirmLabel: 'Confirmar',
        cancelLabel: 'Cancelar',
        tone: 'warning',
        ...request,
        resolve,
      });
    });
  }

  resolve(confirmed: boolean): void {
    const request = this.activeRequest();
    if (!request) return;
    this.activeRequest.set(null);
    request.resolve(confirmed);
  }
}
