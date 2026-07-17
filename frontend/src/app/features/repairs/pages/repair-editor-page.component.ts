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
        max-width: 1600px;
        margin: 0 auto;
        padding: 26px 32px 38px;
      }

      .editor-workspace {
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: var(--shadow-md);
      }

      .page-heading {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 24px 36px;
        border-bottom: 1px solid var(--border);
        background: linear-gradient(180deg, #fff 0%, #fbfcfe 100%);
      }

      .back-button {
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-height: 38px;
        padding: 7px 12px;
        border: 1px solid var(--border);
        border-radius: 10px;
        color: var(--primary);
        font-size: 0.76rem;
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
        width: 17px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.9;
      }

      h1 {
        margin: 0;
        color: var(--text);
        font-size: clamp(1.35rem, 2vw, 1.85rem);
        font-weight: 800;
        line-height: 1.15;
        letter-spacing: -0.035em;
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
          padding: 14px 10px 24px;
        }

        .editor-workspace {
          border-radius: 14px;
        }

        .page-heading {
          align-items: flex-start;
          flex-direction: column;
          gap: 12px;
          padding: 18px;
        }

        .back-button {
          min-height: 34px;
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
