import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RepairReport } from '../../../core/models/repair-report.model';

export interface RepairColumnFilters {
  recordDate: string;
  topIssue: string;
  failureQty: string;
  buildQty: string;
  frPercentage: string;
  category: string;
  returnStatus: string;
  failPicture: string;
  majorPart: string;
  repairResult: string;
  failureFactor: string;
  actions: string;
  evidencePicture: string;
}

@Component({
  selector: 'app-repair-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <p *ngIf="!repairs?.length" class="empty">Aún no hay registros cargados.</p>
      <div class="table-wrap" *ngIf="repairs?.length">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Top issue</th>
              <th>Failure q'ty</th>
              <th>Build q'ty</th>
              <th>F/R</th>
              <th>Categoría</th>
              <th>Return</th>
              <th>Fail picture</th>
              <th>MajorPart</th>
              <th>repair result</th>
              <th>failure fact</th>
              <th>Actions</th>
              <th>Picture</th>
              <th>Acciones</th>
            </tr>
            <tr class="filters-row">
              <th><input [value]="filters.recordDate" (input)="setFilter('recordDate', $any($event.target).value)" placeholder="Filtrar"></th>
              <th><input [value]="filters.topIssue" (input)="setFilter('topIssue', $any($event.target).value)" placeholder="Filtrar"></th>
              <th><input [value]="filters.failureQty" (input)="setFilter('failureQty', $any($event.target).value)" placeholder="Filtrar"></th>
              <th><input [value]="filters.buildQty" (input)="setFilter('buildQty', $any($event.target).value)" placeholder="Filtrar"></th>
              <th><input [value]="filters.frPercentage" (input)="setFilter('frPercentage', $any($event.target).value)" placeholder="Filtrar"></th>
              <th><input [value]="filters.category" (input)="setFilter('category', $any($event.target).value)" placeholder="Filtrar"></th>
              <th><input [value]="filters.returnStatus" (input)="setFilter('returnStatus', $any($event.target).value)" placeholder="Filtrar"></th>
              <th><input [value]="filters.failPicture" (input)="setFilter('failPicture', $any($event.target).value)" placeholder="Filtrar"></th>
              <th><input [value]="filters.majorPart" (input)="setFilter('majorPart', $any($event.target).value)" placeholder="Filtrar"></th>
              <th><input [value]="filters.repairResult" (input)="setFilter('repairResult', $any($event.target).value)" placeholder="Filtrar"></th>
              <th><input [value]="filters.failureFactor" (input)="setFilter('failureFactor', $any($event.target).value)" placeholder="Filtrar"></th>
              <th><input [value]="filters.actions" (input)="setFilter('actions', $any($event.target).value)" placeholder="Filtrar"></th>
              <th><input [value]="filters.evidencePicture" (input)="setFilter('evidencePicture', $any($event.target).value)" placeholder="Filtrar"></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let repair of repairs">
              <td>{{ repair.recordDate }}</td>
              <td>{{ repair.topIssue }}</td>
              <td>{{ repair.failureQty }}</td>
              <td>{{ repair.buildQty }}</td>
              <td>{{ repair.frPercentage }}%</td>
              <td>{{ repair.category }}</td>
              <td>{{ repair.returnStatus || 'Sin retorno' }}</td>
              <td>
                <a *ngIf="repair.failPicture; else noFail" [href]="repair.failPicture" target="_blank" rel="noopener">
                  <img [src]="repair.failPicture" alt="Fail picture" class="thumb">
                </a>
                <ng-template #noFail><span class="subtle">Sin imagen</span></ng-template>
              </td>
              <td>{{ repair.majorPart || '-' }}</td>
              <td>{{ repair.repairResult || '-' }}</td>
              <td>{{ repair.failureFactor || '-' }}</td>
              <td>{{ repair.actions || '-' }}</td>
              <td>
                <a *ngIf="repair.evidencePicture; else noEvidence" [href]="repair.evidencePicture" target="_blank" rel="noopener">
                  <img [src]="repair.evidencePicture" alt="Picture" class="thumb">
                </a>
                <ng-template #noEvidence><span class="subtle">Sin imagen</span></ng-template>
              </td>
              <td>
                <div class="actions">
                  <button type="button" (click)="edit.emit(repair)">Editar</button>
                  <button type="button" class="danger" (click)="remove.emit(repair.id)">Eliminar</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: [
    `
      .card {
        padding: 20px;
        border: 1px solid var(--border);
        border-radius: 20px;
        background: var(--surface);
      }

      .table-wrap {
        overflow-x: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 1680px;
      }

      th,
      td {
        padding: 12px;
        border-top: 1px solid var(--border);
        vertical-align: top;
        text-align: left;
      }

      th {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--muted);
        border-top: 0;
      }

      .filters-row th {
        padding-top: 4px;
        padding-bottom: 12px;
      }

      .filters-row input {
        width: 100%;
        min-width: 88px;
        padding: 8px 10px;
        border: 1px solid var(--border);
        border-radius: 10px;
        font-size: 0.85rem;
      }

      .actions {
        display: flex;
        gap: 8px;
      }

      button {
        border: 1px solid var(--border);
        border-radius: 10px;
        background: transparent;
        padding: 8px 12px;
        cursor: pointer;
      }

      .danger {
        border-color: #ef9a9a;
        color: #b00020;
      }

      .subtle {
        color: var(--muted);
        font-size: 0.9rem;
      }

      .thumb {
        width: 72px;
        height: 72px;
        object-fit: cover;
        border-radius: 12px;
        border: 1px solid var(--border);
      }

      .empty {
        color: var(--muted);
      }
    `,
  ],
})
export class RepairListComponent {
  @Input() repairs: RepairReport[] | null = [];
  @Input() filters: RepairColumnFilters = {
    recordDate: '',
    topIssue: '',
    failureQty: '',
    buildQty: '',
    frPercentage: '',
    category: '',
    returnStatus: '',
    failPicture: '',
    majorPart: '',
    repairResult: '',
    failureFactor: '',
    actions: '',
    evidencePicture: '',
  };
  @Output() edit = new EventEmitter<RepairReport>();
  @Output() remove = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<{ key: keyof RepairColumnFilters; value: string }>();

  setFilter(key: keyof RepairColumnFilters, value: string): void {
    this.filterChange.emit({ key, value });
  }
}

