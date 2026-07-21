import { Injectable } from '@angular/core';
import { ProductionDefectCell, ProductionDefectSeries, ProductionWeek } from '../../../core/services/production-defects-api.service';

type BrowserXlsxWriterModule = typeof import('wasm-xlsxwriter/web');
type Worksheet = import('wasm-xlsxwriter/web').Worksheet;
type Format = import('wasm-xlsxwriter/web').Format;

export type ProductionExcelViewMode = 'single' | 'recent' | 'compare';

export interface ProductionExcelExportRequest {
  mode: ProductionExcelViewMode;
  week: ProductionWeek | null;
  weeks: ProductionWeek[];
  detailWeek: ProductionWeek | null;
  recentWeekCount: number;
}

interface WorkbookFormats {
  header: Format;
  text: Format;
  center: Format;
  integer: Format;
  rate: Format;
  overallText: Format;
  overallCenter: Format;
  overallInteger: Format;
  overallRate: Format;
  weekTotal: Format;
  weekTotalRate: Format;
}

@Injectable({ providedIn: 'root' })
export class ProductionDefectsExcelExportService {
  private writerPromise?: Promise<BrowserXlsxWriterModule>;

  async export(request: ProductionExcelExportRequest): Promise<void> {
    const xlsx = await this.loadWriter();
    const workbook = new xlsx.Workbook();
    const formats = this.createFormats(xlsx);

    if (request.mode === 'single') {
      if (!request.week) return;
      this.addDailySheet(workbook, request.week, formats, this.weekName(request.week));
    } else {
      if (!request.weeks.length) return;
      this.addSummarySheet(workbook, request.weeks, formats);
      if (request.detailWeek) {
        this.addDailySheet(workbook, request.detailWeek, formats, `Detalle ${this.weekName(request.detailWeek)}`);
      }
    }

    const output = workbook.saveToBufferSync();
    this.download(output, this.buildFileName(request));
  }

  private addSummarySheet(
    workbook: import('wasm-xlsxwriter/web').Workbook,
    weeks: ProductionWeek[],
    formats: WorkbookFormats,
  ): void {
    const worksheet = workbook.addWorksheet();
    worksheet.setName('Resumen semanal');

    const orderedWeeks = [...weeks].sort((left, right) => left.weekStart.localeCompare(right.weekStart));
    const series = this.collectSeries(orderedWeeks);
    const headers = [
      'Production Series',
      'Input / Failure',
      ...orderedWeeks.map((week) => `${this.weekName(week)}\n${this.shortDate(week.weekStart)}-${this.shortDate(week.weekEnd)}`),
    ];

    worksheet.writeRowWithFormat(0, 0, headers, formats.header);
    worksheet.setRowHeightPixels(0, 42);
    worksheet.setColumnWidthPixels(0, 150);
    worksheet.setColumnWidthPixels(1, 138);
    orderedWeeks.forEach((_week, index) => worksheet.setColumnWidthPixels(index + 2, 104));

    let row = 1;
    row = this.writeSummaryMetricGroup(
      worksheet,
      row,
      'IDS Overall',
      orderedWeeks.map((week) => ({
        inputQuantity: this.weekOverallInputTotal(week),
        defectQuantity: this.weekOverallDefectTotal(week),
      })),
      formats,
      true,
    );

    for (const productionSeries of series) {
      row = this.writeSummaryMetricGroup(
        worksheet,
        row,
        productionSeries.name,
        orderedWeeks.map((week) => ({
          inputQuantity: this.weekSeriesInputTotal(week, productionSeries.id),
          defectQuantity: this.weekSeriesDefectTotal(week, productionSeries.id),
        })),
        formats,
        false,
      );
    }

    worksheet.setFreezePanes(1, 0);
    worksheet.autofilter(0, 0, row - 1, headers.length - 1);
  }

