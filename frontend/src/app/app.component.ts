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
        <h1>Sistema de reportes de reparación</h1>
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
        padding: 32px;
      }

      .hero {
        max-width: 1040px;
        margin: 0 auto 24px;
        padding: 28px;
        border: 1px solid var(--border);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 18px 45px rgba(16, 32, 51, 0.08);
      }

      .eyebrow {
        margin: 0 0 8px;
        color: var(--primary);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 4vw, 3.5rem);
      }

      .lede {
        margin: 12px 0 0;
        color: var(--muted);
        max-width: 64ch;
      }

      .content {
        max-width: 1040px;
        margin: 0 auto;
      }
    `,
  ],
})
export class AppComponent {}
