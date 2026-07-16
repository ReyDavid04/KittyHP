import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RepairReport, RepairUpsertPayload } from '../../../core/models/repair-report.model';

@Component({
  selector: 'app-repair-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form class="card" [formGroup]="form" (ngSubmit)="submit()">
      <div class="header">
        <h2>{{ repair ? 'Editar reporte' : 'Nuevo reporte' }}</h2>
        <button *ngIf="repair" type="button" class="ghost" (click)="cancel.emit()">Cancelar edición</button>
      </div>
      <label>
        Fecha
        <input type="date" formControlName="recordDate">
      </label>
      <label>
        Top issue
        <input type="text" formControlName="topIssue">
      </label>
      <label>
        Failure qty
        <input type="number" formControlName="failureQty">
      </label>
      <label>
        Build qty
        <input type="number" formControlName="buildQty">
      </label>
      <label>
        F/R %
        <input type="number" step="0.01" formControlName="frPercentage">
      </label>
      <label>
        Category
        <input type="text" formControlName="category">
      </label>
      <label>
        Return
        <input type="text" formControlName="returnStatus">
      </label>
      <label>
        Fail picture
        <input type="file" accept="image/*" (change)="onFileSelected($event, 'failPicture')">
        <span *ngIf="repair?.failPicture && !failPictureFile" class="hint">Actual: <a [href]="repair!.failPicture!" target="_blank">ver imagen</a></span>
      </label>
      <label>
        Major part
        <input type="text" formControlName="majorPart">
      </label>
      <label>
        Repair result
        <input type="text" formControlName="repairResult">
      </label>
      <label>
        Failure factor
        <input type="text" formControlName="failureFactor">
      </label>
      <label>
        Actions
        <textarea rows="4" formControlName="actions"></textarea>
      </label>
      <label>
        Picture
        <input type="file" accept="image/*" (change)="onFileSelected($event, 'evidencePicture')">
        <span *ngIf="repair?.evidencePicture && !evidencePictureFile" class="hint">Actual: <a [href]="repair!.evidencePicture!" target="_blank">ver imagen</a></span>
      </label>
      <div class="actions">
        <button type="submit">{{ repair ? 'Guardar cambios' : 'Guardar reporte' }}</button>
      </div>
    </form>
  `,
  styles: [
    `
      .card {
        display: grid;
        gap: 12px;
        padding: 20px;
        border: 1px solid var(--border);
        border-radius: 20px;
        background: var(--surface);
      }

      .header,
      .actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      label {
        display: grid;
        gap: 6px;
        font-size: 0.95rem;
      }

      input {
        padding: 12px 14px;
        border: 1px solid var(--border);
        border-radius: 12px;
      }

      textarea {
        padding: 12px 14px;
        border: 1px solid var(--border);
        border-radius: 12px;
        resize: vertical;
      }

      button {
        border: 0;
        border-radius: 12px;
        background: var(--primary);
        color: #fff;
        padding: 12px 16px;
        cursor: pointer;
      }

      .ghost {
        background: transparent;
        color: var(--primary);
        border: 1px solid var(--border);
      }

      .hint {
        color: var(--muted);
        font-size: 0.9rem;
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