  private addDailySheet(
    workbook: import('wasm-xlsxwriter/web').Workbook,
    week: ProductionWeek,
    formats: WorkbookFormats,
    requestedName: string,
  ): void {
    const worksheet = workbook.addWorksheet();
    worksheet.setName(this.safeSheetName(requestedName));

    const series = [...week.series].sort(
      (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    );
    const headers = [
      'Production Series',
      'Input / Failure',
      ...week.days.map((day) => this.formatDay(day)),
      this.weekName(week),
    ];

    worksheet.writeRowWithFormat(0, 0, headers, formats.header);
    worksheet.setRowHeightPixels(0, 38);
    worksheet.setColumnWidthPixels(0, 150);
    worksheet.setColumnWidthPixels(1, 138);
    week.days.forEach((_day, index) => worksheet.setColumnWidthPixels(index + 2, 102));
    worksheet.setColumnWidthPixels(headers.length - 1, 104);

    let row = 1;
    row = this.writeDailyMetricGroup(
      worksheet,
      row,
      'IDS Overall',
      week,
      week.days.map((day) => ({
        inputQuantity: this.weekDayInputTotal(week, day),
        defectQuantity: this.weekDayDefectTotal(week, day),
      })),
      formats,
      true,
    );

    for (const productionSeries of series) {
      row = this.writeDailyMetricGroup(
        worksheet,
        row,
        productionSeries.name,
        week,
        week.days.map((day) => this.readCell(productionSeries, day)),
        formats,
        false,
      );
    }

    worksheet.setFreezePanes(1, 0);
    worksheet.autofilter(0, 0, row - 1, headers.length - 1);
  }

  private writeSummaryMetricGroup(
    worksheet: Worksheet,
    startRow: number,
    seriesName: string,
    values: ProductionDefectCell[],
    formats: WorkbookFormats,
    overall: boolean,
  ): number {
    const textFormat = overall ? formats.overallText : formats.text;
    const integerFormat = overall ? formats.overallInteger : formats.integer;
    const rateFormat = overall ? formats.overallRate : formats.rate;

    worksheet.mergeRange(startRow, 0, startRow + 2, 0, seriesName, textFormat);
    worksheet.writeWithFormat(startRow, 1, 'Input Quantity', textFormat);
    values.forEach((cell, index) => this.writeQuantity(worksheet, startRow, index + 2, cell.inputQuantity, integerFormat));

    worksheet.writeWithFormat(startRow + 1, 1, 'Defect Quantity', textFormat);
    values.forEach((cell, index) => this.writeQuantity(worksheet, startRow + 1, index + 2, cell.defectQuantity, integerFormat));

    worksheet.writeWithFormat(startRow + 2, 1, 'Defect Rate', textFormat);
    values.forEach((cell, index) => this.writeRate(worksheet, startRow + 2, index + 2, cell, rateFormat, textFormat));

    return startRow + 3;
  }

  private writeDailyMetricGroup(
    worksheet: Worksheet,
    startRow: number,
    seriesName: string,
    week: ProductionWeek,
    values: ProductionDefectCell[],
    formats: WorkbookFormats,
    overall: boolean,
  ): number {
    const textFormat = overall ? formats.overallText : formats.text;
    const integerFormat = overall ? formats.overallInteger : formats.integer;
    const rateFormat = overall ? formats.overallRate : formats.rate;
    const inputTotal = values.reduce((total, cell) => total + cell.inputQuantity, 0);
    const defectTotal = values.reduce((total, cell) => total + cell.defectQuantity, 0);
    const totalColumn = week.days.length + 2;

    worksheet.mergeRange(startRow, 0, startRow + 2, 0, seriesName, textFormat);
    worksheet.writeWithFormat(startRow, 1, 'Input Quantity', textFormat);
    values.forEach((cell, index) => this.writeQuantity(worksheet, startRow, index + 2, cell.inputQuantity, integerFormat));
    this.writeQuantity(worksheet, startRow, totalColumn, inputTotal, overall ? formats.overallInteger : formats.weekTotal);

    worksheet.writeWithFormat(startRow + 1, 1, 'Defect Quantity', textFormat);
    values.forEach((cell, index) => this.writeQuantity(worksheet, startRow + 1, index + 2, cell.defectQuantity, integerFormat));
    this.writeQuantity(worksheet, startRow + 1, totalColumn, defectTotal, overall ? formats.overallInteger : formats.weekTotal);

    worksheet.writeWithFormat(startRow + 2, 1, 'Defect Rate', textFormat);
    values.forEach((cell, index) => this.writeRate(worksheet, startRow + 2, index + 2, cell, rateFormat, textFormat));
    this.writeRate(
      worksheet,
      startRow + 2,
      totalColumn,
      { inputQuantity: inputTotal, defectQuantity: defectTotal },
      overall ? formats.overallRate : formats.weekTotalRate,
      overall ? formats.overallText : formats.weekTotal,
    );

    return startRow + 3;
  }

  private writeQuantity(
    worksheet: Worksheet,
    row: number,
    column: number,
    value: number,
    format: Format,
  ): void {
    worksheet.writeWithFormat(row, column, value > 0 ? value : '', format);
  }

  private writeRate(
    worksheet: Worksheet,
    row: number,
    column: number,
    cell: ProductionDefectCell,
    rateFormat: Format,
    emptyFormat: Format,
  ): void {
    if (cell.inputQuantity <= 0 || cell.defectQuantity <= 0) {
      worksheet.writeWithFormat(row, column, '', emptyFormat);
      return;
    }
    worksheet.writeWithFormat(row, column, cell.defectQuantity / cell.inputQuantity, rateFormat);
  }

  private createFormats(xlsx: BrowserXlsxWriterModule): WorkbookFormats {
    const header = new xlsx.Format()
      .setBold()
      .setFontColor(xlsx.Color.white())
      .setBackgroundColor(xlsx.Color.parse('#153A6B'))
      .setBorder(xlsx.FormatBorder.Thin)
      .setAlign(xlsx.FormatAlign.Center)
      .setAlign(xlsx.FormatAlign.VerticalCenter)
      .setTextWrap();
    const text = new xlsx.Format()
      .setBorder(xlsx.FormatBorder.Thin)
      .setAlign(xlsx.FormatAlign.VerticalCenter)
      .setTextWrap();
    const center = text.clone()
      .setAlign(xlsx.FormatAlign.Center)
      .setAlign(xlsx.FormatAlign.VerticalCenter);
    const integer = center.clone().setNumFormat('#,##0;-#,##0;;');
    const rate = center.clone().setNumFormat('0.00%;-0.00%;;').setFontColor(xlsx.Color.parse('#0D56B3'));
    const overallText = text.clone().setBold().setBackgroundColor(xlsx.Color.parse('#FFF0B8'));
    const overallCenter = center.clone().setBold().setBackgroundColor(xlsx.Color.parse('#FFF4CE'));
    const overallInteger = overallCenter.clone().setNumFormat('#,##0;-#,##0;;');
    const overallRate = overallCenter.clone().setNumFormat('0.00%;-0.00%;;').setFontColor(xlsx.Color.parse('#0D56B3'));
    const weekTotal = center.clone().setBold().setBackgroundColor(xlsx.Color.parse('#EEF3F8')).setNumFormat('#,##0;-#,##0;;');
    const weekTotalRate = center.clone().setBold().setBackgroundColor(xlsx.Color.parse('#EEF3F8')).setNumFormat('0.00%;-0.00%;;').setFontColor(xlsx.Color.parse('#0D56B3'));

    return {
      header,
      text,
      center,
      integer,
      rate,
      overallText,
      overallCenter,
      overallInteger,
      overallRate,
      weekTotal,
      weekTotalRate,
    };
  }

  private collectSeries(weeks: ProductionWeek[]): ProductionDefectSeries[] {
    const byId = new Map<string, ProductionDefectSeries>();
    for (const week of weeks) {
      for (const productionSeries of week.series) {
        if (!byId.has(productionSeries.id)) byId.set(productionSeries.id, productionSeries);
      }
    }
    return [...byId.values()].sort(
      (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    );
  }

  private weekSeriesInputTotal(week: ProductionWeek, seriesId: string): number {
    const series = week.series.find((item) => item.id === seriesId);
    return series ? week.days.reduce((total, day) => total + this.readCell(series, day).inputQuantity, 0) : 0;
  }

  private weekSeriesDefectTotal(week: ProductionWeek, seriesId: string): number {
    const series = week.series.find((item) => item.id === seriesId);
    return series ? week.days.reduce((total, day) => total + this.readCell(series, day).defectQuantity, 0) : 0;
  }

  private weekOverallInputTotal(week: ProductionWeek): number {
    return week.series.reduce((total, series) => total + this.weekSeriesInputTotal(week, series.id), 0);
  }

  private weekOverallDefectTotal(week: ProductionWeek): number {
    return week.series.reduce((total, series) => total + this.weekSeriesDefectTotal(week, series.id), 0);
  }

  private weekDayInputTotal(week: ProductionWeek, day: string): number {
    return week.series.reduce((total, series) => total + this.readCell(series, day).inputQuantity, 0);
  }

  private weekDayDefectTotal(week: ProductionWeek, day: string): number {
    return week.series.reduce((total, series) => total + this.readCell(series, day).defectQuantity, 0);
  }

  private readCell(series: ProductionDefectSeries, date: string): ProductionDefectCell {
    return series.entries[date] ?? { inputQuantity: 0, defectQuantity: 0 };
  }

  private weekName(week: ProductionWeek): string {
    return `WK${String(week.weekNumber).padStart(2, '0')}`;
  }

  private formatDay(value: string): string {
    const date = this.parseDate(value);
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(date);
    return `${weekday} ${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  }

  private shortDate(value: string): string {
    const date = this.parseDate(value);
    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  }

  private parseDate(value: string): Date {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return new Date(0);
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }

  private safeSheetName(value: string): string {
    const normalized = value.replace(/[\\/*?:[\]]/g, '-').trim() || 'Overall FPF Trend';
    return normalized.slice(0, 31);
  }

  private buildFileName(request: ProductionExcelExportRequest): string {
    const date = new Date().toISOString().slice(0, 10);
    if (request.mode === 'single' && request.week) {
      return `KittyHP_Overall_FPF_Trend_${this.weekName(request.week)}_${request.week.weekStart}.xlsx`;
    }
    if (request.mode === 'recent') {
      return `KittyHP_Overall_FPF_Trend_Ultimas_${request.recentWeekCount}_Semanas_${date}.xlsx`;
    }
    return `KittyHP_Overall_FPF_Trend_Comparacion_${date}.xlsx`;
  }

  private loadWriter(): Promise<BrowserXlsxWriterModule> {
    if (!this.writerPromise) {
      this.writerPromise = import('wasm-xlsxwriter/web').then(async (writer) => {
        const wasmUrl = new URL('assets/wasm_xlsxwriter_bg.wasm', document.baseURI);
        await writer.default({ module_or_path: wasmUrl });
        return writer;
      }).catch((error: unknown) => {
        this.writerPromise = undefined;
        throw error;
      });
    }
    return this.writerPromise;
  }

  private download(buffer: Uint8Array, fileName: string): void {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
  }
}