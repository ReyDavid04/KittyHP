import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-repair-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form class="card" [formGroup]="form">
      <h2>Nuevo reporte</h2>
      <label>
        Fecha
        <input type="date" formControlName="recordDate">
      </label>
      <label>
        Top issue
        <input type="text" formControlName="topIssue">
      </label>
      <label>
        Categoría
        <input type="text" formControlName="category">
      </label>
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
    `,
  ],
})
export class RepairFormComponent {
  readonly form = new FormBuilder().nonNullable.group({
    recordDate: ['', Validators.required],
    topIssue: ['', Validators.required],
    category: ['', Validators.required],
  });
}
