import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="shell">
      <header class="hero">
        <p class="eyebrow">KittyHP</p>
        <div class="title-row">
          <h1>Sistema de reportes de reparación</h1>
          <span class="badge">Reportes</span>
        </div>
        <p class="lede">Angular standalone conectado a un backend NestJS para capturar y consultar registros.</p>
      </header>
      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
        padding: 20px;
      }

      .hero {
        max-width: 1040px;
        margin: 0 auto 16px;
        padding: 16px 20px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 10px 26px rgba(16, 32, 51, 0.06);
      }

      .eyebrow {
        margin: 0 0 6px;
        color: var(--primary);
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      h1 {
        margin: 0;
        font-size: clamp(1.2rem, 2.2vw, 1.75rem);
      }

      .badge {
        padding: 4px 10px;
        border: 1px solid var(--border);
        border-radius: 999px;
        font-size: 0.75rem;
        color: var(--primary);
        background: #f4f8ff;
      }

      .lede {
        margin: 8px 0 0;
        color: var(--muted);
        max-width: 64ch;
        font-size: 0.92rem;
      }

      .content {
        max-width: 1040px;
        margin: 0 auto;
      }
    `,
  ],
})
export class AppComponent {}
