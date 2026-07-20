import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RepairReport } from '../../../core/models/repair-report.model';
import { RepairReportsApiService } from '../../../core/services/repair-reports-api.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="view-page">
      <header class="page-heading">
        <button type="button" class="back-button" aria-label="Regresar a reportes" (click)="goBack()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>
          <span>Regresar</span>
        </button>
        <div class="heading-copy">
          <h1>Visualizar reporte de reparación</h1>
          <span *ngIf="repair">Reporte #{{ repair.id }}</span>
        </div>
      </header>

      <div class="loading-state" *ngIf="isLoading">Cargando reporte...</div>
      <div class="error-state" *ngIf="!isLoading && errorMessage">
        <strong>No fue posible cargar el reporte.</strong><span>{{ errorMessage }}</span>
      </div>

      <section class="report-content" *ngIf="!isLoading && repair as item">
        <div class="summary-grid">
          <article class="detail-card"><span>Date</span><strong>{{ item.recordDate || '—' }}</strong></article>
          <article class="detail-card"><span>Familia</span><strong>{{ item.family || '—' }}</strong></article>
          <article class="detail-card wide"><span>Top issue</span><strong>{{ item.topIssue || '—' }}</strong></article>
          <article class="detail-card number-card"><span>Failure qty</span><strong>{{ item.failureQty | number }}</strong></article>
          <article class="detail-card number-card"><span>Build qty</span><strong>{{ item.buildQty | number }}</strong></article>
          <article class="detail-card number-card"><span>F/R</span><strong>{{ item.frPercentage | number: '1.2-2' }}%</strong></article>
          <article class="detail-card"><span>Category</span><strong>{{ item.category || '—' }}</strong></article>
          <article class="detail-card"><span>Return</span><strong>{{ item.returnStatus || '—' }}</strong></article>
          <article class="detail-card"><span>Major part</span><strong>{{ item.majorPart || '—' }}</strong></article>
          <article class="detail-card"><span>Failure factor</span><strong>{{ item.failureFactor || '—' }}</strong></article>
        </div>

        <div class="text-grid">
          <article class="text-card"><span>Repair result</span><p>{{ item.repairResult || '—' }}</p></article>
          <article class="text-card"><span>Actions</span><p>{{ item.actions || '—' }}</p></article>
        </div>

        <div class="image-grid">
          <article class="image-card">
            <span>Fail picture</span>
            <a *ngIf="item.failPicture; else noFailPicture" [href]="item.failPicture" target="_blank" rel="noopener">
              <img [src]="item.failPicture" alt="Imagen de la falla"><span class="zoom-hint">Abrir imagen</span>
            </a>
            <ng-template #noFailPicture><div class="no-image">Sin imagen</div></ng-template>
          </article>
          <article class="image-card">
            <span>Evidence</span>
            <a *ngIf="item.evidencePicture; else noEvidencePicture" [href]="item.evidencePicture" target="_blank" rel="noopener">
              <img [src]="item.evidencePicture" alt="Evidencia de la reparación"><span class="zoom-hint">Abrir imagen</span>
            </a>
            <ng-template #noEvidencePicture><div class="no-image">Sin imagen</div></ng-template>
          </article>
        </div>
      </section>
    </section>
  `,
  styles: [`
    :host, .view-page { display: block; min-height: calc(100dvh - 50px); background: #fff; }
    .page-heading { display: flex; align-items: center; gap: 14px; min-height: 58px; padding: 9px 22px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg,#fff 0%,#fbfcfe 100%); }
    .back-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 34px; padding: 5px 10px; border: 1px solid var(--border); border-radius: 9px; color: var(--primary); font-size: .72rem; font-weight: 750; background: #fff; cursor: pointer; }
    .back-button:hover { border-color: rgba(47,126,199,.35); background: var(--primary-soft); }
    .back-button svg { width: 15px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.9; }
    .heading-copy { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
    h1 { margin: 0; color: var(--text); font-size: clamp(1.15rem,1.6vw,1.4rem); font-weight: 800; line-height: 1.1; letter-spacing: -.025em; }
    .heading-copy > span { color: var(--muted); font-size: .72rem; font-weight: 650; }
    .report-content { display: grid; gap: 18px; padding: 22px; }
    .summary-grid { display: grid; grid-template-columns: repeat(12,minmax(0,1fr)); gap: 12px; }
    .detail-card { grid-column: span 2; display: grid; align-content: start; gap: 7px; min-height: 82px; padding: 14px 16px; border: 1px solid var(--border); border-radius: 11px; background: #fbfcfe; }
    .detail-card.wide { grid-column: span 4; }
    .detail-card span, .text-card > span, .image-card > span { color: var(--muted); font-size: .68rem; font-weight: 750; letter-spacing: .045em; text-transform: uppercase; }
    .detail-card strong { color: var(--text); font-size: .86rem; line-height: 1.35; overflow-wrap: anywhere; }
    .number-card strong { color: var(--primary); font-size: 1rem; font-variant-numeric: tabular-nums; }
    .text-grid, .image-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
    .text-card, .image-card { display: grid; align-content: start; gap: 10px; padding: 16px; border: 1px solid var(--border); border-radius: 12px; background: #fff; }
    .text-card p { min-height: 92px; margin: 0; color: #344054; font-size: .82rem; line-height: 1.55; white-space: pre-wrap; }
    .image-card a { position: relative; display: grid; place-items: center; min-height: 280px; overflow: hidden; border-radius: 9px; background: #f8fafc; text-decoration: none; }
    .image-card img { display: block; width: 100%; height: 280px; object-fit: contain; transition: transform 180ms ease; }
    .zoom-hint { position: absolute; right: 12px; bottom: 12px; padding: 7px 10px; border-radius: 7px; color: #fff; font-size: .68rem; font-weight: 700; background: rgba(15,32,51,.78); opacity: 0; transition: opacity 160ms ease; }
    .image-card a:hover img { transform: scale(1.02); }
    .image-card a:hover .zoom-hint { opacity: 1; }
    .no-image, .loading-state, .error-state { display: grid; place-items: center; min-height: 280px; color: var(--muted); font-size: .78rem; background: #f8fafc; }
    .loading-state, .error-state { min-height: calc(100dvh - 108px); }
    .error-state { align-content: center; gap: 6px; }
    .error-state strong { color: var(--danger); }
    @media (max-width:1000px) { .detail-card, .detail-card.wide { grid-column: span 4; } }
    @media (max-width:720px) {
      .page-heading { padding: 8px 12px; }
      .heading-copy { display: grid; gap: 3px; }
      h1 { font-size: 1rem; }
      .report-content { padding: 14px 12px; }
      .summary-grid, .text-grid, .image-grid { grid-template-columns: 1fr; }
      .detail-card, .detail-card.wide { grid-column: auto; }
      .image-card a, .image-card img, .no-image { min-height: 220px; height: 220px; }
    }
  `],
})
export class RepairViewPageComponent {
  private readonly repairReportsApi = inject(RepairReportsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  repair: RepairReport | null = null;
  isLoading = true;
  errorMessage = '';

  constructor() {
    const repairId = this.route.snapshot.paramMap.get('id');
    if (!repairId) {
      this.isLoading = false;
      this.errorMessage = 'No se recibió un identificador válido.';
      return;
    }

    this.repairReportsApi.getOne(repairId).subscribe({
      next: (repair) => { this.repair = repair; this.isLoading = false; },
      error: () => { this.isLoading = false; this.errorMessage = 'El registro no existe o no está disponible.'; },
    });
  }

  goBack(): void { void this.router.navigate(['/']); }
}
