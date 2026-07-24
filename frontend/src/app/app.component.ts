import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <header class="app-header ui-navbar" *ngIf="authService.isAuthenticated()">
        <a class="brand" routerLink="/" aria-label="Ir al inicio de KittyHP">
          <img class="brand-icon" src="assets/laptop-repair.svg" alt="">
          <strong>KittyHP</strong>
        </a>

        <nav class="main-nav" aria-label="Navegación principal">
          <a routerLink="/" routerLinkActive="active" ariaCurrentWhenActive="page" [routerLinkActiveOptions]="{ exact: true }">Reportes</a>
          <a routerLink="/production-defects" routerLinkActive="active" ariaCurrentWhenActive="page">Overall FPF Trend</a>

          <details
            *ngIf="authService.currentUser()?.role !== 'viewer'"
            class="settings-menu"
            routerLinkActive="active"
            #configMenu
          >
            <summary>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8 3.5-2.1-.8a6.8 6.8 0 0 0-.7-1.7l.9-2-1.6-1.6-2 .9a6.8 6.8 0 0 0-1.7-.7L12 4H9.8L9 6.1a6.8 6.8 0 0 0-1.7.7l-2-.9-1.6 1.6.9 2a6.8 6.8 0 0 0-.7 1.7L2 12v2.2l2.1.8c.2.6.4 1.2.7 1.7l-.9 2 1.6 1.6 2-.9c.5.3 1.1.5 1.7.7l.8 2.1h2.2l.8-2.1c.6-.2 1.2-.4 1.7-.7l2 .9 1.6-1.6-.9-2c.3-.5.5-1.1.7-1.7l2.1-.8V12Z"></path></svg>
              <span>Configuración</span>
              <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"></path></svg>
            </summary>

            <div class="settings-dropdown">
              <ng-container *ngIf="authService.isAdmin()">
                <span class="dropdown-title">Administración</span>
                <a routerLink="/settings/users" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="$any(configMenu).open = false">
                  <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"></path></svg>
                  <strong>Usuarios</strong>
                </a>
                <span class="menu-divider"></span>
              </ng-container>

              <span class="dropdown-title">Catálogos</span>
              <a routerLink="/settings/catalogs/family" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="$any(configMenu).open = false"><strong>Family</strong></a>
              <a routerLink="/settings/catalogs/top_issue" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="$any(configMenu).open = false"><strong>Top Issue</strong></a>
              <a routerLink="/settings/catalogs/category" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="$any(configMenu).open = false"><strong>Category</strong></a>
              <a routerLink="/settings/catalogs/major_part" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="$any(configMenu).open = false"><strong>Major Part</strong></a>
              <a routerLink="/settings/catalogs/failure_factor" routerLinkActive="active" ariaCurrentWhenActive="page" (click)="$any(configMenu).open = false"><strong>Failure Factor</strong></a>
            </div>
          </details>
        </nav>

        <div class="session-area">
          <span class="user-chip" [title]="authService.currentUser()?.email || ''">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Zm0 1 8 6 8-6"></path></svg>
            <span>{{ authService.emailLocalPart(authService.currentUser()?.email || '') }} IMP</span>
          </span>
          <button type="button" class="logout-button ui-button ui-button-danger" (click)="logout()" aria-label="Cerrar sesión" title="Cerrar sesión">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5m4-3 4-4-4-4m4 4H9"></path></svg>
            <span>Salir</span>
          </button>
        </div>
      </header>

      <main class="app-content"><router-outlet></router-outlet></main>
    </div>
  `,
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  @HostListener('document:click', ['$event'])
  closeSettingsOnOutsideClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (target?.closest('.settings-menu')) return;
    document.querySelectorAll<HTMLDetailsElement>('.settings-menu[open]').forEach((menu) => {
      menu.open = false;
    });
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
