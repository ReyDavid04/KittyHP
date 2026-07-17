import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RepairReport } from '../../../core/models/repair-report.model';
import { RepairReportsApiService } from '../../../core/services/repair-reports-api.service';
import {
  FILTER_BLANK_VALUE,
  RepairColumnFilters,
  RepairColumnKey,
  RepairColumnValues,
  RepairListComponent,
} from '../components/repair-list.component';

@Component({
  standalone: true,
  imports: [CommonModule, RepairListComponent],
  template: `
    <section class="page">
      <header class="page-heading">
        <div>
          <p class="overline">Manufacturing quality</p>
          <h1>Reportes de reparación</h1>
          <p class="page-description">
            Consulta fallas, resultados de reparación y evidencia en un solo espacio.
          </p>
        </div>

        <button type="button" class="create-button" (click)="openNewRepair()">
          <span class="button-icon" aria-hidden="true">+</span>
          Crear reporte
        </button>
      </header>

      <div class="stats-grid" aria-label="Resumen de reportes">
        <article class="stat-card">
          <div class="stat-icon reports" aria-hidden="true">R</div>
          <div>
            <span class="stat-label">Reportes registrados</span>
            <strong>{{ repairs.length | number }}</strong>
            <small>Historial disponible</small>
          </div>
        </article>

        <article class="stat-card">
          <div class="stat-icon failures" aria-hidden="true">F</div>
          <div>
            <span class="stat-label">Unidades con falla</span>
            <strong>{{ totalFailures | number }}</strong>
            <small>Failure quantity acumulada</small>
          </div>
        </article>

        <article class="stat-card">
          <div class="stat-icon builds" aria-hidden="true">B</div>
          <div>
            <span class="stat-label">Build quantity</span>
            <strong>{{ totalBuild | number }}</strong>
            <small>Volumen registrado</small>
          </div>
        </article>

        <article class="stat-card">
          <div class="stat-icon rate" aria-hidden="true">%</div>
          <div>
            <span class="stat-label">F/R promedio</span>
            <strong>{{ averageFailureRate | number: '1.2-2' }}%</strong>
            <small>Promedio de los reportes</small>
          </div>
        </article>
      </div>

      <section class="workspace">
        <div class="workspace-header">
          <div class="workspace-title">
            <div>
              <h2>Historial de reparaciones</h2>
              <p>{{ filteredRepairs.length | number }} de {{ repairs.length | number }} registros visibles</p>
            </div>
            <span class="count-badge">{{ filteredRepairs.length | number }}</span>
          </div>

          <div class="toolbar">
            <label class="search-field" for="globalSearch">
              <span class="search-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"></path>
                </svg>
              </span>
              <input
                id="globalSearch"
                type="search"
                [value]="searchTerm"
                (input)="setSearch($any($event.target).value)"
                placeholder="Buscar issue, categoría, parte..."
              >
              <button
                *ngIf="searchTerm"
                type="button"
                class="clear-search"
                aria-label="Limpiar búsqueda"
                (click)="setSearch('')"
              >×</button>
            </label>

            <button *ngIf="activeFilterCount" type="button" class="secondary-button" (click)="clearFilters()">
              Limpiar filtros
              <span>{{ activeFilterCount }}</span>
            </button>
          </div>
        </div>

        <app-repair-list
          [repairs]="pagedRepairs"
          [filters]="filters"
          [availableValues]="availableValues"
          (filterChange)="updateFilter($event.key, $event.values)"
          (edit)="openEditRepair($event)"
          (remove)="removeRepair($event)"
        ></app-repair-list>

        <footer class="pagination" *ngIf="filteredRepairs.length">
          <div class="page-size">
            <span>Filas por página</span>
            <select [value]="pageSize" (change)="setPageSize($any($event.target).value)">
              <option [value]="8">8</option>
              <option [value]="12">12</option>
              <option [value]="20">20</option>
              <option [value]="50">50</option>
            </select>
          </div>

          <span class="page-info">
            Página <strong>{{ currentPage }}</strong> de <strong>{{ totalPages }}</strong>
          </span>

          <div class="pager" aria-label="Paginación">
            <button type="button" aria-label="Primera página" [disabled]="currentPage === 1" (click)="goToPage(1)">«</button>
            <button type="button" aria-label="Página anterior" [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">‹</button>
            <button
              *ngFor="let pageNumber of pageButtons"
              type="button"
              class="page-button"
              [class.active]="pageNumber === currentPage"
              [attr.aria-current]="pageNumber === currentPage ? 'page' : null"
              (click)="goToPage(pageNumber)"
            >{{ pageNumber }}</button>
            <button type="button" aria-label="Página siguiente" [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)">›</button>
            <button type="button" aria-label="Última página" [disabled]="currentPage === totalPages" (click)="goToPage(totalPages)">»</button>
          </div>
        </footer>
      </section>
    </section>
  `,
  styles: [
    `
      .page {
        display: grid;
        gap: 22px;
      }

      .page-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 24px;
      }

      .overline {
        margin: 0 0 7px;
        color: var(--primary);
        font-size: 0.72rem;
        font-weight: 750;
        letter-spacing: 0.13em;
        text-transform: uppercase;
      }

      h1,
      h2,
      p {
        margin-top: 0;
      }

      h1 {
        margin-bottom: 7px;
        font-size: clamp(1.65rem, 2.5vw, 2.25rem);
        line-height: 1.15;
        letter-spacing: -0.035em;
      }

      .page-description {
        max-width: 680px;
        margin-bottom: 0;
        color: var(--muted);
        font-size: 0.94rem;
      }

      .create-button,
      .secondary-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        min-height: 42px;
        padding: 10px 16px;
        border-radius: 12px;
        font-size: 0.86rem;
        font-weight: 700;
        cursor: pointer;
        transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
      }

      .create-button {
        border: 1px solid var(--primary);
        color: #fff;
        background: var(--primary);
        box-shadow: 0 8px 18px rgba(22, 76, 140, 0.2);
      }

      .create-button:hover {
        background: var(--primary-strong);
        box-shadow: 0 11px 24px rgba(22, 76, 140, 0.24);
        transform: translateY(-1px);
      }

      .button-icon {
        display: grid;
        place-items: center;
        width: 20px;
        height: 20px;
        border-radius: 6px;
        font-size: 1.1rem;
        font-weight: 400;
        background: rgba(255, 255, 255, 0.14);
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 14px;
      }

      .stat-card {
        display: flex;
        align-items: center;
        gap: 14px;
        min-width: 0;
        padding: 17px;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        background: rgba(255, 255, 255, 0.92);
        box-shadow: var(--shadow-sm);
      }

      .stat-icon {
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        width: 42px;
        height: 42px;
        border-radius: 13px;
        font-size: 0.78rem;
        font-weight: 800;
      }

      .stat-icon.reports {
        color: var(--primary);
        background: var(--primary-soft);
      }

      .stat-icon.failures {
        color: var(--danger);
        background: var(--danger-soft);
      }

      .stat-icon.builds {
        color: var(--success);
        background: var(--success-soft);
      }

      .stat-icon.rate {
        color: var(--warning);
        background: var(--warning-soft);
      }

      .stat-card > div:last-child {
        display: grid;
        min-width: 0;
      }

      .stat-label {
        overflow: hidden;
        color: var(--muted);
        font-size: 0.75rem;
        font-weight: 650;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .stat-card strong {
        margin: 2px 0 1px;
        font-size: 1.45rem;
        letter-spacing: -0.04em;
      }

      .stat-card small {
        overflow: hidden;
        color: var(--muted);
        font-size: 0.69rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .workspace {
        overflow: hidden;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: rgba(255, 255, 255, 0.94);
        box-shadow: var(--shadow-md);
      }

      .workspace-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 18px 20px;
        border-bottom: 1px solid var(--border);
      }

      .workspace-title {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .workspace-title h2 {
        margin-bottom: 3px;
        font-size: 1rem;
        letter-spacing: -0.015em;
      }

      .workspace-title p {
        margin-bottom: 0;
        color: var(--muted);
        font-size: 0.76rem;
      }

      .count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 30px;
        height: 25px;
        padding: 0 8px;
        border-radius: 999px;
        color: var(--primary);
        font-size: 0.72rem;
        font-weight: 750;
        background: var(--primary-soft);
      }

      .toolbar {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        min-width: min(100%, 480px);
      }

      .search-field {
        position: relative;
        display: flex;
        align-items: center;
        flex: 1 1 320px;
        min-width: 220px;
      }

      .search-field input {
        width: 100%;
        height: 42px;
        padding: 0 40px 0 40px;
        border: 1px solid var(--border);
        border-radius: 12px;
        color: var(--text);
        background: var(--surface-subtle);
        transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
      }

      .search-field input::placeholder {
        color: #8b97a8;
      }

      .search-field input:focus {
        border-color: rgba(47, 126, 199, 0.7);
        background: #fff;
      }

      .search-icon {
        position: absolute;
        left: 13px;
        z-index: 1;
        display: grid;
        place-items: center;
        width: 18px;
        color: var(--muted);
        pointer-events: none;
      }

      .search-icon svg {
        width: 18px;
        fill: none;
        stroke: currentColor;
        stroke-linecap: round;
        stroke-width: 1.8;
      }

      .clear-search {
        position: absolute;
        right: 8px;
        width: 27px;
        height: 27px;
        border: 0;
        border-radius: 8px;
        color: var(--muted);
        font-size: 1rem;
        background: transparent;
        cursor: pointer;
      }

      .secondary-button {
        border: 1px solid var(--border);
        color: var(--text);
        background: #fff;
        white-space: nowrap;
      }

      .secondary-button span {
        display: grid;
        place-items: center;
        min-width: 20px;
        height: 20px;
        padding: 0 5px;
        border-radius: 999px;
        color: var(--primary);
        font-size: 0.68rem;
        background: var(--primary-soft);
      }

      .pagination {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 16px;
        padding: 14px 18px;
        border-top: 1px solid var(--border);
        color: var(--muted);
        background: var(--surface-subtle);
      }

      .page-size,
      .pager {
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .page-size {
        font-size: 0.76rem;
      }

      .page-size select {
        height: 34px;
        padding: 0 28px 0 10px;
        border: 1px solid var(--border);
        border-radius: 9px;
        color: var(--text);
        background: #fff;
      }

      .page-info {
        font-size: 0.76rem;
      }

      .pager {
        justify-content: flex-end;
      }

      .pager button {
        display: grid;
        place-items: center;
        min-width: 34px;
        height: 34px;
        padding: 0 9px;
        border: 1px solid var(--border);
        border-radius: 9px;
        color: var(--muted);
        background: #fff;
        cursor: pointer;
      }

      .pager button:hover:not(:disabled) {
        border-color: var(--border-strong);
        color: var(--primary);
      }

      .pager button.active {
        border-color: var(--primary);
        color: #fff;
        background: var(--primary);
      }

      .pager button:disabled {
        opacity: 0.42;
        cursor: not-allowed;
      }

      @media (max-width: 1120px) {
        .stats-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .workspace-header {
          align-items: stretch;
          flex-direction: column;
        }

        .toolbar {
          justify-content: stretch;
          max-width: none;
        }
      }

      @media (max-width: 720px) {
        .page-heading {
          align-items: stretch;
          flex-direction: column;
        }

        .create-button {
          width: 100%;
        }

        .stats-grid {
          grid-template-columns: 1fr;
        }

        .workspace-header {
          padding: 15px;
        }

        .toolbar {
          align-items: stretch;
          flex-direction: column;
        }

        .search-field {
          flex-basis: auto;
          min-width: 0;
        }

        .pagination {
          grid-template-columns: 1fr;
          justify-items: center;
        }

        .page-size,
        .pager {
          justify-content: center;
        }
      }
    `,
  ],
})
export class RepairsPageComponent {
  readonly repairReportsApi = inject(RepairReportsApiService);
  readonly router = inject(Router);

