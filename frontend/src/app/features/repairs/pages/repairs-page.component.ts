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

@Component({
  standalone: true,
  imports: [CommonModule, RepairListComponent],
  templateUrl: './repairs-page.component.html',
  styleUrl: './repairs-page.component.css',
})
export class RepairsPageComponent {
  readonly repairReportsApi = inject(RepairReportsApiService);
  readonly router = inject(Router);

  repairs: RepairReport[] = [];
  searchTerm = '';
  dateFrom = '';
  dateTo = '';
  currentPage = 1;
  pageSize = 8;
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

  exportToExcel(): void {
    const repairs = this.filteredRepairs;
    if (!repairs.length) return;

    const headers = [
      'ID',
      'Date',
      'Family',
      'Top Issue',
      "Failure q'ty",
      "Build q'ty",
      'F/R (%)',
      'Category',
      'Return Yes',
      'Return No',
      'Fail Picture',
      'Major Part',
      'Repair Result',
      'Failure Factor',
      'Actions',
      'Evidence',
    ];

    const headerRow = `<Row ss:StyleID="Header">${headers.map((header) => this.excelTextCell(header)).join('')}</Row>`;
    const dataRows = repairs.map((repair) => [
      this.excelTextCell(repair.id),
      this.excelTextCell(this.normalizeRecordDate(repair.recordDate) || repair.recordDate),
      this.excelTextCell(repair.family),
      this.excelTextCell(repair.topIssue),
      this.excelNumberCell(repair.failureQty),
      this.excelNumberCell(repair.buildQty),
      this.excelNumberCell(Number(repair.frPercentage), 'Decimal'),
      this.excelTextCell(repair.category),
      this.excelNumberCell(repair.returnYesQty),
      this.excelNumberCell(repair.returnNoQty),
      this.excelTextCell(repair.failPicture),
      this.excelTextCell(repair.majorPart),
      this.excelTextCell(repair.repairResult),
      this.excelTextCell(repair.failureFactor),
      this.excelTextCell(repair.actions),
      this.excelTextCell(repair.evidencePicture),
    ].join('')).map((cells) => `<Row>${cells}</Row>`).join('');

    const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="Header"><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#164C8C" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="Decimal"><NumberFormat ss:Format="0.00"/></Style>
 </Styles>
 <Worksheet ss:Name="Reportes">
  <Table>
   <Column ss:Width="60"/><Column ss:Width="80"/><Column ss:Width="110"/><Column ss:Width="180"/>
   <Column ss:Width="80"/><Column ss:Width="80"/><Column ss:Width="70"/><Column ss:Width="110"/>
   <Column ss:Width="75"/><Column ss:Width="75"/><Column ss:Width="180"/><Column ss:Width="120"/>
   <Column ss:Width="180"/><Column ss:Width="140"/><Column ss:Width="220"/><Column ss:Width="180"/>
   ${headerRow}${dataRows}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = downloadUrl;
    link.download = `KittyHP_Reportes_${date}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
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

  private excelTextCell(value: unknown): string {
    return `<Cell><Data ss:Type="String">${this.escapeXml(value)}</Data></Cell>`;
  }

  private excelNumberCell(value: unknown, styleId?: string): string {
    const number = Number(value);
    const safeNumber = Number.isFinite(number) ? number : 0;
    const style = styleId ? ` ss:StyleID="${styleId}"` : '';
    return `<Cell${style}><Data ss:Type="Number">${safeNumber}</Data></Cell>`;
  }

  private escapeXml(value: unknown): string {
    return String(value ?? '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
