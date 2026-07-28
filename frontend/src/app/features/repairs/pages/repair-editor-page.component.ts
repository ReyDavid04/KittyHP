import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RepairReport, RepairUpsertPayload } from '../../../core/models/repair-report.model';
import { RepairReportsApiService } from '../../../core/services/repair-reports-api.service';
import { UiIconComponent, UiPageHeaderComponent } from '../../../shared/ui';
import { RepairFormComponent } from '../components/repair-form.component';

@Component({
  standalone: true,
  imports: [CommonModule, RepairFormComponent, UiIconComponent, UiPageHeaderComponent],
  template: `
    <section class="editor-page ui-page">
      <section class="editor-workspace" [attr.aria-busy]="isLoading">
        <app-ui-page-header [title]="repairId ? 'Editar reporte de reparación' : 'Crear reporte de reparación'">
          <button uiHeaderLeading type="button" class="back-button ui-button ui-button-secondary" aria-label="Regresar a reportes" (click)="goBack()">
            <app-ui-icon name="chevron-left"></app-ui-icon>
            <span>Regresar</span>
          </button>

          <button
            type="button"
            class="details-header-action ui-button ui-button-ghost"
            [disabled]="isLoading"
            (click)="repairForm?.toggleDetails()"
            [attr.aria-expanded]="repairForm?.showDetails"
          >
            {{ repairForm?.showDetails ? 'Ocultar detalles' : 'Mostrar detalles' }}
          </button>

          <button
            type="button"
            class="ui-button ui-button-primary"
            [disabled]="isSaveDisabled"
            (click)="submitRepair()"
          >
            <app-ui-icon name="check"></app-ui-icon>
            {{ repairId ? 'Guardar cambios' : 'Guardar reporte' }}
          </button>
        </app-ui-page-header>

        <div class="loading-card ui-card" *ngIf="isLoading" role="status" aria-live="polite" aria-label="Cargando reporte">
          <div class="loading-line title"></div>
          <div class="loading-line"></div>
          <div class="loading-line short"></div>
          <span>Cargando información del reporte...</span>
        </div>

        <app-repair-form
          class="editor-repair-form"
          *ngIf="!isLoading"
          [repair]="repair"
          (save)="saveRepair($event)"
          (cancel)="goBack()"
        ></app-repair-form>

        <div *ngIf="saveMessage" class="ui-toast ui-toast-success" role="status" aria-live="polite">
          <app-ui-icon name="check"></app-ui-icon>
          <span>{{ saveMessage }}</span>
        </div>
        <div *ngIf="saveError" class="ui-toast ui-toast-danger" role="alert" aria-live="assertive">
          <app-ui-icon name="warning"></app-ui-icon>
          <span>{{ saveError }}</span>
        </div>
      </section>
    </section>
  `,
  styleUrl: './repair-editor-page.component.css',
})
export class RepairEditorPageComponent {
  @ViewChild(RepairFormComponent) repairForm?: RepairFormComponent;

  private readonly repairReportsApi = inject(RepairReportsApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  repairId: string | null = this.route.snapshot.paramMap.get('id');
  repair: RepairReport | null = null;
  isLoading = Boolean(this.repairId);
  isSaving = false;
  saveMessage = '';
  saveError = '';

  constructor() {
    if (this.repairId) {
      this.repairReportsApi.getOne(this.repairId).subscribe((repair) => {
        this.repair = repair;
        this.isLoading = false;
      });
    }
  }

  get isSaveDisabled(): boolean {
    return this.isLoading || this.isSaving || !this.repairForm;
  }

  submitRepair(): void {
    this.repairForm?.submit();
  }

  @HostListener('document:keydown.control.s', ['$event'])
  saveWithKeyboard(event: KeyboardEvent): void {
    event.preventDefault();
    if (this.isSaveDisabled) return;
    this.submitRepair();
  }

  @HostListener('document:keydown.control.d', ['$event'])
  toggleDetailsWithKeyboard(event: KeyboardEvent): void {
    event.preventDefault();
    if (this.isLoading) return;
    this.repairForm?.toggleDetails();
  }

  @HostListener('document:keydown.escape', ['$event'])
  goBackWithKeyboard(event: KeyboardEvent): void {
    if (document.body.classList.contains('ui-confirm-toast-open')) return;
    event.preventDefault();
    this.goBack();
  }

  saveRepair(payload: RepairUpsertPayload): void {
    if (this.isSaving) return;

    this.isSaving = true;
    this.saveMessage = '';
    this.saveError = '';
    const request$ = this.repairId
      ? this.repairReportsApi.update(this.repairId, payload)
      : this.repairReportsApi.create(payload);

    request$.subscribe({
      next: () => {
        this.saveMessage = this.repairId
          ? 'Cambios guardados. Las unidades fueron reasignadas por categoría cuando fue necesario.'
          : 'Reporte guardado correctamente.';
        window.setTimeout(() => this.goBack(), 900);
      },
      error: (error: unknown) => {
        this.isSaving = false;
        this.saveError = this.getErrorMessage(error);
      },
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;
      if (Array.isArray(message)) return message.join(' ');
      if (typeof message === 'string') return message;
    }
    return 'No fue posible guardar el reporte. Inténtalo nuevamente.';
  }

  goBack(): void {
    void this.router.navigate(['/']);
  }
}
