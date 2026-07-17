import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RepairReport, RepairUpsertPayload } from '../../../core/models/repair-report.model';
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
    <section class="panel">
      <div class="toolbar">
        <div class="search-box">
          <label for="globalSearch">Buscar</label>
          <input id="globalSearch" type="search" [value]="searchTerm" (input)="setSearch($any($event.target).value)" placeholder="Buscar en toda la tabla">
        </div>
        <div class="toolbar-actions">
          <button type="button" class="primary" (click)="openNewRepair()">Crear nuevo</button>
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

      <div class="pagination" *ngIf="filteredRepairs.length">
        <div class="page-size">
          <span>Rows</span>
          <select [value]="pageSize" (change)="setPageSize($any($event.target).value)">
            <option [value]="8">8</option>
            <option [value]="12">12</option>
            <option [value]="20">20</option>
            <option [value]="50">50</option>
          </select>
        </div>
        <div class="pager">
          <button type="button" [disabled]="currentPage === 1" (click)="goToPage(1)">|&lt;</button>
          <button type="button" [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">&lt;</button>
          <button *ngFor="let page of pageButtons" type="button" class="page-btn" [class.active]="page === currentPage" (click)="goToPage(page)">{{ page }}</button>
          <button type="button" [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)">&gt;</button>
          <button type="button" [disabled]="currentPage === totalPages" (click)="goToPage(totalPages)">&gt;|</button>
        </div>
        <span class="page-info">Página {{ currentPage }} de {{ totalPages }} · {{ filteredRepairs.length }} registros</span>
      </div>

    </section>
  `,
  styles: [
    `
      .panel {
        display: grid;
        gap: 14px;
        width: 100%;
      }

      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 10px 24px rgba(16, 32, 51, 0.05);
        backdrop-filter: blur(8px);
      }

      .search-box {
        display: grid;
        gap: 6px;
        min-width: min(100%, 420px);
      }

      .search-box label {
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .search-box input {
        padding: 12px 14px;
        border: 1px solid var(--border);
        border-radius: 12px;
        min-width: min(100%, 500px);
      }

      .toolbar-actions {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .primary,
      .pagination button,
      .pagination select {
        border: 0;
        border-radius: 12px;
        background: var(--primary);
        color: #fff;
        padding: 12px 16px;
        cursor: pointer;
      }

      .pagination select {
        background: #fff;
        color: var(--text);
        border: 1px solid var(--border);
        padding: 10px 12px;
      }

      .pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 16px;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.82);
        box-shadow: 0 10px 24px rgba(16, 32, 51, 0.05);
        backdrop-filter: blur(8px);
        color: var(--muted);
        flex-wrap: wrap;
      }

      .page-size,
      .pager {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .page-btn {
        min-width: 42px;
        padding: 10px 12px !important;
      }

      .page-btn.active {
        background: #0f5bd7;
      }

      .page-info {
        font-size: 0.9rem;
      }

      .pagination button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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

  filters: RepairColumnFilters = {
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

  removeRepair(id: string) {
    this.repairReportsApi.delete(id).subscribe(() => {
      this.loadRepairs();
    });
  }

  setSearch(value: string): void {
    this.searchTerm = value;
    this.currentPage = 1;
  }

  updateFilter(key: RepairColumnKey, values: string[]): void {
    this.filters = { ...this.filters, [key]: values };
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    this.currentPage = Math.min(Math.max(page, 1), this.totalPages);
  }

  setPageSize(value: string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
  }

  private valueForKey(repair: RepairReport, key: RepairColumnKey): string {
    const raw = String((repair as unknown as Record<string, unknown>)[key] ?? '').trim();
    return raw ? raw.toLowerCase() : FILTER_BLANK_VALUE;
  }

  private buildAvailableValues(repairs: RepairReport[]): RepairColumnValues {
    const unique = <T extends RepairColumnKey>(key: T): string[] => {
      const values = new Set<string>();

      repairs.forEach((repair) => {
        values.add(this.valueForKey(repair, key));
      });

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

