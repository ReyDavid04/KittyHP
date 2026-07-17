import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RepairReport, RepairUpsertPayload } from '../../../core/models/repair-report.model';

@Component({
  selector: 'app-repair-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form class="form-shell" [formGroup]="form" (ngSubmit)="submit()">
      <div class="form-body">
        <div class="form-grid">
          <label class="field grid-date">
            <span>Date <b>*</b></span>
            <input
              type="date"
              formControlName="recordDate"
              [class.invalid]="form.controls.recordDate.invalid && form.controls.recordDate.touched"
            >
            <small *ngIf="form.controls.recordDate.invalid && form.controls.recordDate.touched">
              La fecha es obligatoria.
            </small>
          </label>

          <label class="field grid-top-issue">
            <span>Top issue <b>*</b></span>
            <input
              type="text"
              formControlName="topIssue"
              placeholder="Describe la falla principal"
              [class.invalid]="form.controls.topIssue.invalid && form.controls.topIssue.touched"
            >
            <small *ngIf="form.controls.topIssue.invalid && form.controls.topIssue.touched">
              El top issue es obligatorio.
            </small>
          </label>

          <label class="field grid-failure-qty">
            <span>Failure qty <b>*</b></span>
            <input
              type="number"
              min="0"
              formControlName="failureQty"
              [class.invalid]="form.controls.failureQty.invalid && form.controls.failureQty.touched"
            >
          </label>

          <label class="field grid-build-qty">
            <span>Build qty <b>*</b></span>
            <input
              type="number"
              min="0"
              formControlName="buildQty"
              [class.invalid]="form.controls.buildQty.invalid && form.controls.buildQty.touched"
            >
          </label>

          <label class="field grid-fr">
            <span>F/R <b>*</b></span>
            <div class="suffix-input">
              <input
                type="number"
                min="0"
                step="0.01"
                formControlName="frPercentage"
                [class.invalid]="form.controls.frPercentage.invalid && form.controls.frPercentage.touched"
              >
              <span>%</span>
            </div>
          </label>

          <label class="field grid-category">
            <span>Category <b>*</b></span>
            <input
              type="text"
              formControlName="category"
              placeholder="Ej. MB, LCD, Cover"
              [class.invalid]="form.controls.category.invalid && form.controls.category.touched"
            >
            <small *ngIf="form.controls.category.invalid && form.controls.category.touched">
              La categoría es obligatoria.
            </small>
          </label>

          <label class="field grid-return">
            <span>Return</span>
            <input type="text" formControlName="returnStatus" placeholder="YES, NO o estatus">
          </label>

          <label class="upload-zone grid-fail-picture" [class.has-file]="failPicturePreviewUrl">
            <input type="file" accept="image/*" (change)="onFileSelected($event, 'failPicture')">

            <ng-container *ngIf="failPicturePreviewUrl as preview; else failPictureEmpty">
              <span class="image-preview">
                <img [src]="preview" alt="Vista previa de la imagen de falla">
                <span class="image-change">Cambiar imagen</span>
              </span>
              <span class="upload-content">
                <strong>Fail picture</strong>
                <span class="file-name" *ngIf="failPictureFile">{{ failPictureFile.name }}</span>
                <span *ngIf="!failPictureFile">Imagen actual del reporte</span>
                <span>Haz clic en el recuadro para reemplazarla.</span>
              </span>
            </ng-container>

            <ng-template #failPictureEmpty>
              <span class="upload-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v6h14v-6"></path>
                </svg>
              </span>
              <span class="upload-content">
                <strong>Fail picture</strong>
                <span>Selecciona una imagen de la falla</span>
              </span>
            </ng-template>
          </label>

          <label class="field grid-major-part">
            <span>Major part</span>
            <input type="text" formControlName="majorPart" placeholder="Parte principal afectada">
          </label>

          <label class="field grid-repair-result">
            <span>Repair result</span>
            <input type="text" formControlName="repairResult" placeholder="Resultado de la reparación">
          </label>

          <label class="field grid-half">
            <span>Failure factor</span>
            <textarea
              rows="4"
              formControlName="failureFactor"
              placeholder="Describe el factor o causa de la falla"
            ></textarea>
          </label>

          <label class="field grid-half">
            <span>Actions</span>
            <textarea
              rows="4"
              formControlName="actions"
              placeholder="Detalla las acciones realizadas"
            ></textarea>
          </label>

          <label class="upload-zone grid-full" [class.has-file]="evidencePicturePreviewUrl">
            <input type="file" accept="image/*" (change)="onFileSelected($event, 'evidencePicture')">

            <ng-container *ngIf="evidencePicturePreviewUrl as preview; else evidencePictureEmpty">
              <span class="image-preview">
                <img [src]="preview" alt="Vista previa de la evidencia final">
                <span class="image-change">Cambiar imagen</span>
              </span>
              <span class="upload-content">
                <strong>Evidence</strong>
                <span class="file-name" *ngIf="evidencePictureFile">{{ evidencePictureFile.name }}</span>
                <span *ngIf="!evidencePictureFile">Evidencia actual del reporte</span>
                <span>Haz clic en el recuadro para reemplazarla.</span>
              </span>
            </ng-container>

            <ng-template #evidencePictureEmpty>
              <span class="upload-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v6h14v-6"></path>
                </svg>
              </span>
              <span class="upload-content">
                <strong>Evidence</strong>
                <span>Selecciona la evidencia final de la reparación</span>
              </span>
            </ng-template>
          </label>
        </div>
      </div>

      <footer class="form-actions">
        <div>
          <strong>{{ repair ? 'Actualización de reporte' : 'Nuevo reporte de reparación' }}</strong>
          <span>Los campos marcados con * son obligatorios.</span>
        </div>

        <div class="action-buttons">
          <button type="button" class="cancel-button" (click)="cancel.emit()">Cancelar</button>
          <button type="submit" class="save-button" [disabled]="form.invalid">
            <span aria-hidden="true">✓</span>
            {{ repair ? 'Guardar cambios' : 'Guardar reporte' }}
          </button>
        </div>
      </footer>
    </form>
  `,
  styles: [
    `
      .form-shell {
        overflow: visible;
        background: transparent;
      }

      .form-body {
        padding: 32px 36px 38px;
      }

      .form-grid {
        display: grid;
        grid-template-columns: repeat(12, minmax(0, 1fr));
        gap: 22px;
        align-items: start;
      }

      .grid-date,
      .grid-failure-qty,
      .grid-build-qty,
      .grid-fr {
        grid-column: span 2;
      }

      .grid-top-issue {
        grid-column: span 4;
      }

      .grid-category {
        grid-column: span 3;
      }

      .grid-return {
        grid-column: span 2;
      }

      .grid-fail-picture {
        grid-column: span 7;
      }

      .grid-major-part {
        grid-column: span 3;
      }

      .grid-repair-result {
        grid-column: span 9;
      }

      .grid-half {
        grid-column: span 6;
      }

      .grid-full {
        grid-column: 1 / -1;
      }

      .field {
        display: grid;
        align-content: start;
        gap: 8px;
        min-width: 0;
        color: #455267;
        font-size: 0.76rem;
        font-weight: 700;
      }

      .field > span:first-child {
        min-height: 18px;
      }

      .field b {
        color: var(--danger);
        font-weight: 700;
      }

      .field input,
      .field textarea {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 10px;
        color: var(--text);
        font-size: 0.82rem;
        font-weight: 450;
        background: var(--surface-subtle);
        transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
      }

      .field input {
        height: 46px;
        padding: 0 14px;
      }

      .field textarea {
        min-height: 118px;
        padding: 13px 14px;
        line-height: 1.5;
        resize: vertical;
      }

      .field input::placeholder,
      .field textarea::placeholder {
        color: #98a3b2;
      }

      .field input:focus,
      .field textarea:focus {
        border-color: rgba(47, 126, 199, 0.7);
        background: #fff;
        outline: none;
        box-shadow: 0 0 0 3px rgba(47, 126, 199, 0.1);
      }

      .field input.invalid,
      .field textarea.invalid {
        border-color: rgba(180, 35, 58, 0.55);
        background: #fffafb;
      }

      .field small {
        color: var(--danger);
        font-size: 0.68rem;
        font-weight: 600;
      }

      .suffix-input {
        position: relative;
        display: flex;
        align-items: center;
      }

      .suffix-input input {
        padding-right: 38px;
      }

      .suffix-input > span {
        position: absolute;
        right: 14px;
        color: var(--primary);
        font-weight: 800;
      }

      .upload-zone {
        position: relative;
        display: flex;
        align-items: center;
        gap: 20px;
        min-height: 148px;
        padding: 18px;
        overflow: hidden;
        border: 1px dashed var(--border-strong);
        border-radius: 12px;
        color: var(--text);
        background: var(--surface-subtle);
        cursor: pointer;
        transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
      }

      .upload-zone:hover {
        border-color: var(--accent);
        background: #f5f9fe;
        box-shadow: 0 0 0 3px rgba(47, 126, 199, 0.07);
      }

      .upload-zone.has-file {
        border-style: solid;
        border-color: rgba(47, 126, 199, 0.24);
        background: #fff;
      }

      .upload-zone > input {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        opacity: 0;
      }

      .upload-icon {
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        width: 46px;
        height: 46px;
        border-radius: 12px;
        color: var(--primary);
        background: var(--primary-soft);
      }

      .upload-icon svg {
        width: 21px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.7;
      }

      .image-preview {
        position: relative;
        display: block;
        flex: 0 0 210px;
        width: 210px;
        height: 118px;
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 9px;
        background: var(--surface-muted);
      }

      .image-preview img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .image-change {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        padding: 7px 10px;
        color: #fff;
        font-size: 0.68rem;
        font-weight: 750;
        text-align: center;
        background: rgba(18, 35, 55, 0.76);
        opacity: 0;
        transition: opacity 150ms ease;
      }

      .upload-zone:hover .image-change {
        opacity: 1;
      }

      .upload-content {
        display: grid;
        min-width: 0;
        gap: 5px;
        color: var(--muted);
        font-size: 0.73rem;
        line-height: 1.4;
      }

      .upload-content strong {
        color: var(--text);
        font-size: 0.84rem;
      }

      .file-name {
        overflow: hidden;
        color: var(--success);
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .form-actions {
        position: sticky;
        bottom: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 18px 36px;
        border-top: 1px solid var(--border);
        background: rgba(248, 250, 252, 0.97);
        backdrop-filter: blur(14px);
      }

      .form-actions > div:first-child {
        display: grid;
        gap: 3px;
      }

      .form-actions strong {
        font-size: 0.78rem;
      }

      .form-actions span {
        color: var(--muted);
        font-size: 0.69rem;
      }

      .action-buttons {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .action-buttons button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 40px;
        padding: 8px 15px;
        border-radius: 10px;
        font-size: 0.78rem;
        font-weight: 750;
        cursor: pointer;
      }

      .cancel-button {
        border: 1px solid var(--border);
        color: var(--text);
        background: #fff;
      }

      .save-button {
        border: 1px solid var(--primary);
        color: #fff;
        background: var(--primary);
        box-shadow: 0 7px 16px rgba(22, 76, 140, 0.18);
      }

      .save-button span {
        color: inherit;
        font-size: 0.8rem;
      }

      .save-button:disabled {
        border-color: #aeb8c5;
        background: #aeb8c5;
        box-shadow: none;
        cursor: not-allowed;
      }

      @media (max-width: 1180px) {
        .form-grid {
          grid-template-columns: repeat(6, minmax(0, 1fr));
        }

        .grid-date,
        .grid-failure-qty,
        .grid-build-qty,
        .grid-fr,
        .grid-category,
        .grid-return,
        .grid-major-part {
          grid-column: span 2;
        }

        .grid-top-issue,
        .grid-repair-result,
        .grid-half,
        .grid-fail-picture {
          grid-column: span 4;
        }

        .grid-full {
          grid-column: 1 / -1;
        }
      }

      @media (max-width: 720px) {
        .form-body {
          padding: 22px 18px 28px;
        }

        .form-grid {
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .grid-date,
        .grid-top-issue,
        .grid-failure-qty,
        .grid-build-qty,
        .grid-fr,
        .grid-category,
        .grid-return,
        .grid-fail-picture,
        .grid-major-part,
        .grid-repair-result,
        .grid-half,
        .grid-full {
          grid-column: auto;
        }

        .upload-zone {
          align-items: stretch;
          flex-direction: column;
          min-height: 0;
          padding: 14px;
        }

        .image-preview {
          flex-basis: auto;
          width: 100%;
          height: 210px;
        }

        .form-actions {
          align-items: stretch;
          flex-direction: column;
          padding: 14px 18px;
        }

        .action-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
      }
    `,
  ],
})
export class RepairFormComponent implements OnChanges {
  @Input() repair: RepairReport | null = null;
  @Output() save = new EventEmitter<RepairUpsertPayload>();
  @Output() cancel = new EventEmitter<void>();

  failPictureFile: File | null = null;
  evidencePictureFile: File | null = null;
  failPicturePreview = '';
  evidencePicturePreview = '';

  readonly form = new FormBuilder().nonNullable.group({
    recordDate: ['', Validators.required],
    topIssue: ['', Validators.required],
    category: ['', Validators.required],
    failureQty: [0, [Validators.required, Validators.min(0)]],
    buildQty: [0, [Validators.required, Validators.min(0)]],
    frPercentage: [0, [Validators.required, Validators.min(0)]],
    returnStatus: [''],
    majorPart: [''],
    repairResult: [''],
    failureFactor: [''],
    failPicture: [''],
    evidencePicture: [''],
    actions: [''],
  });

  get failPicturePreviewUrl(): string {
    return this.failPicturePreview || this.repair?.failPicture || '';
  }

  get evidencePicturePreviewUrl(): string {
    return this.evidencePicturePreview || this.repair?.evidencePicture || '';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['repair']) {
      this.failPictureFile = null;
      this.evidencePictureFile = null;
      this.failPicturePreview = '';
      this.evidencePicturePreview = '';
      this.form.reset({
        recordDate: this.repair?.recordDate ?? '',
        topIssue: this.repair?.topIssue ?? '',
        failureQty: this.repair?.failureQty ?? 0,
        buildQty: this.repair?.buildQty ?? 0,
        frPercentage: this.repair?.frPercentage ?? 0,
        category: this.repair?.category ?? '',
        returnStatus: this.repair?.returnStatus ?? '',
        failPicture: this.repair?.failPicture ?? '',
        majorPart: this.repair?.majorPart ?? '',
        repairResult: this.repair?.repairResult ?? '',
        failureFactor: this.repair?.failureFactor ?? '',
        actions: this.repair?.actions ?? '',
        evidencePicture: this.repair?.evidencePicture ?? '',
      });
    }
  }

  onFileSelected(event: Event, field: 'failPicture' | 'evidencePicture'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (field === 'failPicture') {
      this.failPictureFile = file;
    } else {
      this.evidencePictureFile = file;
    }

    if (!file) {
      this.setPreview(field, '');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => this.setPreview(field, typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => this.setPreview(field, '');
    reader.readAsDataURL(file);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();

    this.save.emit({
      recordDate: formValue.recordDate,
      topIssue: formValue.topIssue,
      category: formValue.category,
      failureQty: Number(formValue.failureQty),
      buildQty: Number(formValue.buildQty),
      frPercentage: Number(formValue.frPercentage),
      returnStatus: formValue.returnStatus || null,
      failPicture: this.repair?.failPicture ?? null,
      majorPart: formValue.majorPart || null,
      repairResult: formValue.repairResult || null,
      failureFactor: formValue.failureFactor || null,
      actions: formValue.actions || null,
      evidencePicture: this.repair?.evidencePicture ?? null,
      failPictureFile: this.failPictureFile,
      evidencePictureFile: this.evidencePictureFile,
    });
  }

  private setPreview(field: 'failPicture' | 'evidencePicture', value: string): void {
    if (field === 'failPicture') {
      this.failPicturePreview = value;
    } else {
      this.evidencePicturePreview = value;
    }
  }
}
