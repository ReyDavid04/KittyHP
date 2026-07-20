import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { RepairReport, RepairUpsertPayload } from '../models/repair-report.model';

type RepairReportResponse = Omit<RepairReport, 'frPercentage'> & { frPercentage: string | number };

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

  private normalize(repair: RepairReportResponse): RepairReport {
    return {
      ...repair,
      frPercentage: typeof repair.frPercentage === 'string' ? Number(repair.frPercentage) : repair.frPercentage,
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
    this.appendText(formData, 'returnStatus', payload.returnStatus);
    this.appendText(formData, 'majorPart', payload.majorPart);
    this.appendText(formData, 'repairResult', payload.repairResult);
    this.appendText(formData, 'failureFactor', payload.failureFactor);
    this.appendText(formData, 'actions', payload.actions);
    this.appendText(formData, 'failPicture', payload.failPicture);
    this.appendText(formData, 'evidencePicture', payload.evidencePicture);

    if (payload.failPictureFile) {
      formData.append('failPicture', payload.failPictureFile);
    }

    if (payload.evidencePictureFile) {
      formData.append('evidencePicture', payload.evidencePictureFile);
    }

    return formData;
  }

  private appendText(formData: FormData, key: string, value: unknown): void {
    if (value === undefined || value === null || value === '') {
      return;
    }

    formData.append(key, String(value));
  }
}
