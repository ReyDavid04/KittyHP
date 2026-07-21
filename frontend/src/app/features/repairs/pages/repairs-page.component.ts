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
  RepairSort,
} from '../components/repair-list.component';
import { RepairExcelExportService } from '../services/repair-excel-export.service';

@Component({
  standalone: true,
  imports: [CommonModule, RepairListComponent],
  templateUrl: './repairs-page.component.html',
  styleUrl: './repairs-page.component.css',
})
export class RepairsPageComponent {
  readonly repairReportsApi = inject(RepairReportsApiService);
  readonly router = inject(Router);
  private readonly repairExcelExport = inject(RepairExcelExportService);

  repairs: RepairReport[] = [];
  searchTerm = '';
  dateFrom = '';
  dateTo = '';
  currentPage = 1;
  pageSize = 8;
  isExportingExcel = false;
  sort: RepairSort = { key: null, direction: null };
  filters: RepairColumnFilters = this.createEmptyFilters();
  availableValues: RepairColumnValues = this.createEmptyFilters();

  constructor() {
    this.loadRepairs();
  }

  get activeFilterCount(): number {
    const columnFilterCount = Object.values(this.filters).filter((values) => values.length > 0).length;
    return columnFilterCount + (this.dateFrom || this.dateTo ? 1 : 0);
  }

