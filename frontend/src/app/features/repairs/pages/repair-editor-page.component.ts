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
    <section class="page-shell">
      <div class="page-toolbar">
        <button type="button" class="ghost" (click)="goBack()">Volver</button>
        <div class="page-meta">
          <p class="eyebrow">KittyHP</p>
          <h2>{{ repairId ? 'Editar reporte' : 'Nuevo reporte' }}</h2>
        </div>
      </div>

      <div class="form-card" *ngIf="isLoading">Cargando...</div>
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
      .page-shell {
        display: grid;
        gap: 16px;
        width: 100%;
      }

      .page-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 18px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 10px 24px rgba(16, 32, 51, 0.05);
        backdrop-filter: blur(8px);
      }

      .page-meta {
        display: grid;
        gap: 4px;
      }

      .eyebrow {
        margin: 0;
        font-size: 0.72rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
      }

      h2 {
        margin: 0;
        font-size: 1.15rem;
      }

      .ghost {
        border: 1px solid var(--border);
        border-radius: 12px;
        background: #fff;
        color: var(--text);
        padding: 10px 14px;
        cursor: pointer;
      }

      .form-card {
        padding: 20px;
        border: 1px solid var(--border);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 12px 28px rgba(16, 32, 51, 0.07);
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
    const request$ = this.repairId ? this.repairReportsApi.update(this.repairId, payload) : this.repairReportsApi.create(payload);

    request$.subscribe(() => this.goBack());
  }

  goBack(): void {
    void this.router.navigate(['/']);
  }
}