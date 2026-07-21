import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';

export interface ProductionDefectCell {
  inputQuantity: number;
  defectQuantity: number;
}

export interface ProductionDefectSeries {
  id: string;
  name: string;
  sortOrder: number;
  entries: Record<string, ProductionDefectCell>;
}

export interface ProductionWeek {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  days: string[];
  series: ProductionDefectSeries[];
}

interface ProductionWeekResponse extends Omit<ProductionWeek, 'series'> {
  series: Array<Omit<ProductionDefectSeries, 'sortOrder' | 'entries'> & {
    sortOrder: string | number;
    entries: Record<string, {
      inputQuantity: string | number;
      defectQuantity: string | number;
    }>;
  }>;
}

export interface SaveProductionWeekPayload {
  weekStart: string;
  entries: Array<{
    seriesId: number;
    recordDate: string;
    inputQuantity: number;
    defectQuantity: number;
  }>;
}

@Injectable({ providedIn: 'root' })
export class ProductionDefectsApiService {
  private readonly baseUrl = '/api/production-defects';

  constructor(private readonly httpClient: HttpClient) {}

  getWeek(start: string): Observable<ProductionWeek> {
    const params = new HttpParams().set('start', start);
    return this.httpClient
      .get<ProductionWeekResponse>(`${this.baseUrl}/week`, { params })
      .pipe(map((response) => this.normalize(response)));
  }

  getWeeks(starts: string[]): Observable<ProductionWeek[]> {
    if (!starts.length) return of([]);
    return forkJoin(starts.map((start) => this.getWeek(start)));
  }

  saveWeek(payload: SaveProductionWeekPayload): Observable<ProductionWeek> {
    return this.httpClient
      .put<ProductionWeekResponse>(`${this.baseUrl}/week`, payload)
      .pipe(map((response) => this.normalize(response)));
  }

  private normalize(response: ProductionWeekResponse): ProductionWeek {
    return {
      ...response,
      series: response.series.map((series) => ({
        ...series,
        sortOrder: Number(series.sortOrder ?? 0),
        entries: Object.fromEntries(
          Object.entries(series.entries).map(([date, cell]) => [date, {
            inputQuantity: Number(cell.inputQuantity ?? 0),
            defectQuantity: Number(cell.defectQuantity ?? 0),
          }]),
        ),
      })),
    };
  }
}
