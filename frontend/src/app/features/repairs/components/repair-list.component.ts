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

export interface RepairColumnValues extends RepairColumnFilters {}

interface RepairColumnDefinition {
  key: RepairColumnKey;
  label: string;
  className?: string;
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
              <th
                *ngFor="let column of columns; trackBy: trackByColumn"
                [ngClass]="column.className"
                [class.sticky-left]="column.key === 'recordDate'"
              >
                <div class="th-cell">
                  <span>{{ column.label }}</span>
                  <button
                    type="button"
                    class="filter-button"
                    [class.active]="isFiltered(column.key)"
                    [attr.aria-label]="'Filtrar por ' + column.label"
                    [attr.aria-expanded]="activeFilterKey === column.key"
                    (click)="toggleFilter(column.key, $event)"
                  >
                    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                      <path d="M5 7h14l-5.5 6.2v4.3l-3 1.5v-5.8L5 7Z"></path>
                    </svg>
                  </button>
                </div>
              </th>
              <th class="actions-column sticky-right"><span>Opciones</span></th>
            </tr>
          </thead>

          <tbody>
            <tr *ngFor="let repair of repairs; trackBy: trackByRepairId">
              <td
                *ngFor="let column of columns; trackBy: trackByColumn"
                [class.sticky-left]="column.key === 'recordDate'"
              >
                <ng-container [ngSwitch]="column.key">
                  <span *ngSwitchCase="'recordDate'" class="date-value">{{ repair.recordDate }}</span>

                  <strong *ngSwitchCase="'topIssue'" class="issue-value" [title]="repair.topIssue">
                    {{ repair.topIssue }}
                  </strong>

                  <span *ngSwitchCase="'failureQty'" class="numeric-value">{{ repair.failureQty | number }}</span>
                  <span *ngSwitchCase="'buildQty'" class="numeric-value">{{ repair.buildQty | number }}</span>

                  <span *ngSwitchCase="'frPercentage'" class="rate-pill">
                    {{ repair.frPercentage | number: '1.2-2' }}%
                  </span>

                  <span *ngSwitchCase="'category'" class="category-pill">{{ repair.category }}</span>

                  <span *ngSwitchCase="'returnStatus'" class="status-pill" [class.empty]="!repair.returnStatus">
                    <span class="status-dot" aria-hidden="true"></span>
                    {{ repair.returnStatus || 'Sin retorno' }}
                  </span>

                  <ng-container *ngSwitchCase="'failPicture'">
                    <a *ngIf="repair.failPicture; else noImage" class="image-link" [href]="repair.failPicture" target="_blank" rel="noopener">
                      <img [src]="repair.failPicture" alt="Evidencia de falla" class="thumbnail">
                      <span>Ver</span>
                    </a>
                  </ng-container>

                  <ng-container *ngSwitchCase="'evidencePicture'">
                    <a *ngIf="repair.evidencePicture; else noImage" class="image-link" [href]="repair.evidencePicture" target="_blank" rel="noopener">
                      <img [src]="repair.evidencePicture" alt="Evidencia de reparación" class="thumbnail">
                      <span>Ver</span>
                    </a>
                  </ng-container>

                  <span *ngSwitchDefault class="truncate" [title]="valueForColumn(repair, column.key)">
                    {{ valueForColumn(repair, column.key) || '—' }}
                  </span>
                </ng-container>

                <ng-template #noImage><span class="empty-value">Sin imagen</span></ng-template>
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

      <aside
        class="filter-popover"
        *ngIf="activeFilterKey as key"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'Filtrar ' + headerLabel(key)"
        [style.top.px]="filterPosition.top"
        [style.left.px]="filterPosition.left"
      >
        <header class="filter-header">
          <div>
            <span>Filtro de columna</span>
            <strong>{{ headerLabel(key) }}</strong>
          </div>
          <button type="button" class="close-filter" aria-label="Cerrar filtro" (click)="closeFilter()">×</button>
        </header>

        <button *ngIf="isFiltered(key)" type="button" class="clear-column-filter" (click)="clearColumnFilter(key)">
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"></path></svg>
          Borrar filtro de “{{ headerLabel(key) }}”
        </button>

