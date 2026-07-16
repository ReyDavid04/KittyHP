import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RepairReport } from '../models/repair-report.model';

@Injectable({ providedIn: 'root' })
export class RepairReportsApiService {
  private readonly baseUrl = '/api/repairs';

  constructor(private readonly httpClient: HttpClient) {}

  getAll(): Observable<RepairReport[]> {
    return this.httpClient.get<RepairReport[]>(this.baseUrl);
  }
}
