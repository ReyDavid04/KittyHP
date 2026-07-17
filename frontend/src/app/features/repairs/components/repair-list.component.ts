import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RepairReport } from '../../../core/models/repair-report.model';

export const FILTER_BLANK_VALUE = '__BLANK__';

export type RepairColumnKey =
  | 'recordDate'
  | 'topIssue'
  | 'failureQty'
  | 'buildQty'
  | 'frPercentage'
  | 'category'
  | 'returnStatus'
  | 'failPicture'
  | 'majorPart'
  | 'repairResult'
  | 'failureFactor'
  | 'actions'
  | 'evidencePicture';

export interface RepairColumnFilters {
  recordDate: string[];
  topIssue: string[];
  failureQty: string[];
  buildQty: string[];
  frPercentage: string[];
  category: string[];
  returnStatus: string[];
  failPicture: string[];
  majorPart: string[];
  repairResult: string[];
  failureFactor: string[];
  actions: string[];
  evidencePicture: string[];
}

export interface RepairColumnValues {
  recordDate: string[];
  topIssue: string[];
  failureQty: string[];
  buildQty: string[];
  frPercentage: string[];
  category: string[];
  returnStatus: string[];
  failPicture: string[];
  majorPart: string[];
  repairResult: string[];
  failureFactor: string[];
  actions: string[];
  evidencePicture: string[];
}

