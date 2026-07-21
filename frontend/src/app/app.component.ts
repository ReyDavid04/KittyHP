import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <header class="app-header" *ngIf="authService.isAuthenticated()">
        <a class="brand" routerLink="/" aria-label="Ir al inicio de KittyHP">
          <img class="brand-icon" src="assets/laptop-repair.svg" alt="">
          <strong>KittyHP</strong>
        </a>

        <nav class="main-nav" aria-label="Navegación principal">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Reportes</a>
          <a routerLink="/production-defects" routerLinkActive="active">Defect Rate</a>

          <details
            *ngIf="authService.isAdmin()"
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
              <span class="dropdown-title">Administración</span>
              <a routerLink="/settings/users" routerLinkActive="active" (click)="$any(configMenu).open = false">
                <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"></path></svg>
                <strong>Usuarios</strong>
              </a>
              <span class="menu-divider"></span>

              <span class="dropdown-title">Catálogos</span>
              <a routerLink="/settings/catalogs/family" routerLinkActive="active" (click)="$any(configMenu).open = false"><strong>Family</strong></a>
              <a routerLink="/settings/catalogs/top_issue" routerLinkActive="active" (click)="$any(configMenu).open = false"><strong>Top Issue</strong></a>
              <a routerLink="/settings/catalogs/category" routerLinkActive="active" (click)="$any(configMenu).open = false"><strong>Category</strong></a>
              <a routerLink="/settings/catalogs/major_part" routerLinkActive="active" (click)="$any(configMenu).open = false"><strong>Major Part</strong></a>
              <a routerLink="/settings/catalogs/failure_factor" routerLinkActive="active" (click)="$any(configMenu).open = false"><strong>Failure Factor</strong></a>
            </div>
          </details>
        </nav>

        <div class="session-area">
          <span class="user-chip" [title]="authService.currentUser()?.email || ''">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4V6Zm0 1 8 6 8-6"></path></svg>
            <span>{{ authService.emailLocalPart(authService.currentUser()?.email || '') }} IMP</span>
          </span>
          <button type="button" class="logout-button" (click)="logout()" aria-label="Cerrar sesión" title="Cerrar sesión">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5m4-3 4-4-4-4m4 4H9"></path></svg>
            <span>Salir</span>
          </button>
        </div>
      </header>

      <main class="app-content"><router-outlet></router-outlet></main>
    </div>
  `,
  styles: [`
    :host, .app-shell { display: block; min-height: 100dvh; }
    .app-header {
      position: sticky; top: 0; z-index: 50; display: grid;
      grid-template-columns: minmax(160px, auto) 1fr auto; align-items: center; gap: 18px;
      min-height: 50px; padding: 0 18px; border-bottom: 1px solid rgba(200,211,223,.9);
      background: rgba(255,255,255,.94); box-shadow: 0 1px 0 rgba(18,35,55,.02); backdrop-filter: blur(18px);
    }
    .brand { display: inline-flex; align-items: center; gap: 8px; width: max-content; color: inherit; text-decoration: none; }
    .brand-icon { display: block; width: 30px; height: 30px; flex: 0 0 30px; }
    .brand strong { font-size: .9rem; letter-spacing: -.01em; }
    .main-nav { display: flex; align-items: stretch; gap: 22px; height: 50px; }
    .main-nav > a, .settings-menu summary { position: relative; display: inline-flex; align-items: center; padding: 0 3px; color: var(--muted); font-size: .8rem; font-weight: 650; text-decoration: none; }
    .main-nav > a::after, .settings-menu summary::after { position: absolute; right: 0; bottom: 0; left: 0; height: 2px; border-radius: 2px 2px 0 0; background: var(--primary); content: ''; opacity: 0; transform: scaleX(.5); transition: 160ms ease; }
    .main-nav > a.active, .settings-menu[open] summary, .settings-menu summary:hover, .settings-menu.active summary { color: var(--primary); }
    .main-nav > a.active::after, .settings-menu.active summary::after { opacity: 1; transform: scaleX(1); }
    .settings-menu { position: relative; display: flex; align-items: stretch; }
    .settings-menu summary { height: 50px; gap: 7px; list-style: none; cursor: pointer; user-select: none; }
    .settings-menu summary::-webkit-details-marker { display: none; }
    .settings-menu summary > svg:first-child { width: 16px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.55; }
    .settings-menu .chevron { width: 13px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; transition: transform 150ms ease; }
    .settings-menu[open] .chevron { transform: rotate(180deg); }
    .settings-dropdown {
      position: absolute; top: 44px; left: -12px; z-index: 80; display: grid; width: 232px;
      padding: 8px; border: 1px solid #dce4ee; border-radius: 12px; background: #fff;
      box-shadow: 0 14px 34px rgba(15,32,51,.13);
    }
    .dropdown-title { padding: 5px 10px 8px; color: #718096; font-size: .61rem; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
    .settings-dropdown a {
      position: relative; display: flex; align-items: center; gap: 9px; min-height: 38px; margin: 1px 0;
      padding: 7px 11px 7px 14px; border: 1px solid transparent; border-radius: 8px;
      color: #263449; background: transparent; text-decoration: none; transition: 150ms ease;
    }
    .settings-dropdown a:hover { color: var(--primary); border-color: rgba(47,126,199,.1); background: #f5f8fc; }
    .settings-dropdown a.active { padding-left: 18px; color: var(--primary); border-color: rgba(47,126,199,.1); background: #eaf2fb; }
    .settings-dropdown a.active::before { position: absolute; top: 9px; bottom: 9px; left: 7px; width: 3px; border-radius: 999px; background: var(--primary); content: ''; }
    .settings-dropdown strong { font-size: .74rem; font-weight: 750; line-height: 1.2; }
    .menu-icon { width: 15px; flex: 0 0 15px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.65; }
    .menu-divider { height: 1px; margin: 7px 5px; background: #edf1f5; }
    .session-area { display: flex; align-items: center; gap: 8px; }
    .user-chip { display: inline-flex; align-items: center; gap: 6px; max-width: 240px; min-height: 30px; padding: 4px 9px; border: 1px solid #e0e7ef; border-radius: 9px; color: #526176; font-size: .69rem; font-weight: 650; background: #f8fafc; }
    .user-chip > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-chip svg, .logout-button svg { width: 15px; flex: 0 0 15px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; }
    .logout-button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 30px; padding: 4px 9px; border: 1px solid #e0e7ef; border-radius: 9px; color: #66758a; font-size: .68rem; font-weight: 700; background: #fff; cursor: pointer; transition: 150ms ease; }
    .logout-button:hover { border-color: rgba(180,35,58,.25); color: #a71d39; background: #fff7f8; }
    .app-content { width: 100%; max-width: none; margin: 0; padding: 0; }

    @media (min-width: 1181px) {
      :host ::ng-deep app-repair-form .grid-date { grid-column: 1 / span 2 !important; grid-row: 1 !important; }
      :host ::ng-deep app-repair-form .grid-family { grid-column: 3 / span 3 !important; grid-row: 1 !important; }
      :host ::ng-deep app-repair-form .grid-top-issue { grid-column: 6 / span 3 !important; grid-row: 1 !important; }
      :host ::ng-deep app-repair-form .grid-failure-qty { grid-column: 9 / span 2 !important; grid-row: 1 !important; }
      :host ::ng-deep app-repair-form .grid-build-qty { grid-column: 1 / span 2 !important; grid-row: 2 !important; }
      :host ::ng-deep app-repair-form .grid-fr { grid-column: 3 / span 2 !important; grid-row: 2 !important; }
      :host ::ng-deep app-repair-form .grid-category { grid-column: 5 / span 3 !important; grid-row: 2 !important; }
      :host ::ng-deep app-repair-form .grid-return { grid-column: 8 / span 3 !important; grid-row: 2 !important; }
    }

    @media (max-width: 760px) {
      .app-header { display: flex; justify-content: space-between; min-height: 48px; padding: 0 12px; }
      .main-nav { gap: 12px; height: 48px; margin-left: auto; }
      .main-nav > a { display: none; }
      .settings-menu summary { height: 48px; }
      .settings-dropdown { right: 0; left: auto; width: min(232px,calc(100vw - 24px)); }
      .user-chip { display: none; }
      .logout-button span { display: none; }
      .logout-button { width: 32px; padding: 0; }
    }
  `],
})
export class AppComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
