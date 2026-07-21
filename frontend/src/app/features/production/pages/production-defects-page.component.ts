import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  ProductionDefectCell,
  ProductionDefectSeries,
  ProductionDefectsApiService,
  ProductionWeek,
} from '../../../core/services/production-defects-api.service';

type QuantityField = 'inputQuantity' | 'defectQuantity';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './production-defects-page.component.html',
  styleUrl: './production-defects-page.component.css',
})
export class ProductionDefectsPageComponent {
  private readonly productionApi = inject(ProductionDefectsApiService);

  week: ProductionWeek | null = null;
  selectedDate = this.formatDate(this.startOfIsoWeek(new Date()));
  isLoading = false;
  isSaving = false;
  isDirty = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.loadWeek(this.selectedDate);
  }

  get series(): ProductionDefectSeries[] {
    return this.week?.series ?? [];
  }

  get days(): string[] {
    return this.week?.days ?? [];
  }

  get weekLabel(): string {
    return this.week ? `WK${String(this.week.weekNumber).padStart(2, '0')}` : 'WK--';
  }

  loadWeek(start: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

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

  changeWeek(offset: number): void {
    const current = this.parseDate(this.week?.weekStart ?? this.selectedDate);
    current.setUTCDate(current.getUTCDate() + (offset * 7));
    this.navigateToWeek(this.formatDate(current));
  }

  goToCurrentWeek(): void {
    this.navigateToWeek(this.formatDate(this.startOfIsoWeek(new Date())));
  }

  selectWeek(value: string): void {
    if (!value) return;
    this.navigateToWeek(this.formatDate(this.startOfIsoWeek(this.parseDate(value))));
  }

  saveWeek(): void {
    if (!this.week || this.isSaving) return;

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
    this.successMessage = '';
    this.errorMessage = '';
  }

  cell(series: ProductionDefectSeries, date: string): ProductionDefectCell {
    if (!series.entries[date]) {
      series.entries[date] = { inputQuantity: 0, defectQuantity: 0 };
    }
    return series.entries[date];
  }

  dayInputTotal(date: string): number {
    return this.series.reduce((total, series) => total + this.cell(series, date).inputQuantity, 0);
  }

  dayDefectTotal(date: string): number {
    return this.series.reduce((total, series) => total + this.cell(series, date).defectQuantity, 0);
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

  trackBySeries(_index: number, series: ProductionDefectSeries): string {
    return series.id;
  }

  trackByDay(_index: number, day: string): string {
    return day;
  }

  private navigateToWeek(start: string): void {
    if (this.isDirty && !window.confirm('Hay cambios sin guardar. ¿Deseas cambiar de semana?')) {
      return;
    }
    this.loadWeek(start);
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

  private startOfIsoWeek(value: Date): Date {
    const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - day + 1);
    return date;
  }

  private parseDate(value: string): Date {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return new Date();
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