  repairs: RepairReport[] = [];
  searchTerm = '';
  currentPage = 1;
  pageSize = 8;

  filters: RepairColumnFilters = this.createEmptyFilters();

  availableValues: RepairColumnValues = {
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

  constructor() {
    this.loadRepairs();
  }

  get totalFailures(): number {
    return this.repairs.reduce((total, repair) => total + Number(repair.failureQty || 0), 0);
  }

  get totalBuild(): number {
    return this.repairs.reduce((total, repair) => total + Number(repair.buildQty || 0), 0);
  }

  get averageFailureRate(): number {
    if (!this.repairs.length) {
      return 0;
    }

    const total = this.repairs.reduce((sum, repair) => sum + Number(repair.frPercentage || 0), 0);
    return total / this.repairs.length;
  }

  get activeFilterCount(): number {
    return Object.values(this.filters).filter((values) => values.length > 0).length;
  }

  get filteredRepairs(): RepairReport[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.repairs.filter((repair) => {
      const searchableValues = [
        repair.recordDate,
        repair.topIssue,
        String(repair.failureQty),
        String(repair.buildQty),
        String(repair.frPercentage),
        repair.category,
        repair.returnStatus ?? '',
        repair.failPicture ?? '',
        repair.majorPart ?? '',
        repair.repairResult ?? '',
        repair.failureFactor ?? '',
        repair.actions ?? '',
        repair.evidencePicture ?? '',
      ]
        .join(' ')
        .toLowerCase();

      if (search && !searchableValues.includes(search)) {
        return false;
      }

      return Object.entries(this.filters).every(([key, values]) => {
        if (!values.length) {
          return true;
        }

        const repairValue = this.valueForKey(repair, key as RepairColumnKey);
        return values.includes(repairValue);
      });
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRepairs.length / this.pageSize));
  }

  get pagedRepairs(): RepairReport[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRepairs.slice(start, start + this.pageSize);
  }

  get pageButtons(): number[] {
    const total = this.totalPages;
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const start = Math.max(2, this.currentPage - 2);
    const end = Math.min(total - 1, this.currentPage + 2);
    const pages = [1];

    if (start > 2) {
      pages.push(start - 1);
    }

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    if (end < total - 1) {
      pages.push(end + 1);
    }

    pages.push(total);
    return Array.from(new Set(pages));
  }

  loadRepairs(): void {
    this.repairReportsApi.getAll().subscribe((repairs) => {
      this.repairs = repairs;
      this.availableValues = this.buildAvailableValues(repairs);
      this.currentPage = 1;
    });
  }

  openNewRepair(): void {
    void this.router.navigate(['/repairs/new']);
  }

  openEditRepair(repair: RepairReport): void {
    void this.router.navigate(['/repairs', repair.id, 'edit']);
  }

  removeRepair(id: string): void {
    this.repairReportsApi.delete(id).subscribe(() => this.loadRepairs());
  }

  setSearch(value: string): void {
    this.searchTerm = value;
    this.currentPage = 1;
  }

  updateFilter(key: RepairColumnKey, values: string[]): void {
    this.filters = { ...this.filters, [key]: values };
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.filters = this.createEmptyFilters();
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
  }

  setPageSize(value: string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
  }

  private createEmptyFilters(): RepairColumnFilters {
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

  private valueForKey(repair: RepairReport, key: RepairColumnKey): string {
    const raw = String((repair as unknown as Record<string, unknown>)[key] ?? '').trim();
    return raw ? raw.toLowerCase() : FILTER_BLANK_VALUE;
  }

  private buildAvailableValues(repairs: RepairReport[]): RepairColumnValues {
    const unique = <T extends RepairColumnKey>(key: T): string[] => {
      const values = new Set<string>();

      repairs.forEach((repair) => values.add(this.valueForKey(repair, key)));

      return Array.from(values).sort((first, second) => {
        if (first === FILTER_BLANK_VALUE) return -1;
        if (second === FILTER_BLANK_VALUE) return 1;
        return first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' });
      });
    };

    return {
      recordDate: unique('recordDate'),
      topIssue: unique('topIssue'),
      failureQty: unique('failureQty'),
      buildQty: unique('buildQty'),
      frPercentage: unique('frPercentage'),
      category: unique('category'),
      returnStatus: unique('returnStatus'),
      failPicture: unique('failPicture'),
      majorPart: unique('majorPart'),
      repairResult: unique('repairResult'),
      failureFactor: unique('failureFactor'),
      actions: unique('actions'),
      evidencePicture: unique('evidencePicture'),
    };
  }
}
