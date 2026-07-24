import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RepairReport } from '../../../core/models/repair-report.model';
import { RepairReportsApiService } from '../../../core/services/repair-reports-api.service';
import { UiIconComponent, UiPageHeaderComponent, UiStateComponent } from '../../../shared/ui';

@Component({
  standalone: true,
  imports: [CommonModule, UiIconComponent, UiPageHeaderComponent, UiStateComponent],
  template: `
    <section class="view-page ui-page" [attr.aria-busy]="isLoading">
      <app-ui-page-header title="Visualizar reporte de reparación" [description]="repair ? 'Reporte #' + repair.id : ''">
        <button uiHeaderLeading type="button" class="ui-button ui-button-secondary" aria-label="Regresar a reportes" (click)="goBack()">
          <app-ui-icon name="chevron-left"></app-ui-icon>
          <span>Regresar</span>
        </button>
      </app-ui-page-header>

      <app-ui-state *ngIf="isLoading" kind="loading" size="lg" message="Cargando reporte..."></app-ui-state>
      <app-ui-state
        *ngIf="!isLoading && errorMessage"
        kind="error"
        size="lg"
        title="No fue posible cargar el reporte."
        [message]="errorMessage"
      ></app-ui-state>

      <section class="report-content" *ngIf="!isLoading && repair as item">
        <div class="summary-grid">
          <article class="detail-card ui-card">
            <span class="detail-label">Date</span>
            <span class="detail-value">{{ item.recordDate || '—' }}</span>
          </article>
          <article class="detail-card ui-card">
            <span class="detail-label">Family</span>
            <span class="detail-value">{{ item.family || '—' }}</span>
          </article>
          <article class="detail-card wide ui-card">
            <span class="detail-label">Top issue</span>
            <span class="detail-value">{{ item.topIssue || '—' }}</span>
          </article>
          <article class="detail-card number-card ui-card">
            <span class="detail-label">Failure qty</span>
            <span class="detail-value">{{ item.failureQty | number }}</span>
          </article>
          <article class="detail-card number-card ui-card">
            <span class="detail-label">Build qty</span>
            <span class="detail-value">{{ item.buildQty | number }}</span>
          </article>
          <article class="detail-card number-card ui-card">
            <span class="detail-label">F/R</span>
            <span class="detail-value">{{ item.frPercentage | number: '1.2-2' }}%</span>
          </article>
          <article class="detail-card ui-card">
            <span class="detail-label">Category</span>
            <span class="detail-value">{{ item.category || '—' }}</span>
          </article>
          <article class="detail-card number-card ui-card">
            <span class="detail-label">Return Yes</span>
            <span class="detail-value">{{ item.returnYesQty | number }}</span>
          </article>
          <article class="detail-card number-card ui-card">
            <span class="detail-label">Return No</span>
            <span class="detail-value">{{ item.returnNoQty | number }}</span>
          </article>
          <article class="detail-card ui-card">
            <span class="detail-label">Major part</span>
            <span class="detail-value">{{ item.majorPart || '—' }}</span>
          </article>
          <article class="detail-card ui-card">
            <span class="detail-label">Failure factor</span>
            <span class="detail-value">{{ item.failureFactor || '—' }}</span>
          </article>
        </div>

        <div class="text-grid">
          <article class="text-card ui-card">
            <span class="section-label">Repair result</span>
            <p>{{ item.repairResult || '—' }}</p>
          </article>
          <article class="text-card ui-card">
            <span class="section-label">Actions</span>
            <p>{{ item.actions || '—' }}</p>
          </article>
        </div>

        <div class="image-grid">
          <article class="image-card ui-card">
            <span class="section-label">Fail picture</span>
            <div *ngIf="item.failPictures?.length; else noFailPicture" class="image-gallery" [class.image-gallery-single]="item.failPictures?.length === 1" [class.image-gallery-double]="item.failPictures?.length === 2">
              <a *ngFor="let image of item.failPictures" [href]="image" target="_blank" rel="noopener"><img [src]="image" alt="Imagen de la falla"><span class="zoom-hint">Abrir imagen</span></a>
            </div>
            <ng-template #noFailPicture><div class="no-image">Sin imagen</div></ng-template>
          </article>
          <article class="image-card ui-card">
            <span class="section-label">Evidence</span>
            <div *ngIf="item.evidencePictures?.length; else noEvidencePicture" class="image-gallery" [class.image-gallery-single]="item.evidencePictures?.length === 1" [class.image-gallery-double]="item.evidencePictures?.length === 2">
              <a *ngFor="let image of item.evidencePictures" [href]="image" target="_blank" rel="noopener"><img [src]="image" alt="Evidencia"></a>
            </div>
            <a *ngIf="false" [href]="item.evidencePicture" target="_blank" rel="noopener">
              <img [src]="item.evidencePicture" alt="Evidencia de la reparación"><span class="zoom-hint">Abrir imagen</span>
            </a>
            <ng-template #noEvidencePicture><div class="no-image">Sin imagen</div></ng-template>
          </article>
        </div>
      </section>
    </section>
  `,
  styleUrl: './repair-view-page.component.css',
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
