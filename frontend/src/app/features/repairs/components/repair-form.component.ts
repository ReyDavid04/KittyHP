import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RepairReport, RepairUpsertPayload } from '../../../core/models/repair-report.model';
import { RepairCatalogs, RepairReportsApiService } from '../../../core/services/repair-reports-api.service';
import { UiIconComponent } from '../../../shared/ui';
import { CatalogAutocompleteDirective } from './catalog-autocomplete.directive';

const EMPTY_CATALOGS: RepairCatalogs = {
  families: [],
  topIssues: [],
  categories: [],
  majorParts: [],
  failureFactors: [],
};

const returnQuantitiesValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const failureRaw = control.get('failureQty')?.value;
  const returnYesRaw = control.get('returnYesQty')?.value;

  if (failureRaw === '' || returnYesRaw === '' || failureRaw === null || returnYesRaw === null) {
    return null;
  }

  const failureQty = Number(failureRaw);
  const returnYesQty = Number(returnYesRaw);

  if (!Number.isFinite(failureQty) || !Number.isFinite(returnYesQty)) {
    return null;
  }

  return returnYesQty > failureQty ? { returnYesExceedsFailureQty: true } : null;
};

@Component({
  selector: 'app-repair-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CatalogAutocompleteDirective, UiIconComponent],
  host: { class: 'block' },
  template: `
    <form class="form-shell" [formGroup]="form" (ngSubmit)="submit()">
      <div *ngIf="catalogError" class="form-error-alert" role="alert">{{ catalogError }}</div>
      <div class="form-body">
        <div class="form-grid">
          <label class="field grid-date ui-field">
            <span>Date <b>*</b></span>
            <input class="ui-control" type="date" formControlName="recordDate" [class.invalid]="isInvalid('recordDate')" [attr.aria-invalid]="isInvalid('recordDate')">
          </label>

          <label class="field grid-family ui-field">
            <span>Family <b>*</b></span>
            <select appCatalogAutocomplete catalogAutocompletePlaceholder="Escribe o selecciona Family" class="ui-control" formControlName="family" [class.invalid]="isInvalid('family')" [attr.aria-invalid]="isInvalid('family')">
              <option value="" disabled>{{ catalogsLoading ? 'Cargando catálogo...' : 'Selecciona Family' }}</option>
              <option *ngFor="let option of familyOptions" [value]="option">{{ option }}</option>
            </select>
          </label>

          <label class="field grid-top-issue ui-field">
            <span>Top issue <b>*</b></span>
            <select appCatalogAutocomplete catalogAutocompletePlaceholder="Escribe o selecciona el top issue" class="ui-control" formControlName="topIssue" [class.invalid]="isInvalid('topIssue')" [attr.aria-invalid]="isInvalid('topIssue')">
              <option value="" disabled>{{ catalogsLoading ? 'Cargando catálogo...' : 'Selecciona el top issue' }}</option>
              <option *ngFor="let option of topIssueOptions" [value]="option">{{ option }}</option>
            </select>
          </label>

          <label class="field grid-failure-qty ui-field">
            <span>Failure qty <b>*</b></span>
            <input
              class="ui-control"
              type="number"
              min="1"
              step="1"
              formControlName="failureQty"
              placeholder="Captura la cantidad"
              [class.invalid]="isInvalid('failureQty') || isReturnQuantityInvalid"
              [attr.aria-invalid]="isInvalid('failureQty') || isReturnQuantityInvalid"
            >
          </label>

          <label class="field grid-build-qty ui-field">
            <span>Build qty <b>*</b></span>
            <input
              class="ui-control"
              type="number"
              min="1"
              step="1"
              formControlName="buildQty"
              placeholder="Captura la cantidad"
              [class.invalid]="isInvalid('buildQty')"
              [attr.aria-invalid]="isInvalid('buildQty')"
            >
          </label>

          <label class="field grid-fr ui-field">
            <span>F/R <b>*</b></span>
            <div class="suffix-input">
              <input
                class="ui-control"
                type="text"
                formControlName="frPercentage"
                readonly
                placeholder="Automático"
                [class.invalid]="isInvalid('frPercentage')"
                [attr.aria-invalid]="isInvalid('frPercentage')"
                aria-label="F/R calculado automáticamente"
                title="Calculado automáticamente: Failure qty / Build qty"
              >
              <span>%</span>
            </div>
            <small *ngIf="isInvalid('frPercentage')">El F/R debe ser mayor a 0.00%.</small>
          </label>

          <label class="field grid-category ui-field">
            <span>Category <b>*</b></span>
            <select appCatalogAutocomplete catalogAutocompletePlaceholder="Escribe o selecciona la categoría" class="ui-control" formControlName="category" [class.invalid]="isInvalid('category')" [attr.aria-invalid]="isInvalid('category')">
              <option value="" disabled>{{ catalogsLoading ? 'Cargando catálogo...' : 'Selecciona la categoría' }}</option>
              <option *ngFor="let option of categoryOptions" [value]="option">{{ option }}</option>
            </select>
          </label>

          <div class="return-group grid-return">
            <label class="field ui-field">
              <span>Return Yes <b>*</b></span>
              <input
                class="ui-control"
                type="number"
                min="0"
                step="1"
                formControlName="returnYesQty"
                placeholder="Cantidad Yes"
                [class.invalid]="isReturnQuantityInvalid"
                [attr.aria-invalid]="isReturnQuantityInvalid"
              >
            </label>

            <label class="field ui-field">
              <span>Return No</span>
              <input
                class="ui-control"
                type="text"
                formControlName="returnNoQty"
                readonly
                placeholder="Automático"
                aria-label="Return No calculado automáticamente"
                title="Calculado automáticamente: Failure qty - Return Yes"
              >
            </label>
            <small *ngIf="isReturnQuantityInvalid">Return Yes no puede ser mayor que Failure qty.</small>
          </div>

          <label class="field grid-major-part ui-field">
            <span>Major part <b>*</b></span>
            <select appCatalogAutocomplete catalogAutocompletePlaceholder="Escribe o selecciona la parte principal" class="ui-control" formControlName="majorPart" [class.invalid]="isInvalid('majorPart')" [attr.aria-invalid]="isInvalid('majorPart')">
              <option value="" disabled>{{ catalogsLoading ? 'Cargando catálogo...' : 'Selecciona la parte principal' }}</option>
              <option *ngFor="let option of majorPartOptions" [value]="option">{{ option }}</option>
            </select>
          </label>

          <label class="field grid-failure-factor ui-field">
            <span>Failure factor <b>*</b></span>
            <select appCatalogAutocomplete catalogAutocompletePlaceholder="Escribe o selecciona el factor de falla" class="ui-control" formControlName="failureFactor" [class.invalid]="isInvalid('failureFactor')" [attr.aria-invalid]="isInvalid('failureFactor')">
              <option value="" disabled>{{ catalogsLoading ? 'Cargando catálogo...' : 'Selecciona el factor de falla' }}</option>
              <option *ngFor="let option of failureFactorOptions" [value]="option">{{ option }}</option>
            </select>
          </label>

          <label class="upload-zone grid-fail-picture" [class.has-file]="failPicturePreviewUrls.length" [class.invalid]="isInvalid('failPicture')">
            <input type="file" accept="image/*" multiple (change)="onFileSelected($event, 'failPicture')" [attr.aria-invalid]="isInvalid('failPicture')">
            <ng-container *ngIf="failPicturePreviewUrls.length; else failPictureEmpty">
              <span class="image-preview image-preview-shell"><span #failGallery class="image-preview-gallery" (scroll)="updateGalleryIndex($event, 'failPicture')"><img *ngFor="let preview of failPicturePreviewUrls" [src]="preview" alt="Vista previa de la imagen de falla"></span><span class="gallery-position">{{ failPictureIndex + 1 }} / {{ failPicturePreviewUrls.length }}</span><button type="button" class="gallery-delete" (click)="removeImage($event, 'failPicture')" aria-label="Eliminar imagen actual">×</button><button type="button" class="gallery-arrow gallery-arrow-left" (click)="scrollGallery($event, failGallery, -1)" aria-label="Imagen anterior">‹</button><button type="button" class="gallery-arrow gallery-arrow-right" (click)="scrollGallery($event, failGallery, 1)" aria-label="Imagen siguiente">›</button><span class="image-change">Agregar imágenes ({{ failPictureCount }}/10)</span></span>
              <span class="upload-content"><strong>Fail picture <b>*</b></strong></span>
            </ng-container>
            <ng-template #failPictureEmpty>
              <span class="upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v6h14v-6"></path></svg></span>
              <span class="upload-content"><strong>Fail picture <b>*</b></strong><span>Selecciona una imagen de la falla</span></span>
            </ng-template>
          </label>

          <label class="field grid-repair-result ui-field">
            <span>Repair result <b>*</b></span>
            <textarea class="ui-control" rows="4" formControlName="repairResult" placeholder="Resultado de la reparación" [class.invalid]="isInvalid('repairResult')" [attr.aria-invalid]="isInvalid('repairResult')"></textarea>
          </label>

          <label class="field grid-actions ui-field">
            <span>Actions <b>*</b></span>
            <textarea class="ui-control" rows="4" formControlName="actions" placeholder="Detalla las acciones realizadas" [class.invalid]="isInvalid('actions')" [attr.aria-invalid]="isInvalid('actions')"></textarea>
          </label>

          <label class="upload-zone grid-evidence" [class.has-file]="evidencePicturePreviewUrls.length" [class.invalid]="isInvalid('evidencePicture')">
            <input type="file" accept="image/*" multiple (change)="onFileSelected($event, 'evidencePicture')" [attr.aria-invalid]="isInvalid('evidencePicture')">
            <ng-container *ngIf="evidencePicturePreviewUrls.length; else evidencePictureEmpty">
              <span class="image-preview image-preview-shell"><span #evidenceGallery class="image-preview-gallery" (scroll)="updateGalleryIndex($event, 'evidencePicture')"><img *ngFor="let preview of evidencePicturePreviewUrls" [src]="preview" alt="Vista previa de la evidencia final"></span><span class="gallery-position">{{ evidencePictureIndex + 1 }} / {{ evidencePicturePreviewUrls.length }}</span><button type="button" class="gallery-delete" (click)="removeImage($event, 'evidencePicture')" aria-label="Eliminar imagen actual">×</button><button type="button" class="gallery-arrow gallery-arrow-left" (click)="scrollGallery($event, evidenceGallery, -1)" aria-label="Imagen anterior">‹</button><button type="button" class="gallery-arrow gallery-arrow-right" (click)="scrollGallery($event, evidenceGallery, 1)" aria-label="Imagen siguiente">›</button><span class="image-change">Agregar imágenes ({{ evidencePictureCount }}/10)</span></span>
              <span class="upload-content"><strong>Evidence <b>*</b></strong></span>
            </ng-container>
            <ng-template #evidencePictureEmpty>
              <span class="upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v6h14v-6"></path></svg></span>
              <span class="upload-content"><strong>Evidence <b>*</b></strong><span>Selecciona la evidencia final de la reparación</span></span>
            </ng-template>
          </label>
        </div>
      </div>

    </form>
  `,
  styleUrl: './repair-form.component.css',
})
export class RepairFormComponent implements OnChanges {
  @Input() repair: RepairReport | null = null;
  @Output() save = new EventEmitter<RepairUpsertPayload>();
  @Output() cancel = new EventEmitter<void>();

