import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}

interface LoginResponse {
  token: string;
  userId: number;
  email: string;
  role: UserRole;
  expiresAt: string;
}

interface StoredSession extends LoginResponse {}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'kittyhp-auth-session';
  private readonly currentSession = signal<StoredSession | null>(this.readSession());

  readonly currentUser = signal<AuthUser | null>(this.toAuthUser(this.currentSession()));

  constructor(private readonly httpClient: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.httpClient.post<LoginResponse>('/api/auth/login', { email: this.toCorporateEmail(email), password }).pipe(
      tap((session) => this.saveSession(session)),
    );
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.currentSession.set(null);
    this.currentUser.set(null);
  }

  isAuthenticated(): boolean {
    const session = this.currentSession();
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      if (session) this.logout();
      return false;
    }
    return true;
  }

  isAdmin(): boolean {
    return this.isAuthenticated() && this.currentUser()?.role === 'admin';
  }

  getToken(): string | null {
    return this.isAuthenticated() ? this.currentSession()?.token ?? null : null;
  }

  emailLocalPart(email: string): string {
    return email.split('@')[0] ?? email;
  }

  private toCorporateEmail(value: string): string {
    const trimmed = value.trim();
    const localPart = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
    return `${localPart}@inventec.com`;
  }

  private saveSession(session: StoredSession): void {
    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.currentSession.set(session);
    this.currentUser.set(this.toAuthUser(session));
  }

  private readSession(): StoredSession | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const session = JSON.parse(raw) as StoredSession;
      const validRole = session.role === 'admin' || session.role === 'user';

      if (
        !session.token ||
        !session.userId ||
        !session.email ||
        !validRole ||
        !session.expiresAt ||
        new Date(session.expiresAt).getTime() <= Date.now()
      ) {
        localStorage.removeItem(this.storageKey);
        return null;
      }

      return session;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private toAuthUser(session: StoredSession | null): AuthUser | null {
    if (!session) return null;
    return {
      id: session.userId,
      email: session.email,
      role: session.role,
    };
  }
}
