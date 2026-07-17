import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RepairReport, RepairUpsertPayload } from '../../../core/models/repair-report.model';
import { RepairReportsApiService } from '../../../core/services/repair-reports-api.service';
import { RepairFormComponent } from '../components/repair-form.component';

@Component({
  standalone: true,
  imports: [CommonModule, RepairFormComponent],
  template: `
    <section class="editor-page">
      <nav class="breadcrumb" aria-label="Ruta de navegación">
        <button type="button" (click)="goBack()">Reportes</button>
        <span aria-hidden="true">/</span>
        <strong>{{ repairId ? 'Editar reporte' : 'Nuevo reporte' }}</strong>
      </nav>

      <header class="page-heading">
        <div class="heading-copy">
          <button type="button" class="back-button" aria-label="Volver a reportes" (click)="goBack()">
            <svg viewBox="0 0 24 24" focusable="false"><path d="m15 18-6-6 6-6"></path></svg>
          </button>
          <div>
            <p class="overline">Repair management</p>
            <h1>{{ repairId ? 'Editar reporte de reparación' : 'Crear reporte de reparación' }}</h1>
            <p class="description">
              {{ repairId ? 'Actualiza la información, diagnóstico y evidencia del registro.' : 'Registra la falla, el análisis y la evidencia del proceso de reparación.' }}
            </p>
          </div>
        </div>

        <span class="mode-badge" [class.editing]="repairId">
          <span aria-hidden="true"></span>
          {{ repairId ? 'Modo edición' : 'Nuevo registro' }}
        </span>
      </header>

      <div class="loading-card" *ngIf="isLoading" aria-live="polite">
        <div class="loading-line title"></div>
        <div class="loading-line"></div>
        <div class="loading-line short"></div>
        <span>Cargando información del reporte...</span>
      </div>

      <app-repair-form
        *ngIf="!isLoading"
        [repair]="repair"
        (save)="saveRepair($event)"
        (cancel)="goBack()"
      ></app-repair-form>
    </section>
  `,
  styles: [
    `
      .editor-page {
        display: grid;
        gap: 20px;
        max-width: 1540px;
        margin: 0 auto;
      }

      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--muted);
        font-size: 0.72rem;
      }

      .breadcrumb button {
        padding: 0;
        border: 0;
        color: var(--primary);
        font-weight: 700;
        background: transparent;
        cursor: pointer;
      }

      .breadcrumb strong {
        color: var(--muted);
        font-weight: 600;
      }

      .page-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
      }

      .heading-copy {
        display: flex;
        align-items: flex-start;
        gap: 14px;
      }

      .back-button {
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        width: 42px;
        height: 42px;
        margin-top: 2px;
        padding: 0;
        border: 1px solid var(--border);
        border-radius: 12px;
        color: var(--primary);
        background: #fff;
        box-shadow: var(--shadow-sm);
        cursor: pointer;
      }

      .back-button:hover {
        border-color: rgba(47, 126, 199, 0.35);
        background: var(--primary-soft);
      }

      .back-button svg {
        width: 19px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.8;
      }

      .overline {
        margin: 0 0 6px;
        color: var(--primary);
        font-size: 0.69rem;
        font-weight: 750;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0 0 7px;
        font-size: clamp(1.45rem, 2.4vw, 2rem);
        line-height: 1.2;
        letter-spacing: -0.035em;
      }

      .description {
        max-width: 720px;
        margin: 0;
        color: var(--muted);
        font-size: 0.86rem;
        line-height: 1.5;
      }

      .mode-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
        padding: 0 12px;
        border: 1px solid rgba(20, 125, 100, 0.18);
        border-radius: 999px;
        color: var(--success);
        font-size: 0.72rem;
        font-weight: 750;
        background: var(--success-soft);
        white-space: nowrap;
      }

      .mode-badge.editing {
        border-color: rgba(47, 126, 199, 0.2);
        color: var(--primary);
        background: var(--primary-soft);
      }

      .mode-badge > span {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
      }

      .loading-card {
        display: grid;
        gap: 13px;
        min-height: 280px;
        padding: 32px;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        color: var(--muted);
        font-size: 0.78rem;
        background: #fff;
        box-shadow: var(--shadow-md);
      }

      .loading-line {
        width: 100%;
        height: 14px;
        border-radius: 8px;
        background: linear-gradient(90deg, #edf1f5 25%, #f7f9fb 50%, #edf1f5 75%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
      }

      .loading-line.title {
        width: 38%;
        height: 22px;
      }

      .loading-line.short {
        width: 62%;
      }

      .loading-card span {
        margin-top: auto;
      }

      @keyframes shimmer {
        to {
          background-position: -200% 0;
        }
      }

      @media (max-width: 720px) {
        .page-heading {
          align-items: flex-start;
          flex-direction: column;
        }

        .mode-badge {
          margin-left: 56px;
        }
      }
    `,
  ],
})
export class RepairEditorPageComponent {
  private readonly repairReportsApi = inject(RepairReportsApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  repairId: string | null = this.route.snapshot.paramMap.get('id');
  repair: RepairReport | null = null;
  isLoading = Boolean(this.repairId);

  constructor() {
    if (this.repairId) {
      this.repairReportsApi.getOne(this.repairId).subscribe((repair) => {
        this.repair = repair;
        this.isLoading = false;
      });
    }
  }

  saveRepair(payload: RepairUpsertPayload): void {
    const request$ = this.repairId
      ? this.repairReportsApi.update(this.repairId, payload)
      : this.repairReportsApi.create(payload);

    request$.subscribe(() => this.goBack());
  }

  goBack(): void {
    void this.router.navigate(['/']);
  }
}