  failPictureFiles: File[] = [];
  evidencePictureFiles: File[] = [];
  failPicturePreview = '';
  evidencePicturePreview = '';
  failPicturePreviews: string[] = [];
  evidencePicturePreviews: string[] = [];
  existingFailPictures: string[] = [];
  existingEvidencePictures: string[] = [];
  failPictureIndex = 0;
  evidencePictureIndex = 0;
  catalogs: RepairCatalogs = { ...EMPTY_CATALOGS };
  catalogsLoading = true;
  catalogError = '';

  readonly form = new FormBuilder().nonNullable.group({
    recordDate: [''],
    family: [''],
    topIssue: [''],
    category: [''],
    failureQty: [''],
    buildQty: [''],
    frPercentage: [''],
    returnYesQty: [''],
    returnNoQty: [''],
    majorPart: [''],
    repairResult: [''],
    failureFactor: [''],
    failPicture: [''],
    evidencePicture: [''],
    actions: [''],
  }, { validators: returnQuantitiesValidator });

  constructor(private readonly repairReportsApi: RepairReportsApiService) {
    this.form.controls.failureQty.valueChanges.subscribe(() => {
      this.updateFrPercentage();
      this.updateReturnNoQty();
    });
    this.form.controls.buildQty.valueChanges.subscribe(() => this.updateFrPercentage());
    this.form.controls.returnYesQty.valueChanges.subscribe(() => this.updateReturnNoQty());
    this.loadCatalogs();
  }

