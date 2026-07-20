import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

interface LoginResponse {
  token: string;
  username: string;
  expiresAt: string;
}

interface StoredSession extends LoginResponse {}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'kittyhp-auth-session';
  private readonly currentSession = signal<StoredSession | null>(this.readSession());

  readonly currentUser = signal<string | null>(this.currentSession()?.username ?? null);

  constructor(private readonly httpClient: HttpClient) {}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.httpClient.post<LoginResponse>('/api/auth/login', { username, password }).pipe(
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

  getToken(): string | null {
    return this.isAuthenticated() ? this.currentSession()?.token ?? null : null;
  }

  private saveSession(session: StoredSession): void {
    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.currentSession.set(session);
    this.currentUser.set(session.username);
  }

  private readSession(): StoredSession | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return null;
      const session = JSON.parse(raw) as StoredSession;
      if (!session.token || !session.username || !session.expiresAt || new Date(session.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem(this.storageKey);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
}
