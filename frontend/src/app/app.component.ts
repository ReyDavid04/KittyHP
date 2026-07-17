import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <header class="app-header">
        <a class="brand" routerLink="/" aria-label="Ir al inicio de KittyHP">
          <span class="brand-mark" aria-hidden="true">K</span>
          <span class="brand-copy">
            <strong>KittyHP</strong>
          </span>
        </a>

        <nav class="main-nav" aria-label="Navegación principal">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            Reportes
          </a>
        </nav>
      </header>

      <main class="app-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
      }

      .app-shell {
        min-height: 100dvh;
      }

      .app-header {
        position: sticky;
        top: 0;
        z-index: 50;
        display: grid;
        grid-template-columns: minmax(160px, auto) 1fr;
        align-items: center;
        gap: 18px;
        min-height: 50px;
        padding: 0 18px;
        border-bottom: 1px solid rgba(200, 211, 223, 0.9);
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 1px 0 rgba(18, 35, 55, 0.02);
        backdrop-filter: blur(18px);
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        width: max-content;
        color: inherit;
        text-decoration: none;
      }

      .brand-mark {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border-radius: 9px;
        color: #fff;
        font-size: 0.84rem;
        font-weight: 800;
        background: linear-gradient(145deg, var(--primary), var(--accent));
        box-shadow: 0 5px 12px rgba(22, 76, 140, 0.18);
      }

      .brand-copy {
        display: grid;
      }

      .brand-copy strong {
        font-size: 0.9rem;
        letter-spacing: -0.01em;
      }

      .main-nav {
        display: flex;
        align-items: stretch;
        height: 50px;
      }

      .main-nav a {
        position: relative;
        display: inline-flex;
        align-items: center;
        padding: 0 3px;
        color: var(--muted);
        font-size: 0.8rem;
        font-weight: 650;
        text-decoration: none;
      }

      .main-nav a::after {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        height: 2px;
        border-radius: 2px 2px 0 0;
        background: var(--primary);
        content: '';
        opacity: 0;
        transform: scaleX(0.5);
        transition: 160ms ease;
      }

      .main-nav a.active {
        color: var(--primary);
      }

      .main-nav a.active::after {
        opacity: 1;
        transform: scaleX(1);
      }

      .app-content {
        width: 100%;
        max-width: 1920px;
        margin: 0 auto;
        padding: 12px 18px 28px;
      }

      @media (max-width: 760px) {
        .app-header {
          grid-template-columns: 1fr;
          min-height: 48px;
          padding: 0 12px;
        }

        .main-nav {
          display: none;
        }

        .app-content {
          padding: 10px 10px 22px;
        }
      }
    `,
  ],
})
export class AppComponent {}
