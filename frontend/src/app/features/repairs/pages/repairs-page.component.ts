import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RepairReport, RepairUpsertPayload } from '../../../core/models/repair-report.model';
import { RepairReportsApiService } from '../../../core/services/repair-reports-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { UiBadgeComponent, UiIconComponent } from '../../../shared/ui';
import {
  FILTER_BLANK_VALUE,
  RepairColumnFilters,
  RepairColumnKey,
  RepairColumnValues,
  RepairListComponent,
  RepairSort,
} from '../components/repair-list.component';
import { RepairExcelExportService } from '../services/repair-excel-export.service';
import { CatalogAutocompleteDirective } from '../components/catalog-autocomplete.directive';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, CatalogAutocompleteDirective, RepairListComponent, UiBadgeComponent, UiIconComponent],
  templateUrl: './repairs-page.component.html',
  styleUrl: './repairs-page.component.css',
})
export class RepairsPageComponent {
  readonly repairReportsApi = inject(RepairReportsApiService);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);
  private readonly repairExcelExport = inject(RepairExcelExportService);

  repairs: RepairReport[] = [];
  searchTerm = '';
  dateFrom = '';
  dateTo = '';
  currentPage = 1;
  pageSize = 8;
  isExportingExcel = false;
  isImporting = false;
  importError = '';
  private importErrorTimer?: ReturnType<typeof setTimeout>;
  importPreview: RepairUpsertPayload[] | null = null;
  originalImportPreview: RepairUpsertPayload[] = [];
  private importPreviewOriginalByRecord = new Map<RepairUpsertPayload, RepairUpsertPayload>();
  importPreviewFile: File | null = null;
  previewCatalogs = { families: [] as string[], topIssues: [] as string[], categories: [] as string[], majorParts: [] as string[] };
  previewExclusionOptions: Record<string, string[]> = { cause: [], majorPart: [], shiftFail: [], repeat: [] };
  previewExclusions: Record<string, string[]> = { cause: [], majorPart: [], shiftFail: [], repeat: [] };
  showImportExclusions = false;
  previewFamilyFilter = '';
  previewFamilyOptions: string[] = [];
  private previewAllRecords: RepairUpsertPayload[] = [];
  sort: RepairSort = { key: null, direction: null };
  filters: RepairColumnFilters = this.createEmptyFilters();
  availableValues: RepairColumnValues = this.createEmptyFilters();

  constructor() {
    this.restoreViewState();
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
        repair.id,
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

  importExcel(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.dismissImportError();
    this.isImporting = true;
    this.repairReportsApi.importWorkbook(file, true).subscribe({
      next: (result) => { this.isImporting = false; input.value = ''; this.importPreviewFile = file; this.setImportPreviewRecords(result.records ?? []); this.previewExclusionOptions = result.exclusionOptions ?? this.previewExclusionOptions; this.repairReportsApi.getCatalogs().subscribe((catalogs) => { this.previewCatalogs = catalogs; }); },
      error: (error: unknown) => { this.isImporting = false; input.value = ''; this.importError = this.readImportError(error); },
    });
  }
  togglePreviewExclusion(key: string, value: string, checked: boolean): void {
    const values = new Set(this.previewExclusions[key] ?? []);
    checked ? values.add(value) : values.delete(value);
    this.previewExclusions = { ...this.previewExclusions, [key]: [...values] };
    if (!this.importPreviewFile || this.isImporting) return;
    this.isImporting = true;
    this.repairReportsApi.importWorkbook(this.importPreviewFile, true, this.previewExclusions).subscribe({
      next: (result) => { this.isImporting = false; this.setImportPreviewRecords(result.records ?? []); this.previewExclusionOptions = result.exclusionOptions ?? this.previewExclusionOptions; },
      error: (error: unknown) => { this.isImporting = false; this.importError = this.readImportError(error); },
    });
  }
  confirmImport(): void {
    if (!this.importPreview?.length || this.isImporting) return;
    this.isImporting = true;
    this.repairReportsApi.confirmImport(this.importPreview).subscribe({
      next: () => { this.isImporting = false; this.cancelImportPreview(); this.loadRepairs(); },
      error: (error: unknown) => { this.isImporting = false; this.importError = this.readImportError(error); },
    });
  }

  cancelImportPreview(): void { this.importPreview = null; this.importPreviewFile = null; this.originalImportPreview = []; this.importPreviewOriginalByRecord.clear(); this.previewExclusions = { cause: [], majorPart: [], shiftFail: [], repeat: [] }; this.previewExclusionOptions = { cause: [], majorPart: [], shiftFail: [], repeat: [] }; this.showImportExclusions = false; }
  toggleImportExclusions(): void { this.showImportExclusions = !this.showImportExclusions; }
  applyPreviewFamilyFilter(): void { this.importPreview = this.previewFamilyFilter ? this.previewAllRecords.filter((record) => record.family === this.previewFamilyFilter) : structuredClone(this.previewAllRecords); }
  dismissImportError(): void {
    this.importError = '';
    if (this.importErrorTimer) {
      clearTimeout(this.importErrorTimer);
      this.importErrorTimer = undefined;
    }
  }

  private readImportError(error: unknown): string {
    const response = error as { error?: { message?: string | string[] }; message?: string };
    const message = response?.error?.message ?? response?.message;
    const text = Array.isArray(message)
      ? message.join(' ')
      : message || 'No se pudo importar el archivo. Verifica que sea un Excel válido y que contenga las pestañas requeridas.';
    this.importErrorTimer = setTimeout(() => this.dismissImportError(), 6000);
    return text;
  }
  removePreviewRecord(index: number): void { this.importPreview?.splice(index, 1); }
  resetPreviewRecord(index: number): void {
    const record = this.importPreview?.[index];
    const original = record && this.importPreviewOriginalByRecord.get(record);
    if (!this.importPreview || !original) return;
    const restored = structuredClone(original);
    this.importPreview[index] = restored;
    this.importPreviewOriginalByRecord.set(restored, structuredClone(original));
  }
  resetImportPreview(): void { this.setImportPreviewRecords(this.originalImportPreview); }

  private setImportPreviewRecords(records: RepairUpsertPayload[]): void {
    this.previewAllRecords = structuredClone(records);
    this.previewFamilyFilter = '';
    this.previewFamilyOptions = [...new Set(records.map((record) => record.family).filter((family): family is string => Boolean(family)))].sort();
    this.originalImportPreview = structuredClone(records);
    this.importPreview = structuredClone(records);
    this.importPreviewOriginalByRecord.clear();
    this.importPreview.forEach((record, index) => this.importPreviewOriginalByRecord.set(record, structuredClone(this.originalImportPreview[index])));
  }
  openEditRepair(repair: RepairReport): void { void this.router.navigate(['/repairs', repair.id, 'edit']); }

  async exportToExcel(): Promise<void> {
    const repairs = this.filteredRepairs;
    if (!repairs.length || this.isExportingExcel) return;

    this.isExportingExcel = true;
    try {
      await this.repairExcelExport.export(repairs);
    } catch (error) {
      console.error('No fue posible generar el archivo Excel.', error);
      const detail = this.errorMessage(error);
      window.alert(`No fue posible generar el archivo Excel con las imágenes.\n\nDetalle: ${detail}`);
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

  setSearch(value: string): void { this.searchTerm = value; this.currentPage = 1; this.persistViewState(); }

  setDateFrom(value: string): void {
    this.dateFrom = value;
    if (this.dateTo && value && this.dateTo < value) this.dateTo = value;
    this.currentPage = 1;
    this.persistViewState();
  }

  setDateTo(value: string): void {
    this.dateTo = value;
    if (this.dateFrom && value && this.dateFrom > value) this.dateFrom = value;
    this.currentPage = 1;
    this.persistViewState();
  }

  clearDateRange(): void { this.dateFrom = ''; this.dateTo = ''; this.currentPage = 1; this.persistViewState(); }
  updateFilter(key: RepairColumnKey, values: string[]): void { this.filters = { ...this.filters, [key]: values }; this.currentPage = 1; this.persistViewState(); }
  updateSort(sort: RepairSort): void { this.sort = sort; this.currentPage = 1; this.persistViewState(); }
  clearFilters(): void { this.filters = this.createEmptyFilters(); this.clearDateRange(); }
  goToPage(page: number): void { this.currentPage = Math.min(Math.max(page, 1), this.totalPages); }
  setPageSize(value: string): void { this.pageSize = Number(value); this.currentPage = 1; this.persistViewState(); }

  private persistViewState(): void {
    localStorage.setItem('kittyhp.repairs.view-state', JSON.stringify({ searchTerm: this.searchTerm, dateFrom: this.dateFrom, dateTo: this.dateTo, pageSize: this.pageSize, sort: this.sort, filters: this.filters }));
  }

  private restoreViewState(): void {
    try {
      const saved = JSON.parse(localStorage.getItem('kittyhp.repairs.view-state') ?? 'null');
      if (!saved) return;
      this.searchTerm = saved.searchTerm ?? '';
      this.dateFrom = saved.dateFrom ?? '';
      this.dateTo = saved.dateTo ?? '';
      this.pageSize = Number(saved.pageSize) || 8;
      this.sort = saved.sort ?? this.sort;
      this.filters = { ...this.createEmptyFilters(), ...(saved.filters ?? {}) };
    } catch { /* ignore invalid persisted state */ }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) return error.message;
    if (typeof error === 'string' && error.trim()) return error;
    return 'Error desconocido durante la generación del archivo.';
  }

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
    return key === 'id' || key === 'failureQty' || key === 'buildQty' || key === 'frPercentage';
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
      id: [], recordDate: [], family: [], topIssue: [], failureQty: [], buildQty: [], frPercentage: [], category: [],
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
      id: unique('id'),
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