  get familyOptions(): string[] { return this.withCurrentValue(this.catalogs.families, this.form.controls.family.value); }
  get topIssueOptions(): string[] { return this.withCurrentValue(this.catalogs.topIssues, this.form.controls.topIssue.value); }
  get categoryOptions(): string[] { return this.withCurrentValue(this.catalogs.categories, this.form.controls.category.value); }
  get majorPartOptions(): string[] { return this.withCurrentValue(this.catalogs.majorParts, this.form.controls.majorPart.value); }
  get failureFactorOptions(): string[] { return this.withCurrentValue(this.catalogs.failureFactors, this.form.controls.failureFactor.value); }
  get failPicturePreviewUrl(): string { return this.failPicturePreview || this.repair?.failPicture || ''; }
  get evidencePicturePreviewUrl(): string { return this.evidencePicturePreview || this.repair?.evidencePicture || ''; }
  get failPicturePreviewUrls(): string[] { return [...this.existingFailPictures, ...this.failPicturePreviews]; }
  get evidencePicturePreviewUrls(): string[] { return [...this.existingEvidencePictures, ...this.evidencePicturePreviews]; }
  get failPictureCount(): number { return Math.min(10, this.existingFailPictures.length + this.failPictureFiles.length); }
  get evidencePictureCount(): number { return Math.min(10, this.existingEvidencePictures.length + this.evidencePictureFiles.length); }

