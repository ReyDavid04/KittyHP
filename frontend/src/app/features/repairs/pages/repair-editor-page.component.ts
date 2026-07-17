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
  `,
  styles: [
    `
      .editor-page {
        display: grid;
        gap: 16px;
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
        display: block;
      }

      h1 {
        margin: 0;
        font-size: clamp(1.45rem, 2.4vw, 2rem);
        font-weight: 800;
        line-height: 1.15;
        letter-spacing: -0.035em;
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
