import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RepairReport } from '../../../core/models/repair-report.model';

type BrowserXlsxWriterModule = typeof import('wasm-xlsxwriter/web');

@Injectable({ providedIn: 'root' })
export class RepairExcelExportService {
  private writerPromise?: Promise<BrowserXlsxWriterModule>;

  constructor(private readonly httpClient: HttpClient) {}

  async export(repairs: RepairReport[]): Promise<void> {
    if (!repairs.length) return;

    const xlsx = await this.loadWriter();
    const workbook = new xlsx.Workbook();
    const worksheet = workbook.addWorksheet();
    worksheet.setName('Reportes');

    const headerFormat = new xlsx.Format()
      .setBold()
      .setFontColor(xlsx.Color.white())
      .setBackgroundColor(xlsx.Color.parse('#164C8C'))
      .setBorder(xlsx.FormatBorder.Thin)
      .setAlign(xlsx.FormatAlign.Center)
      .setAlign(xlsx.FormatAlign.VerticalCenter)
      .setTextWrap();
    const textFormat = new xlsx.Format()
      .setBorder(xlsx.FormatBorder.Thin)
      .setAlign(xlsx.FormatAlign.VerticalCenter)
      .setTextWrap();
    const centerFormat = textFormat.clone()
      .setAlign(xlsx.FormatAlign.Center)
      .setAlign(xlsx.FormatAlign.VerticalCenter);
    const decimalFormat = centerFormat.clone().setNumFormat('0.00');
    const imageCellFormat = centerFormat.clone();

    const maxFailPictures = Math.max(1, ...repairs.map((repair) => this.pictureList(repair.failPictures, repair.failPicture).length));
    const maxEvidencePictures = Math.max(1, ...repairs.map((repair) => this.pictureList(repair.evidencePictures, repair.evidencePicture).length));
    const failPictureHeaders = Array.from({ length: maxFailPictures }, (_, index) => `Fail Picture ${index + 1}`);
    const evidencePictureHeaders = Array.from({ length: maxEvidencePictures }, (_, index) => `Evidence ${index + 1}`);
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
      'Major Part',
      'Repair Result',
      'Failure Factor',
      'Actions',
      ...failPictureHeaders,
      ...evidencePictureHeaders,
    ];

    worksheet.writeRowWithFormat(0, 0, headers, headerFormat);
    worksheet.setRowHeightPixels(0, 34);

    const columnWidths = [70, 95, 130, 220, 90, 90, 82, 160, 82, 82, 145, 220, 165, 240, ...failPictureHeaders.map(() => 125), ...evidencePictureHeaders.map(() => 125)];
    columnWidths.forEach((width, column) => worksheet.setColumnWidthPixels(column, width));

    repairs.forEach((repair, index) => {
      const row = index + 1;
      worksheet.setRowHeightPixels(row, 92);
      worksheet.writeWithFormat(row, 0, String(repair.id ?? ''), centerFormat);
      worksheet.writeWithFormat(row, 1, this.normalizeRecordDate(repair.recordDate) || String(repair.recordDate ?? ''), centerFormat);
      worksheet.writeWithFormat(row, 2, repair.family ?? '', textFormat);
      worksheet.writeWithFormat(row, 3, repair.topIssue ?? '', textFormat);
      worksheet.writeWithFormat(row, 4, Number(repair.failureQty ?? 0), centerFormat);
      worksheet.writeWithFormat(row, 5, Number(repair.buildQty ?? 0), centerFormat);
      worksheet.writeWithFormat(row, 6, Number(repair.frPercentage ?? 0), decimalFormat);
      worksheet.writeWithFormat(row, 7, repair.category ?? '', textFormat);
      worksheet.writeWithFormat(row, 8, Number(repair.returnYesQty ?? 0), centerFormat);
      worksheet.writeWithFormat(row, 9, Number(repair.returnNoQty ?? 0), centerFormat);
      worksheet.writeWithFormat(row, 10, repair.majorPart ?? '', textFormat);
      worksheet.writeWithFormat(row, 11, repair.repairResult ?? '', textFormat);
      worksheet.writeWithFormat(row, 12, repair.failureFactor ?? '', textFormat);
      worksheet.writeWithFormat(row, 13, repair.actions ?? '', textFormat);
      failPictureHeaders.forEach((_, index) => worksheet.writeWithFormat(row, 14 + index, '', imageCellFormat));
      evidencePictureHeaders.forEach((_, index) => worksheet.writeWithFormat(row, 14 + maxFailPictures + index, '', imageCellFormat));
    });

