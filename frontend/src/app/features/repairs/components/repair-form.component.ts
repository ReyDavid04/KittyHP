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
      <section class="form-section">
        <div class="section-heading">
          <span class="section-number">01</span>
          <div>
            <h3>Información general</h3>
            <p>Datos principales para identificar y clasificar el reporte.</p>
          </div>
        </div>

        <div class="form-grid general-grid">
          <label class="field">
            <span>Fecha <b>*</b></span>
            <input type="date" formControlName="recordDate" [class.invalid]="form.controls.recordDate.invalid && form.controls.recordDate.touched">
            <small *ngIf="form.controls.recordDate.invalid && form.controls.recordDate.touched">La fecha es obligatoria.</small>
          </label>

          <label class="field field-wide">
            <span>Top issue <b>*</b></span>
            <input type="text" formControlName="topIssue" placeholder="Describe la falla principal" [class.invalid]="form.controls.topIssue.invalid && form.controls.topIssue.touched">
            <small *ngIf="form.controls.topIssue.invalid && form.controls.topIssue.touched">El top issue es obligatorio.</small>
          </label>

          <label class="field">
            <span>Categoría <b>*</b></span>
            <input type="text" formControlName="category" placeholder="Ej. MB, LCD, Cover" [class.invalid]="form.controls.category.invalid && form.controls.category.touched">
            <small *ngIf="form.controls.category.invalid && form.controls.category.touched">La categoría es obligatoria.</small>
          </label>

          <label class="field">
            <span>Return</span>
            <input type="text" formControlName="returnStatus" placeholder="YES, NO o estatus">
          </label>
        </div>
      </section>

      <section class="form-section">
        <div class="section-heading">
          <span class="section-number">02</span>
          <div>
            <h3>Información de producción</h3>
            <p>Cantidades utilizadas para dar contexto al failure rate.</p>
          </div>
        </div>

        <div class="form-grid metrics-grid">
          <label class="field metric-field">
            <span>Failure quantity <b>*</b></span>
            <input type="number" min="0" formControlName="failureQty" [class.invalid]="form.controls.failureQty.invalid && form.controls.failureQty.touched">
          </label>

          <label class="field metric-field">
            <span>Build quantity <b>*</b></span>
            <input type="number" min="0" formControlName="buildQty" [class.invalid]="form.controls.buildQty.invalid && form.controls.buildQty.touched">
          </label>

          <label class="field metric-field accent-field">
            <span>F/R % <b>*</b></span>
            <div class="suffix-input">
              <input type="number" min="0" step="0.01" formControlName="frPercentage" [class.invalid]="form.controls.frPercentage.invalid && form.controls.frPercentage.touched">
              <span>%</span>
            </div>
          </label>
        </div>
      </section>

      <section class="form-section">
        <div class="section-heading">
          <span class="section-number">03</span>
          <div>
            <h3>Diagnóstico y reparación</h3>
            <p>Documenta la parte involucrada, la causa y el resultado obtenido.</p>
          </div>
        </div>

        <div class="form-grid diagnosis-grid">
          <label class="field">
            <span>Major part</span>
            <input type="text" formControlName="majorPart" placeholder="Parte principal afectada">
          </label>

          <label class="field field-wide">
            <span>Repair result</span>
            <input type="text" formControlName="repairResult" placeholder="Resultado de la reparación">
          </label>

          <label class="field field-full">
            <span>Failure factor</span>
            <textarea rows="3" formControlName="failureFactor" placeholder="Describe el factor o causa de la falla"></textarea>
          </label>

          <label class="field field-full">
            <span>Acciones realizadas</span>
            <textarea rows="4" formControlName="actions" placeholder="Detalla las acciones ejecutadas y el seguimiento requerido"></textarea>
          </label>
        </div>
      </section>

      <section class="form-section">
        <div class="section-heading">
          <span class="section-number">04</span>
          <div>
            <h3>Evidencia fotográfica</h3>
            <p>Agrega imágenes claras de la falla y del resultado final.</p>
          </div>
        </div>

        <div class="upload-grid">
          <label class="upload-zone" [class.has-file]="failPictureFile || repair?.failPicture">
            <input type="file" accept="image/*" (change)="onFileSelected($event, 'failPicture')">
            <span class="upload-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v6h14v-6"></path></svg>
            </span>
            <strong>Fail picture</strong>
            <span class="upload-copy" *ngIf="!failPictureFile">Selecciona o arrastra una imagen de la falla</span>
            <span class="file-name" *ngIf="failPictureFile">{{ failPictureFile.name }}</span>
            <a *ngIf="repair?.failPicture && !failPictureFile" [href]="repair!.failPicture!" target="_blank" rel="noopener" (click)="$event.stopPropagation()">Ver imagen actual</a>
          </label>

          <label class="upload-zone" [class.has-file]="evidencePictureFile || repair?.evidencePicture">
            <input type="file" accept="image/*" (change)="onFileSelected($event, 'evidencePicture')">
            <span class="upload-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v6h14v-6"></path></svg>
            </span>
            <strong>Evidencia final</strong>
            <span class="upload-copy" *ngIf="!evidencePictureFile">Selecciona o arrastra la evidencia de reparación</span>
            <span class="file-name" *ngIf="evidencePictureFile">{{ evidencePictureFile.name }}</span>
            <a *ngIf="repair?.evidencePicture && !evidencePictureFile" [href]="repair!.evidencePicture!" target="_blank" rel="noopener" (click)="$event.stopPropagation()">Ver imagen actual</a>
          </label>
        </div>
      </section>

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
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: rgba(255, 255, 255, 0.96);
        box-shadow: var(--shadow-md);
      }

      .form-section {
        display: grid;
        grid-template-columns: minmax(220px, 290px) minmax(0, 1fr);
        gap: 34px;
        padding: 28px 30px;
        border-bottom: 1px solid var(--border);
      }

      .section-heading {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .section-number {
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 11px;
        color: var(--primary);
        font-size: 0.69rem;
        font-weight: 800;
        background: var(--primary-soft);
      }

      .section-heading h3 {
        margin: 1px 0 5px;
        font-size: 0.95rem;
        letter-spacing: -0.01em;
      }

      .section-heading p {
        max-width: 250px;
        margin: 0;
        color: var(--muted);
        font-size: 0.76rem;
        line-height: 1.55;
      }

      .form-grid {
        display: grid;
        gap: 18px;
      }

      .general-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .metrics-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .diagnosis-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      .field-wide {
        grid-column: span 2;
      }

      .field-full {
        grid-column: 1 / -1;
      }

      .field {
        display: grid;
        align-content: start;
        gap: 7px;
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
        border-radius: 11px;
        color: var(--text);
        font-size: 0.82rem;
        font-weight: 450;
        background: var(--surface-subtle);
        transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
      }

      .field input {
        height: 43px;
        padding: 0 12px;
      }

      .field textarea {
        min-height: 86px;
        padding: 11px 12px;
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

      .metric-field {
        padding: 15px;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: var(--surface-subtle);
      }

      .metric-field input {
        background: #fff;
      }

      .accent-field {
        border-color: rgba(47, 126, 199, 0.24);
        background: var(--primary-soft);
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
        right: 12px;
        color: var(--primary);
        font-weight: 800;
      }

      .upload-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .upload-zone {
        position: relative;
        display: grid;
        place-items: center;
        min-height: 190px;
        padding: 22px;
        border: 1px dashed var(--border-strong);
        border-radius: 16px;
        color: var(--text);
        text-align: center;
        background: var(--surface-subtle);
        cursor: pointer;
        transition: border-color 150ms ease, background 150ms ease, transform 150ms ease;
      }

      .upload-zone:hover {
        border-color: var(--accent);
        background: #f5f9fe;
        transform: translateY(-1px);
      }

      .upload-zone.has-file {
        border-style: solid;
        border-color: rgba(20, 125, 100, 0.3);
        background: var(--success-soft);
      }

      .upload-zone input {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        opacity: 0;
      }

      .upload-icon {
        display: grid;
        place-items: center;
        width: 44px;
        height: 44px;
        margin-bottom: 10px;
        border-radius: 14px;
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

      .upload-zone strong {
        margin-bottom: 4px;
        font-size: 0.84rem;
      }

      .upload-copy,
      .file-name {
        max-width: 100%;
        overflow: hidden;
        color: var(--muted);
        font-size: 0.72rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .file-name {
        color: var(--success);
        font-weight: 700;
      }

      .upload-zone a {
        margin-top: 9px;
        color: var(--primary);
        font-size: 0.72rem;
        font-weight: 700;
        text-decoration: none;
      }

      .upload-zone a:hover {
        text-decoration: underline;
      }

      .form-actions {
        position: sticky;
        bottom: 0;
        z-index: 10;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 17px 30px;
        background: rgba(248, 250, 252, 0.96);
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
        min-height: 42px;
        padding: 9px 16px;
        border-radius: 11px;
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

      @media (max-width: 1080px) {
        .form-section {
          grid-template-columns: 1fr;
          gap: 22px;
        }

        .section-heading p {
          max-width: none;
        }
      }

      @media (max-width: 760px) {
        .form-section {
          padding: 22px 18px;
        }

        .general-grid,
        .metrics-grid,
        .diagnosis-grid,
        .upload-grid {
          grid-template-columns: 1fr;
        }

        .field-wide,
        .field-full {
          grid-column: auto;
        }

        .form-actions {
          align-items: stretch;
          flex-direction: column;
          padding: 15px 18px;
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

  readonly form = new FormBuilder().nonNullable.group({
    recordDate: ['', Validators.required],
    topIssue: ['', Validators.required],
    category: ['', Validators.required],
    failureQty: [0, Validators.required],
    buildQty: [0, Validators.required],
    frPercentage: [0, Validators.required],
    returnStatus: [''],
    majorPart: [''],
    repairResult: [''],
    failureFactor: [''],
    failPicture: [''],
    evidencePicture: [''],
    actions: [''],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['repair']) {
      this.failPictureFile = null;
      this.evidencePictureFile = null;
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
}
