import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserRole } from './auth.service';

export interface ManagedUser {
  id: number;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UserManagementApiService {
  private readonly baseUrl = '/api/users';

  constructor(private readonly httpClient: HttpClient) {}

  getAll(): Observable<ManagedUser[]> {
    return this.httpClient.get<ManagedUser[]>(this.baseUrl);
  }

  create(payload: CreateUserPayload): Observable<ManagedUser> {
    return this.httpClient.post<ManagedUser>(this.baseUrl, payload);
  }

  update(id: number, payload: UpdateUserPayload): Observable<ManagedUser> {
    return this.httpClient.patch<ManagedUser>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ deleted: true }> {
    return this.httpClient.delete<{ deleted: true }>(`${this.baseUrl}/${id}`);
  }
}