  get filteredRepairs(): RepairReport[] {
    const search = this.searchTerm.trim().toLowerCase();
    const filtered = this.repairs.filter((repair) => {
      const searchableValues = [
        repair.recordDate,
        repair.family ?? '',
        repair.topIssue,
        String(repair.failureQty),
        String(repair.buildQty),
        String(repair.frPercentage),
        repair.category,
        this.returnSummary(repair),
        String(repair.returnYesQty),
        String(repair.returnNoQty),
        repair.majorPart ?? '',
        repair.repairResult ?? '',
        repair.failureFactor ?? '',
        repair.actions ?? '',
      ].join(' ').toLowerCase();

      if (search && !searchableValues.includes(search)) return false;

      const recordDate = this.normalizeRecordDate(repair.recordDate);
      if (this.dateFrom && (!recordDate || recordDate < this.dateFrom)) return false;
      if (this.dateTo && (!recordDate || recordDate > this.dateTo)) return false;

      return Object.entries(this.filters).every(([key, values]) => {
        if (!values.length) return true;
        return values.includes(this.valueForKey(repair, key as RepairColumnKey));
      });
    });

    return this.sortRepairs(filtered);
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.filteredRepairs.length / this.pageSize)); }

  get pagedRepairs(): RepairReport[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRepairs.slice(start, start + this.pageSize);
  }

  get pageButtons(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

    const start = Math.max(2, this.currentPage - 2);
    const end = Math.min(total - 1, this.currentPage + 2);
    const pages = [1];
    if (start > 2) pages.push(start - 1);
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (end < total - 1) pages.push(end + 1);
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

  openNewRepair(): void { void this.router.navigate(['/repairs/new']); }
  openEditRepair(repair: RepairReport): void { void this.router.navigate(['/repairs', repair.id, 'edit']); }

  async exportToExcel(): Promise<void> {
    const repairs = this.filteredRepairs;
    if (!repairs.length || this.isExportingExcel) return;

    this.isExportingExcel = true;
    try {
      await this.repairExcelExport.export(repairs);
    } catch (error) {
      console.error('No fue posible generar el archivo Excel.', error);
      window.alert('No fue posible generar el archivo Excel con las imágenes.');
    } finally {
      this.isExportingExcel = false;
    }
  }

  removeRepair(id: string): void {
    const repair = this.repairs.find((item) => item.id === id);
    const detail = repair?.topIssue ? `\n\nTop Issue: ${repair.topIssue}` : '';
    const confirmed = window.confirm(
      `¿Estás seguro de eliminar el reporte #${id}?${detail}\n\nEsta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    this.repairReportsApi.delete(id).subscribe(() => this.loadRepairs());
  }

  setSearch(value: string): void { this.searchTerm = value; this.currentPage = 1; }

  setDateFrom(value: string): void {
    this.dateFrom = value;
    if (this.dateTo && value && this.dateTo < value) this.dateTo = value;
    this.currentPage = 1;
  }

  setDateTo(value: string): void {
    this.dateTo = value;
    if (this.dateFrom && value && this.dateFrom > value) this.dateFrom = value;
    this.currentPage = 1;
  }

  clearDateRange(): void { this.dateFrom = ''; this.dateTo = ''; this.currentPage = 1; }
  updateFilter(key: RepairColumnKey, values: string[]): void { this.filters = { ...this.filters, [key]: values }; this.currentPage = 1; }
  updateSort(sort: RepairSort): void { this.sort = sort; this.currentPage = 1; }
  clearFilters(): void { this.filters = this.createEmptyFilters(); this.clearDateRange(); }
  goToPage(page: number): void { this.currentPage = Math.min(Math.max(page, 1), this.totalPages); }
  setPageSize(value: string): void { this.pageSize = Number(value); this.currentPage = 1; }

  private sortRepairs(repairs: RepairReport[]): RepairReport[] {
    const { key, direction } = this.sort;
    if (!key || !direction) return repairs;

    const multiplier = direction === 'asc' ? 1 : -1;
    return repairs
      .map((repair, index) => ({ repair, index }))
      .sort((first, second) => {
        const comparison = this.compareRepairValues(first.repair, second.repair, key, multiplier);
        return comparison === 0 ? first.index - second.index : comparison;
      })
      .map(({ repair }) => repair);
  }

  private compareRepairValues(first: RepairReport, second: RepairReport, key: RepairColumnKey, multiplier: number): number {
    const firstRaw = this.rawValueForKey(first, key);
    const secondRaw = this.rawValueForKey(second, key);
    const firstBlank = firstRaw === null || firstRaw === undefined || String(firstRaw).trim() === '';
    const secondBlank = secondRaw === null || secondRaw === undefined || String(secondRaw).trim() === '';

    if (firstBlank && secondBlank) return 0;
    if (firstBlank) return 1;
    if (secondBlank) return -1;
    if (this.isNumericKey(key)) return (Number(firstRaw) - Number(secondRaw)) * multiplier;

    if (key === 'recordDate') {
      const firstDate = Date.parse(String(firstRaw));
      const secondDate = Date.parse(String(secondRaw));
      if (!Number.isNaN(firstDate) && !Number.isNaN(secondDate)) return (firstDate - secondDate) * multiplier;
    }

    return String(firstRaw).localeCompare(String(secondRaw), undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
  }

  private isNumericKey(key: RepairColumnKey): boolean {
    return key === 'failureQty' || key === 'buildQty' || key === 'frPercentage';
  }

  private normalizeRecordDate(value: unknown): string {
    const raw = String(value ?? '').trim();
    const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (isoDate) return isoDate;

    const timestamp = Date.parse(raw);
    return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString().slice(0, 10);
  }

  private createEmptyFilters(): RepairColumnFilters {
    return {
      recordDate: [], family: [], topIssue: [], failureQty: [], buildQty: [], frPercentage: [], category: [],
      returnSummary: [], failPicture: [], majorPart: [], repairResult: [], failureFactor: [], actions: [], evidencePicture: [],
    };
  }

  private valueForKey(repair: RepairReport, key: RepairColumnKey): string {
    const raw = String(this.rawValueForKey(repair, key) ?? '').trim();
    return raw ? raw.toLowerCase() : FILTER_BLANK_VALUE;
  }

  private rawValueForKey(repair: RepairReport, key: RepairColumnKey): unknown {
    if (key === 'returnSummary') return this.returnSummary(repair);
    return (repair as unknown as Record<string, unknown>)[key];
  }

  private returnSummary(repair: RepairReport): string {
    return `Yes: ${Number(repair.returnYesQty ?? 0)} · No: ${Number(repair.returnNoQty ?? 0)}`;
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
      family: unique('family'),
      topIssue: unique('topIssue'),
      failureQty: unique('failureQty'),
      buildQty: unique('buildQty'),
      frPercentage: unique('frPercentage'),
      category: unique('category'),
      returnSummary: unique('returnSummary'),
      failPicture: [],
      majorPart: unique('majorPart'),
      repairResult: unique('repairResult'),
      failureFactor: unique('failureFactor'),
      actions: unique('actions'),
      evidencePicture: [],
    };
  }
}