        <div class="select-all-row">
          <label>
            <input
              type="checkbox"
              [checked]="allSelected(key)"
              [indeterminate]="someSelected(key)"
              (change)="toggleAll(key)"
            >
            <span>Seleccionar todo</span>
          </label>
          <span class="selection-count">{{ draftValues.length }} de {{ availableFilterValues(key).length }}</span>
        </div>

        <div class="filter-options">
          <label
            *ngFor="let option of availableFilterValues(key); trackBy: trackByOption"
            [class.selected]="isChecked(option)"
          >
            <input type="checkbox" [checked]="isChecked(option)" (change)="toggleOption(option)">
            <span>{{ displayOption(option) }}</span>
          </label>

          <div *ngIf="!availableFilterValues(key).length" class="no-options">
            Esta columna no contiene valores disponibles.
          </div>
        </div>

        <footer class="filter-footer">
          <span *ngIf="!draftValues.length" class="selection-warning">Selecciona al menos un valor</span>
          <div class="filter-actions">
            <button type="button" class="cancel-filter" (click)="closeFilter()">Cancelar</button>
            <button type="button" class="apply-filter" [disabled]="!draftValues.length" (click)="applyFilter()">Aceptar</button>
          </div>
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
        width: 25px;
        height: 25px;
        padding: 0;
        border: 1px solid transparent;
        border-radius: 6px;
        color: #7c8999;
        background: transparent;
        cursor: pointer;
      }

      .filter-button svg {
        width: 14px;
        fill: none;
        stroke: currentColor;
        stroke-linejoin: round;
        stroke-width: 1.7;
      }

      .filter-button:hover {
        border-color: var(--border);
        color: var(--primary);
        background: #fff;
      }

      .filter-button.active {
        border-color: var(--primary);
        color: #fff;
        background: var(--primary);
      }

      .date-column { width: 116px; min-width: 116px; }
      .issue-column { min-width: 190px; }
      .number-column { min-width: 118px; }
      .rate-column { min-width: 92px; }
      .image-column { min-width: 112px; }
      .text-column { min-width: 190px; }
      .actions-column { width: 92px; min-width: 92px; }

      .sticky-left {
        position: sticky;
        left: 0;
        z-index: 3;
        box-shadow: 8px 0 14px -14px rgba(18, 35, 55, 0.45);
      }

      th.sticky-left,
      th.sticky-right {
        z-index: 8;
        background: #f6f8fb;
      }

      .sticky-right {
        position: sticky;
        right: 0;
        z-index: 3;
        box-shadow: -8px 0 14px -14px rgba(18, 35, 55, 0.45);
      }

      .date-value,
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

      .date-value {
        border-radius: 8px;
        color: #4d5c70;
        background: #f1f4f8;
      }

      .issue-value {
        display: block;
        overflow: hidden;
        max-width: 220px;
        color: var(--text);
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .numeric-value {
        color: var(--text);
        font-variant-numeric: tabular-nums;
        font-weight: 650;
      }

      .rate-pill { color: var(--primary); background: var(--primary-soft); }
      .category-pill { color: #536176; background: #eef2f6; }
      .status-pill { gap: 7px; color: var(--success); background: var(--success-soft); }
      .status-pill.empty { color: var(--muted); background: #f0f3f6; }
      .status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

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

      .empty-value { color: #929eae; font-size: 0.72rem; }

      .truncate {
        display: block;
        overflow: hidden;
        max-width: 190px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .actions-cell { background: #fff; }
      .row-actions { display: flex; justify-content: center; gap: 7px; }

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
      }

      .icon-button svg,
      .clear-column-filter svg {
        width: 15px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-linejoin: round;
        stroke-width: 1.7;
      }

      .icon-button.edit { color: var(--primary); }
      .icon-button.edit:hover { border-color: rgba(47, 126, 199, 0.35); background: var(--primary-soft); }
      .icon-button.delete { color: var(--danger); }
      .icon-button.delete:hover { border-color: rgba(180, 35, 58, 0.28); background: var(--danger-soft); }

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

      .empty-icon svg { width: 28px; fill: none; stroke: currentColor; stroke-width: 1.6; }
      .empty-state h3 { margin: 0 0 7px; font-size: 1rem; }
      .empty-state p { margin: 0; color: var(--muted); font-size: 0.82rem; }

      .filter-backdrop {
        position: fixed;
        inset: 0;
        z-index: 80;
        background: rgba(18, 35, 55, 0.12);
      }

      .filter-popover {
        position: fixed;
        z-index: 90;
        display: grid;
        grid-template-rows: auto auto auto minmax(120px, 1fr) auto;
        width: min(330px, calc(100vw - 24px));
        max-height: min(520px, calc(100dvh - 24px));
        overflow: hidden;
        border: 1px solid #cfd8e3;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 18px 42px rgba(18, 35, 55, 0.2);
      }

      .filter-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 14px 15px;
        border-bottom: 1px solid var(--border);
        background: #f7f9fc;
      }

      .filter-header > div { display: grid; gap: 2px; }
      .filter-header span { color: var(--muted); font-size: 0.63rem; font-weight: 700; text-transform: uppercase; }
      .filter-header strong { font-size: 0.9rem; }

      .close-filter {
        display: grid;
        place-items: center;
        width: 29px;
        height: 29px;
        padding: 0;
        border: 1px solid var(--border);
        border-radius: 6px;
        color: var(--muted);
        font-size: 1rem;
        background: #fff;
        cursor: pointer;
      }

      .clear-column-filter {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 15px;
        border: 0;
        border-bottom: 1px solid var(--border);
        color: var(--primary);
        font-size: 0.72rem;
        font-weight: 700;
        text-align: left;
        background: #fff;
        cursor: pointer;
      }

      .clear-column-filter:hover { background: var(--primary-soft); }

      .select-all-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 11px 14px;
        border-bottom: 1px solid var(--border);
      }

      .select-all-row label,
      .filter-options label {
        display: flex;
        align-items: center;
        gap: 9px;
        cursor: pointer;
      }

      .select-all-row label { color: var(--text); font-size: 0.76rem; font-weight: 700; }
      .selection-count { color: var(--muted); font-size: 0.68rem; white-space: nowrap; }

      .select-all-row input,
      .filter-options input {
        width: 16px;
        height: 16px;
        margin: 0;
        accent-color: var(--primary);
      }

      .filter-options {
        display: grid;
        align-content: start;
        gap: 2px;
        overflow: auto;
        padding: 7px 8px;
      }

      .filter-options label {
        min-height: 34px;
        padding: 6px 8px;
        border-radius: 5px;
        color: #435066;
        font-size: 0.75rem;
      }

      .filter-options label:hover { background: #f2f6fb; }
      .filter-options label.selected { color: var(--text); background: #edf4fc; }
      .filter-options label span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      .no-options {
        padding: 28px 12px;
        color: var(--muted);
        font-size: 0.75rem;
        text-align: center;
      }

      .filter-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        min-height: 58px;
        padding: 10px 12px;
        border-top: 1px solid var(--border);
        background: #f7f9fc;
      }

      .selection-warning { color: var(--danger); font-size: 0.66rem; }
      .filter-actions { display: flex; gap: 7px; margin-left: auto; }

      .filter-actions button {
        min-height: 34px;
        padding: 7px 12px;
        border-radius: 7px;
        font-size: 0.73rem;
        font-weight: 700;
        cursor: pointer;
      }

      .cancel-filter { border: 1px solid var(--border); color: var(--text); background: #fff; }
      .apply-filter { border: 1px solid var(--primary); color: #fff; background: var(--primary); }
      .apply-filter:disabled { opacity: 0.45; cursor: not-allowed; }

      @media (max-width: 720px) {
        .table-wrap { max-height: none; }

        .filter-popover {
          top: auto !important;
          right: 12px;
          bottom: 12px;
          left: 12px !important;
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
  @Input() availableValues: RepairColumnValues = this.emptyFilters();

  @Output() edit = new EventEmitter<RepairReport>();
  @Output() remove = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<{ key: RepairColumnKey; values: string[] }>();

  readonly columns: RepairColumnDefinition[] = [
    { key: 'recordDate', label: 'Fecha', className: 'date-column' },
    { key: 'topIssue', label: 'Top issue', className: 'issue-column' },
    { key: 'failureQty', label: 'Failure qty', className: 'number-column' },
    { key: 'buildQty', label: 'Build qty', className: 'number-column' },
    { key: 'frPercentage', label: 'F/R', className: 'rate-column' },
    { key: 'category', label: 'Categoría' },
    { key: 'returnStatus', label: 'Return' },
    { key: 'failPicture', label: 'Fail picture', className: 'image-column' },
    { key: 'majorPart', label: 'Major part' },
    { key: 'repairResult', label: 'Repair result', className: 'text-column' },
    { key: 'failureFactor', label: 'Failure factor', className: 'text-column' },
    { key: 'actions', label: 'Acciones', className: 'text-column' },
    { key: 'evidencePicture', label: 'Evidencia', className: 'image-column' },
  ];

  activeFilterKey: RepairColumnKey | null = null;
  draftValues: string[] = [];
  filterPosition: { top: number | null; left: number | null } = { top: null, left: null };

  trackByRepairId(_: number, repair: RepairReport): string {
    return repair.id;
  }

  trackByColumn(_: number, column: RepairColumnDefinition): RepairColumnKey {
    return column.key;
  }

  trackByOption(_: number, option: string): string {
    return option;
  }

  toggleFilter(key: RepairColumnKey, event: MouseEvent): void {
    event.stopPropagation();

    if (this.activeFilterKey === key) {
      this.closeFilter();
      return;
    }

    const trigger = event.currentTarget as HTMLElement;
    this.positionFilter(trigger);
    this.activeFilterKey = key;
    this.draftValues = [...(this.filters[key].length ? this.filters[key] : this.availableFilterValues(key))];
  }

  closeFilter(): void {
    this.activeFilterKey = null;
    this.draftValues = [];
    this.filterPosition = { top: null, left: null };
  }

  clearColumnFilter(key: RepairColumnKey): void {
    this.filterChange.emit({ key, values: [] });
    this.closeFilter();
  }

  allSelected(key: RepairColumnKey): boolean {
    const total = this.availableFilterValues(key).length;
    return total > 0 && this.draftValues.length === total;
  }

  someSelected(key: RepairColumnKey): boolean {
    return this.draftValues.length > 0 && !this.allSelected(key);
  }

  toggleAll(key: RepairColumnKey): void {
    this.draftValues = this.allSelected(key) ? [] : [...this.availableFilterValues(key)];
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
    if (!this.activeFilterKey || !this.draftValues.length) {
      return;
    }

    const allValues = this.availableFilterValues(this.activeFilterKey);
    const values = this.draftValues.length === allValues.length ? [] : [...this.draftValues];

    this.filterChange.emit({ key: this.activeFilterKey, values });
    this.closeFilter();
  }

  availableFilterValues(key: RepairColumnKey): string[] {
    return this.availableValues[key] ?? [];
  }

  displayOption(value: string): string {
    return value === FILTER_BLANK_VALUE ? '(Vacíos)' : value;
  }

  isFiltered(key: RepairColumnKey): boolean {
    return this.filters[key].length > 0;
  }

  headerLabel(key: RepairColumnKey): string {
    return this.columns.find((column) => column.key === key)?.label ?? key;
  }

  valueForColumn(repair: RepairReport, key: RepairColumnKey): string {
    return String((repair as unknown as Record<string, unknown>)[key] ?? '');
  }

  private positionFilter(trigger: HTMLElement): void {
    if (window.innerWidth <= 720) {
      this.filterPosition = { top: null, left: null };
      return;
    }

    const width = 330;
    const margin = 12;
    const rect = trigger.getBoundingClientRect();
    const left = Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin);
    const top = Math.min(rect.bottom + 7, Math.max(margin, window.innerHeight - 520 - margin));

    this.filterPosition = { top, left };
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
