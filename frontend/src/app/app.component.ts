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
        min-height: 100dvh;
        padding: 12px;
        background:
          radial-gradient(circle at top left, rgba(0, 87, 184, 0.08), transparent 34%),
          radial-gradient(circle at right top, rgba(24, 144, 255, 0.08), transparent 28%),
          linear-gradient(180deg, #f6f9fc 0%, #eef4fb 100%);
      }

      .hero {
        width: 100%;
        margin: 0 0 12px;
        padding: 14px 18px;
        border: 1px solid var(--border);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.8);
        box-shadow: 0 10px 22px rgba(16, 32, 51, 0.05);
        backdrop-filter: blur(8px);
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
        font-size: clamp(1.05rem, 1.9vw, 1.45rem);
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
        width: 100%;
        margin: 0;
      }
    `,
  ],
})
export class AppComponent {}
