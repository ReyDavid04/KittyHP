import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { finalize } from 'rxjs';
import {
  ProductionDefectCell,
  ProductionDefectSeries,
  ProductionDefectsApiService,
  ProductionWeek,
} from '../../../core/services/production-defects-api.service';
import { ProductionDefectsExcelExportService } from '../services/production-defects-excel-export.service';

type QuantityField = 'inputQuantity' | 'defectQuantity';
type ProductionViewMode = 'single' | 'recent' | 'compare';

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './production-defects-page.component.html',
  styleUrl: './production-defects-page.component.css',
})
export class ProductionDefectsPageComponent {
  private readonly productionApi = inject(ProductionDefectsApiService);
  private readonly excelExport = inject(ProductionDefectsExcelExportService);

  readonly recentWeekOptions = [4, 8, 12, 16];
  readonly maxComparisonWeeks = 6;

  viewMode: ProductionViewMode = 'single';
  week: ProductionWeek | null = null;
  trendWeeks: ProductionWeek[] = [];
  activeDetailWeekStart = '';
  selectedDate = this.formatDate(this.startOfIsoWeek(this.todayAsUtcDate()));
  recentWeekCount = 4;
  comparisonDate = '';
  selectedComparisonStarts: string[] = [];
  isLoading = false;
  isSaving = false;
  isExportingExcel = false;
  isDirty = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.comparisonDate = this.selectedDate;
    this.selectedComparisonStarts = this.buildRecentWeekStarts(4, this.selectedDate);
    this.loadWeek(this.selectedDate);
  }

  get series(): ProductionDefectSeries[] {
    return this.week?.series ?? [];
  }

  get days(): string[] {
    return this.week?.days ?? [];
  }

  get weekLabel(): string {
    return this.week ? this.weekName(this.week) : 'WK--';
  }

  get trendSeries(): ProductionDefectSeries[] {
    const seriesById = new Map<string, ProductionDefectSeries>();
    for (const trendWeek of this.trendWeeks) {
      for (const productionSeries of trendWeek.series) {
        if (!seriesById.has(productionSeries.id)) {
          seriesById.set(productionSeries.id, productionSeries);
        }
      }
    }
    return [...seriesById.values()].sort(
      (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    );
  }

  get detailWeek(): ProductionWeek | null {
    return this.trendWeeks.find((item) => item.weekStart === this.activeDetailWeekStart) ?? null;
  }

  get detailSeries(): ProductionDefectSeries[] {
    return [...(this.detailWeek?.series ?? [])]
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  }

  get canExportExcel(): boolean {
    return this.viewMode === 'single' ? Boolean(this.week) : this.trendWeeks.length > 0;
  }

  setViewMode(mode: ProductionViewMode): void {
    if (mode === this.viewMode) return;
    if (!this.confirmDiscardChanges()) return;

    this.isDirty = false;
    this.viewMode = mode;
    this.activeDetailWeekStart = '';
    this.clearMessages();

    if (mode === 'single') {
      this.loadWeek(this.selectedDate);
      return;
    }

    if (mode === 'recent') {
      this.loadRecentWeeks();
      return;
    }

    this.loadComparisonWeeks();
  }

  loadWeek(start: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.trendWeeks = [];
    this.activeDetailWeekStart = '';

    this.productionApi.getWeek(start)
      .pipe(finalize(() => { this.isLoading = false; }))
      .subscribe({
        next: (week) => {
          this.week = week;
          this.selectedDate = week.weekStart;
          this.isDirty = false;
        },
        error: (error: unknown) => {
          console.error('No fue posible cargar la semana de producción.', error);
          this.errorMessage = 'No fue posible cargar la información semanal.';
        },
      });
  }

  loadRecentWeeks(): void {
    const starts = this.buildRecentWeekStarts(this.recentWeekCount, this.selectedDate);
    this.loadTrendWeeks(starts);
  }

  loadComparisonWeeks(): void {
    this.loadTrendWeeks(this.selectedComparisonStarts);
  }

  changeWeek(offset: number): void {
    const currentStart = this.viewMode === 'single'
      ? this.week?.weekStart ?? this.selectedDate
      : this.selectedDate;
    const current = this.parseDate(currentStart);
    current.setUTCDate(current.getUTCDate() + (offset * 7));
    const nextStart = this.formatDate(current);

    if (this.viewMode === 'single') {
      this.navigateToWeek(nextStart);
      return;
    }

    this.selectedDate = nextStart;
    this.loadRecentWeeks();
  }

  goToCurrentWeek(): void {
    const currentWeek = this.formatDate(this.startOfIsoWeek(this.todayAsUtcDate()));
    if (this.viewMode === 'single') {
      this.navigateToWeek(currentWeek);
      return;
    }

    this.selectedDate = currentWeek;
    this.loadRecentWeeks();
  }

  selectWeek(value: string): void {
    if (!value) return;
    const selectedWeek = this.formatDate(this.startOfIsoWeek(this.parseDate(value)));
    if (this.viewMode === 'single') {
      this.navigateToWeek(selectedWeek);
      return;
    }

    this.selectedDate = selectedWeek;
    this.loadRecentWeeks();
  }

  selectRecentWeekCount(value: string): void {
    const count = Number(value);
    if (!this.recentWeekOptions.includes(count)) return;
    this.recentWeekCount = count;
    this.loadRecentWeeks();
  }

  setComparisonDate(value: string): void {
    if (value) this.comparisonDate = value;
  }

  addComparisonWeek(): void {
    const start = this.formatDate(this.startOfIsoWeek(this.parseDate(this.comparisonDate)));
    if (this.selectedComparisonStarts.includes(start)) {
      this.errorMessage = 'Esa semana ya está seleccionada.';
      return;
    }

    if (this.selectedComparisonStarts.length >= this.maxComparisonWeeks) {
      this.errorMessage = `Puedes comparar hasta ${this.maxComparisonWeeks} semanas.`;
      return;
    }

    this.selectedComparisonStarts = [...this.selectedComparisonStarts, start].sort();
    this.clearMessages();
    this.loadComparisonWeeks();
  }

  removeComparisonWeek(start: string): void {
    this.selectedComparisonStarts = this.selectedComparisonStarts.filter((item) => item !== start);
    this.clearMessages();
    this.loadComparisonWeeks();
  }

  selectDetailWeek(week: ProductionWeek): void {
    this.activeDetailWeekStart = week.weekStart;
  }

  async exportToExcel(): Promise<void> {
    if (!this.canExportExcel || this.isExportingExcel || this.isLoading) return;

    this.isExportingExcel = true;
    this.errorMessage = '';

    try {
      await this.excelExport.export({
        mode: this.viewMode,
        week: this.week,
        weeks: this.trendWeeks,
        detailWeek: this.detailWeek,
        recentWeekCount: this.recentWeekCount,
      });
    } catch (error: unknown) {
      console.error('No fue posible generar el archivo Excel de Overall FPF Trend.', error);
      this.errorMessage = 'No fue posible generar el archivo Excel.';
    } finally {
      this.isExportingExcel = false;
    }
  }

  saveWeek(): void {
    if (!this.week || this.isSaving || this.viewMode !== 'single') return;

    const invalidCell = this.findInvalidCell();
    if (invalidCell) {
      this.errorMessage = `Defect Quantity no puede ser mayor que Input Quantity en ${invalidCell.seriesName}, ${this.formatDay(invalidCell.date)}.`;
      return;
    }

    const entries = this.series.flatMap((series) => this.days.map((recordDate) => {
      const cell = this.cell(series, recordDate);
      return {
        seriesId: Number(series.id),
        recordDate,
        inputQuantity: cell.inputQuantity,
        defectQuantity: cell.defectQuantity,
      };
    }));

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.productionApi.saveWeek({ weekStart: this.week.weekStart, entries })
      .pipe(finalize(() => { this.isSaving = false; }))
      .subscribe({
        next: (week) => {
          this.week = week;
          this.isDirty = false;
          this.successMessage = 'La semana se guardó correctamente.';
        },
        error: (error: unknown) => {
          console.error('No fue posible guardar la semana de producción.', error);
          this.errorMessage = this.extractError(error) || 'No fue posible guardar la información semanal.';
        },
      });
  }

  updateQuantity(series: ProductionDefectSeries, date: string, field: QuantityField, rawValue: string): void {
    const numericValue = rawValue.trim() === '' ? 0 : Number(rawValue);
    const normalizedValue = Number.isFinite(numericValue) ? Math.max(0, Math.trunc(numericValue)) : 0;
    this.cell(series, date)[field] = normalizedValue;
    this.isDirty = true;
    this.clearMessages();
  }

  cell(series: ProductionDefectSeries, date: string): ProductionDefectCell {
    if (!series.entries[date]) {
      series.entries[date] = { inputQuantity: 0, defectQuantity: 0 };
    }
    return series.entries[date];
  }

  weekCell(week: ProductionWeek, seriesId: string, date: string): ProductionDefectCell {
    const series = week.series.find((item) => item.id === seriesId);
    return series ? this.readCell(series, date) : { inputQuantity: 0, defectQuantity: 0 };
  }

  dayInputTotal(date: string): number {
    return this.series.reduce((total, series) => total + this.cell(series, date).inputQuantity, 0);
  }

  dayDefectTotal(date: string): number {
    return this.series.reduce((total, series) => total + this.cell(series, date).defectQuantity, 0);
  }

  weekDayInputTotal(week: ProductionWeek, date: string): number {
    return week.series.reduce((total, series) => total + this.readCell(series, date).inputQuantity, 0);
  }

  weekDayDefectTotal(week: ProductionWeek, date: string): number {
    return week.series.reduce((total, series) => total + this.readCell(series, date).defectQuantity, 0);
  }

  seriesInputTotal(series: ProductionDefectSeries): number {
    return this.days.reduce((total, date) => total + this.cell(series, date).inputQuantity, 0);
  }

  seriesDefectTotal(series: ProductionDefectSeries): number {
    return this.days.reduce((total, date) => total + this.cell(series, date).defectQuantity, 0);
  }

  overallInputTotal(): number {
    return this.days.reduce((total, date) => total + this.dayInputTotal(date), 0);
  }

  overallDefectTotal(): number {
    return this.days.reduce((total, date) => total + this.dayDefectTotal(date), 0);
  }

  weekSeriesInputTotal(week: ProductionWeek, seriesId: string): number {
    const series = week.series.find((item) => item.id === seriesId);
    if (!series) return 0;
    return week.days.reduce((total, day) => total + this.readCell(series, day).inputQuantity, 0);
  }

  weekSeriesDefectTotal(week: ProductionWeek, seriesId: string): number {
    const series = week.series.find((item) => item.id === seriesId);
    if (!series) return 0;
    return week.days.reduce((total, day) => total + this.readCell(series, day).defectQuantity, 0);
  }

  weekOverallInputTotal(week: ProductionWeek): number {
    return week.series.reduce((total, series) => total + this.weekSeriesInputTotal(week, series.id), 0);
  }

  weekOverallDefectTotal(week: ProductionWeek): number {
    return week.series.reduce((total, series) => total + this.weekSeriesDefectTotal(week, series.id), 0);
  }

  defectRate(defectQuantity: number, inputQuantity: number): string {
    if (inputQuantity <= 0) return '—';
    return `${((defectQuantity / inputQuantity) * 100).toFixed(2)}%`;
  }

  isInvalid(series: ProductionDefectSeries, date: string): boolean {
    const cell = this.cell(series, date);
    return cell.defectQuantity > cell.inputQuantity;
  }

  formatDay(value: string): string {
    const date = this.parseDate(value);
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(date);
    return `${weekday} ${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  }

  formatWeekRange(): string {
    if (!this.week) return '';
    return `${this.formatDay(this.week.weekStart)} – ${this.formatDay(this.week.weekEnd)}`;
  }

  formatTrendWeekRange(week: ProductionWeek): string {
    return `${this.shortDate(week.weekStart)}–${this.shortDate(week.weekEnd)}`;
  }

  weekName(week: ProductionWeek): string {
    return `WK${String(week.weekNumber).padStart(2, '0')}`;
  }

  comparisonLabel(start: string): string {
    const startDate = this.parseDate(start);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    return `WK${String(this.getIsoWeekNumber(startDate)).padStart(2, '0')} · ${this.shortDate(start)}–${this.shortDate(this.formatDate(endDate))}`;
  }

  trackBySeries(_index: number, series: ProductionDefectSeries): string {
    return series.id;
  }

  trackByDay(_index: number, day: string): string {
    return day;
  }

  trackByWeek(_index: number, week: ProductionWeek): string {
    return week.weekStart;
  }

  trackByComparisonStart(_index: number, start: string): string {
    return start;
  }

  private loadTrendWeeks(starts: string[]): void {
    if (!starts.length) {
      this.trendWeeks = [];
      this.activeDetailWeekStart = '';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.week = null;

    this.productionApi.getWeeks(starts)
      .pipe(finalize(() => { this.isLoading = false; }))
      .subscribe({
        next: (weeks) => {
          this.trendWeeks = [...weeks].sort((left, right) => left.weekStart.localeCompare(right.weekStart));
          const activeStillExists = this.trendWeeks.some((item) => item.weekStart === this.activeDetailWeekStart);
          if (!activeStillExists) {
            this.activeDetailWeekStart = this.trendWeeks.at(-1)?.weekStart ?? '';
          }
        },
        error: (error: unknown) => {
          console.error('No fue posible cargar las semanas de producción.', error);
          this.trendWeeks = [];
          this.activeDetailWeekStart = '';
          this.errorMessage = 'No fue posible cargar las semanas seleccionadas.';
        },
      });
  }

  private navigateToWeek(start: string): void {
    if (!this.confirmDiscardChanges()) return;
    this.loadWeek(start);
  }

  private confirmDiscardChanges(): boolean {
    return !this.isDirty || window.confirm('Hay cambios sin guardar. ¿Deseas continuar?');
  }

  private findInvalidCell(): { seriesName: string; date: string } | null {
    for (const series of this.series) {
      for (const date of this.days) {
        if (this.isInvalid(series, date)) {
          return { seriesName: series.name, date };
        }
      }
    }
    return null;
  }

  private buildRecentWeekStarts(count: number, endStart: string): string[] {
    const end = this.startOfIsoWeek(this.parseDate(endStart));
    const starts: string[] = [];
    for (let index = count - 1; index >= 0; index -= 1) {
      const date = new Date(end);
      date.setUTCDate(date.getUTCDate() - (index * 7));
      starts.push(this.formatDate(date));
    }
    return starts;
  }

  private readCell(series: ProductionDefectSeries, date: string): ProductionDefectCell {
    return series.entries[date] ?? { inputQuantity: 0, defectQuantity: 0 };
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private shortDate(value: string): string {
    const date = this.parseDate(value);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  }

  private getIsoWeekNumber(value: Date): number {
    const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private todayAsUtcDate(): Date {
    const today = new Date();
    return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  }

  private startOfIsoWeek(value: Date): Date {
    const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - day + 1);
    return date;
  }

  private parseDate(value: string): Date {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return this.todayAsUtcDate();
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }

  private formatDate(value: Date): string {
    return [
      value.getUTCFullYear(),
      String(value.getUTCMonth() + 1).padStart(2, '0'),
      String(value.getUTCDate()).padStart(2, '0'),
    ].join('-');
  }

  private extractError(error: unknown): string {
    if (typeof error !== 'object' || error === null || !('error' in error)) return '';
    const response = (error as { error?: { message?: string | string[] } }).error;
    const message = response?.message;
    return Array.isArray(message) ? message.join(' ') : (message ?? '');
  }
}
