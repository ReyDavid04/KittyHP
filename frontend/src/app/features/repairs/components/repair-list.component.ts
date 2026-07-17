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

export type RepairSortDirection = 'asc' | 'desc';

export interface RepairSort {
  key: RepairColumnKey | null;
  direction: RepairSortDirection | null;
}

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
  filterable?: boolean;
  numeric?: boolean;
}

@Component({
  selector: 'app-repair-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './repair-list.component.html',
  styleUrl: './repair-list.component.css',
})
export class RepairListComponent {
  @Input() repairs: RepairReport[] | null = [];
  @Input() filters: RepairColumnFilters = this.emptyFilters();
  @Input() availableValues: RepairColumnValues = this.emptyFilters();
  @Input() sort: RepairSort = { key: null, direction: null };

  @Output() edit = new EventEmitter<RepairReport>();
  @Output() remove = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<{ key: RepairColumnKey; values: string[] }>();
  @Output() sortChange = new EventEmitter<RepairSort>();

  readonly columns: RepairColumnDefinition[] = [
    { key: 'recordDate', label: 'Fecha', className: 'date-column' },
    { key: 'topIssue', label: 'Top issue', className: 'issue-column' },
    { key: 'failureQty', label: 'Failure qty', className: 'number-column', numeric: true },
    { key: 'buildQty', label: 'Build qty', className: 'number-column', numeric: true },
    { key: 'frPercentage', label: 'F/R', className: 'rate-column', numeric: true },
    { key: 'category', label: 'Categoría' },
    { key: 'returnStatus', label: 'Return' },
    { key: 'failPicture', label: 'Fail picture', className: 'image-column', filterable: false },
    { key: 'majorPart', label: 'Major part' },
    { key: 'repairResult', label: 'Repair result', className: 'text-column' },
    { key: 'failureFactor', label: 'Failure factor', className: 'text-column' },
    { key: 'actions', label: 'Acciones', className: 'text-column' },
    { key: 'evidencePicture', label: 'Evidencia', className: 'image-column', filterable: false },
  ];

  activeFilterKey: RepairColumnKey | null = null;
  draftValues: string[] = [];
  filterSearch = '';
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

    if (!this.isFilterable(key)) {
      return;
    }

    if (this.activeFilterKey === key) {
      this.closeFilter();
      return;
    }

    const trigger = event.currentTarget as HTMLElement;
    this.positionFilter(trigger);
    this.activeFilterKey = key;
    this.filterSearch = '';
    this.draftValues = [...(this.filters[key].length ? this.filters[key] : this.availableFilterValues(key))];
  }

  closeFilter(): void {
    this.activeFilterKey = null;
    this.draftValues = [];
    this.filterSearch = '';
    this.filterPosition = { top: null, left: null };
  }

  clearColumnFilter(key: RepairColumnKey): void {
    this.filterChange.emit({ key, values: [] });
    this.closeFilter();
  }

  applySort(key: RepairColumnKey, direction: RepairSortDirection): void {
    this.sortChange.emit({ key, direction });
    this.closeFilter();
  }

  clearSort(): void {
    this.sortChange.emit({ key: null, direction: null });
    this.closeFilter();
  }

  sortDirection(key: RepairColumnKey): RepairSortDirection | null {
    return this.sort.key === key ? this.sort.direction : null;
  }

  isSorted(key: RepairColumnKey): boolean {
    return this.sort.key === key && this.sort.direction !== null;
  }

  ascendingLabel(key: RepairColumnKey): string {
    return this.isNumericColumn(key) ? 'Ordenar de menor a mayor' : 'Ordenar de A a Z';
  }

  descendingLabel(key: RepairColumnKey): string {
    return this.isNumericColumn(key) ? 'Ordenar de mayor a menor' : 'Ordenar de Z a A';
  }

  allVisibleSelected(key: RepairColumnKey): boolean {
    const visible = this.visibleFilterValues(key);
    return visible.length > 0 && visible.every((value) => this.draftValues.includes(value));
  }

  someVisibleSelected(key: RepairColumnKey): boolean {
    const visible = this.visibleFilterValues(key);
    const selectedCount = visible.filter((value) => this.draftValues.includes(value)).length;
    return selectedCount > 0 && selectedCount < visible.length;
  }

  toggleAllVisible(key: RepairColumnKey): void {
    const visible = this.visibleFilterValues(key);

    if (this.allVisibleSelected(key)) {
      this.draftValues = this.draftValues.filter((value) => !visible.includes(value));
      return;
    }

    this.draftValues = Array.from(new Set([...this.draftValues, ...visible]));
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

  visibleFilterValues(key: RepairColumnKey): string[] {
    const search = this.filterSearch.trim().toLocaleLowerCase();

    if (!search) {
      return this.availableFilterValues(key);
    }

    return this.availableFilterValues(key).filter((value) =>
      this.displayOption(value).toLocaleLowerCase().includes(search),
    );
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

  private isFilterable(key: RepairColumnKey): boolean {
    return this.columns.find((column) => column.key === key)?.filterable !== false;
  }

  private isNumericColumn(key: RepairColumnKey): boolean {
    return this.columns.find((column) => column.key === key)?.numeric === true;
  }

  private positionFilter(trigger: HTMLElement): void {
    if (window.innerWidth <= 720) {
      this.filterPosition = { top: null, left: null };
      return;
    }

    const width = 350;
    const maxHeight = 660;
    const margin = 12;
    const rect = trigger.getBoundingClientRect();
    const left = Math.min(Math.max(margin, rect.right - width), window.innerWidth - width - margin);
    const top = Math.min(rect.bottom + 7, Math.max(margin, window.innerHeight - maxHeight - margin));

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