  get isReturnQuantityInvalid(): boolean {
    const touched = this.form.controls.returnYesQty.touched || this.form.controls.failureQty.touched;
    return this.isInvalid('returnYesQty') || (touched && this.form.hasError('returnYesExceedsFailureQty'));
  }

  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && control.touched;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['repair']) return;

    this.failPictureFiles = [];
    this.evidencePictureFiles = [];
    this.failPicturePreview = '';
    this.evidencePicturePreview = '';
    this.failPicturePreviews = [];
    this.evidencePicturePreviews = [];
    this.failPictureIndex = 0;
    this.evidencePictureIndex = 0;
    this.existingFailPictures = [...(this.repair?.failPictures ?? (this.repair?.failPicture ? [this.repair.failPicture] : []))];
    this.existingEvidencePictures = [...(this.repair?.evidencePictures ?? (this.repair?.evidencePicture ? [this.repair.evidencePicture] : []))];
    this.form.reset({
      recordDate: this.repair?.recordDate ?? this.defaultRecordDate(),
      family: this.repair?.family ?? '',
      topIssue: this.repair?.topIssue ?? '',
      failureQty: this.repair ? String(this.repair.failureQty) : '',
      buildQty: this.repair ? String(this.repair.buildQty) : '',
      frPercentage: this.calculateFrPercentage(
        this.repair?.failureQty ?? '',
        this.repair?.buildQty ?? '',
      ),
      category: this.repair?.category ?? '',
      returnYesQty: this.repair ? String(this.repair.returnYesQty ?? 0) : '',
      returnNoQty: this.repair ? String(this.repair.returnNoQty ?? 0) : '',
      failPicture: this.repair?.failPicture ?? '',
      majorPart: this.repair?.majorPart ?? '',
      repairResult: this.repair?.repairResult ?? '',
      failureFactor: this.repair?.failureFactor ?? '',
      actions: this.repair?.actions ?? '',
      evidencePicture: this.repair?.evidencePicture ?? '',
    });
    this.updateFrPercentage();
    this.updateReturnNoQty();
  }

  onFileSelected(event: Event, field: 'failPicture' | 'evidencePicture'): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const file = files[0] ?? null;
    const existingValue = field === 'failPicture' ? this.repair?.failPicture ?? '' : this.repair?.evidencePicture ?? '';

    if (field === 'failPicture') {
      this.failPictureFiles = [...this.failPictureFiles, ...files].slice(0, 10);
      this.form.controls.failPicture.setValue(this.failPictureFiles.map((item) => item.name).join(', ') || existingValue);
      this.form.controls.failPicture.markAsTouched();
    } else {
      this.evidencePictureFiles = [...this.evidencePictureFiles, ...files].slice(0, 10);
      this.form.controls.evidencePicture.setValue(this.evidencePictureFiles.map((item) => item.name).join(', ') || existingValue);
      this.form.controls.evidencePicture.markAsTouched();
    }

    if (!file) {
      this.setPreview(field, '');
      return;
    }

    files.forEach((selectedFile) => {
      const reader = new FileReader();
      reader.onload = () => {
        const preview = typeof reader.result === 'string' ? reader.result : '';
        if (!preview) return;
        if (field === 'failPicture') this.failPicturePreviews = [...this.failPicturePreviews, preview];
        else this.evidencePicturePreviews = [...this.evidencePicturePreviews, preview];
      };
      reader.readAsDataURL(selectedFile);
    });
  }

  submit(): void {
    const value = this.form.getRawValue();
    const failureQty = Number(value.failureQty || this.repair?.failureQty || 0);
    const buildQty = Number(value.buildQty || this.repair?.buildQty || 0);
    const frPercentage = Number(this.calculateFrPercentage(failureQty, buildQty));

    this.save.emit({
      recordDate: value.recordDate,
      family: value.family,
      topIssue: value.topIssue,
      category: value.category,
      failureQty: this.repair && this.repair.failureQty < 1 ? undefined : failureQty,
      buildQty: this.repair && this.repair.buildQty < 1 ? undefined : buildQty,
      frPercentage: this.repair && this.repair.frPercentage < 0.01 ? undefined : frPercentage,
      returnYesQty: Number(value.returnYesQty),
      failPicture: JSON.stringify(this.existingFailPictures),
      majorPart: value.majorPart,
      repairResult: value.repairResult,
      failureFactor: value.failureFactor,
      actions: value.actions,
      evidencePicture: JSON.stringify(this.existingEvidencePictures),
      failPictureFiles: this.failPictureFiles,
      evidencePictureFiles: this.evidencePictureFiles,
    });
  }

  scrollGallery(event: Event, gallery: HTMLElement, direction: number): void {
    event.preventDefault();
    event.stopPropagation();
    gallery.scrollBy({ left: direction * gallery.clientWidth, behavior: 'smooth' });
  }

  updateGalleryIndex(event: Event, field: 'failPicture' | 'evidencePicture'): void {
    const gallery = event.currentTarget as HTMLElement;
    const index = gallery.clientWidth ? Math.round(gallery.scrollLeft / gallery.clientWidth) : 0;
    if (field === 'failPicture') this.failPictureIndex = index;
    else this.evidencePictureIndex = index;
  }

  removeImage(event: Event, field: 'failPicture' | 'evidencePicture'): void {
    event.preventDefault();
    event.stopPropagation();
    const index = field === 'failPicture' ? this.failPictureIndex : this.evidencePictureIndex;
    const existing = field === 'failPicture' ? this.existingFailPictures : this.existingEvidencePictures;
    if (index < existing.length) existing.splice(index, 1);
    else {
      const pendingIndex = index - existing.length;
      if (field === 'failPicture') { this.failPictureFiles.splice(pendingIndex, 1); this.failPicturePreviews.splice(pendingIndex, 1); }
      else { this.evidencePictureFiles.splice(pendingIndex, 1); this.evidencePicturePreviews.splice(pendingIndex, 1); }
    }
    const length = field === 'failPicture' ? this.failPicturePreviewUrls.length : this.evidencePicturePreviewUrls.length;
    if (field === 'failPicture') this.failPictureIndex = Math.max(0, Math.min(index, length - 1));
    else this.evidencePictureIndex = Math.max(0, Math.min(index, length - 1));
  }

  private updateFrPercentage(): void {
    const frPercentage = this.calculateFrPercentage(
      this.form.controls.failureQty.value,
      this.form.controls.buildQty.value,
    );
    this.form.controls.frPercentage.setValue(frPercentage, { emitEvent: false });
  }

  private updateReturnNoQty(): void {
    const failureRaw = this.form.controls.failureQty.value;
    const returnYesRaw = this.form.controls.returnYesQty.value;
    const failureQty = Number(failureRaw);
    const returnYesQty = Number(returnYesRaw);
    const hasValues = failureRaw !== '' && returnYesRaw !== '';
    const isValid = hasValues
      && Number.isInteger(failureQty)
      && Number.isInteger(returnYesQty)
      && failureQty > 0
      && returnYesQty >= 0
      && returnYesQty <= failureQty;

    this.form.controls.returnNoQty.setValue(
      isValid ? String(failureQty - returnYesQty) : '',
      { emitEvent: false },
    );
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private calculateFrPercentage(failureQtyValue: string | number, buildQtyValue: string | number): string {
    const failureQty = Number(failureQtyValue);
    const buildQty = Number(buildQtyValue);

    if (!Number.isFinite(failureQty) || !Number.isFinite(buildQty) || failureQty <= 0 || buildQty <= 0) {
      return '';
    }

    const frPercentage = Number(((failureQty / buildQty) * 100).toFixed(2));
    return frPercentage > 0 ? frPercentage.toFixed(2) : '';
  }

  private defaultRecordDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private loadCatalogs(): void {
    this.repairReportsApi.getCatalogs().subscribe({
      next: (catalogs) => { this.catalogs = catalogs; this.catalogsLoading = false; },
      error: () => { this.catalogs = { ...EMPTY_CATALOGS }; this.catalogsLoading = false; this.catalogError = 'No fue posible cargar los catálogos. Verifica la conexión e inténtalo de nuevo.'; },
    });
  }

  private withCurrentValue(options: string[], currentValue: string): string[] {
    const current = currentValue.trim();
    return !current || options.includes(current) ? options : [current, ...options];
  }

  private setPreview(field: 'failPicture' | 'evidencePicture', value: string): void {
    if (field === 'failPicture') this.failPicturePreview = value;
    else this.evidencePicturePreview = value;
  }
}
