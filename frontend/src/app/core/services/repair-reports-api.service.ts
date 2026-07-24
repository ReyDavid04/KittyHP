import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { RepairReport, RepairUpsertPayload } from '../models/repair-report.model';

type RepairReportResponse = Omit<RepairReport, 'frPercentage' | 'returnYesQty' | 'returnNoQty'> & {
  frPercentage: string | number;
  returnYesQty: string | number;
  returnNoQty: string | number;
  review: boolean | number;
};

export type RepairCatalogType = 'family' | 'top_issue' | 'category' | 'major_part' | 'failure_factor';

export interface RepairCatalogs {
  families: string[];
  topIssues: string[];
  categories: string[];
  majorParts: string[];
  failureFactors: string[];
}

export interface RepairCatalogItem {
  id: string;
  catalogType: RepairCatalogType;
  value: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RepairCatalogItemPayload {
  value?: string;
  isActive?: boolean;
  sortOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class RepairReportsApiService {
  private readonly baseUrl = '/api/repairs';

  constructor(private readonly httpClient: HttpClient) {}

  getAll(): Observable<RepairReport[]> {
    return this.httpClient.get<RepairReportResponse[]>(this.baseUrl).pipe(map((repairs) => repairs.map((repair) => this.normalize(repair))));
  }

  getCatalogs(): Observable<RepairCatalogs> {
    return this.httpClient.get<RepairCatalogs>(`${this.baseUrl}/catalogs`);
  }

  getCatalogItems(type: RepairCatalogType): Observable<RepairCatalogItem[]> {
    return this.httpClient.get<RepairCatalogItem[]>(`${this.baseUrl}/catalog-items/${type}`);
  }

  createCatalogItem(type: RepairCatalogType, payload: Required<Pick<RepairCatalogItemPayload, 'value'>> & RepairCatalogItemPayload): Observable<RepairCatalogItem> {
    return this.httpClient.post<RepairCatalogItem>(`${this.baseUrl}/catalog-items/${type}`, payload);
  }

  updateCatalogItem(type: RepairCatalogType, id: string, payload: RepairCatalogItemPayload): Observable<RepairCatalogItem> {
    return this.httpClient.patch<RepairCatalogItem>(`${this.baseUrl}/catalog-items/${type}/${id}`, payload);
  }

  deleteCatalogItem(type: RepairCatalogType, id: string): Observable<{ deleted: true }> {
    return this.httpClient.delete<{ deleted: true }>(`${this.baseUrl}/catalog-items/${type}/${id}`);
  }

  getOne(id: string): Observable<RepairReport> {
    return this.httpClient.get<RepairReportResponse>(`${this.baseUrl}/${id}`).pipe(map((repair) => this.normalize(repair)));
  }

  create(payload: RepairUpsertPayload): Observable<RepairReport> {
    return this.httpClient.post<RepairReportResponse>(this.baseUrl, this.toFormData(payload)).pipe(map((repair) => this.normalize(repair)));
  }

  update(id: string, payload: RepairUpsertPayload): Observable<RepairReport> {
    return this.httpClient.patch<RepairReportResponse>(`${this.baseUrl}/${id}`, this.toFormData(payload)).pipe(map((repair) => this.normalize(repair)));
  }

  delete(id: string): Observable<{ deleted: true }> {
    return this.httpClient.delete<{ deleted: true }>(`${this.baseUrl}/${id}`);
  }

  importWorkbook(file: File, preview = false, exclusions: Record<string, string[]> = {}): Observable<{ created?: number; preview?: boolean; records?: RepairUpsertPayload[]; total?: number; exclusionOptions?: Record<string, string[]> }> {
    const formData = new FormData();
    formData.append('file', file);
    const encoded = encodeURIComponent(JSON.stringify(exclusions));
    return this.httpClient.post<{ created?: number; preview?: boolean; records?: RepairUpsertPayload[]; total?: number; exclusionOptions?: Record<string, string[]> }>(`${this.baseUrl}/import?preview=${preview}&exclusions=${encoded}`, formData);
  }

  confirmImport(records: RepairUpsertPayload[]): Observable<{ created: number }> {
    return this.httpClient.post<{ created: number }>(`${this.baseUrl}/import/confirm`, records);
  }

  setReview(id: string, review: boolean): Observable<RepairReport> {
    return this.httpClient.patch<RepairReportResponse>(`${this.baseUrl}/${id}/review`, { review }).pipe(map((repair) => this.normalize(repair)));
  }

  private normalize(repair: RepairReportResponse): RepairReport {
    const paths = (value: string | null | undefined): string[] => {
      if (!value) return [];
      try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [value]; } catch { return [value]; }
    };
    const failPictures = paths(repair.failPicture);
    const evidencePictures = paths(repair.evidencePicture);
    return {
      ...repair,
      failPicture: failPictures[0] ?? null,
      evidencePicture: evidencePictures[0] ?? null,
      failPictures,
      evidencePictures,
      frPercentage: Number(repair.frPercentage),
      returnYesQty: Number(repair.returnYesQty),
      returnNoQty: Number(repair.returnNoQty),
      review: Boolean(repair.review),
    };
  }

  private toFormData(payload: RepairUpsertPayload): FormData {
    const formData = new FormData();

    this.appendText(formData, 'recordDate', payload.recordDate);
    this.appendText(formData, 'family', payload.family);
    this.appendText(formData, 'topIssue', payload.topIssue);
    this.appendText(formData, 'failureQty', payload.failureQty);
    this.appendText(formData, 'buildQty', payload.buildQty);
    this.appendText(formData, 'frPercentage', payload.frPercentage);
    this.appendText(formData, 'category', payload.category);
    this.appendText(formData, 'returnYesQty', payload.returnYesQty);
    this.appendText(formData, 'majorPart', payload.majorPart);
    this.appendText(formData, 'repairResult', payload.repairResult);
    this.appendText(formData, 'failureFactor', payload.failureFactor);
    this.appendText(formData, 'actions', payload.actions);
    this.appendText(formData, 'failPicture', payload.failPicture);
    this.appendText(formData, 'evidencePicture', payload.evidencePicture);

    for (const file of payload.failPictureFiles ?? []) formData.append('failPicture', file);
    for (const file of payload.evidencePictureFiles ?? []) formData.append('evidencePicture', file);

    return formData;
  }

  private appendText(formData: FormData, key: string, value: unknown): void {
    if (value === undefined || value === null || value === '') {
      return;
    }

    formData.append(key, String(value));
  }
}