    const batchSize = 5;
    for (let start = 0; start < repairs.length; start += batchSize) {
      const batch = repairs.slice(start, start + batchSize);
      const images = await Promise.all(batch.map(async (repair) => {
        const failPictures = await Promise.all(this.pictureList(repair.failPictures, repair.failPicture).map((picture) => this.loadImage(picture)));
        const evidencePictures = await Promise.all(this.pictureList(repair.evidencePictures, repair.evidencePicture).map((picture) => this.loadImage(picture)));
        return { failPictures, evidencePictures };
      }));

      images.forEach((imagePair, batchIndex) => {
        const repair = batch[batchIndex];
        const row = start + batchIndex + 1;
        imagePair.failPictures.forEach((picture, index) => this.insertAnchoredImage(xlsx, worksheet, row, 14 + index, picture, imageCellFormat, `Fail picture ${index + 1} reporte ${repair.id}`));
        imagePair.evidencePictures.forEach((picture, index) => this.insertAnchoredImage(xlsx, worksheet, row, 14 + maxFailPictures + index, picture, imageCellFormat, `Evidence ${index + 1} reporte ${repair.id}`));
      });
    }

    worksheet.setFreezePanes(1, 0);
    worksheet.autofilter(0, 0, repairs.length, headers.length - 1);

    const output = workbook.saveToBufferSync();
    this.download(output, `KittyHP_Reportes_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  private pictureList(pictures: string[] | undefined, picture: string | null | undefined): string[] {
    const values = Array.isArray(pictures) ? pictures.filter(Boolean) : [];
    return values.length ? values : (picture ? [picture] : []);
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

  private insertAnchoredImage(
    xlsx: BrowserXlsxWriterModule,
    worksheet: import('wasm-xlsxwriter/web').Worksheet,
    row: number,
    column: number,
    bytes: Uint8Array | null,
    format: import('wasm-xlsxwriter/web').Format,
    altText: string,
  ): void {
    if (!bytes?.length) {
      worksheet.writeWithFormat(row, column, 'Sin imagen', format);
      return;
    }

    try {
      const image = new xlsx.Image(bytes);
      image.setAltText(altText);
      image.setObjectMovement(xlsx.ObjectMovement.MoveAndSizeWithCellsAfter);
      worksheet.insertImageFitToCellCentered(row, column, image);
    } catch {
      worksheet.writeWithFormat(row, column, 'Imagen no compatible', format);
    }
  }

  private async loadImage(source: string | null | undefined): Promise<Uint8Array | null> {
    const value = String(source ?? '').trim();
    if (!value) return null;

    try {
      if (value.startsWith('data:image/')) return this.decodeDataUri(value);
      const normalized = value.replace(/\\/g, '/');
      const url = new URL(normalized, document.baseURI).toString();
      const buffer = await firstValueFrom(this.httpClient.get(url, { responseType: 'arraybuffer' }));
      return new Uint8Array(buffer);
    } catch {
      return null;
    }
  }

  private decodeDataUri(value: string): Uint8Array | null {
    const commaIndex = value.indexOf(',');
    if (commaIndex < 0) return null;

    const metadata = value.slice(0, commaIndex);
    const payload = value.slice(commaIndex + 1);
    if (!metadata.includes(';base64')) return new TextEncoder().encode(decodeURIComponent(payload));

    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  private normalizeRecordDate(value: unknown): string {
    const raw = String(value ?? '').trim();
    const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (isoDate) return isoDate;

    const timestamp = Date.parse(raw);
    return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString().slice(0, 10);
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
