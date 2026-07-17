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
      <section class="editor-workspace">
        <header class="page-heading">
          <button type="button" class="back-button" aria-label="Regresar a reportes" (click)="goBack()">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="m15 18-6-6 6-6"></path>
            </svg>
            <span>Regresar</span>
          </button>

          <h1>{{ repairId ? 'Editar reporte de reparación' : 'Crear reporte de reparación' }}</h1>
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
    </section>
  `,
  styles: [
    `
      .editor-page {
        width: 100%;
        max-width: none;
        margin: 0;
        padding: 0;
      }

      .editor-workspace {
        overflow: hidden;
        border: 0;
        border-radius: 0;
        background: #fff;
        box-shadow: none;
      }

      .page-heading {
        display: flex;
        align-items: center;
        gap: 14px;
        min-height: 58px;
        padding: 9px 22px;
        border-bottom: 1px solid var(--border);
        background: linear-gradient(180deg, #fff 0%, #fbfcfe 100%);
      }

      .back-button {
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 34px;
        padding: 5px 10px;
        border: 1px solid var(--border);
        border-radius: 9px;
        color: var(--primary);
        font-size: 0.72rem;
        font-weight: 750;
        background: #fff;
        cursor: pointer;
        transition: border-color 150ms ease, background 150ms ease, transform 150ms ease;
      }

      .back-button:hover {
        border-color: rgba(47, 126, 199, 0.35);
        background: var(--primary-soft);
        transform: translateX(-1px);
      }

      .back-button svg {
        width: 15px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.9;
      }

      h1 {
        margin: 0;
        color: var(--text);
        font-size: clamp(1.15rem, 1.6vw, 1.4rem);
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -0.025em;
      }

      app-repair-form {
        display: block;
      }

      .loading-card {
        display: grid;
        gap: 13px;
        min-height: 320px;
        padding: 36px;
        color: var(--muted);
        font-size: 0.78rem;
        background: #fff;
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
        .editor-page {
          padding: 0;
        }

        .editor-workspace {
          border-radius: 0;
        }

        .page-heading {
          gap: 10px;
          min-height: 54px;
          padding: 8px 12px;
        }

        .back-button {
          min-height: 32px;
          padding: 5px 8px;
        }

        h1 {
          font-size: 1.05rem;
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