@Component({
  selector: 'app-repair-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <div class="table-wrap" *ngIf="repairs?.length; else emptyState">
        <table>
          <thead>
            <tr>
              <th>
                <div class="th-cell">
                  <span>Date</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('recordDate')" (click)="toggleFilter('recordDate')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>Top issue</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('topIssue')" (click)="toggleFilter('topIssue')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>Failure q'ty</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('failureQty')" (click)="toggleFilter('failureQty')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>Build q'ty</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('buildQty')" (click)="toggleFilter('buildQty')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>F/R</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('frPercentage')" (click)="toggleFilter('frPercentage')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>Category</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('category')" (click)="toggleFilter('category')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>Return</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('returnStatus')" (click)="toggleFilter('returnStatus')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>Fail picture</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('failPicture')" (click)="toggleFilter('failPicture')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>MajorPart</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('majorPart')" (click)="toggleFilter('majorPart')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>repair result</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('repairResult')" (click)="toggleFilter('repairResult')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>failure fact</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('failureFactor')" (click)="toggleFilter('failureFactor')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>Actions</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('actions')" (click)="toggleFilter('actions')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>Picture</span>
                  <button type="button" class="filter-btn" [class.active]="isFiltered('evidencePicture')" (click)="toggleFilter('evidencePicture')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>Acciones</span>
                </div>
              </th>
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

      <ng-template #emptyState>
        <div class="empty-state">
          <p class="empty-title">Aún no hay registros cargados.</p>
          <p class="empty-copy">Usa el botón de crear nuevo para empezar.</p>
        </div>
      </ng-template>

      <div class="filter-popover" *ngIf="activeFilterKey as key">
        <div class="filter-head">
          <strong>{{ headerLabel(key) }}</strong>
          <button type="button" class="link" (click)="closeFilter()">Cerrar</button>
        </div>
        <input class="filter-search" type="search" [value]="filterSearch" (input)="filterSearch = $any($event.target).value" placeholder="Search">
        <div class="filter-actions-row">
          <button type="button" class="mini" (click)="selectAll()">(Select All)</button>
          <button type="button" class="mini" (click)="clearSelection()">Clear</button>
        </div>
        <div class="filter-options">
          <label *ngFor="let option of visibleOptions(key)">
            <input type="checkbox" [checked]="isChecked(option)" (change)="toggleOption(option)">
            <span>{{ displayOption(option) }}</span>
          </label>
        </div>
        <div class="filter-foot">
          <button type="button" class="mini primary" (click)="applyFilter()">OK</button>
          <button type="button" class="mini" (click)="closeFilter()">Cancel</button>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .card {
        position: relative;
        padding: 14px;
        border: 1px solid var(--border);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 12px 30px rgba(16, 32, 51, 0.06);
        backdrop-filter: blur(8px);
      }

      .table-wrap {
        overflow-x: auto;
        max-height: calc(100vh - 320px);
        overflow-y: auto;
        border-radius: 16px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 1800px;
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
        background: #f6f9fe;
        position: sticky;
        top: 0;
        z-index: 2;
      }

      .th-cell {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .filter-btn {
        width: 24px;
        height: 24px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: white;
        color: var(--muted);
        padding: 0;
        line-height: 1;
      }

      .filter-btn.active {
        background: var(--primary);
        color: #fff;
        border-color: var(--primary);
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

      .empty-state {
        display: grid;
        gap: 6px;
        place-items: center;
        min-height: 240px;
        border: 1px dashed var(--border);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.7);
      }

      .empty-title {
        margin: 0;
        font-weight: 700;
      }

      .empty-copy {
        margin: 0;
        color: var(--muted);
      }

      .filter-popover {
        position: absolute;
        top: 70px;
        left: 24px;
        width: min(340px, calc(100vw - 64px));
        max-height: 520px;
        display: grid;
        gap: 10px;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: #fff;
        box-shadow: 0 20px 40px rgba(16, 32, 51, 0.18);
        z-index: 5;
      }

      .filter-head,
      .filter-foot,
      .filter-actions-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .filter-search {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border);
        border-radius: 10px;
      }

      .filter-options {
        display: grid;
        gap: 6px;
        max-height: 300px;
        overflow: auto;
        padding: 4px 2px;
      }

      .filter-options label {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 4px;
        border-radius: 10px;
        cursor: pointer;
      }

      .mini,
      .link {
        border: 1px solid var(--border);
        border-radius: 10px;
        background: #fff;
        padding: 8px 10px;
        cursor: pointer;
      }

      .mini.primary {
        background: var(--primary);
        color: #fff;
        border-color: var(--primary);
      }

      .link {
        border: 0;
        color: var(--primary);
        background: transparent;
      }

      .filter-foot {
        padding-top: 4px;
        border-top: 1px solid var(--border);
      }
    `,
  ],
})
export class RepairListComponent {
  @Input() repairs: RepairReport[] | null = [];
  @Input() filters: RepairColumnFilters = {
    recordDate: [],
    topIssue: [],
    failureQty: [],
    buildQty: [],
    frPercentage: [],
    category: [],
    returnStatus: [],
    failPicture: [],
    majorPart: [],
    repairResult: [],
    failureFactor: [],
    actions: [],
    evidencePicture: [],
  };
  @Input() availableValues: RepairColumnValues = {
    recordDate: [],
    topIssue: [],
    failureQty: [],
    buildQty: [],
    frPercentage: [],
    category: [],
    returnStatus: [],
    failPicture: [],
    majorPart: [],
    repairResult: [],
    failureFactor: [],
    actions: [],
    evidencePicture: [],
  };
  @Output() edit = new EventEmitter<RepairReport>();
  @Output() remove = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<{ key: RepairColumnKey; values: string[] }>();

  activeFilterKey: RepairColumnKey | null = null;
  filterSearch = '';
  draftValues: string[] = [];

  toggleFilter(key: RepairColumnKey): void {
    if (this.activeFilterKey === key) {
      this.closeFilter();
      return;
    }

    this.activeFilterKey = key;
    this.filterSearch = '';
    this.draftValues = [...(this.filters[key] ?? this.availableFilterValues(key))];
  }

  closeFilter(): void {
    this.activeFilterKey = null;
    this.filterSearch = '';
    this.draftValues = [];
  }

  selectAll(): void {
    if (!this.activeFilterKey) {
      return;
    }

    this.draftValues = [...this.availableFilterValues(this.activeFilterKey)];
  }

  clearSelection(): void {
    this.draftValues = [];
  }

  isChecked(option: string): boolean {
    return this.draftValues.includes(option);
  }

  toggleOption(option: string): void {
    if (this.isChecked(option)) {
      this.draftValues = this.draftValues.filter((item) => item !== option);
      return;
    }

    this.draftValues = [...this.draftValues, option];
  }

  applyFilter(): void {
    if (!this.activeFilterKey) {
      return;
    }

    const allValues = this.availableFilterValues(this.activeFilterKey);
    const values = this.draftValues.length === allValues.length ? [] : [...this.draftValues];

    this.filterChange.emit({ key: this.activeFilterKey, values });
    this.closeFilter();
  }

  visibleOptions(key: RepairColumnKey): string[] {
    const search = this.filterSearch.trim().toLowerCase();

    return this.availableFilterValues(key).filter((value) => this.displayOption(value).toLowerCase().includes(search));
  }

  displayOption(value: string): string {
    return value === FILTER_BLANK_VALUE ? '(Blanks)' : value;
  }

  isFiltered(key: RepairColumnKey): boolean {
    return (this.filters[key] ?? []).length > 0;
  }

  headerLabel(key: RepairColumnKey): string {
    const labels: Record<RepairColumnKey, string> = {
      recordDate: 'Date',
      topIssue: 'Top issue',
      failureQty: 'Failure q\'ty',
      buildQty: 'Build q\'ty',
      frPercentage: 'F/R',
      category: 'Category',
      returnStatus: 'Return',
      failPicture: 'Fail picture',
      majorPart: 'MajorPart',
      repairResult: 'repair result',
      failureFactor: 'failure fact',
      actions: 'Actions',
      evidencePicture: 'Picture',
    };

    return labels[key];
  }

  private availableFilterValues(key: RepairColumnKey): string[] {
    return this.availableValues[key] ?? [];
  }

  setFilter(key: keyof RepairColumnFilters, value: string): void {
    this.filterChange.emit({ key, values: [value] });
  }
}

