import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, HostListener, OnDestroy, inject } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { RepairReport, RepairUpsertPayload } from '../../../core/models/repair-report.model';
import { ProductionSnapshot, RepairReportsApiService } from '../../../core/services/repair-reports-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { UiBadgeComponent, UiConfirmToastService, UiIconComponent } from '../../../shared/ui';
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
export class RepairsPageComponent implements OnDestroy {
  readonly repairReportsApi = inject(RepairReportsApiService);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);
  private readonly repairExcelExport = inject(RepairExcelExportService);
  private readonly confirmToast = inject(UiConfirmToastService);

  repairs: RepairReport[] = [];
  searchTerm = '';
  dateFrom = '';
  dateTo = '';
  currentPage = 1;
  pageSize = 8;
  isExportingExcel = false;
  isImporting = false;
  private activeImportRequest?: Subscription;
  private repairsRefreshSubscription?: Subscription;
  private isRefreshingRepairs = false;
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
  previewDate = '';
  previewAnalysisSummary: Record<string, { prioritizedQty: number; totalDefects: number }> = {};
  private previewAllRecords: RepairUpsertPayload[] = [];
  private previewProductionSnapshot: ProductionSnapshot | null = null;
  private pendingPreviewExclusionRefresh = false;
  private previewExclusionRefreshTimer: number | undefined;
  sort: RepairSort = { key: null, direction: null };
  filters: RepairColumnFilters = this.createEmptyFilters();
  availableValues: RepairColumnValues = this.createEmptyFilters();

  constructor() {
    this.restoreViewState();
    this.loadRepairs();
    this.repairsRefreshSubscription = interval(15_000).subscribe(() => this.refreshRepairsSilently());
  }

  ngOnDestroy(): void {
    this.repairsRefreshSubscription?.unsubscribe();
    this.activeImportRequest?.unsubscribe();
    if (this.previewExclusionRefreshTimer !== undefined) window.clearTimeout(this.previewExclusionRefreshTimer);
    if (this.importErrorTimer) clearTimeout(this.importErrorTimer);
  }

  get activeFilterCount(): number {
    const columnFilterCount = Object.values(this.filters).filter((values) => values.length > 0).length;
    return columnFilterCount + (this.dateFrom || this.dateTo ? 1 : 0);
  }

  get importPreviewCount(): number {
    return this.previewAllRecords.length;
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

  private refreshRepairsSilently(): void {
    if (this.isImporting || this.isRefreshingRepairs) return;
    this.isRefreshingRepairs = true;
    const currentPage = this.currentPage;
    this.repairReportsApi.getAll().subscribe({
      next: (repairs) => {
        this.repairs = repairs;
        this.availableValues = this.buildAvailableValues(repairs);
        const maxPage = Math.max(1, Math.ceil(this.filteredRepairs.length / this.pageSize));
        this.currentPage = Math.min(currentPage, maxPage);
      },
      error: () => { this.isRefreshingRepairs = false; },
      complete: () => { this.isRefreshingRepairs = false; },
    });
  }

  openNewRepair(): void { void this.router.navigate(['/repairs/new']); }

  importExcel(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.dismissImportError();
    this.activeImportRequest?.unsubscribe();
    this.isImporting = true;
    this.activeImportRequest = this.repairReportsApi.importWorkbook(file, true).subscribe({
      next: (result) => { this.activeImportRequest = undefined; this.isImporting = false; input.value = ''; this.importPreviewFile = file; this.previewAnalysisSummary = result.analysisSummary ?? {}; this.previewProductionSnapshot = result.productionSnapshot ?? null; this.setImportPreviewRecords(result.records ?? []); const fileDate = this.dateFromImportFilename(file.name); if (fileDate) { this.previewDate = fileDate; this.applyPreviewDate(); } this.previewExclusionOptions = result.exclusionOptions ?? this.previewExclusionOptions; this.repairReportsApi.getCatalogs().subscribe((catalogs) => { this.previewCatalogs = this.mergePreviewCatalogValues(catalogs); }); },
      error: (error: unknown) => { this.activeImportRequest = undefined; this.isImporting = false; input.value = ''; this.importError = this.readImportError(error); },
    });
  }
  togglePreviewExclusion(key: string, value: string, checked: boolean): void {
    const values = new Set(this.previewExclusions[key] ?? []);
    checked ? values.add(value) : values.delete(value);
    this.previewExclusions = { ...this.previewExclusions, [key]: [...values] };
    if (!this.importPreviewFile) return;
    if (this.isImporting) {
      this.pendingPreviewExclusionRefresh = true;
      return;
    }
    this.schedulePreviewExclusionRefresh();
  }
  private schedulePreviewExclusionRefresh(): void {
    if (this.previewExclusionRefreshTimer !== undefined) window.clearTimeout(this.previewExclusionRefreshTimer);
    this.previewExclusionRefreshTimer = window.setTimeout(() => {
      this.previewExclusionRefreshTimer = undefined;
      this.refreshPreviewExclusions();
    }, 250);
  }
  private refreshPreviewExclusions(): void {
    if (!this.importPreviewFile) return;
    const selectedDate = this.previewDate || this.dateFromImportFilename(this.importPreviewFile.name) || '';
    const selectedFamily = this.previewFamilyFilter;
    this.isImporting = true;
    this.activeImportRequest = this.repairReportsApi.importWorkbook(this.importPreviewFile, true, this.previewExclusions).subscribe({
      next: (result) => { this.activeImportRequest = undefined; this.isImporting = false; this.previewAnalysisSummary = result.analysisSummary ?? {}; this.previewProductionSnapshot = result.productionSnapshot ?? null; this.setImportPreviewRecords(result.records ?? []); if (selectedDate) { this.previewDate = selectedDate; this.applyPreviewDate(); } this.previewFamilyFilter = selectedFamily; this.applyPreviewFamilyFilter(); this.previewExclusionOptions = result.exclusionOptions ?? this.previewExclusionOptions; this.runPendingPreviewExclusionRefresh(); },
      error: (error: unknown) => { this.activeImportRequest = undefined; this.isImporting = false; this.importError = this.readImportError(error); this.runPendingPreviewExclusionRefresh(); },
    });
  }
  private runPendingPreviewExclusionRefresh(): void {
    if (!this.pendingPreviewExclusionRefresh) return;
    this.pendingPreviewExclusionRefresh = false;
    this.schedulePreviewExclusionRefresh();
  }
  confirmImport(): void {
    if (!this.previewAllRecords.length || this.isImporting) return;
    this.isImporting = true;
    const snapshot = this.previewProductionSnapshot ? { ...this.previewProductionSnapshot, recordDate: this.previewDate || this.previewProductionSnapshot.recordDate } : undefined;
    this.activeImportRequest = this.repairReportsApi.confirmImport(this.previewAllRecords, snapshot).subscribe({
      next: () => { this.activeImportRequest = undefined; this.isImporting = false; this.cancelImportPreview(); this.loadRepairs(); },
      error: (error: unknown) => { this.activeImportRequest = undefined; this.isImporting = false; this.importError = this.readImportError(error); },
    });
  }

  cancelImportPreview(): void { this.activeImportRequest?.unsubscribe(); this.activeImportRequest = undefined; this.isImporting = false; this.importPreview = null; this.importPreviewFile = null; this.originalImportPreview = []; this.importPreviewOriginalByRecord.clear(); this.previewProductionSnapshot = null; this.previewAnalysisSummary = {}; this.previewExclusions = { cause: [], majorPart: [], shiftFail: [], repeat: [] }; this.previewExclusionOptions = { cause: [], majorPart: [], shiftFail: [], repeat: [] }; this.showImportExclusions = false; }
  toggleImportExclusions(): void { this.showImportExclusions = !this.showImportExclusions; }
  hasPreviewExclusions(): boolean {
    return Object.values(this.previewExclusions).some((values) => values.length > 0);
  }
  @HostListener('document:click', ['$event'])
  closeExclusionsOnOutsideClick(event: MouseEvent): void {
    if (!this.showImportExclusions) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('.import-exclusion-panel, .import-preview-modal-tools button')) return;
    this.showImportExclusions = false;
  }

  @HostListener('document:keydown.escape', ['$event'])
  closeImportLayerOnEscape(event: KeyboardEvent): void {
    if (document.body.classList.contains('ui-confirm-toast-open')) return;
    if (this.showImportExclusions) {
      event.preventDefault();
      this.showImportExclusions = false;
      return;
    }
    if (this.importPreview) {
      event.preventDefault();
      this.cancelImportPreview();
    }
  }
  applyPreviewFamilyFilter(): void {
    this.importPreview = this.previewFamilyFilter
      ? this.previewAllRecords.filter((record) => record.family === this.previewFamilyFilter)
      : [...this.previewAllRecords];
    this.renderPreviewFrColumn();
  }
  previewSummary(): { prioritizedQty: number; totalDefects: number } {
    const entries = Object.entries(this.previewAnalysisSummary).filter(([family]) => !this.previewFamilyFilter || family === this.previewFamilyFilter);
    return entries.reduce((summary, [, value]) => ({
      prioritizedQty: summary.prioritizedQty + Number(value.prioritizedQty ?? 0),
      totalDefects: summary.totalDefects + Number(value.totalDefects ?? 0),
    }), { prioritizedQty: 0, totalDefects: 0 });
  }
  applyPreviewDate(): void {
    if (!this.previewDate) return;
    this.previewAllRecords.forEach((record) => { record.recordDate = this.previewDate; });
    this.importPreview?.forEach((record) => { record.recordDate = this.previewDate; });
    this.originalImportPreview.forEach((record) => { record.recordDate = this.previewDate; });
    this.importPreview?.forEach((record) => { const original = this.importPreviewOriginalByRecord.get(record); if (original) original.recordDate = this.previewDate; });
    this.previewAllRecords.forEach((record) => { const original = this.importPreviewOriginalByRecord.get(record); if (original) original.recordDate = this.previewDate; });
  }
  previewFr(record: RepairUpsertPayload): number {
    const failure = Number(record.failureQty ?? 0);
    const build = Number(record.buildQty ?? 0);
    return build > 0 ? (failure / build) * 100 : 0;
  }
  private renderPreviewFrColumn(): void {
    window.setTimeout(() => {
      const table = document.querySelector<HTMLTableElement>('.import-preview-modal .import-preview-table');
      if (!table) return;
      table.querySelector('thead tr th.preview-fr-header')?.remove();
      table.querySelectorAll('tbody tr').forEach((row) => row.querySelector('td.preview-fr-cell')?.remove());
      const header = document.createElement('th');
      header.className = 'preview-fr-header';
      header.textContent = 'F/R';
      table.querySelector('thead tr')?.insertBefore(header, table.querySelector('thead tr')?.children[5] ?? null);
      this.importPreview?.forEach((record, index) => {
        const row = table.querySelectorAll('tbody tr')[index];
        if (!row) return;
        const cell = document.createElement('td');
        cell.className = 'preview-fr-cell';
        const input = document.createElement('input');
        input.className = 'import-preview-input numeric preview-fr-input';
        input.type = 'text';
        input.readOnly = true;
        input.value = `${this.previewFr(record).toFixed(2)}%`;
        input.setAttribute('aria-label', 'F/R calculado');
        cell.appendChild(input);
        row.insertBefore(cell, row.children[5] ?? null);
      });
    });
  }
  private dateFromImportFilename(fileName: string): string | null {
    const match = fileName.match(/(?:reporte\s*)?(\d{2})\s+(\d{2})/i);
    if (!match) return null;
    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = new Date().getFullYear();
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
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
  removePreviewRecord(index: number): void {
    const record = this.importPreview?.[index];
    if (!record) return;
    this.previewAllRecords = this.previewAllRecords.filter((item) => item !== record);
    this.importPreview = this.importPreview?.filter((item) => item !== record) ?? [];
    this.renderPreviewFrColumn();
  }
  resetPreviewRecord(index: number): void {
    const record = this.importPreview?.[index];
    const original = record && this.importPreviewOriginalByRecord.get(record);
    if (!this.importPreview || !original) return;
    Object.assign(record, structuredClone(original));
    this.importPreview = [...this.importPreview];
    this.renderPreviewFrColumn();
  }
  resetImportPreview(): void {
    const restored = structuredClone(this.originalImportPreview);
    this.previewAllRecords = structuredClone(restored);
    this.importPreview = [...this.previewAllRecords];
    this.previewDate = restored[0]?.recordDate ?? '';
    this.previewFamilyFilter = '';
    this.importPreviewOriginalByRecord.clear();
    this.importPreview.forEach((record, index) => this.importPreviewOriginalByRecord.set(record, structuredClone(restored[index])));
    this.previewAllRecords.forEach((record, index) => this.importPreviewOriginalByRecord.set(record, structuredClone(restored[index])));
    this.renderPreviewFrColumn();
  }

  private setImportPreviewRecords(records: RepairUpsertPayload[]): void {
    const acceptedRecords = records
      .filter((record) => /^(?:CHIRON|G12\s*800|GEMTREE|MERINO|LAMPAS|CASHMERE)/i.test(record.family ?? ''))
      .map((record) => ({ ...record, frPercentage: this.previewFr(record) }))
      .sort((a, b) => Number(b.frPercentage ?? 0) - Number(a.frPercentage ?? 0));
    this.previewFamilyFilter = '';
    this.previewDate = acceptedRecords[0]?.recordDate ?? '';
    this.previewFamilyOptions = [...new Set(records.map((record) => record.family).filter((family): family is string => Boolean(family)))]
      .filter((family) => /^(?:CHIRON|G12\s*800|GEMTREE|MERINO|LAMPAS|CASHMERE)/i.test(family))
      .sort();
    this.originalImportPreview = structuredClone(acceptedRecords);
    this.previewAllRecords = acceptedRecords;
    this.importPreview = [...this.previewAllRecords];
    this.importPreviewOriginalByRecord.clear();
    this.importPreview.forEach((record, index) => this.importPreviewOriginalByRecord.set(record, structuredClone(this.originalImportPreview[index])));
    this.previewAllRecords.forEach((record, index) => this.importPreviewOriginalByRecord.set(record, structuredClone(this.originalImportPreview[index])));
    this.renderPreviewFrColumn();
  }
  /** Ensure imported values remain selectable even when the catalog is stale or incomplete. */
  private mergePreviewCatalogValues(catalogs: typeof this.previewCatalogs): typeof this.previewCatalogs {
    const records = this.previewAllRecords;
    const merge = (values: string[], key: keyof RepairUpsertPayload): string[] => {
      const extras = records.map((record) => String(record[key] ?? '').trim()).filter(Boolean);
      return [...new Set([...(values ?? []), ...extras])].sort((a, b) => a.localeCompare(b));
    };
    return {
      families: merge(catalogs.families, 'family'),
      topIssues: merge(catalogs.topIssues, 'topIssue'),
      categories: merge(catalogs.categories, 'category'),
      majorParts: merge(catalogs.majorParts, 'majorPart'),
    };
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
      this.importError = this.readImportError({ message: `No fue posible generar el archivo Excel con las imágenes. Detalle: ${detail}` });
    } finally {
      this.isExportingExcel = false;
    }
  }

  async removeRepair(id: string): Promise<void> {
    const repair = this.repairs.find((item) => item.id === id);
    const detail = repair?.topIssue ? `Top Issue: ${repair.topIssue}. Esta acción no se puede deshacer.` : 'Esta acción no se puede deshacer.';
    const confirmed = await this.confirmToast.confirm({
      title: `¿Eliminar el reporte #${id}?`,
      message: detail,
      confirmLabel: 'Eliminar',
      tone: 'danger',
    });

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
