import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RepairReport } from '../../../core/models/repair-report.model';

@Component({
  selector: 'app-repair-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <h2>Registros</h2>
      <p *ngIf="!repairs?.length" class="empty">Aún no hay registros cargados.</p>
      <article *ngFor="let repair of repairs" class="row">
        <strong>{{ repair.topIssue }}</strong>
        <span>{{ repair.recordDate }} · {{ repair.category }} · {{ repair.frPercentage }}%</span>
      </article>
    </section>
  `,
  styles: [
    `
      .card {
        padding: 20px;
        border: 1px solid var(--border);
        border-radius: 20px;
        background: var(--surface);
      }

      .row {
        display: grid;
        gap: 4px;
        padding: 12px 0;
        border-top: 1px solid var(--border);
      }

      .empty {
        color: var(--muted);
      }
    `,
  ],
})
export class RepairListComponent {
  @Input() repairs: RepairReport[] | null = [];
}
