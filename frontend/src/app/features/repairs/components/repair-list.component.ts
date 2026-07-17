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
    <section class="table-shell">
      <div class="table-wrap" *ngIf="repairs?.length; else emptyState">
        <table>
          <thead>
            <tr>
              <th class="date-column sticky-left">
                <div class="th-cell">
                  <span>Fecha</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('recordDate')" aria-label="Filtrar por fecha" (click)="toggleFilter('recordDate')">⌄</button>
                </div>
              </th>
              <th class="issue-column">
                <div class="th-cell">
                  <span>Top issue</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('topIssue')" aria-label="Filtrar por top issue" (click)="toggleFilter('topIssue')">⌄</button>
                </div>
              </th>
              <th class="number-column">
                <div class="th-cell">
                  <span>Failure qty</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('failureQty')" aria-label="Filtrar por failure quantity" (click)="toggleFilter('failureQty')">⌄</button>
                </div>
              </th>
              <th class="number-column">
                <div class="th-cell">
                  <span>Build qty</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('buildQty')" aria-label="Filtrar por build quantity" (click)="toggleFilter('buildQty')">⌄</button>
                </div>
              </th>
              <th class="rate-column">
                <div class="th-cell">
                  <span>F/R</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('frPercentage')" aria-label="Filtrar por failure rate" (click)="toggleFilter('frPercentage')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>Categoría</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('category')" aria-label="Filtrar por categoría" (click)="toggleFilter('category')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>Return</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('returnStatus')" aria-label="Filtrar por return" (click)="toggleFilter('returnStatus')">⌄</button>
                </div>
              </th>
              <th class="image-column">
                <div class="th-cell">
                  <span>Fail picture</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('failPicture')" aria-label="Filtrar por fail picture" (click)="toggleFilter('failPicture')">⌄</button>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>Major part</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('majorPart')" aria-label="Filtrar por major part" (click)="toggleFilter('majorPart')">⌄</button>
                </div>
              </th>
              <th class="text-column">
                <div class="th-cell">
                  <span>Repair result</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('repairResult')" aria-label="Filtrar por repair result" (click)="toggleFilter('repairResult')">⌄</button>
                </div>
              </th>
              <th class="text-column">
                <div class="th-cell">
                  <span>Failure factor</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('failureFactor')" aria-label="Filtrar por failure factor" (click)="toggleFilter('failureFactor')">⌄</button>
                </div>
              </th>
              <th class="text-column">
                <div class="th-cell">
                  <span>Acciones</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('actions')" aria-label="Filtrar por acciones" (click)="toggleFilter('actions')">⌄</button>
                </div>
              </th>
              <th class="image-column">
                <div class="th-cell">
                  <span>Evidencia</span>
                  <button type="button" class="filter-button" [class.active]="isFiltered('evidencePicture')" aria-label="Filtrar por evidencia" (click)="toggleFilter('evidencePicture')">⌄</button>
                </div>
              </th>
              <th class="actions-column sticky-right"><span>Opciones</span></th>
            </tr>
          </thead>

          <tbody>
            <tr *ngFor="let repair of repairs; trackBy: trackByRepairId">
              <td class="sticky-left">
                <span class="date-value">{{ repair.recordDate }}</span>
              </td>
              <td>
                <strong class="issue-value" [title]="repair.topIssue">{{ repair.topIssue }}</strong>
              </td>
              <td class="numeric-cell">{{ repair.failureQty | number }}</td>
              <td class="numeric-cell">{{ repair.buildQty | number }}</td>
              <td><span class="rate-pill">{{ repair.frPercentage | number: '1.2-2' }}%</span></td>
              <td><span class="category-pill">{{ repair.category }}</span></td>
              <td>
                <span class="status-pill" [class.empty]="!repair.returnStatus">
                  <span class="status-dot" aria-hidden="true"></span>
                  {{ repair.returnStatus || 'Sin retorno' }}
                </span>
              </td>
              <td>
                <a *ngIf="repair.failPicture; else noFail" class="image-link" [href]="repair.failPicture" target="_blank" rel="noopener">
                  <img [src]="repair.failPicture" alt="Evidencia de falla" class="thumbnail">
                  <span>Ver</span>
                </a>
                <ng-template #noFail><span class="empty-value">Sin imagen</span></ng-template>
              </td>
              <td><span class="truncate" [title]="repair.majorPart || ''">{{ repair.majorPart || '—' }}</span></td>
              <td><span class="truncate wide" [title]="repair.repairResult || ''">{{ repair.repairResult || '—' }}</span></td>
              <td><span class="truncate wide" [title]="repair.failureFactor || ''">{{ repair.failureFactor || '—' }}</span></td>
              <td><span class="truncate wide" [title]="repair.actions || ''">{{ repair.actions || '—' }}</span></td>
              <td>
                <a *ngIf="repair.evidencePicture; else noEvidence" class="image-link" [href]="repair.evidencePicture" target="_blank" rel="noopener">
                  <img [src]="repair.evidencePicture" alt="Evidencia de reparación" class="thumbnail">
                  <span>Ver</span>
                </a>
                <ng-template #noEvidence><span class="empty-value">Sin imagen</span></ng-template>
              </td>
              <td class="sticky-right actions-cell">
                <div class="row-actions">
                  <button type="button" class="icon-button edit" aria-label="Editar reporte" title="Editar" (click)="edit.emit(repair)">
                    <svg viewBox="0 0 24 24" focusable="false"><path d="m4 20 4.2-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.2 16 4 20Zm10.8-13.6 2.8 2.8"></path></svg>
                  </button>
                  <button type="button" class="icon-button delete" aria-label="Eliminar reporte" title="Eliminar" (click)="remove.emit(repair.id)">
                    <svg viewBox="0 0 24 24" focusable="false"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"></path></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
          <div class="empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false"><path d="M7 3h10l3 3v15H4V3h3Zm2 6h6m-6 4h6m-6 4h4"></path></svg>
          </div>
          <h3>No hay reportes para mostrar</h3>
          <p>Crea un reporte o ajusta la búsqueda y los filtros activos.</p>
        </div>
      </ng-template>

      <div *ngIf="activeFilterKey" class="filter-backdrop" (click)="closeFilter()"></div>
      <aside class="filter-popover" *ngIf="activeFilterKey as key" role="dialog" aria-modal="true" [attr.aria-label]="'Filtrar ' + headerLabel(key)">
        <header class="filter-header">
          <div>
            <span>Filtrar columna</span>
            <strong>{{ headerLabel(key) }}</strong>
          </div>
          <button type="button" class="close-filter" aria-label="Cerrar filtro" (click)="closeFilter()">×</button>
        </header>

        <label class="filter-search">
          <span aria-hidden="true">⌕</span>
          <input type="search" [value]="filterSearch" (input)="filterSearch = $any($event.target).value" placeholder="Buscar valores">
        </label>

        <div class="filter-tools">
          <button type="button" (click)="selectAll()">Seleccionar todos</button>
          <button type="button" (click)="clearSelection()">Limpiar</button>
        </div>

        <div class="filter-options">
          <label *ngFor="let option of visibleOptions(key)">
            <input type="checkbox" [checked]="isChecked(option)" (change)="toggleOption(option)">
            <span>{{ displayOption(option) }}</span>
          </label>
          <p *ngIf="!visibleOptions(key).length" class="no-options">No se encontraron valores.</p>
        </div>

        <footer class="filter-footer">
          <button type="button" class="cancel-filter" (click)="closeFilter()">Cancelar</button>
          <button type="button" class="apply-filter" (click)="applyFilter()">Aplicar filtro</button>
        </footer>
      </aside>
    </section>
  `,
  styles: [
    `
      .table-shell {
        position: relative;
        min-width: 0;
      }

      .table-wrap {
        overflow: auto;
        max-height: calc(100dvh - 360px);
        min-height: 260px;
      }

      table {
        width: 100%;
        min-width: 1780px;
        border-spacing: 0;
        border-collapse: separate;
      }

      th,
      td {
        padding: 12px 13px;
        border-bottom: 1px solid #e8edf3;
        vertical-align: middle;
        text-align: left;
      }

      th {
        position: sticky;
        top: 0;
        z-index: 5;
        height: 48px;
        color: #5f6d80;
        font-size: 0.68rem;
        font-weight: 750;
        letter-spacing: 0.055em;
        text-transform: uppercase;
        background: #f6f8fb;
        box-shadow: inset 0 -1px 0 var(--border);
      }

      td {
        color: #334055;
        font-size: 0.79rem;
        background: #fff;
      }

      tbody tr:last-child td {
        border-bottom: 0;
      }

      tbody tr:hover td {
        background: #f8fbff;
      }

      .th-cell {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        white-space: nowrap;
      }

      .filter-button {
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        width: 24px;
        height: 24px;
        padding: 0 0 3px;
        border: 1px solid transparent;
        border-radius: 7px;
        color: #7c8999;
        background: transparent;
        cursor: pointer;
      }

      .filter-button:hover {
        border-color: var(--border);
        color: var(--primary);
        background: #fff;
      }

      .filter-button.active {
        border-color: rgba(47, 126, 199, 0.28);
        color: var(--primary);
        background: var(--primary-soft);
      }

      .date-column {
        width: 116px;
        min-width: 116px;
      }

      .issue-column {
        min-width: 190px;
      }

      .number-column {
        min-width: 118px;
      }

      .rate-column {
        min-width: 92px;
      }

      .image-column {
        min-width: 112px;
      }

      .text-column {
        min-width: 190px;
      }

      .actions-column {
        width: 92px;
        min-width: 92px;
      }

      .sticky-left {
        position: sticky;
        left: 0;
        z-index: 3;
        box-shadow: 8px 0 14px -14px rgba(18, 35, 55, 0.45);
      }

      th.sticky-left {
        z-index: 8;
        background: #f6f8fb;
      }

      .sticky-right {
        position: sticky;
        right: 0;
        z-index: 3;
        box-shadow: -8px 0 14px -14px rgba(18, 35, 55, 0.45);
      }

      th.sticky-right {
        z-index: 8;
        background: #f6f8fb;
      }

      .date-value {
        display: inline-flex;
        align-items: center;
        min-height: 27px;
        padding: 0 8px;
        border-radius: 8px;
        color: #4d5c70;
        font-size: 0.72rem;
        font-weight: 650;
        background: #f1f4f8;
        white-space: nowrap;
      }

      .issue-value {
        display: block;
        overflow: hidden;
        max-width: 220px;
        color: var(--text);
        font-size: 0.8rem;
        font-weight: 700;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .numeric-cell {
        color: var(--text);
        font-variant-numeric: tabular-nums;
        font-weight: 650;
      }

      .rate-pill,
      .category-pill,
      .status-pill {
        display: inline-flex;
        align-items: center;
        width: max-content;
        min-height: 27px;
        padding: 0 9px;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .rate-pill {
        color: var(--primary);
        background: var(--primary-soft);
      }

      .category-pill {
        color: #536176;
        background: #eef2f6;
      }

      .status-pill {
        gap: 7px;
        color: var(--success);
        background: var(--success-soft);
      }

      .status-pill.empty {
        color: var(--muted);
        background: #f0f3f6;
      }

      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      .thumbnail {
        width: 34px;
        height: 34px;
        border: 1px solid var(--border);
        border-radius: 9px;
        object-fit: cover;
        background: var(--surface-muted);
      }

      .image-link {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        color: var(--primary);
        font-size: 0.7rem;
        font-weight: 700;
        text-decoration: none;
      }

      .image-link:hover span {
        text-decoration: underline;
      }

      .empty-value {
        color: #929eae;
        font-size: 0.72rem;
      }

      .truncate {
        display: block;
        overflow: hidden;
        max-width: 150px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .truncate.wide {
        max-width: 190px;
      }

      .actions-cell {
        background: #fff;
      }

      .row-actions {
        display: flex;
        justify-content: center;
        gap: 7px;
      }

      .icon-button {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: 1px solid var(--border);
        border-radius: 9px;
        background: #fff;
        cursor: pointer;
        transition: border-color 150ms ease, color 150ms ease, background 150ms ease;
      }

      .icon-button svg {
        width: 15px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.7;
      }

      .icon-button.edit {
        color: var(--primary);
      }

      .icon-button.edit:hover {
        border-color: rgba(47, 126, 199, 0.35);
        background: var(--primary-soft);
      }

      .icon-button.delete {
        color: var(--danger);
      }

      .icon-button.delete:hover {
        border-color: rgba(180, 35, 58, 0.28);
        background: var(--danger-soft);
      }

      .empty-state {
        display: grid;
        place-items: center;
        min-height: 330px;
        padding: 42px 20px;
        text-align: center;
      }

      .empty-icon {
        display: grid;
        place-items: center;
        width: 58px;
        height: 58px;
        margin-bottom: 14px;
        border-radius: 18px;
        color: var(--primary);
        background: var(--primary-soft);
      }

      .empty-icon svg {
        width: 28px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.6;
      }

      .empty-state h3 {
        margin: 0 0 7px;
        font-size: 1rem;
      }

      .empty-state p {
        max-width: 390px;
        margin: 0;
        color: var(--muted);
        font-size: 0.82rem;
      }

      .filter-backdrop {
        position: fixed;
        inset: 0;
        z-index: 80;
        background: rgba(18, 35, 55, 0.2);
        backdrop-filter: blur(2px);
      }

      .filter-popover {
        position: fixed;
        top: 104px;
        right: 28px;
        z-index: 90;
        display: grid;
        grid-template-rows: auto auto auto minmax(100px, 1fr) auto;
        width: min(360px, calc(100vw - 32px));
        max-height: min(620px, calc(100dvh - 132px));
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: #fff;
        box-shadow: var(--shadow-lg);
      }

      .filter-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 17px 18px;
        border-bottom: 1px solid var(--border);
      }

      .filter-header > div {
        display: grid;
        gap: 3px;
      }

      .filter-header span {
        color: var(--muted);
        font-size: 0.67rem;
        font-weight: 700;
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }

      .filter-header strong {
        font-size: 0.95rem;
      }

      .close-filter {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: 1px solid var(--border);
        border-radius: 9px;
        color: var(--muted);
        font-size: 1.1rem;
        background: #fff;
        cursor: pointer;
      }

      .filter-search {
        position: relative;
        display: flex;
        align-items: center;
        margin: 14px 16px 9px;
      }

      .filter-search > span {
        position: absolute;
        left: 12px;
        z-index: 1;
        color: var(--muted);
      }

      .filter-search input {
        width: 100%;
        height: 40px;
        padding: 0 12px 0 35px;
        border: 1px solid var(--border);
        border-radius: 11px;
        color: var(--text);
        background: var(--surface-subtle);
      }

      .filter-tools {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px 9px;
      }

      .filter-tools button {
        padding: 4px 0;
        border: 0;
        color: var(--primary);
        font-size: 0.71rem;
        font-weight: 700;
        background: transparent;
        cursor: pointer;
      }

      .filter-options {
        display: grid;
        align-content: start;
        gap: 3px;
        overflow: auto;
        padding: 4px 12px 14px;
      }

      .filter-options label {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 36px;
        padding: 7px 8px;
        border-radius: 9px;
        color: #435066;
        font-size: 0.76rem;
        cursor: pointer;
      }

      .filter-options label:hover {
        background: var(--surface-subtle);
      }

      .filter-options input {
        width: 16px;
        height: 16px;
        accent-color: var(--primary);
      }

      .no-options {
        padding: 24px 10px;
        color: var(--muted);
        font-size: 0.76rem;
        text-align: center;
      }

      .filter-footer {
        display: flex;
        justify-content: flex-end;
        gap: 9px;
        padding: 13px 16px;
        border-top: 1px solid var(--border);
        background: var(--surface-subtle);
      }

      .filter-footer button {
        min-height: 38px;
        padding: 8px 13px;
        border-radius: 10px;
        font-size: 0.76rem;
        font-weight: 700;
        cursor: pointer;
      }

      .cancel-filter {
        border: 1px solid var(--border);
        color: var(--text);
        background: #fff;
      }

      .apply-filter {
        border: 1px solid var(--primary);
        color: #fff;
        background: var(--primary);
      }

      @media (max-width: 720px) {
        .table-wrap {
          max-height: none;
        }

        .filter-popover {
          top: auto;
          right: 12px;
          bottom: 12px;
          left: 12px;
          width: auto;
          max-height: calc(100dvh - 24px);
        }
      }
    `,
  ],
})
export class RepairListComponent {
  @Input() repairs: RepairReport[] | null = [];
  @Input() filters: RepairColumnFilters = this.emptyFilters();
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

  trackByRepairId(_: number, repair: RepairReport): string {
    return repair.id;
  }

  toggleFilter(key: RepairColumnKey): void {
    if (this.activeFilterKey === key) {
      this.closeFilter();
      return;
    }

    this.activeFilterKey = key;
    this.filterSearch = '';
    this.draftValues = [...(this.filters[key].length ? this.filters[key] : this.availableFilterValues(key))];
  }

  closeFilter(): void {
    this.activeFilterKey = null;
    this.filterSearch = '';
    this.draftValues = [];
  }

  selectAll(): void {
    if (this.activeFilterKey) {
      this.draftValues = [...this.availableFilterValues(this.activeFilterKey)];
    }
  }

  clearSelection(): void {
    this.draftValues = [];
  }

  isChecked(option: string): boolean {
    return this.draftValues.includes(option);
  }

  toggleOption(option: string): void {
    this.draftValues = this.isChecked(option)
      ? this.draftValues.filter((item) => item !== option)
      : [...this.draftValues, option];
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
    return value === FILTER_BLANK_VALUE ? '(Vacíos)' : value;
  }

  isFiltered(key: RepairColumnKey): boolean {
    return this.filters[key].length > 0;
  }

  headerLabel(key: RepairColumnKey): string {
    const labels: Record<RepairColumnKey, string> = {
      recordDate: 'Fecha',
      topIssue: 'Top issue',
      failureQty: 'Failure quantity',
      buildQty: 'Build quantity',
      frPercentage: 'Failure rate',
      category: 'Categoría',
      returnStatus: 'Return',
      failPicture: 'Fail picture',
      majorPart: 'Major part',
      repairResult: 'Repair result',
      failureFactor: 'Failure factor',
      actions: 'Acciones',
      evidencePicture: 'Evidencia',
    };

    return labels[key];
  }

  private availableFilterValues(key: RepairColumnKey): string[] {
    return this.availableValues[key] ?? [];
  }

  private emptyFilters(): RepairColumnFilters {
    return {
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
  }
}
